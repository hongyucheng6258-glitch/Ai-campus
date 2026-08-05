package com.campus.platform.controller;

import com.campus.platform.common.PageResult;
import com.campus.platform.common.R;
import com.campus.platform.common.UserContext;
import com.campus.platform.dto.AiChatDTO;
import com.campus.platform.dto.CodeFixDTO;
import com.campus.platform.dto.OutlineDTO;
import com.campus.platform.dto.PdfAskDTO;
import com.campus.platform.dto.QuizDTO;
import com.campus.platform.dto.SessionCreateDTO;
import com.campus.platform.entity.AiMessage;
import com.campus.platform.entity.AiSession;
import com.campus.platform.service.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {
    private final AiChatService aiChatService;

    @PostMapping("/session")
    public R<AiSession> createSession(@Valid @RequestBody SessionCreateDTO dto) {
        return R.ok(aiChatService.createSession(UserContext.getUid(), dto));
    }

    @GetMapping("/sessions")
    public R<List<AiSession>> listSessions(@RequestParam(required = false) String scene) {
        return R.ok(aiChatService.listSessions(UserContext.getUid(), scene));
    }

    @PutMapping("/session/{id}")
    public R<Void> renameSession(@PathVariable Long id, @RequestBody Map<String, String> body) {
        aiChatService.renameSession(UserContext.getUid(), id, body.get("title"));
        return R.ok();
    }

    @DeleteMapping("/session/{id}")
    public R<Void> deleteSession(@PathVariable Long id) {
        aiChatService.deleteSession(UserContext.getUid(), id);
        return R.ok();
    }

    @PutMapping("/session/{id}/pdf")
    public R<AiSession> bindPdfDocument(@PathVariable Long id, @RequestBody(required = false) Map<String, Long> body) {
        Long docId = body == null ? null : body.get("docId");
        return R.ok(aiChatService.bindPdfDocument(UserContext.getUid(), id, docId));
    }

    @GetMapping("/session/{id}/messages")
    public R<PageResult<AiMessage>> listMessages(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "20") Integer pageSize) {
        return R.ok(aiChatService.listMessages(UserContext.getUid(), id, pageNum, pageSize));
    }

    @PostMapping("/chat/stream")
    public SseEmitter askStream(@Valid @RequestBody AiChatDTO dto) {
        return aiChatService.askStream(UserContext.getUid(), dto);
    }

    @PostMapping("/chat/sync")
    public R<String> askSync(@Valid @RequestBody AiChatDTO dto) {
        return R.ok(aiChatService.askSync(UserContext.getUid(), dto));
    }

    @PostMapping("/pdf/ask")
    public R<String> pdfAsk(@Valid @RequestBody PdfAskDTO dto) {
        return R.ok(aiChatService.pdfAsk(UserContext.getUid(), dto));
    }

    @PostMapping("/pdf/ask/stream")
    public SseEmitter pdfAskStream(@Valid @RequestBody PdfAskDTO dto) {
        return aiChatService.pdfAskStream(UserContext.getUid(), dto);
    }

    @PostMapping("/code-fix")
    public R<String> codeFix(@Valid @RequestBody CodeFixDTO dto) {
        return R.ok(aiChatService.codeFix(UserContext.getUid(), dto));
    }

    @PostMapping("/outline")
    public R<String> outline(@Valid @RequestBody OutlineDTO dto) {
        return R.ok(aiChatService.outline(UserContext.getUid(), dto));
    }

    @PostMapping("/quiz")
    public R<String> quiz(@Valid @RequestBody QuizDTO dto) {
        return R.ok(aiChatService.quiz(UserContext.getUid(), dto));
    }
}
