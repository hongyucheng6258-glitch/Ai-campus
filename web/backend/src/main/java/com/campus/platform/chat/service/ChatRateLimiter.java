package com.campus.platform.chat.service;

import com.campus.platform.common.BizException;
import com.campus.platform.common.ResultCode;
import com.campus.platform.utils.RedisUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class ChatRateLimiter {
    private final RedisUtils redisUtils;

    public void checkSend(Long userId) {
        check("chat:rate:sec:" + userId, 5, 1, TimeUnit.SECONDS);
        check("chat:rate:min:" + userId, 100, 1, TimeUnit.MINUTES);
    }

    private void check(String key, long limit, long timeout, TimeUnit unit) {
        Long value = redisUtils.incr(key, timeout, unit);
        if (value == null) {
            throw new BizException(ResultCode.SYSTEM_ERROR, "发送限流服务暂不可用");
        }
        if (value > limit) {
            throw new BizException(ResultCode.FORBIDDEN, "发送过于频繁，请稍后再试");
        }
    }
}
