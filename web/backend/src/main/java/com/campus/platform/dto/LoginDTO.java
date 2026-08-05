package com.campus.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 学生登录请求。
 */
@Data
public class LoginDTO {

    @NotBlank(message = "学号不能为空")
    private String studentNo;

    @NotBlank(message = "密码不能为空")
    private String password;
}
