package com.campus.platform.service;

import com.campus.platform.aigateway.AiGatewayService;
import com.campus.platform.aigateway.ChatMemoryService;
import com.campus.platform.common.Constants;
import com.campus.platform.dto.PdfAskDTO;
import com.campus.platform.entity.AiSession;
import com.campus.platform.entity.PdfDocument;
import com.campus.platform.mapper.AiMessageMapper;
import com.campus.platform.mapper.AiSessionMapper;
import com.campus.platform.mapper.PdfDocumentMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AI PDF 会话绑定")
class AiChatServiceTest {

    private static final Long USER_ID = 1001L;
    private static final Long SESSION_ID = 88L;
    private static final Long DOC_ID = 99L;

    @Mock
    private AiSessionMapper aiSessionMapper;
    @Mock
    private AiMessageMapper aiMessageMapper;
    @Mock
    private AiGatewayService aiGatewayService;
    @Mock
    private ChatMemoryService chatMemoryService;
    @Mock
    private WrongQuestionService wrongQuestionService;
    @Mock
    private PdfDocumentMapper pdfDocumentMapper;

    @InjectMocks
    private AiChatService service;

    @Test
    @DisplayName("已有 PDF 会话提问时应持久化最新文档ID")
    void pdfAsk_shouldPersistDocIdOnExistingSession() {
        AiSession session = session(Constants.SCENE_PDF);
        PdfDocument document = document(USER_ID);
        when(aiSessionMapper.selectById(SESSION_ID)).thenReturn(session);
        when(pdfDocumentMapper.selectById(DOC_ID)).thenReturn(document);
        when(aiGatewayService.chat(eq(USER_ID), eq(Constants.SCENE_PDF), eq("问题"),
                eq(SESSION_ID), anyMap())).thenReturn("答案");

        PdfAskDTO dto = request();
        String answer = service.pdfAsk(USER_ID, dto);

        verify(aiSessionMapper).updateById(session);
        verify(aiGatewayService).chat(eq(USER_ID), eq(Constants.SCENE_PDF), eq("问题"),
                eq(SESSION_ID), anyMap());
        org.assertj.core.api.Assertions.assertThat(answer).isEqualTo("答案");
    }

    @Test
    @DisplayName("普通聊天会话不能用于 PDF 问答")
    void pdfAsk_shouldRejectNonPdfSession() {
        AiSession session = session(Constants.SCENE_CHAT);
        when(aiSessionMapper.selectById(SESSION_ID)).thenReturn(session);
        when(pdfDocumentMapper.selectById(DOC_ID)).thenReturn(document(USER_ID));

        assertThatThrownBy(() -> service.pdfAsk(USER_ID, request()))
                .hasMessageContaining("PDF");
    }

    @Test
    @DisplayName("不属于当前用户的 PDF 文档不能用于问答")
    void pdfAsk_shouldRejectForeignDocument() {
        when(pdfDocumentMapper.selectById(DOC_ID)).thenReturn(document(2002L));

        assertThatThrownBy(() -> service.pdfAsk(USER_ID, request()))
                .hasMessageContaining("文档");
    }

    private PdfAskDTO request() {
        PdfAskDTO dto = new PdfAskDTO();
        dto.setDocId(DOC_ID);
        dto.setSessionId(SESSION_ID);
        dto.setQuestion("问题");
        return dto;
    }

    private AiSession session(String scene) {
        AiSession session = new AiSession();
        session.setId(SESSION_ID);
        session.setUserId(USER_ID);
        session.setScene(scene);
        return session;
    }

    private PdfDocument document(Long userId) {
        PdfDocument document = new PdfDocument();
        document.setId(DOC_ID);
        document.setUserId(userId);
        document.setTextContent("文档正文");
        document.setStatus(1);
        return document;
    }
}
