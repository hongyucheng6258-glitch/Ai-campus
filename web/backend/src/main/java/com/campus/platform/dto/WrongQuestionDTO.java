package com.campus.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 错题录入请求。
 */
@Data
public class WrongQuestionDTO {

    @NotBlank(message = "学科不能为空")
    private String subject;

    private String tag;

    @NotBlank(message = "题目不能为空")
    private String question;

    private String answer;

    private String analysis;
}
