package com.campus.platform.vo;

import com.campus.platform.entity.Admin;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 管理员登录响应。
 */
@Data
@AllArgsConstructor
public class AdminLoginVO {

    private String token;

    private Admin adminInfo;
}
