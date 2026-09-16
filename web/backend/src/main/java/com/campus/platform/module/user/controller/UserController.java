package com.campus.platform.module.user.controller;

import com.campus.platform.module.user.dto.PasswordUpdateDTO;
import com.campus.platform.module.user.dto.ProfileUpdateDTO;
import com.campus.platform.module.user.service.UserService;
import com.campus.platform.module.user.entity.User;

import com.campus.platform.common.R;
import com.campus.platform.common.UserContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping("/info")
    public R<User> info() {
        return R.ok(userService.getById(UserContext.getUid()));
    }

    @PutMapping("/profile")
    public R<User> updateProfile(@Valid @RequestBody ProfileUpdateDTO dto) {
        return R.ok(userService.updateProfile(UserContext.getUid(), dto));
    }

    @PutMapping("/password")
    public R<Void> updatePassword(@Valid @RequestBody PasswordUpdateDTO dto) {
        userService.updatePassword(UserContext.getUid(), dto);
        return R.ok();
    }
}
