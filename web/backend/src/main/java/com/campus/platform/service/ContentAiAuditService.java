package com.campus.platform.service;

import cn.hutool.core.util.StrUtil;
import com.campus.platform.aigateway.AiConfigHolder;
import com.campus.platform.aigateway.AiGatewayService;
import com.campus.platform.common.Constants;
import com.campus.platform.entity.Activity;
import com.campus.platform.entity.IdleItem;
import com.campus.platform.entity.LostFound;
import com.campus.platform.entity.Post;
import com.campus.platform.mapper.ActivityMapper;
import com.campus.platform.mapper.IdleItemMapper;
import com.campus.platform.mapper.LostFoundMapper;
import com.campus.platform.mapper.PostMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 学生内容AI分级审核：低风险自动通过，中高风险保留人工审核，AI故障时安全降级为人工审核。
 */
@Slf4j
@Service
public class ContentAiAuditService {

    private final LostFoundMapper lostFoundMapper;
    private final IdleItemMapper idleItemMapper;
    private final ActivityMapper activityMapper;
    private final PostMapper postMapper;
    private final AiGatewayService aiGatewayService;
    private final AiConfigHolder aiConfigHolder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ContentAiAuditService(LostFoundMapper lostFoundMapper,
                                 IdleItemMapper idleItemMapper,
                                 ActivityMapper activityMapper,
                                 PostMapper postMapper,
                                 AiGatewayService aiGatewayService,
                                 AiConfigHolder aiConfigHolder) {
        this.lostFoundMapper = lostFoundMapper;
        this.idleItemMapper = idleItemMapper;
        this.activityMapper = activityMapper;
        this.postMapper = postMapper;
        this.aiGatewayService = aiGatewayService;
        this.aiConfigHolder = aiConfigHolder;
    }

    public void audit(String type, Object content, Long userId, String title, String body) {
        AiAuditResult result = ruleDecision(title, body);
        if (aiEnabled()) {
            try {
                result = parse(aiGatewayService.internalChat(userId, Constants.SCENE_CONTENT_AUDIT,
                        buildAuditText(type, title, body), Map.of("contentType", type)));
            } catch (Exception e) {
                log.warn("AI内容审核失败，降级为人工审核: type={}, userId={}", type, userId, e);
                result = new AiAuditResult("MEDIUM", 50, "AI审核暂不可用，已转人工审核", List.of("AI降级"));
            }
        }
        applyDecision(type, content, result);
    }

    void applyDecision(String type, Object content, AiAuditResult result) {
        int riskLevel = riskLevel(result.level());
        int score = result.score() == null ? riskLevel * 40 + 10 : Math.max(0, Math.min(100, result.score()));
        String reason = StrUtil.blankToDefault(result.reason(), "未发现明显风险");
        LocalDateTime now = LocalDateTime.now();
        boolean autoPass = riskLevel == 0;

        switch (type) {
            case Constants.BIZ_IDLE -> {
                IdleItem item = (IdleItem) content;
                fill(item, riskLevel, reason, now, autoPass);
                idleItemMapper.updateById(item);
            }
            case Constants.BIZ_ACTIVITY -> {
                Activity activity = (Activity) content;
                fill(activity, riskLevel, reason, now, autoPass);
                activityMapper.updateById(activity);
            }
            case Constants.BIZ_LOSTFOUND -> {
                LostFound lf = (LostFound) content;
                fill(lf, riskLevel, reason, now, autoPass);
                lostFoundMapper.updateById(lf);
            }
            case Constants.BIZ_POST -> {
                Post post = (Post) content;
                fill(post, riskLevel, reason, now, autoPass);
                postMapper.updateById(post);
            }
            default -> throw new IllegalArgumentException("不支持的内容类型: " + type);
        }
        log.info("内容审核完成: type={}, score={}, level={}, autoPass={}", type, score, result.level(), autoPass);
    }

