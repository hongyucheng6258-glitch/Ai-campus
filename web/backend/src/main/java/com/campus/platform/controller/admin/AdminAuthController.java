package com.campus.platform.controller.admin;

import com.campus.platform.common.R;
import com.campus.platform.dto.AdminLoginDTO;
import com.campus.platform.service.AuthService;
import com.campus.platform.vo.AdminLoginVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public R<AdminLoginVO> login(@Valid @RequestBody AdminLoginDTO dto) {
        return R.ok(authService.adminLogin(dto));
    }
}
