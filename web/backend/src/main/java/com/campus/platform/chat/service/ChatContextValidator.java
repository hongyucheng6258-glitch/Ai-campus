package com.campus.platform.chat.service;

import cn.hutool.core.util.StrUtil;
import com.campus.platform.common.BizException;
import com.campus.platform.common.ResultCode;
import com.campus.platform.entity.Activity;
import com.campus.platform.entity.IdleItem;
import com.campus.platform.entity.LostFound;
import com.campus.platform.entity.Post;
import com.campus.platform.mapper.ActivityMapper;
import com.campus.platform.mapper.IdleItemMapper;
import com.campus.platform.mapper.LostFoundMapper;
import com.campus.platform.mapper.PostMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChatContextValidator {
    private final IdleItemMapper idleItemMapper;
    private final LostFoundMapper lostFoundMapper;
    private final ActivityMapper activityMapper;
    private final PostMapper postMapper;

    public String validate(Long ignoredRequesterId, Long targetUserId, String contextType, Long contextId) {
        if (StrUtil.isBlank(contextType) && contextId == null) return null;
        if (StrUtil.isBlank(contextType) || contextId == null) {
            throw new BizException(ResultCode.BAD_REQUEST, "业务上下文类型和ID必须同时提供");
        }
        return switch (contextType) {
            case "idle" -> {
                IdleItem value = idleItemMapper.selectById(contextId);
                requireTarget(value == null ? null : value.getUserId(), targetUserId);
                yield value.getTitle();
            }
            case "lostfound" -> {
                LostFound value = lostFoundMapper.selectById(contextId);
                requireTarget(value == null ? null : value.getUserId(), targetUserId);
                yield value.getTitle();
            }
            case "activity" -> {
                Activity value = activityMapper.selectById(contextId);
                requireTarget(value == null ? null : value.getUserId(), targetUserId);
                yield value.getTitle();
            }
            case "post" -> {
                Post value = postMapper.selectById(contextId);
                requireTarget(value == null ? null : value.getUserId(), targetUserId);
                yield StrUtil.sub(value.getContent(), 0, 128);
            }
            case "profile" -> {
                if (!targetUserId.equals(contextId)) {
                    throw new BizException(ResultCode.FORBIDDEN, "业务对象与目标用户不匹配");
                }
                yield null;
            }
            default -> throw new BizException(ResultCode.BAD_REQUEST, "不支持的业务上下文类型");
        };
    }

    private void requireTarget(Long ownerId, Long targetUserId) {
        if (ownerId == null) throw new BizException(ResultCode.NOT_FOUND, "业务对象不存在");
        if (!ownerId.equals(targetUserId)) {
            throw new BizException(ResultCode.FORBIDDEN, "业务对象与目标用户不匹配");
        }
    }
}