    private AiAuditResult ruleDecision(String title, String body) {
        String text = StrUtil.nullToEmpty(title) + " " + StrUtil.nullToEmpty(body);
        String[] highRiskWords = {"转账", "押金", "银行卡", "刷单", "兼职返利", "加微信", "二维码", "代充", "账号交易"};
        for (String word : highRiskWords) {
            if (text.contains(word)) {
                return new AiAuditResult("HIGH", 85, "命中高风险规则：" + word, List.of("交易风险"));
            }
        }
        String[] mediumRiskWords = {"悬赏", "收费", "校外", "联系我", "手机号", "群聊", "购买"};
        for (String word : mediumRiskWords) {
            if (text.contains(word)) {
                return new AiAuditResult("MEDIUM", 50, "命中需复核规则：" + word, List.of("人工复核"));
            }
        }
        return new AiAuditResult("LOW", 10, "普通校园内容，规则预审通过", List.of());
    }

    private boolean aiEnabled() {
        if (aiConfigHolder == null || aiGatewayService == null) return false;
        String enabled = aiConfigHolder.get("audit_enabled");
        String key = aiConfigHolder.getApiKey();
        return "true".equalsIgnoreCase(enabled) && StrUtil.isNotBlank(key) && !key.contains("xxx");
    }

    private String buildAuditText(String type, String title, String body) {
        return "内容类型：" + type + "\n标题：" + StrUtil.nullToEmpty(title)
                + "\n正文：" + StrUtil.nullToEmpty(body)
                + "\n请仅返回JSON：{\"level\":\"LOW|MEDIUM|HIGH\",\"score\":0-100,\"reason\":\"原因\",\"categories\":[]}";
    }

    private AiAuditResult parse(String response) throws Exception {
        String json = response == null ? "" : response.trim();
        if (json.startsWith("```")) {
            json = json.replaceFirst("^```(?:json)?", "").replaceFirst("```$", "").trim();
        }
        JsonNode root = objectMapper.readTree(json);
        String level = root.path("level").asText("MEDIUM").toUpperCase();
        if (!List.of("LOW", "MEDIUM", "HIGH").contains(level)) level = "MEDIUM";
        int score = root.path("score").asInt(level.equals("LOW") ? 10 : level.equals("HIGH") ? 85 : 50);
        String reason = root.path("reason").asText("AI建议人工复核");
        return new AiAuditResult(level, score, reason, List.of());
    }

    private int riskLevel(String level) {
        if ("LOW".equalsIgnoreCase(level)) return 0;
        if ("HIGH".equalsIgnoreCase(level)) return 2;
        return 1;
    }

    private void fill(IdleItem item, int risk, String reason, LocalDateTime time, boolean pass) {
        item.setAiRiskLevel(risk); item.setAiAuditReason(reason); item.setAiAuditTime(time); item.setAuditSource("ai");
        if (pass && item.getAuditStatus() == Constants.AUDIT_PENDING) item.setAuditStatus(Constants.AUDIT_PASS);
    }
    private void fill(Activity item, int risk, String reason, LocalDateTime time, boolean pass) {
        item.setAiRiskLevel(risk); item.setAiAuditReason(reason); item.setAiAuditTime(time); item.setAuditSource("ai");
        if (pass && item.getAuditStatus() == Constants.AUDIT_PENDING) item.setAuditStatus(Constants.AUDIT_PASS);
    }
    private void fill(LostFound item, int risk, String reason, LocalDateTime time, boolean pass) {
        item.setAiRiskLevel(risk); item.setAiAuditReason(reason); item.setAiAuditTime(time); item.setAuditSource("ai");
        if (pass && item.getAuditStatus() == Constants.AUDIT_PENDING) item.setAuditStatus(Constants.AUDIT_PASS);
    }
    private void fill(Post item, int risk, String reason, LocalDateTime time, boolean pass) {
        item.setAiRiskLevel(risk); item.setAiAuditReason(reason); item.setAiAuditTime(time); item.setAuditSource("ai");
        if (pass && item.getAuditStatus() == Constants.AUDIT_PENDING) item.setAuditStatus(Constants.AUDIT_PASS);
    }
}
