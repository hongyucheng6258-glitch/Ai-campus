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
import com.campus.platform.entity.Notice;
import com.campus.platform.mapper.ActivityMapper;
import com.campus.platform.mapper.IdleItemMapper;
import com.campus.platform.mapper.LostFoundMapper;
import com.campus.platform.mapper.NoticeMapper;
import com.campus.platform.vo.HomeAggregateVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 公告与首页聚合服务（C5）。
 */
@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeMapper noticeMapper;
    private final IdleItemMapper idleItemMapper;
    private final ActivityMapper activityMapper;
    private final LostFoundMapper lostFoundMapper;

    /** 公告列表（公开，仅已发布） */
    public PageResult<Notice> list(int pageNum, int pageSize) {
        Page<Notice> page = noticeMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Notice>()
                        .eq(Notice::getStatus, Constants.NOTICE_PUBLISHED)
                        .orderByDesc(Notice::getPublishTime));
        return PageResult.of(page);
    }

    /** 公告详情（公开，仅已发布） */
    public Notice detail(Long id) {
        Notice notice = noticeMapper.selectById(id);
        if (notice == null || notice.getStatus() != Constants.NOTICE_PUBLISHED) {
            throw new BizException(ResultCode.NOT_FOUND, "公告不存在或未发布");
        }
        return notice;
    }

    /** 首页聚合（公告轮播 + 各模块最新3条） */
    public HomeAggregateVO homeAggregate() {
        HomeAggregateVO vo = new HomeAggregateVO();
        vo.setNotices(noticeMapper.selectList(new LambdaQueryWrapper<Notice>()
                .eq(Notice::getStatus, Constants.NOTICE_PUBLISHED)
                .orderByDesc(Notice::getPublishTime)
                .last("LIMIT 5")));
        vo.setIdleItems(idleItemMapper.selectList(new LambdaQueryWrapper<IdleItem>()
                .eq(IdleItem::getAuditStatus, Constants.AUDIT_PASS)
                .eq(IdleItem::getStatus, Constants.IDLE_ON_SHELF)
                .orderByDesc(IdleItem::getId)
                .last("LIMIT 3")));
        vo.setActivities(activityMapper.selectList(new LambdaQueryWrapper<Activity>()
                .eq(Activity::getAuditStatus, Constants.AUDIT_PASS)
                .eq(Activity::getStatus, Constants.ACTIVITY_SIGNING)
                // 已结束的活动不再计入首页推荐
                .and(w -> w.isNull(Activity::getEndTime).or().gt(Activity::getEndTime, java.time.LocalDateTime.now()))
                .orderByDesc(Activity::getId)
                .last("LIMIT 3")));
        vo.setLostFounds(lostFoundMapper.selectList(new LambdaQueryWrapper<LostFound>()
                .eq(LostFound::getAuditStatus, Constants.AUDIT_PASS)
                .eq(LostFound::getStatus, Constants.LF_DOING)
                .orderByDesc(LostFound::getId)
                .last("LIMIT 3")));
        return vo;
    }
}
