package com.campus.platform.controller;

import com.campus.platform.common.PageResult;
import com.campus.platform.common.R;
import com.campus.platform.common.UserContext;
import com.campus.platform.dto.AppointDTO;
import com.campus.platform.dto.AppointHandleDTO;
import com.campus.platform.dto.IdlePublishDTO;
import com.campus.platform.dto.ReviewDTO;
import com.campus.platform.entity.IdleAppointment;
import com.campus.platform.entity.IdleItem;
import com.campus.platform.service.IdleService;
import com.campus.platform.vo.AppointmentVO;
import com.campus.platform.vo.IdleDetailVO;
import com.campus.platform.vo.IdleItemVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/idle")
@RequiredArgsConstructor
public class IdleController {
    private final IdleService idleService;

    @PostMapping
    public R<IdleItem> publish(@Valid @RequestBody IdlePublishDTO dto) {
        return R.ok(idleService.publish(UserContext.getUid(), dto));
    }

    @GetMapping("/list")
    public R<PageResult<IdleItemVO>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        return R.ok(idleService.list(keyword, category, pageNum, pageSize));
    }

    @GetMapping("/my")
    public R<PageResult<IdleItemVO>> my(
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        return R.ok(idleService.myList(UserContext.getUid(), pageNum, pageSize));
    }

    @GetMapping("/appoint/my")
    public R<PageResult<AppointmentVO>> myAppointments(
            @RequestParam(defaultValue = "buyer") String role,
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        return R.ok(idleService.myAppointments(UserContext.getUid(), role, pageNum, pageSize));
    }

    @GetMapping("/{id}")
    public R<IdleDetailVO> detail(@PathVariable Long id) {
        UserContext.CurrentUser current = UserContext.get();
        Long uid = current == null ? null : current.uid();
        return R.ok(idleService.detail(id, uid));
    }

    @PutMapping("/{id}")
    public R<IdleItem> update(@PathVariable Long id, @Valid @RequestBody IdlePublishDTO dto) {
        return R.ok(idleService.update(UserContext.getUid(), id, dto));
    }

    @DeleteMapping("/{id}")
    public R<Void> offline(@PathVariable Long id) {
        idleService.offline(UserContext.getUid(), id);
        return R.ok();
    }

    @PostMapping("/{id}/appoint")
    public R<IdleAppointment> appoint(@PathVariable Long id, @Valid @RequestBody AppointDTO dto) {
        return R.ok(idleService.appoint(UserContext.getUid(), id, dto));
    }

    @PutMapping("/appoint/{id}/handle")
    public R<Void> handleAppoint(@PathVariable Long id, @Valid @RequestBody AppointHandleDTO dto) {
        idleService.handleAppoint(UserContext.getUid(), id, dto.getAccept());
        return R.ok();
    }

    @PutMapping("/appoint/{id}/finish")
    public R<Void> finishAppoint(@PathVariable Long id) {
        idleService.finishAppoint(UserContext.getUid(), id);
        return R.ok();
    }

    @PostMapping("/appoint/{id}/review")
    public R<Void> review(@PathVariable Long id, @Valid @RequestBody ReviewDTO dto) {
        idleService.review(UserContext.getUid(), id, dto);
        return R.ok();
    }
}
