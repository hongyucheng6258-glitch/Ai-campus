package com.campus.platform.controller.admin;

import com.campus.platform.common.PageResult;
import com.campus.platform.common.R;
import com.campus.platform.common.UserContext;
import com.campus.platform.dto.ReportHandleDTO;
import com.campus.platform.entity.Report;
import com.campus.platform.service.ReportAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/report")
@RequiredArgsConstructor
public class AdminReportController {
    private final ReportAdminService reportAdminService;

    @GetMapping("/list")
    public R<PageResult<Report>> list(
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        return R.ok(reportAdminService.list(status, pageNum, pageSize));
    }

    @PutMapping("/{id}/handle")
    public R<Void> handle(@PathVariable Long id, @Valid @RequestBody ReportHandleDTO dto) {
        reportAdminService.handle(UserContext.getUid(), id, dto);
        return R.ok();
    }
}
