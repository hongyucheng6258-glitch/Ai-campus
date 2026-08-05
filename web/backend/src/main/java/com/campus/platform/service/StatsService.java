package com.campus.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.campus.platform.common.Constants;
import com.campus.platform.entity.Activity;
import com.campus.platform.entity.AiCallLog;
import com.campus.platform.entity.IdleItem;
import com.campus.platform.entity.LostFound;
import com.campus.platform.entity.Post;
import com.campus.platform.entity.Report;
import com.campus.platform.entity.User;
import com.campus.platform.mapper.ActivityMapper;
import com.campus.platform.mapper.AiCallLogMapper;
import com.campus.platform.mapper.IdleItemMapper;
import com.campus.platform.mapper.LostFoundMapper;
import com.campus.platform.mapper.PostMapper;
import com.campus.platform.mapper.ReportMapper;
import com.campus.platform.mapper.UserMapper;
import com.campus.platform.vo.StatsOverviewVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 数据大屏统计服务（D7）。
 * "今日活跃"口径（共享约定 #11）：当日登录 + AI调用 + 发布行为任一并集去重。
 */
@Service
@RequiredArgsConstructor
public class StatsService {

    private final UserMapper userMapper;
    private final AiCallLogMapper aiCallLogMapper;
    private final IdleItemMapper idleItemMapper;
    private final ActivityMapper activityMapper;
    private final LostFoundMapper lostFoundMapper;
    private final PostMapper postMapper;
    private final ReportMapper reportMapper;

    /** 数字卡片：总用户/今日活跃/今日AI调用/待审核数 */
    public StatsOverviewVO overview() {
        StatsOverviewVO vo = new StatsOverviewVO();
        vo.setTotalUsers(userMapper.selectCount(null));

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        // 今日活跃：当日登录用户 并集 当日有AI调用的用户 并集 当日发布内容的用户
        java.util.Set<Long> active = new java.util.HashSet<>();
        userMapper.selectList(new LambdaQueryWrapper<User>()
                        .ge(User::getLastLoginTime, todayStart)
                        .select(User::getId))
                .forEach(u -> active.add(u.getId()));
        aiCallLogMapper.selectList(new LambdaQueryWrapper<AiCallLog>()
                        .ge(AiCallLog::getCreateTime, todayStart)
                        .select(AiCallLog::getUserId)
                        .groupBy(AiCallLog::getUserId))
                .forEach(l -> active.add(l.getUserId()));
        idleItemMapper.selectList(new LambdaQueryWrapper<IdleItem>()
                        .ge(IdleItem::getCreateTime, todayStart)
                        .select(IdleItem::getUserId)
                        .groupBy(IdleItem::getUserId))
                .forEach(i -> active.add(i.getUserId()));
        vo.setTodayActiveUsers((long) active.size());

        vo.setTodayAiCalls(aiCallLogMapper.selectCount(new LambdaQueryWrapper<AiCallLog>()
                .ge(AiCallLog::getCreateTime, todayStart)));

        long pending = idleItemMapper.selectCount(new LambdaQueryWrapper<IdleItem>()
                        .eq(IdleItem::getAuditStatus, Constants.AUDIT_PENDING))
                + activityMapper.selectCount(new LambdaQueryWrapper<Activity>()
                        .eq(Activity::getAuditStatus, Constants.AUDIT_PENDING))
                + lostFoundMapper.selectCount(new LambdaQueryWrapper<LostFound>()
                        .eq(LostFound::getAuditStatus, Constants.AUDIT_PENDING))
                + postMapper.selectCount(new LambdaQueryWrapper<Post>()
                        .eq(Post::getAuditStatus, Constants.AUDIT_PENDING));
        vo.setPendingAudits(pending);
        return vo;
    }

    /**
     * 近30天趋势：用户增长 + AI调用 双折线。
     * 返回 {dates:[], userGrowth:[], aiCalls:[]}
     */
    public Map<String, Object> trend() {
        List<String> dates = new ArrayList<>();
        List<Long> userGrowth = new ArrayList<>();
        List<Long> aiCalls = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = 29; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            dates.add(day.toString());
            LocalDateTime dayEnd = day.plusDays(1).atStartOfDay();
            // 用户累计增长（截至当日总数）
            userGrowth.add(userMapper.selectCount(new LambdaQueryWrapper<User>()
                    .lt(User::getCreateTime, dayEnd)));
            // 当日 AI 调用量
            aiCalls.add(aiCallLogMapper.selectCount(new LambdaQueryWrapper<AiCallLog>()
                    .ge(AiCallLog::getCreateTime, day.atStartOfDay())
                    .lt(AiCallLog::getCreateTime, dayEnd)));
        }
        Map<String, Object> result = new HashMap<>();
        result.put("dates", dates);
        result.put("userGrowth", userGrowth);
        result.put("aiCalls", aiCalls);
        return result;
    }

    /**
     * 各模块发布量柱状图。
     * 返回 [{name:'闲置',value:n}, ...]
     */
    public List<Map<String, Object>> moduleStats() {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(bar("闲置互换", idleItemMapper.selectCount(null)));
        list.add(bar("活动组队", activityMapper.selectCount(null)));
        list.add(bar("失物招领", lostFoundMapper.selectCount(null)));
        list.add(bar("动态广场", postMapper.selectCount(null)));
        list.add(bar("AI会话", aiCallLogMapper.selectCount(null)));
        return list;
    }

    /**
     * 饼图数据：失物状态分布 + 举报类型分布。
     * 返回 {lostStatus:[{name,value}], reportTypes:[{name,value}]}
     */
    public Map<String, Object> pieStats() {
        Map<String, Object> result = new HashMap<>();
        // 失物：进行中/已完成/已下架
        List<Map<String, Object>> lostStatus = new ArrayList<>();
        lostStatus.add(pie("进行中", lostFoundMapper.selectCount(
                new LambdaQueryWrapper<LostFound>().eq(LostFound::getStatus, Constants.LF_DOING))));
        lostStatus.add(pie("已完成", lostFoundMapper.selectCount(
                new LambdaQueryWrapper<LostFound>().eq(LostFound::getStatus, Constants.LF_DONE))));
        lostStatus.add(pie("已下架", lostFoundMapper.selectCount(
                new LambdaQueryWrapper<LostFound>().eq(LostFound::getStatus, Constants.LF_OFF))));
        result.put("lostStatus", lostStatus);
        // 举报类型分布
        List<Report> reports = reportMapper.selectList(
                new LambdaQueryWrapper<Report>().select(Report::getReasonType));
        Map<String, Long> typeCount = new HashMap<>();
        reports.forEach(r -> typeCount.merge(r.getReasonType(), 1L, Long::sum));
        List<Map<String, Object>> reportTypes = new ArrayList<>();
        typeCount.forEach((k, v) -> reportTypes.add(pie(k, v)));
        result.put("reportTypes", reportTypes);
        return result;
    }

    private Map<String, Object> bar(String name, Long value) {
        Map<String, Object> m = new HashMap<>();
        m.put("name", name);
        m.put("value", value);
        return m;
    }

    private Map<String, Object> pie(String name, Long value) {
        return bar(name, value);
    }
}
