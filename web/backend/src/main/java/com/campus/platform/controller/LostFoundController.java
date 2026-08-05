package com.campus.platform.controller;

import com.campus.platform.common.PageResult;
import com.campus.platform.common.R;
import com.campus.platform.common.UserContext;
import com.campus.platform.dto.LostFoundPublishDTO;
import com.campus.platform.entity.LostFound;
import com.campus.platform.service.LostFoundService;
import com.campus.platform.vo.LostFoundVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lostfound")
@RequiredArgsConstructor
public class LostFoundController {
    private final LostFoundService lostFoundService;

    @PostMapping
    public R<LostFound> publish(@Valid @RequestBody LostFoundPublishDTO dto) {
        return R.ok(lostFoundService.publish(UserContext.getUid(), dto));
    }

    @GetMapping("/list")
    public R<PageResult<LostFoundVO>> list(
            @RequestParam(required = false) Integer type,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        return R.ok(lostFoundService.list(type, keyword, pageNum, pageSize));
    }

    @GetMapping("/my")
    public R<PageResult<LostFoundVO>> my(
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        return R.ok(lostFoundService.myList(UserContext.getUid(), pageNum, pageSize));
    }

    @GetMapping("/{id}")
    public R<LostFoundVO> detail(@PathVariable Long id) {
        UserContext.CurrentUser current = UserContext.get();
        Long uid = current == null ? null : current.uid();
        return R.ok(lostFoundService.detail(id, uid));
    }

    @PutMapping("/{id}/finish")
    public R<Void> finish(@PathVariable Long id) {
        lostFoundService.finish(UserContext.getUid(), id);
        return R.ok();
    }
}
