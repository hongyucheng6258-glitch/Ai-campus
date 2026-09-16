package com.campus.platform.module.report.service;

import com.campus.platform.module.report.mapper.ReportMapper;
import com.campus.platform.module.report.dto.ReportDTO;
import com.campus.platform.module.report.entity.Report;

import com.campus.platform.common.BizException;
import com.campus.platform.common.Constants;
import com.campus.platform.common.ResultCode;
import com.campus.platform.module.activity.entity.Activity;
import com.campus.platform.module.idle.entity.IdleItem;
import com.campus.platform.module.lostfound.entity.LostFound;
import com.campus.platform.module.post.entity.Post;
import com.campus.platform.module.post.entity.PostComment;
import com.campus.platform.module.activity.mapper.ActivityMapper;
import com.campus.platform.module.idle.mapper.IdleItemMapper;
import com.campus.platform.module.lostfound.mapper.LostFoundMapper;
import com.campus.platform.module.post.mapper.PostCommentMapper;
import com.campus.platform.module.post.mapper.PostMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 举报服务（D3 学生发起侧）：校验举报目标存在后落库，等待管理端处置。
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportMapper reportMapper;
    private final IdleItemMapper idleItemMapper;
    private final ActivityMapper activityMapper;
    private final LostFoundMapper lostFoundMapper;
    private final PostMapper postMapper;
    private final PostCommentMapper postCommentMapper;

    /** 发起举报 */
    public Report submit(Long userId, ReportDTO dto) {
        checkTargetExists(dto.getTargetType(), dto.getTargetId());
        Report report = new Report();
        report.setReporterId(userId);
        report.setTargetType(dto.getTargetType());
        report.setTargetId(dto.getTargetId());
        report.setReasonType(dto.getReasonType());
        report.setReason(dto.getReason());
        report.setStatus(Constants.REPORT_PENDING);
        reportMapper.insert(report);
        return report;
    }

    /** 校验举报目标真实存在 */
    private void checkTargetExists(String targetType, Long targetId) {
        Object target = switch (targetType) {
            case Constants.BIZ_IDLE -> idleItemMapper.selectById(targetId);
            case Constants.BIZ_ACTIVITY -> activityMapper.selectById(targetId);
            case Constants.BIZ_LOSTFOUND -> lostFoundMapper.selectById(targetId);
            case Constants.BIZ_POST -> postMapper.selectById(targetId);
            case "comment" -> postCommentMapper.selectById(targetId);
            default -> null;
        };
        if (target == null) {
            throw new BizException(ResultCode.NOT_FOUND, "举报对象不存在");
        }
    }
}
