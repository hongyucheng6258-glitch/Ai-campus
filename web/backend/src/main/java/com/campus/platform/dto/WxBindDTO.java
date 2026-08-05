package com.campus.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 微信绑定已有学号账号请求。
 */
@Data
public class WxBindDTO {

    @NotBlank(message = "学号不能为空")
    private String studentNo;

    private String password;

    private String phone;
}
