package com.campus.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 复习提纲生成请求。
 */
@Data
public class OutlineDTO {

    @NotBlank(message = "学科不能为空")
    private String subject;

    private String chapter;

    @NotBlank(message = "主题不能为空")
    private String topic;
}
