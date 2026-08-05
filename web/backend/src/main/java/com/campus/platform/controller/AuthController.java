package com.campus.platform.controller;

import com.campus.platform.common.R;
import com.campus.platform.common.UserContext;
import com.campus.platform.dto.*;
import com.campus.platform.service.AuthService;
import com.campus.platform.vo.LoginVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public R<LoginVO> register(@Valid @RequestBody RegisterDTO dto) {
        return R.ok(authService.register(dto));
    }

    @PostMapping("/login")
    public R<LoginVO> login(@Valid @RequestBody LoginDTO dto) {
        return R.ok(authService.login(dto));
    }

    @PostMapping("/wx-login")
    public R<LoginVO> wxLogin(@Valid @RequestBody WxLoginDTO dto) {
        return R.ok(authService.wxLogin(dto));
    }

    @PostMapping("/wx-bind")
    public R<LoginVO> wxBind(@Valid @RequestBody WxBindDTO dto) {
        return R.ok(authService.wxBind(UserContext.getUid(), dto));
    }
}
