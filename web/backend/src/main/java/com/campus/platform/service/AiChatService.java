package com.campus.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.platform.common.BizException;
import com.campus.platform.common.Constants;
import com.campus.platform.common.PageResult;
import com.campus.platform.common.ResultCode;
import com.campus.platform.dto.AiChatDTO;
import com.campus.platform.dto.CodeFixDTO;
import com.campus.platform.dto.OutlineDTO;
import com.campus.platform.dto.PdfAskDTO;
import com.campus.platform.dto.QuizDTO;
import com.campus.platform.dto.SessionCreateDTO;
import com.campus.platform.entity.AiMessage;
import com.campus.platform.entity.AiSession;
import com.campus.platform.entity.WrongQuestion;
import com.campus.platform.mapper.AiMessageMapper;
import com.campus.platform.mapper.AiSessionMapper;
import com.campus.platform.mapper.PdfDocumentMapper;
import com.campus.platform.entity.PdfDocument;
import com.campus.platform.aigateway.AiGatewayService;
import com.campus.platform.aigateway.ChatMemoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.Map;

/**
 * AI 会话/问答业务编排：会话 CRUD + 各场景问答出口。
 * 模型调用一律经 {@link AiGatewayService}（共享约定 #10）。
 */
@Service
@RequiredArgsConstructor
public class AiChatService {

    private final AiSessionMapper aiSessionMapper;
    private final AiMessageMapper aiMessageMapper;
    private final AiGatewayService aiGatewayService;
    private final ChatMemoryService chatMemoryService;
    private final WrongQuestionService wrongQuestionService;
    private final PdfDocumentMapper pdfDocumentMapper;

    /** 新建会话 */
    public AiSession createSession(Long userId, SessionCreateDTO dto) {
        AiSession session = new AiSession();
        session.setUserId(userId);
        session.setScene(dto.getScene());
        session.setTitle(dto.getTitle() == null || dto.getTitle().isBlank() ? "新会话" : dto.getTitle());
        session.setDocId(dto.getDocId());
        aiSessionMapper.insert(session);
        return session;
    }

    /** 会话列表（按场景筛选） */
    public java.util.List<AiSession> listSessions(Long userId, String scene) {
        return aiSessionMapper.selectList(new LambdaQueryWrapper<AiSession>()
                .eq(AiSession::getUserId, userId)
                .eq(scene != null && !scene.isBlank(), AiSession::getScene, scene)
                .orderByDesc(AiSession::getUpdateTime));
    }

    /** 重命名会话（校验归属） */
    public void renameSession(Long userId, Long sessionId, String title) {
        AiSession session = checkOwner(userId, sessionId);
        session.setTitle(title);
        aiSessionMapper.updateById(session);
    }

    /** 绑定 PDF 文档到已有 PDF 会话。 */
    public AiSession bindPdfDocument(Long userId, Long sessionId, Long docId) {
        if (docId == null) {
            throw new BizException(ResultCode.BAD_REQUEST, "文档ID不能为空");
        }
        PdfDocument document = pdfDocumentMapper.selectById(docId);
        if (document == null || !userId.equals(document.getUserId())) {
            throw new BizException(ResultCode.NOT_FOUND, "文档不存在");
        }
        AiSession session = checkOwner(userId, sessionId);
        if (!Constants.SCENE_PDF.equals(session.getScene())) {
            throw new BizException(ResultCode.BAD_REQUEST, "当前会话不是PDF会话");
        }
        session.setDocId(docId);
        aiSessionMapper.updateById(session);
        return session;
    }

    /** 删除会话（含消息） */
    public void deleteSession(Long userId, Long sessionId) {
        checkOwner(userId, sessionId);
        chatMemoryService.deleteBySession(sessionId);
        aiSessionMapper.deleteById(sessionId);
    }

