package com.campus.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.platform.common.BizException;
import com.campus.platform.common.Constants;
import com.campus.platform.common.PageResult;
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
import org.springframework.stereotype.Service;

/**
 * 通用审核服务（D2，架构设计 1.1 难点3）：
 * 四类 UGC（idle/activity/lostfound/post）统一 audit_status 状态机；
 * 通过/驳回后消息通知作者。
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final IdleItemMapper idleItemMapper;
    private final ActivityMapper activityMapper;
    private final LostFoundMapper lostFoundMapper;
    private final PostMapper postMapper;
    private final MessageService messageService;

    /** 待审队列（按类型分页） */
    public PageResult<?> pendingList(String type, int pageNum, int pageSize) {
        return switch (type) {
            case Constants.BIZ_IDLE -> PageResult.of(idleItemMapper.selectPage(
                    new Page<>(pageNum, pageSize),
                    new LambdaQueryWrapper<IdleItem>()
                            .eq(IdleItem::getAuditStatus, Constants.AUDIT_PENDING)
                            .orderByAsc(IdleItem::getId)));
            case Constants.BIZ_ACTIVITY -> PageResult.of(activityMapper.selectPage(
                    new Page<>(pageNum, pageSize),
                    new LambdaQueryWrapper<Activity>()
                            .eq(Activity::getAuditStatus, Constants.AUDIT_PENDING)
                            .orderByAsc(Activity::getId)));
            case Constants.BIZ_LOSTFOUND -> PageResult.of(lostFoundMapper.selectPage(
                    new Page<>(pageNum, pageSize),
                    new LambdaQueryWrapper<LostFound>()
                            .eq(LostFound::getAuditStatus, Constants.AUDIT_PENDING)
                            .orderByAsc(LostFound::getId)));
            case Constants.BIZ_POST -> PageResult.of(postMapper.selectPage(
                    new Page<>(pageNum, pageSize),
                    new LambdaQueryWrapper<Post>()
                            .eq(Post::getAuditStatus, Constants.AUDIT_PENDING)
                            .orderByAsc(Post::getId)));
            default -> throw new BizException(ResultCode.BAD_REQUEST, "不支持的审核类型: " + type);
        };
    }

    /** 审核通过 → 通知作者 */
    public void pass(String type, Long id) {
        AuditedTarget target = doAudit(type, id, Constants.AUDIT_PASS, null);
        notifyAuthor(target, true, null);
    }

    /** 审核驳回（必填理由）→ 通知作者 */
    public void reject(String type, Long id, String reason) {
        AuditedTarget target = doAudit(type, id, Constants.AUDIT_REJECT, reason);
        notifyAuthor(target, false, reason);
    }

    /** 各类型统一更新审核状态，返回（作者ID, 内容标题） */
    private AuditedTarget doAudit(String type, Long id, int auditStatus, String reason) {
        switch (type) {
            case Constants.BIZ_IDLE -> {
                IdleItem item = idleItemMapper.selectById(id);
                if (item == null) {
                    throw new BizException(ResultCode.NOT_FOUND, "内容不存在");
                }
                item.setAuditStatus(auditStatus);
                item.setAuditReason(reason);
                idleItemMapper.updateById(item);
                return new AuditedTarget(item.getUserId(), "闲置「" + item.getTitle() + "」");
            }
            case Constants.BIZ_ACTIVITY -> {
                Activity activity = activityMapper.selectById(id);
                if (activity == null) {
                    throw new BizException(ResultCode.NOT_FOUND, "内容不存在");
                }
                activity.setAuditStatus(auditStatus);
                activity.setAuditReason(reason);
                activityMapper.updateById(activity);
                return new AuditedTarget(activity.getUserId(), "活动「" + activity.getTitle() + "」");
            }
            case Constants.BIZ_LOSTFOUND -> {
                LostFound lf = lostFoundMapper.selectById(id);
                if (lf == null) {
                    throw new BizException(ResultCode.NOT_FOUND, "内容不存在");
                }
                lf.setAuditStatus(auditStatus);
                lf.setAuditReason(reason);
                lostFoundMapper.updateById(lf);
                return new AuditedTarget(lf.getUserId(), "失物招领「" + lf.getTitle() + "」");
            }
            case Constants.BIZ_POST -> {
                Post post = postMapper.selectById(id);
                if (post == null) {
                    throw new BizException(ResultCode.NOT_FOUND, "内容不存在");
                }
                post.setAuditStatus(auditStatus);
                post.setAuditReason(reason);
                postMapper.updateById(post);
                String preview = post.getContent().length() > 20
                        ? post.getContent().substring(0, 20) + "..." : post.getContent();
                return new AuditedTarget(post.getUserId(), "动态「" + preview + "」");
            }
            default -> throw new BizException(ResultCode.BAD_REQUEST, "不支持的审核类型: " + type);
        }
    }

    private void notifyAuthor(AuditedTarget target, boolean passed, String reason) {
        messageService.send(target.authorId(), Constants.MSG_AUDIT,
                passed ? "审核通过" : "审核未通过",
                passed ? "你发布的" + target.title() + "已通过审核，现已公开展示。"
                        : "你发布的" + target.title() + "未通过审核，原因：" + reason,
                Constants.MSG_AUDIT, null);
    }

    private record AuditedTarget(Long authorId, String title) {
    }
}
