package com.campus.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 微信登录请求（携带 wx.login 的 code）。
 */
@Data
public class WxLoginDTO {

    @NotBlank(message = "code不能为空")
    private String code;
}
