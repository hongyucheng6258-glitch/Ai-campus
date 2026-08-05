package com.campus.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * AI 对话请求。
 */
@Data
public class AiChatDTO {

    private Long sessionId;

    @NotBlank(message = "问题不能为空")
    private String question;
}
