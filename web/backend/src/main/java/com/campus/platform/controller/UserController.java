package com.campus.platform.controller;

import com.campus.platform.common.R;
import com.campus.platform.common.UserContext;
import com.campus.platform.dto.PasswordUpdateDTO;
import com.campus.platform.dto.ProfileUpdateDTO;
import com.campus.platform.entity.User;
import com.campus.platform.service.UserService;
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
