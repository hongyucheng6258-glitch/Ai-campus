package com.campus.platform.service;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.platform.common.BizException;
import com.campus.platform.common.Constants;
import com.campus.platform.common.PageResult;
import com.campus.platform.common.ResultCode;
import com.campus.platform.dto.ActivityPublishDTO;
import com.campus.platform.dto.SigninDTO;
import com.campus.platform.dto.SignupDTO;
import com.campus.platform.entity.Activity;
import com.campus.platform.entity.ActivityMember;
import com.campus.platform.entity.ActivitySignin;
import com.campus.platform.entity.User;
import com.campus.platform.aigateway.SensitiveWordService;
import com.campus.platform.mapper.ActivityMapper;
import com.campus.platform.mapper.ActivityMemberMapper;
import com.campus.platform.mapper.ActivitySigninMapper;
import com.campus.platform.mapper.UserMapper;
import com.campus.platform.utils.SignTokenUtils;
import com.campus.platform.vo.ActivityDetailVO;
import com.campus.platform.vo.ActivityVO;
import com.campus.platform.vo.MemberVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 活动组队服务（C2/C3）：发布→报名审批→扫码签到。
 */
@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityMapper activityMapper;
    private final ActivityMemberMapper memberMapper;
    private final ActivitySigninMapper signinMapper;
    private final UserMapper userMapper;
    private final MessageService messageService;
    private final SignTokenUtils signTokenUtils;
    private final SensitiveWordService sensitiveWordService;
    private final ContentAiAuditService contentAiAuditService;

    /** 发布活动（待审核） */
    public Activity publish(Long userId, ActivityPublishDTO dto) {
        if (sensitiveWordService.contains(dto.getTitle()) || sensitiveWordService.contains(dto.getDescription())) {
            throw new BizException(ResultCode.SENSITIVE_WORD);
        }
        if (dto.getStartTime() != null && dto.getEndTime() != null
                && dto.getEndTime().isBefore(dto.getStartTime())) {
            throw new BizException(ResultCode.BAD_REQUEST, "结束时间不能早于开始时间");
        }
        if (dto.getSignupDeadline() != null && dto.getStartTime() != null
                && dto.getSignupDeadline().isAfter(dto.getStartTime())) {
            throw new BizException(ResultCode.BAD_REQUEST, "报名截止时间不能晚于活动开始时间");
        }
        if (dto.getSignupDeadline() != null && dto.getEndTime() != null
                && dto.getSignupDeadline().isAfter(dto.getEndTime())) {
            throw new BizException(ResultCode.BAD_REQUEST, "报名截止时间不能晚于活动结束时间");
        }
        Activity activity = new Activity();
        BeanUtil.copyProperties(dto, activity);
        activity.setUserId(userId);
        activity.setImages(IdleService.toJson(dto.getImages()));
        activity.setAuditStatus(Constants.AUDIT_PENDING);
        activity.setStatus(Constants.ACTIVITY_SIGNING);
        activityMapper.insert(activity);
        contentAiAuditService.audit(Constants.BIZ_ACTIVITY, activity, userId, dto.getTitle(), dto.getDescription());
        return activity;
    }

    /** 列表检索（公开，仅审核通过；已结束的活动不展示） */
    public PageResult<ActivityVO> list(String keyword, String category, int pageNum, int pageSize) {
        LocalDateTime now = LocalDateTime.now();
        Page<Activity> page = activityMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Activity>()
                        .eq(Activity::getAuditStatus, Constants.AUDIT_PASS)
                        .and(w -> w.eq(Activity::getStatus, Constants.ACTIVITY_SIGNING)
                                .or().eq(Activity::getStatus, Constants.ACTIVITY_FULL))
                        // 时间已结束的活动不再展示（endTime 为空视为长期活动）
                        .and(w -> w.isNull(Activity::getEndTime)
                                .or().gt(Activity::getEndTime, now))
                        .and(StrUtil.isNotBlank(keyword), w -> w
                                .like(Activity::getTitle, keyword)
                                .or().like(Activity::getDescription, keyword))
                        .eq(StrUtil.isNotBlank(category), Activity::getCategory, category)
                        .orderByDesc(Activity::getId));
        return PageResult.of(page, this::toVO);
    }

    /** 详情（含报名数、我的报名状态） */
    public ActivityDetailVO detail(Long id, Long currentUid) {
        Activity activity = activityMapper.selectById(id);
        if (activity == null) {
            throw new BizException(ResultCode.NOT_FOUND, "活动不存在");
        }
        boolean isOwner = currentUid != null && currentUid.equals(activity.getUserId());
        if (activity.getAuditStatus() != Constants.AUDIT_PASS && !isOwner) {
            throw new BizException(ResultCode.AUDIT_PENDING);
        }
        ActivityDetailVO vo = new ActivityDetailVO();
        BeanUtil.copyProperties(toVO(activity), vo);
        vo.setIsOwner(isOwner);
        if (currentUid != null && !isOwner) {
            ActivityMember my = memberMapper.selectOne(new LambdaQueryWrapper<ActivityMember>()
                    .eq(ActivityMember::getActivityId, id)
                    .eq(ActivityMember::getUserId, currentUid)
                    .last("LIMIT 1"));
            vo.setMySignupStatus(my == null ? null : my.getStatus());
            vo.setSignedIn(signinMapper.selectCount(new LambdaQueryWrapper<ActivitySignin>()
                    .eq(ActivitySignin::getActivityId, id)
                    .eq(ActivitySignin::getUserId, currentUid)) > 0);
        } else {
            vo.setSignedIn(false);
        }
        return vo;
    }

    /**
     * 报名（审批制，联合唯一索引防重复报名）。
     * 时间/人数/下架等校验统一走 checkSignAllowed（最终安全边界）。
     */
    public void signup(Long userId, Long activityId, SignupDTO dto) {
        Activity activity = checkSignAllowed(activityId);
        if (activity.getUserId().equals(userId)) {
            throw new BizException(ResultCode.BAD_REQUEST, "不能报名自己发布的活动");
        }
        Long exist = memberMapper.selectCount(new LambdaQueryWrapper<ActivityMember>()
                .eq(ActivityMember::getActivityId, activityId)
                .eq(ActivityMember::getUserId, userId));
        if (exist > 0) {
            throw new BizException(ResultCode.DUPLICATE_OPERATION, "你已报名该活动，请等待审批");
        }
        ActivityMember member = new ActivityMember();
        member.setActivityId(activityId);
        member.setUserId(userId);
        member.setRemark(dto.getRemark());
        member.setStatus(Constants.MEMBER_PENDING);
        try {
            memberMapper.insert(member);
        } catch (org.springframework.dao.DuplicateKeyException e) {
            // 并发下唯一索引兜底：重复报名转友好提示
            throw new BizException(ResultCode.DUPLICATE_OPERATION, "你已报名该活动，请等待审批");
        }

        User applicant = userMapper.selectById(userId);
        messageService.send(activity.getUserId(), Constants.MSG_INTERACT,
                "活动有新报名",
                String.format("「%s」报名了你的活动「%s」，请审批。",
                        applicant == null ? "有用户" : applicant.getNickname(), activity.getTitle()),
                Constants.BIZ_ACTIVITY, activityId);
    }

    /** 报名名单（仅发布者可见，含签到状态） */
    public List<MemberVO> members(Long userId, Long activityId) {
        checkPublisher(userId, activityId);
        List<ActivityMember> members = memberMapper.selectList(new LambdaQueryWrapper<ActivityMember>()
                .eq(ActivityMember::getActivityId, activityId)
                .orderByAsc(ActivityMember::getId));
        if (members.isEmpty()) {
            return List.of();
        }
        Map<Long, User> userMap = userMapper.selectBatchIds(
                        members.stream().map(ActivityMember::getUserId).toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<Long, Boolean> signedMap = signinMapper.selectList(new LambdaQueryWrapper<ActivitySignin>()
                        .eq(ActivitySignin::getActivityId, activityId))
                .stream().collect(Collectors.toMap(ActivitySignin::getUserId, s -> true));
        return members.stream().map(m -> {
            MemberVO vo = new MemberVO();
            BeanUtil.copyProperties(m, vo);
            User u = userMap.get(m.getUserId());
            vo.setNickname(u == null ? "" : u.getNickname());
            vo.setAvatar(u == null ? null : u.getAvatar());
            vo.setStudentNo(u == null ? null : u.getStudentNo());
            vo.setSignedIn(signedMap.getOrDefault(m.getUserId(), false));
            return vo;
        }).toList();
    }

    /**
     * 审批报名（通过/拒绝）→ 消息通知；满员自动更新活动状态。
     */
    @Transactional
    public void handleMember(Long userId, Long memberId, boolean approve) {
        ActivityMember member = memberMapper.selectById(memberId);
        if (member == null) {
            throw new BizException(ResultCode.NOT_FOUND, "报名记录不存在");
        }
        Activity activity = checkPublisher(userId, member.getActivityId());
        if (member.getStatus() != Constants.MEMBER_PENDING) {
            throw new BizException(ResultCode.DUPLICATE_OPERATION, "该报名已审批");
        }
        // 活动已结束/已下架时不允许再审批（防止与定时状态清理竞争时误放行）
        if (activity.getStatus() == Constants.ACTIVITY_OFF) {
            throw new BizException(ResultCode.BAD_REQUEST, "活动已下架，无法审批");
        }
        if (activity.getEndTime() != null && !LocalDateTime.now().isBefore(activity.getEndTime())) {
            throw new BizException(ResultCode.BAD_REQUEST, "活动已结束，无法审批");
        }
        // 人数上限校验
        if (approve && activity.getMaxMembers() != null && activity.getMaxMembers() > 0) {
            Long approved = memberMapper.selectCount(new LambdaQueryWrapper<ActivityMember>()
                    .eq(ActivityMember::getActivityId, activity.getId())
                    .eq(ActivityMember::getStatus, Constants.MEMBER_APPROVED));
            if (approved >= activity.getMaxMembers()) {
                activity.setStatus(Constants.ACTIVITY_FULL);
                activityMapper.updateById(activity);
                throw new BizException(ResultCode.BAD_REQUEST, "活动人数已满");
            }
        }
        member.setStatus(approve ? Constants.MEMBER_APPROVED : Constants.MEMBER_REJECTED);
        memberMapper.updateById(member);
        // 满员自动变更状态
        if (approve && activity.getMaxMembers() != null && activity.getMaxMembers() > 0) {
            Long approved = memberMapper.selectCount(new LambdaQueryWrapper<ActivityMember>()
                    .eq(ActivityMember::getActivityId, activity.getId())
                    .eq(ActivityMember::getStatus, Constants.MEMBER_APPROVED));
            if (approved >= activity.getMaxMembers()) {
                activity.setStatus(Constants.ACTIVITY_FULL);
                activityMapper.updateById(activity);
            }
        }
        messageService.send(member.getUserId(), Constants.MSG_AUDIT,
                approve ? "报名已通过" : "报名未通过",
                String.format("你对活动「%s」的报名%s。",
                        activity.getTitle(), approve ? "已通过，记得准时参加并扫码签到" : "未通过"),
                Constants.BIZ_ACTIVITY, activity.getId());
    }

    /** 发布者获取签到二维码内容（campus://signin/{id}/{token}） */
    public String signinQrCode(Long userId, Long activityId) {
        checkPublisher(userId, activityId);
        return signTokenUtils.generateQrContent(activityId);
    }

    /**
     * 扫码签到：token 校验 + 必须为已通过报名的成员 + 防重复签到。
     */
    @Transactional
    public void signin(Long userId, SigninDTO dto) {
        if (!signTokenUtils.verify(dto.getActivityId(), dto.getToken())) {
            throw new BizException(ResultCode.BAD_REQUEST, "签到二维码无效");
        }
        Activity activity = activityMapper.selectById(dto.getActivityId());
        if (activity == null) {
            throw new BizException(ResultCode.NOT_FOUND, "活动不存在");
        }
        ActivityMember member = memberMapper.selectOne(new LambdaQueryWrapper<ActivityMember>()
                .eq(ActivityMember::getActivityId, dto.getActivityId())
                .eq(ActivityMember::getUserId, userId)
                .last("LIMIT 1"));
        if (member == null || member.getStatus() != Constants.MEMBER_APPROVED) {
            throw new BizException(ResultCode.FORBIDDEN, "报名未通过，无法签到");
        }
        Long exist = signinMapper.selectCount(new LambdaQueryWrapper<ActivitySignin>()
                .eq(ActivitySignin::getActivityId, dto.getActivityId())
                .eq(ActivitySignin::getUserId, userId));
        if (exist > 0) {
            throw new BizException(ResultCode.DUPLICATE_OPERATION, "你已签到，请勿重复操作");
        }
        ActivitySignin signin = new ActivitySignin();
        signin.setActivityId(dto.getActivityId());
        signin.setUserId(userId);
        signinMapper.insert(signin);
    }

    /** 我的发布 */
    public PageResult<ActivityVO> myPublished(Long userId, int pageNum, int pageSize) {
        Page<Activity> page = activityMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Activity>()
                        .eq(Activity::getUserId, userId)
                        .orderByDesc(Activity::getId));
        return PageResult.of(page, this::toVO);
    }

    /** 我的报名 */
    public PageResult<MemberVO> mySignups(Long userId, int pageNum, int pageSize) {
        Page<ActivityMember> page = memberMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<ActivityMember>()
                        .eq(ActivityMember::getUserId, userId)
                        .orderByDesc(ActivityMember::getId));
        List<ActivityMember> records = page.getRecords();
        Map<Long, Activity> actMap = records.isEmpty() ? Map.of() :
                activityMapper.selectBatchIds(records.stream().map(ActivityMember::getActivityId).toList())
                        .stream().collect(Collectors.toMap(Activity::getId, Function.identity()));
        return PageResult.of(page, m -> {
            MemberVO vo = new MemberVO();
            BeanUtil.copyProperties(m, vo);
            Activity a = actMap.get(m.getActivityId());
            vo.setActivityTitle(a == null ? "活动已删除" : a.getTitle());
            return vo;
        });
    }

    // ---------- 内部方法 ----------

    /**
     * 报名资格最终校验（安全边界，不能只依赖前端按钮）。
     * 顺序：不存在/未审核 → 已下架 → 已结束 → 报名已截止 → 已开始 → 人数已满。
     * signupDeadline 为空时，默认截止时间 = startTime（活动开始后不允许新报名）。
     */
    private Activity checkSignAllowed(Long activityId) {
        Activity activity = activityMapper.selectById(activityId);
        if (activity == null || activity.getAuditStatus() != Constants.AUDIT_PASS) {
            throw new BizException(ResultCode.NOT_FOUND, "活动不存在或未通过审核");
        }
        if (activity.getStatus() == Constants.ACTIVITY_OFF) {
            throw new BizException(ResultCode.BAD_REQUEST, "活动已下架");
        }
        LocalDateTime now = LocalDateTime.now();
        if (activity.getEndTime() != null && !now.isBefore(activity.getEndTime())) {
            throw new BizException(ResultCode.BAD_REQUEST, "活动已结束");
        }
        if (activity.getSignupDeadline() != null && !now.isBefore(activity.getSignupDeadline())) {
            throw new BizException(ResultCode.BAD_REQUEST, "报名已截止");
        }
        // signupDeadline 为空 → 默认截止为 startTime
        if (activity.getStartTime() != null && !now.isBefore(activity.getStartTime())) {
            throw new BizException(ResultCode.BAD_REQUEST, "活动已开始，无法报名");
        }
        // 人数已满（审批通过数达到上限）
        if (activity.getMaxMembers() != null && activity.getMaxMembers() > 0) {
            Long approved = memberMapper.selectCount(new LambdaQueryWrapper<ActivityMember>()
                    .eq(ActivityMember::getActivityId, activityId)
                    .eq(ActivityMember::getStatus, Constants.MEMBER_APPROVED));
            if (approved >= activity.getMaxMembers()) {
                throw new BizException(ResultCode.BAD_REQUEST, "活动人数已满");
            }
        }
        return activity;
    }

    private Activity checkPublisher(Long userId, Long activityId) {
        Activity activity = activityMapper.selectById(activityId);
        if (activity == null) {
            throw new BizException(ResultCode.NOT_FOUND, "活动不存在");
        }
        if (!activity.getUserId().equals(userId)) {
            throw new BizException(ResultCode.FORBIDDEN, "只有活动发布者可以执行此操作");
        }
        return activity;
    }

    private ActivityVO toVO(Activity activity) {
        ActivityVO vo = new ActivityVO();
        BeanUtil.copyProperties(activity, vo);
        vo.setImageList(IdleService.parseJson(activity.getImages()));
        User publisher = userMapper.selectById(activity.getUserId());
        vo.setPublisherNickname(publisher == null ? "" : publisher.getNickname());
        vo.setPublisherAvatar(publisher == null ? null : publisher.getAvatar());
        vo.setMemberCount(memberMapper.selectCount(new LambdaQueryWrapper<ActivityMember>()
                .eq(ActivityMember::getActivityId, activity.getId())
                .eq(ActivityMember::getStatus, Constants.MEMBER_APPROVED)));
        // 按当前时间动态计算有效展示状态（不落库，避免时间驱动状态不一致）
        DisplayInfo info = resolveDisplayStatus(activity, LocalDateTime.now(), vo.getMemberCount());
        vo.setDisplayStatus(info.status);
        vo.setDisplayStatusText(info.text);
        vo.setCanSignup(info.canSignup);
        vo.setSignupDisabledReason(info.reason);
        return vo;
    }

    // ---------- 活动有效状态计算（统一规则，展示与报名共用） ----------

    /**
     * 统一状态计算（展示层，不依赖定时任务）：
     * <pre>
     * 已下架(5) → 已结束(4) → 已满员(1) → 报名已截止(2) → 活动进行中(3) → 报名中(0)
     * </pre>
     * 报名截止时间优先用 signupDeadline；为空时默认用 startTime（活动开始后不可报名）。
     */
    static DisplayInfo resolveDisplayStatus(Activity activity, LocalDateTime now, long approvedCount) {
        int dbStatus = activity.getStatus() == null ? Constants.ACTIVITY_SIGNING : activity.getStatus();
        // 1. 下架（数据库硬状态优先）
        if (dbStatus == Constants.ACTIVITY_OFF) {
            return new DisplayInfo(Constants.ACT_DISPLAY_OFF, "已下架", false, "活动已下架");
        }
        // 2. 数据库已结束
        if (dbStatus == Constants.ACTIVITY_ENDED) {
            return new DisplayInfo(Constants.ACT_DISPLAY_ENDED, "已结束", false, "活动已结束");
        }
        // 3. 当前时间已过结束时间
        if (activity.getEndTime() != null && !now.isBefore(activity.getEndTime())) {
            return new DisplayInfo(Constants.ACT_DISPLAY_ENDED, "已结束", false, "活动已结束");
        }
        // 4. 人数已满
        if (activity.getMaxMembers() != null && activity.getMaxMembers() > 0
                && approvedCount >= activity.getMaxMembers()) {
            return new DisplayInfo(Constants.ACT_DISPLAY_FULL, "已满员", false, "活动人数已满");
        }
        // 5. 报名截止
        if (activity.getSignupDeadline() != null && !now.isBefore(activity.getSignupDeadline())) {
            return new DisplayInfo(Constants.ACT_DISPLAY_DEADLINE_PASSED, "报名已截止", false, "报名已截止");
        }
        // 6. 活动已开始（signupDeadline 为空时默认截止=startTime）
        if (activity.getStartTime() != null && !now.isBefore(activity.getStartTime())) {
            return new DisplayInfo(Constants.ACT_DISPLAY_ONGOING, "活动进行中", false, "活动已开始，无法报名");
        }
        return new DisplayInfo(Constants.ACT_DISPLAY_SIGNING, "报名中", true, null);
    }

    /** 展示状态计算结果（静态内部类，便于单元测试） */
    @lombok.AllArgsConstructor
    static class DisplayInfo {
        final int status;
        final String text;
        final boolean canSignup;
        final String reason;
    }
}