    /** 历史消息（分页，倒序供上拉加载） */
    public PageResult<AiMessage> listMessages(Long userId, Long sessionId, int pageNum, int pageSize) {
        checkOwner(userId, sessionId);
        Page<AiMessage> page = aiMessageMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<AiMessage>()
                        .eq(AiMessage::getSessionId, sessionId)
                        .orderByDesc(AiMessage::getId));
        return PageResult.of(page);
    }

    /** Web SSE 流式答疑 */
    public SseEmitter askStream(Long userId, AiChatDTO dto) {
        Long sessionId = ensureSession(userId, dto.getSessionId(), Constants.SCENE_CHAT);
        return aiGatewayService.streamChat(userId, Constants.SCENE_CHAT,
                dto.getQuestion(), sessionId, Map.of());
    }

    /** 小程序一次性答疑 */
    public String askSync(Long userId, AiChatDTO dto) {
        Long sessionId = ensureSession(userId, dto.getSessionId(), Constants.SCENE_CHAT);
        return aiGatewayService.chat(userId, Constants.SCENE_CHAT,
                dto.getQuestion(), sessionId, Map.of());
    }

    /** PDF 问答（docId 注入 params，由网关截取文档片段） */
    public String pdfAsk(Long userId, PdfAskDTO dto) {
        Long sessionId = preparePdfSession(userId, dto);
        Map<String, String> params = Map.of("docId", String.valueOf(dto.getDocId()));
        return aiGatewayService.chat(userId, Constants.SCENE_PDF,
                dto.getQuestion(), sessionId, params);
    }

    /** PDF 问答 SSE 版（Web 端） */
    public SseEmitter pdfAskStream(Long userId, PdfAskDTO dto) {
        Long sessionId = preparePdfSession(userId, dto);
        Map<String, String> params = Map.of("docId", String.valueOf(dto.getDocId()));
        return aiGatewayService.streamChat(userId, Constants.SCENE_PDF,
                dto.getQuestion(), sessionId, params);
    }

    /** 校验 PDF 文档归属，并将文档绑定到当前 PDF 会话。 */
    private Long preparePdfSession(Long userId, PdfAskDTO dto) {
        PdfDocument document = pdfDocumentMapper.selectById(dto.getDocId());
        if (document == null || !userId.equals(document.getUserId())) {
            throw new BizException(ResultCode.NOT_FOUND, "文档不存在");
        }
        Long sessionId = dto.getSessionId();
        if (sessionId == null) {
            SessionCreateDTO create = new SessionCreateDTO();
            create.setScene(Constants.SCENE_PDF);
            create.setDocId(dto.getDocId());
            return createSession(userId, create).getId();
        }
        AiSession session = checkOwner(userId, sessionId);
        if (!Constants.SCENE_PDF.equals(session.getScene())) {
            throw new BizException(ResultCode.BAD_REQUEST, "当前会话不是PDF会话");
        }
        if (!dto.getDocId().equals(session.getDocId())) {
            session.setDocId(dto.getDocId());
            aiSessionMapper.updateById(session);
        }
        return sessionId;
    }

    /** 代码纠错（B4，无状态单轮） */
    public String codeFix(Long userId, CodeFixDTO dto) {
        Map<String, String> params = new HashMap<>();
        params.put("code", dto.getCode());
        params.put("language", dto.getLanguage());
        // question 供模板兜底与敏感词检查
        String question = dto.getExtra() == null || dto.getExtra().isBlank()
                ? "请检查以下代码" : dto.getExtra();
        return aiGatewayService.chat(userId, Constants.SCENE_CODE_FIX, question, null, params);
    }

    /** 复习提纲生成（B5） */
    public String outline(Long userId, OutlineDTO dto) {
        Map<String, String> params = new HashMap<>();
        params.put("subject", dto.getSubject() + (dto.getChapter() == null ? "" : " " + dto.getChapter()));
        params.put("topic", dto.getTopic());
        return aiGatewayService.chat(userId, Constants.SCENE_OUTLINE,
                "生成「" + dto.getTopic() + "」复习提纲", null, params);
    }

    /** 智能习题：基于错题生成同类题（B7） */
    public String quiz(Long userId, QuizDTO dto) {
        WrongQuestion wq = wrongQuestionService.getOwned(userId, dto.getWrongQuestionId());
        Map<String, String> params = new HashMap<>();
        params.put("subject", wq.getSubject());
        params.put("question", wq.getQuestion());
        params.put("answer", wq.getAnswer() == null ? "（未提供）" : wq.getAnswer());
        return aiGatewayService.chat(userId, Constants.SCENE_QUIZ,
                wq.getQuestion(), null, params);
    }

    /** 若无会话则自动创建（chat 场景） */
    private Long ensureSession(Long userId, Long sessionId, String scene) {
        if (sessionId != null) {
            checkOwner(userId, sessionId);
            return sessionId;
        }
        SessionCreateDTO create = new SessionCreateDTO();
        create.setScene(scene);
        return createSession(userId, create).getId();
    }

    /** 校验会话归属当前用户 */
    private AiSession checkOwner(Long userId, Long sessionId) {
        AiSession session = aiSessionMapper.selectById(sessionId);
        if (session == null) {
            throw new BizException(ResultCode.NOT_FOUND, "会话不存在");
        }
        if (!session.getUserId().equals(userId)) {
            throw new BizException(ResultCode.FORBIDDEN, "无权访问该会话");
        }
        return session;
    }
}
