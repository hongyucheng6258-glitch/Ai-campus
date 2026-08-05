package com.campus.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.platform.common.BizException;
import com.campus.platform.common.Constants;
import com.campus.platform.common.PageResult;
import com.campus.platform.common.ResultCode;
import com.campus.platform.dto.ReportHandleDTO;
import com.campus.platform.entity.Activity;
import com.campus.platform.entity.IdleItem;
import com.campus.platform.entity.LostFound;
import com.campus.platform.entity.Post;
import com.campus.platform.entity.PostComment;
import com.campus.platform.entity.Report;
import com.campus.platform.entity.User;
import com.campus.platform.mapper.ActivityMapper;
import com.campus.platform.mapper.IdleItemMapper;
import com.campus.platform.mapper.LostFoundMapper;
import com.campus.platform.mapper.PostCommentMapper;
import com.campus.platform.mapper.PostMapper;
import com.campus.platform.mapper.ReportMapper;
import com.campus.platform.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 管理端-举报处置闭环（D3）：处置（下架/警告/封禁）→ 通知举报人。
 */
@Service
@RequiredArgsConstructor
public class ReportAdminService {

    private final ReportMapper reportMapper;
    private final IdleItemMapper idleItemMapper;
    private final ActivityMapper activityMapper;
    private final LostFoundMapper lostFoundMapper;
    private final PostMapper postMapper;
    private final PostCommentMapper postCommentMapper;
    private final UserMapper userMapper;
    private final MessageService messageService;

    /** 举报列表（状态筛选） */
    public PageResult<Report> list(Integer status, int pageNum, int pageSize) {
        Page<Report> page = reportMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Report>()
                        .eq(status != null, Report::getStatus, status)
                        .orderByDesc(Report::getId));
        return PageResult.of(page);
    }

    /**
     * 处置举报。
     * action: offline=下架内容 / warn=警告发布者 / ban=封禁发布者 / ignore=举报不成立
     */
    @Transactional
    public void handle(Long adminId, Long reportId, ReportHandleDTO dto) {
        Report report = reportMapper.selectById(reportId);
        if (report == null) {
            throw new BizException(ResultCode.NOT_FOUND, "举报不存在");
        }
        if (report.getStatus() == Constants.REPORT_HANDLED) {
            throw new BizException(ResultCode.DUPLICATE_OPERATION, "该举报已处理");
        }
        switch (dto.getAction()) {
            case "offline" -> offlineTarget(report.getTargetType(), report.getTargetId());
            case "warn" -> { /* 仅记录处置说明并通知，下方统一发消息 */ }
            case "ban" -> banAuthor(report.getTargetType(), report.getTargetId());
            case "ignore" -> { /* 举报不成立，仅关闭 */ }
            default -> throw new BizException(ResultCode.BAD_REQUEST, "不支持的处置动作");
        }
        report.setStatus(Constants.REPORT_HANDLED);
        report.setHandleResult(dto.getHandleResult());
        report.setHandlerId(adminId);
        report.setHandleTime(LocalDateTime.now());
        reportMapper.updateById(report);
        // 通知举报人处置结果
        messageService.send(report.getReporterId(), Constants.MSG_AUDIT,
                "举报处理结果",
                "你举报的内容已处理完毕：" + dto.getHandleResult(),
                "report", reportId);
    }

    /** 按类型下架目标内容 */
    private void offlineTarget(String type, Long targetId) {
        switch (type) {
            case Constants.BIZ_IDLE -> {
                IdleItem item = idleItemMapper.selectById(targetId);
                if (item != null) {
                    item.setStatus(Constants.IDLE_OFF_SHELF);
                    idleItemMapper.updateById(item);
                }
            }
            case Constants.BIZ_ACTIVITY -> {
                Activity activity = activityMapper.selectById(targetId);
                if (activity != null) {
                    activity.setStatus(Constants.ACTIVITY_OFF);
                    activityMapper.updateById(activity);
                }
            }
            case Constants.BIZ_LOSTFOUND -> {
                LostFound lf = lostFoundMapper.selectById(targetId);
                if (lf != null) {
                    lf.setStatus(Constants.LF_OFF);
                    lostFoundMapper.updateById(lf);
                }
            }
            case Constants.BIZ_POST -> {
                Post post = postMapper.selectById(targetId);
                if (post != null) {
                    post.setAuditStatus(Constants.AUDIT_REJECT);
                    post.setAuditReason("举报处置下架");
                    postMapper.updateById(post);
                }
            }
            case "comment" -> {
                PostComment comment = postCommentMapper.selectById(targetId);
                if (comment != null) {
                    comment.setStatus(Constants.COMMENT_HIDDEN);
                    postCommentMapper.updateById(comment);
                }
            }
            default -> throw new BizException(ResultCode.BAD_REQUEST, "不支持的举报类型");
        }
    }

    /** 封禁目标内容的发布者 */
    private void banAuthor(String type, Long targetId) {
        Long authorId = switch (type) {
            case Constants.BIZ_IDLE -> {
                IdleItem item = idleItemMapper.selectById(targetId);
                yield item == null ? null : item.getUserId();
            }
            case Constants.BIZ_ACTIVITY -> {
                Activity activity = activityMapper.selectById(targetId);
                yield activity == null ? null : activity.getUserId();
            }
            case Constants.BIZ_LOSTFOUND -> {
                LostFound lf = lostFoundMapper.selectById(targetId);
                yield lf == null ? null : lf.getUserId();
            }
            case Constants.BIZ_POST -> {
                Post post = postMapper.selectById(targetId);
                yield post == null ? null : post.getUserId();
            }
            case "comment" -> {
                PostComment comment = postCommentMapper.selectById(targetId);
                yield comment == null ? null : comment.getUserId();
            }
            default -> null;
        };
        if (authorId != null) {
            User user = userMapper.selectById(authorId);
            if (user != null) {
                user.setStatus(Constants.USER_STATUS_BANNED);
                userMapper.updateById(user);
                messageService.send(authorId, Constants.MSG_SYSTEM, "账号处罚通知",
                        "因发布违规内容被举报核实，你的账号已被封禁，如有异议请联系管理员。",
                        null, null);
            }
        }
    }
}
