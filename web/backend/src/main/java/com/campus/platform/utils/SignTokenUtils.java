package com.campus.platform.utils;

import cn.hutool.crypto.digest.HMac;
import cn.hutool.crypto.digest.HmacAlgorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 活动签到二维码签名工具（架构设计 1.1 难点7）。
 * 二维码内容 = campus://signin/{activityId}/{token}，token = HMAC-SHA256(activityId, secret) 前16位。
 * 不生成图片，前端/小程序现场渲染（第10章假设5）。
 */
@Component
public class SignTokenUtils {

    @Value("${signin.secret}")
    private String secret;

    public static final String QR_PREFIX = "campus://signin/";

    /** 生成签到二维码内容 */
    public String generateQrContent(Long activityId) {
        return QR_PREFIX + activityId + "/" + sign(activityId);
    }

    /**
     * 校验签到 token。
     *
     * @param activityId 活动ID
     * @param token      二维码中解析出的 token
     */
    public boolean verify(Long activityId, String token) {
        if (activityId == null || token == null) {
            return false;
        }
        return sign(activityId).equals(token);
    }

    private String sign(Long activityId) {
        HMac hMac = new HMac(HmacAlgorithm.HmacSHA256, secret.getBytes());
        return hMac.digestHex(String.valueOf(activityId)).substring(0, 16);
    }
}
