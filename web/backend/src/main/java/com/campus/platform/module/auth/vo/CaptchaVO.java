package com.campus.platform.module.auth.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 图形验证码响应：captchaId 用于登录时回传，image 为 base64 PNG 图片。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CaptchaVO {

    /** 验证码唯一标识（Redis key 后缀），登录时原样回传 */
    private String captchaId;

    /** 验证码图片，data:image/png;base64, 前缀 */
    private String image;
}
