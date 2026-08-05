package com.campus.platform.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 智能习题生成请求（基于错题）。
 */
@Data
public class QuizDTO {

    @NotNull(message = "错题ID不能为空")
    private Long wrongQuestionId;
}
