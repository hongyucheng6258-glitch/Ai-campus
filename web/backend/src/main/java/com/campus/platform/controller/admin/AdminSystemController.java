package com.campus.platform.controller.admin;

import com.campus.platform.common.BizException;
import com.campus.platform.common.PageResult;
import com.campus.platform.common.R;
import com.campus.platform.common.ResultCode;
import com.campus.platform.common.UserContext;
import com.campus.platform.dto.AdminSaveDTO;
import com.campus.platform.entity.Admin;
import com.campus.platform.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/system/admin")
@RequiredArgsConstructor
public class AdminSystemController {
    private final AdminUserService adminUserService;

    @GetMapping
    public R<PageResult<Admin>> list(
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        return R.ok(adminUserService.listAdmins(pageNum, pageSize));
    }

    @PostMapping
    public R<Admin> create(@Valid @RequestBody AdminSaveDTO dto) {
        // BUG-01 修复：只有 super 角色才能创建管理员
        checkSuperAdmin();
        return R.ok(adminUserService.createAdmin(dto));
    }

    @PutMapping("/{id}")
    public R<Admin> update(@PathVariable Long id, @Valid @RequestBody AdminSaveDTO dto) {
        // BUG-01 修复：只有 super 角色才能修改管理员
        checkSuperAdmin();
        return R.ok(adminUserService.updateAdmin(id, dto));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        checkSuperAdmin();
        adminUserService.deleteAdmin(id, UserContext.getUid());
        return R.ok();
    }

    /** 校验当前登录管理员是否为 super 角色 */
    private void checkSuperAdmin() {
        Long adminId = UserContext.getUid();
        Admin current = adminUserService.getAdminById(adminId);
        if (current == null || !"super".equals(current.getRole())) {
            throw new BizException(ResultCode.FORBIDDEN, "无权限：仅超级管理员可操作");
        }
    }
}
