package com.campus.platform.aigateway;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.campus.platform.common.BizException;
import com.campus.platform.common.Constants;
import com.campus.platform.common.ResultCode;
import com.campus.platform.entity.AiCallLog;
import com.campus.platform.entity.AiMessage;
import com.campus.platform.entity.PdfDocument;
import com.campus.platform.entity.PromptTemplate;
import com.campus.platform.mapper.AiCallLogMapper;
import com.campus.platform.mapper.PdfDocumentMapper;
import com.campus.platform.mapper.PromptTemplateMapper;
import com.campus.platform.utils.RedisUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import okio.BufferedSource;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * AI 网关服务：统一封装 DeepSeek（OpenAI 兼容协议）调用。
 * <ul>
 *   <li>同步调用 {@link #chat} —— 小程序一次性答疑</li>
 *   <li>流式调用 {@link #streamChat} —— Web SSE 实时输出</li>
 *   <li>每日限流、敏感词检查、提示词模板、调用日志、消息持久化</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiGatewayService {

    private final AiConfigHolder aiConfigHolder;
    private final ChatMemoryService chatMemoryService;
    private final SensitiveWordService sensitiveWordService;
    private final PromptTemplateMapper promptTemplateMapper;
    private final AiCallLogMapper aiCallLogMapper;
    private final PdfDocumentMapper pdfDocumentMapper;
    private final RedisUtils redisUtils;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();

    /**
     * 同步调用（非流式）。
     *
     * @param userId    用户ID
     * @param scene     场景：chat/pdf/code_fix/outline/quiz
     * @param question  用户问题
     * @param sessionId 会话ID（可空，无状态场景如 code_fix/outline/quiz 传 null）
     * @param params    附加参数（docId、code、language、subject 等）
     * @return AI 回复文本
     */
    public String chat(Long userId, String scene, String question, Long sessionId, Map<String, String> params) {
        if (StrUtil.isBlank(question)) {
            throw new BizException(ResultCode.SYSTEM_ERROR, "问题不能为空");
        }
        if (!isAiConfigured()) {
            throw new BizException(ResultCode.AI_NOT_CONFIGURED,
                    "AI 服务暂不可用（未配置 API Key），可稍后重试或使用基础功能");
        }
        checkRateLimit(userId);
        if (sensitiveWordService.contains(question)) {
            throw new BizException(ResultCode.SENSITIVE_WORD);
        }

        ArrayNode messages = buildMessages(userId, scene, question, sessionId, params);
        long start = System.currentTimeMillis();

        try {
            String responseBody = doChat(messages, false);
            JsonNode root = objectMapper.readTree(responseBody);
            String content = root.path("choices").path(0).path("message").path("content").asText();
            int promptTokens = root.path("usage").path("prompt_tokens").asInt();
            int completionTokens = root.path("usage").path("completion_tokens").asInt();

            // 持久化消息
            if (sessionId != null) {
                chatMemoryService.saveMessage(sessionId, "user", question, null);
                chatMemoryService.saveMessage(sessionId, "assistant", content, completionTokens);
            }

            logCall(userId, scene, promptTokens, completionTokens,
                    (int) (System.currentTimeMillis() - start), 0, null);
            return content;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("AI同步调用失败: userId={}, scene={}", userId, scene, e);
            logCall(userId, scene, 0, 0,
                    (int) (System.currentTimeMillis() - start), 1, e.getMessage());
            throw new BizException(ResultCode.AI_INVOKE_FAIL, "AI服务暂时不可用，请稍后重试");
        }
    }

    /**
     * 流式调用（SSE）。
     *
     * @return SseEmitter，前端 EventSource 接收
     */
    /** 后台内部AI调用：不占用学生限额，不做输入敏感词拦截，也不保存会话。 */
    public String internalChat(Long userId, String scene, String question, Map<String, String> params) {
        ArrayNode messages = buildMessages(userId, scene, question, null, params);
        long start = System.currentTimeMillis();
        try {
            String responseBody = doChat(messages, false);
            JsonNode root = objectMapper.readTree(responseBody);
            String content = root.path("choices").path(0).path("message").path("content").asText();
            logCall(userId, scene,
                    root.path("usage").path("prompt_tokens").asInt(),
                    root.path("usage").path("completion_tokens").asInt(),
                    (int) (System.currentTimeMillis() - start), 0, null);
            return content;
        } catch (Exception e) {
            logCall(userId, scene, 0, 0,
                    (int) (System.currentTimeMillis() - start), 1, e.getMessage());
            throw new BizException(ResultCode.AI_INVOKE_FAIL, "AI审核服务暂时不可用");
        }
    }

    public SseEmitter streamChat(Long userId, String scene, String question, Long sessionId, Map<String, String> params) {
        return streamChat(userId, scene, question, sessionId, params,
                new SseEmitter(aiConfigHolder.getTimeoutMs() * 2L));
    }

    SseEmitter streamChat(Long userId, String scene, String question, Long sessionId,
                          Map<String, String> params, SseEmitter emitter) {
        checkRateLimit(userId);
        if (sensitiveWordService.contains(question)) {
            throw new BizException(ResultCode.SENSITIVE_WORD);
        }

        ArrayNode messages = buildMessages(userId, scene, question, sessionId, params);
        long start = System.currentTimeMillis();

        // 持久化用户消息
        if (sessionId != null) {
            chatMemoryService.saveMessage(sessionId, "user", question, null);
        }

        Request request = buildStreamRequest(messages);
        httpClient.newCall(request).enqueue(new Callback() {
            private final StringBuilder fullContent = new StringBuilder();

            @Override
            public void onFailure(Call call, IOException e) {
                log.error("AI流式调用失败: userId={}, scene={}", userId, scene, e);
                logCall(userId, scene, 0, 0,
                        (int) (System.currentTimeMillis() - start), 1, e.getMessage());
                try {
                    emitter.send(SseEmitter.event().name("error").data("AI服务暂时不可用"));
                } catch (IOException ignored) {
                }
                emitter.completeWithError(e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                try (ResponseBody body = response.body()) {
                    if (!response.isSuccessful() || body == null) {
                        String err = "HTTP " + response.code();
                        logCall(userId, scene, 0, 0,
                                (int) (System.currentTimeMillis() - start), 1, err);
                        emitter.send(SseEmitter.event().name("error").data("AI服务返回错误"));
                        emitter.complete();
                        return;
                    }
                    BufferedSource source = body.source();
                    while (!source.exhausted()) {
                        String line = source.readUtf8Line();
                        if (line == null) break;
                        if (line.startsWith("data: ")) {
                            String data = line.substring(6).trim();
                            if ("[DONE]".equals(data)) {
                                break;
                            }
                            try {
                                JsonNode chunk = objectMapper.readTree(data);
                                String delta = chunk.path("choices").path(0).path("delta").path("content").asText("");
                                if (!delta.isEmpty()) {
                                    fullContent.append(delta);
                                    emitter.send(SseEmitter.event().name("delta").data(delta));
                                }
                            } catch (Exception parseEx) {
                                log.warn("SSE解析失败: {}", data);
                            }
                        }
                    }
                    // 持久化 assistant 回复
                    if (sessionId != null && fullContent.length() > 0) {
                        chatMemoryService.saveMessage(sessionId, "assistant", fullContent.toString(), null);
                    }
                    logCall(userId, scene, 0, 0,
                            (int) (System.currentTimeMillis() - start), 0, null);
                    emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                    emitter.complete();
                } catch (Exception e) {
                    log.error("SSE处理异常", e);
                    emitter.completeWithError(e);
                }
            }
        });

        return emitter;
    }

    // ==================== 内部方法 ====================

    /** AI 是否已配置可用：apiKey 非空且非占位符 */
    public boolean isAiConfigured() {
        String key = aiConfigHolder.getApiKey();
        return StrUtil.isNotBlank(key)
                && !"sk-xxx".equals(key.trim())
                && !key.trim().startsWith("${");
    }

    /** 每日限流检查 */
    private void checkRateLimit(Long userId) {
        String key = Constants.REDIS_AI_RATE_LIMIT + userId + ":" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        Long count = redisUtils.get(key) == null ? 0L : Long.parseLong(redisUtils.get(key).toString());
        if (count >= aiConfigHolder.getRateLimitPerDay()) {
            throw new BizException(ResultCode.RATE_LIMITED, "今日AI调用次数已达上限(" + aiConfigHolder.getRateLimitPerDay() + "次/天)");
        }
        // 预占计数
        if (count == 0L) {
            redisUtils.incr(key, 1, TimeUnit.DAYS);
        } else {
            redisUtils.incr(key, 1, TimeUnit.DAYS);
        }
    }

    /** 构建消息数组（system + 历史上下文 + user） */
    private ArrayNode buildMessages(Long userId, String scene, String question, Long sessionId, Map<String, String> params) {
        ArrayNode messages = objectMapper.createArrayNode();

        // 1. system prompt（从模板表加载）
        String systemPrompt = getPromptTemplate(scene, params);
        if (StrUtil.isNotBlank(systemPrompt)) {
            messages.add(objectMapper.createObjectNode()
                    .put("role", "system")
                    .put("content", systemPrompt));
        }

        // 2. PDF 场景：注入文档全文
        if (Constants.SCENE_PDF.equals(scene) && params != null && params.containsKey("docId")) {
            String docContext = buildPdfContext(userId, Long.parseLong(params.get("docId")));
            if (StrUtil.isNotBlank(docContext)) {
                messages.add(objectMapper.createObjectNode()
                        .put("role", "system")
                        .put("content", "以下是用户上传的PDF文档内容，请基于此回答问题：\n\n" + docContext));
            }
        }

        // 3. 会话历史（chat/pdf 场景）
        if (sessionId != null) {
            List<AiMessage> history = chatMemoryService.getBySession(sessionId);
            // 最近 10 轮上下文
            int start = Math.max(0, history.size() - 20);
            for (int i = start; i < history.size(); i++) {
                AiMessage msg = history.get(i);
                messages.add(objectMapper.createObjectNode()
                        .put("role", msg.getRole())
                        .put("content", msg.getContent()));
            }
        }

        // 4. 当前问题
        String userContent = question;
        if (Constants.SCENE_CODE_FIX.equals(scene) && params != null) {
            // 代码纠错：拼接代码到问题中
            String code = params.getOrDefault("code", "");
            String language = params.getOrDefault("language", "");
            userContent = "语言: " + language + "\n代码:\n" + code + "\n\n" + question;
        } else if (Constants.SCENE_OUTLINE.equals(scene) && params != null) {
            String subject = params.getOrDefault("subject", "");
            String topic = params.getOrDefault("topic", "");
            String questionList = params.getOrDefault("question_list", "");
            userContent = "科目: " + subject
                    + (StrUtil.isNotBlank(topic) ? "\n主题: " + topic : "")
                    + (StrUtil.isNotBlank(questionList) ? "\n错题列表:\n" + questionList : "")
                    + "\n\n" + question;
        } else if (Constants.SCENE_QUIZ.equals(scene) && params != null) {
            String subject = params.getOrDefault("subject", "");
            String q = params.getOrDefault("question", "");
            String answer = params.getOrDefault("answer", "");
            userContent = "科目: " + subject + "\n原题: " + q + "\n原答案: " + answer + "\n\n请生成一道类似的练习题。";
        }
        messages.add(objectMapper.createObjectNode()
                .put("role", "user")
                .put("content", userContent));

        return messages;
    }

    /** 获取场景对应的提示词模板 */
    private String getPromptTemplate(String scene, Map<String, String> params) {
        PromptTemplate tpl = promptTemplateMapper.selectOne(new LambdaQueryWrapper<PromptTemplate>()
                .eq(PromptTemplate::getScene, scene)
                .eq(PromptTemplate::getEnabled, 1)
                .orderByDesc(PromptTemplate::getUpdateTime)
                .last("LIMIT 1"));
        if (tpl != null && StrUtil.isNotBlank(tpl.getContent())) {
            String content = tpl.getContent();
            if (params != null) {
                for (Map.Entry<String, String> entry : params.entrySet()) {
                    content = content.replace("{" + entry.getKey() + "}", entry.getValue());
                }
            }
            content = content.replace("{question}", "");
            return content;
        }
        // 兜底默认提示词
        return switch (scene) {
            case Constants.SCENE_CHAT -> "你是一个友好的校园AI助手，请简洁准确地回答学生的问题。";
            case Constants.SCENE_PDF -> "你是一个文档分析助手，请基于用户提供的PDF文档内容回答问题。";
            case Constants.SCENE_CODE_FIX -> "你是一个编程助教，请检查学生提交的代码，指出错误并给出修改建议。";
            case Constants.SCENE_OUTLINE -> "你是一个学习辅导助手，请根据科目和主题生成结构化的复习提纲。";
            case Constants.SCENE_QUIZ -> "你是一个出题助手，请根据学生的错题生成一道类似的练习题，包含题目和参考答案。";
            default -> "你是一个校园AI助手。";
        };
    }

    /** 构建 PDF 文档上下文（截取前 8000 字符避免 token 超限） */
    private String buildPdfContext(Long userId, Long docId) {
        PdfDocument doc = pdfDocumentMapper.selectById(docId);
        if (doc == null || !userId.equals(doc.getUserId()) || StrUtil.isBlank(doc.getTextContent())) {
            return null;
        }
        String text = doc.getTextContent();
        return text.length() > 8000 ? text.substring(0, 8000) : text;
    }

    /** 执行同步 HTTP 调用 */
    private String doChat(ArrayNode messages, boolean stream) throws IOException {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", aiConfigHolder.getModel());
        body.set("messages", messages);
        body.put("temperature", aiConfigHolder.getTemperature());
        body.put("max_tokens", aiConfigHolder.getMaxTokens());
        body.put("stream", stream);

        Request request = new Request.Builder()
                .url(aiConfigHolder.getBaseUrl() + "/v1/chat/completions")
                .header("Authorization", "Bearer " + aiConfigHolder.getApiKey())
                .header("Content-Type", "application/json")
                .post(RequestBody.create(objectMapper.writeValueAsString(body), MediaType.parse("application/json")))
                .build();

        int retryTimes = aiConfigHolder.getRetryTimes();
        IOException lastEx = null;
        for (int i = 0; i <= retryTimes; i++) {
            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    return response.body().string();
                }
                String errBody = response.body() != null ? response.body().string() : "";
                log.warn("AI调用失败(第{}次): code={}, body={}", i + 1, response.code(), errBody);
                if (response.code() == 401 || response.code() == 403) {
                    throw new IOException("API Key无效或无权限: " + response.code());
                }
            } catch (IOException e) {
                lastEx = e;
                log.warn("AI调用异常(第{}次): {}", i + 1, e.getMessage());
            }
        }
        throw lastEx != null ? lastEx : new IOException("AI调用失败");
    }

    /** 构建流式请求 */
    private Request buildStreamRequest(ArrayNode messages) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", aiConfigHolder.getModel());
        body.set("messages", messages);
        body.put("temperature", aiConfigHolder.getTemperature());
        body.put("max_tokens", aiConfigHolder.getMaxTokens());
        body.put("stream", true);

        try {
            return new Request.Builder()
                    .url(aiConfigHolder.getBaseUrl() + "/v1/chat/completions")
                    .header("Authorization", "Bearer " + aiConfigHolder.getApiKey())
                    .header("Content-Type", "application/json")
                    .header("Accept", "text/event-stream")
                    .post(RequestBody.create(objectMapper.writeValueAsString(body), MediaType.parse("application/json")))
                    .build();
        } catch (Exception e) {
            throw new BizException(ResultCode.SYSTEM_ERROR, "构建AI请求失败");
        }
    }

    /** 记录调用日志 */
    private void logCall(Long userId, String scene, int promptTokens, int completionTokens,
                         int costMs, int status, String errorMsg) {
        try {
            AiCallLog logEntry = new AiCallLog();
            logEntry.setUserId(userId);
            logEntry.setScene(scene);
            logEntry.setModel(aiConfigHolder.getModel());
            logEntry.setPromptTokens(promptTokens);
            logEntry.setCompletionTokens(completionTokens);
            logEntry.setCostMs(costMs);
            logEntry.setStatus(status);
            logEntry.setErrorMsg(errorMsg);
            logEntry.setCreateTime(LocalDateTime.now());
            aiCallLogMapper.insert(logEntry);
        } catch (Exception e) {
            log.error("记录AI调用日志失败", e);
        }
    }
}
