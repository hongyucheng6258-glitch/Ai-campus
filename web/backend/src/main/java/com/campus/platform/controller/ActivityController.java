package com.campus.platform.controller;

import com.campus.platform.common.PageResult;
import com.campus.platform.common.R;
import com.campus.platform.common.UserContext;
import com.campus.platform.dto.ActivityPublishDTO;
import com.campus.platform.dto.MemberHandleDTO;
import com.campus.platform.dto.SigninDTO;
import com.campus.platform.dto.SignupDTO;
import com.campus.platform.entity.Activity;
import com.campus.platform.service.ActivityService;
import com.campus.platform.vo.ActivityDetailVO;
import com.campus.platform.vo.ActivityVO;
import com.campus.platform.vo.MemberVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activity")
@RequiredArgsConstructor
public class ActivityController {
    private final ActivityService activityService;

    @PostMapping
    public R<Activity> publish(@Valid @RequestBody ActivityPublishDTO dto) {
        return R.ok(activityService.publish(UserContext.getUid(), dto));
    }

    @GetMapping("/list")
    public R<PageResult<ActivityVO>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        // 匿名公开接口：限制分页大小，防止一次性拉全表
        int capped = Math.min(pageSize == null ? 10 : pageSize, 50);
        return R.ok(activityService.list(keyword, category, pageNum, capped));
    }

    @GetMapping("/my")
    public R<PageResult<ActivityVO>> myPublished(
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        return R.ok(activityService.myPublished(UserContext.getUid(), pageNum, pageSize));
    }

    @GetMapping("/my/signup")
    public R<PageResult<MemberVO>> mySignups(
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        return R.ok(activityService.mySignups(UserContext.getUid(), pageNum, pageSize));
    }

    @GetMapping("/{id}")
    public R<ActivityDetailVO> detail(@PathVariable Long id) {
        UserContext.CurrentUser current = UserContext.get();
        Long uid = current == null ? null : current.uid();
        return R.ok(activityService.detail(id, uid));
    }

    @PostMapping("/{id}/signup")
    public R<Void> signup(@PathVariable Long id, @Valid @RequestBody SignupDTO dto) {
        activityService.signup(UserContext.getUid(), id, dto);
        return R.ok();
    }

    @GetMapping("/{id}/members")
    public R<List<MemberVO>> members(@PathVariable Long id) {
        return R.ok(activityService.members(UserContext.getUid(), id));
    }

    @PutMapping("/member/{memberId}/handle")
    public R<Void> handleMember(@PathVariable Long memberId, @Valid @RequestBody MemberHandleDTO dto) {
        activityService.handleMember(UserContext.getUid(), memberId, dto.getApprove());
        return R.ok();
    }

    @GetMapping("/{id}/signin-qrcode")
    public R<String> signinQrCode(@PathVariable Long id) {
        return R.ok(activityService.signinQrCode(UserContext.getUid(), id));
    }

    @PostMapping("/signin")
    public R<Void> signin(@Valid @RequestBody SigninDTO dto) {
        activityService.signin(UserContext.getUid(), dto);
        return R.ok();
    }
}
