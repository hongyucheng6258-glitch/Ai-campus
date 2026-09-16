package com.campus.platform.module.auth.service;

import cn.hutool.captcha.CaptchaUtil;
import cn.hutool.captcha.LineCaptcha;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.campus.platform.common.BizException;
import com.campus.platform.common.ResultCode;
import com.campus.platform.module.auth.vo.CaptchaVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * 图形验证码服务：Hutool 生成字符验证码，Redis 存储（一次性使用、TTL 过期）。
 * 校验在 Controller 层调用，Service 层登录逻辑不感知验证码，避免影响既有单元测试。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CaptchaService {

    private static final String KEY_PREFIX = "captcha:";
    /** 去除易混淆字符 0/O、1/l/I */
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final int CODE_LENGTH = 4;

    private final StringRedisTemplate redisTemplate;

    @Value("${platform.captcha.expire-seconds:300}")
    private long expireSeconds;

    /** 验证码开关：false 时跳过校验（便于自动化测试/本地联调） */
    @Value("${platform.captcha.enabled:true}")
    private boolean enabled;

    /**
     * 生成验证码：返回 captchaId + base64 图片，答案写入 Redis（TTL 过期）。
     */
    public CaptchaVO generate() {
        LineCaptcha captcha = CaptchaUtil.createLineCaptcha(150, 50, CODE_LENGTH, 40);
        // 替换随机字符为去混淆字符集（Hutool 默认字符集含 0/O/1/l/I）
        captcha.setGenerator(new cn.hutool.captcha.generator.RandomGenerator(CHARS, CODE_LENGTH));
        captcha.createCode();
        String captchaId = IdUtil.fastSimpleUUID();
        redisTemplate.opsForValue().set(KEY_PREFIX + captchaId, captcha.getCode(), Duration.ofSeconds(expireSeconds));
        return new CaptchaVO(captchaId, "data:image/png;base64," + captcha.getImageBase64());
    }

    /**
     * 校验并消费验证码：无论成败立即删除（一次性，防重放）。
     * 校验失败抛出 BizException(400, "验证码错误或已过期")。
     */
    public void validateAndConsume(String captchaId, String code) {
        if (!enabled) {
            return;
        }
        if (StrUtil.isBlank(captchaId) || StrUtil.isBlank(code)) {
            throw new BizException(ResultCode.BAD_REQUEST, "验证码不能为空");
        }
        String key = KEY_PREFIX + captchaId;
        String saved = redisTemplate.opsForValue().get(key);
        redisTemplate.delete(key);
        if (saved == null || !saved.equalsIgnoreCase(code.trim())) {
            throw new BizException(ResultCode.BAD_REQUEST, "验证码错误或已过期");
        }
    }
}
