package com.campus.platform.controller.admin;

import com.campus.platform.common.PageResult;
import com.campus.platform.common.R;
import com.campus.platform.dto.AuditDTO;
import com.campus.platform.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/audit")
@RequiredArgsConstructor
public class AdminAuditController {
    private final AuditService auditService;

    @GetMapping("/pending")
    public R<PageResult<?>> pendingList(
            @RequestParam(defaultValue = "idle") String type,
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        return R.ok(auditService.pendingList(type, pageNum, pageSize));
    }

    @PutMapping("/{type}/{id}/pass")
    public R<Void> pass(@PathVariable String type, @PathVariable Long id) {
        auditService.pass(type, id);
        return R.ok();
    }

    @PutMapping("/{type}/{id}/reject")
    public R<Void> reject(@PathVariable String type, @PathVariable Long id, @Valid @RequestBody AuditDTO dto) {
        auditService.reject(type, id, dto.getReason());
        return R.ok();
    }
}
