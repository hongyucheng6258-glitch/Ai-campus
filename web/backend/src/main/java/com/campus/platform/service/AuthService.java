package com.campus.platform.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.campus.platform.common.BizException;
import com.campus.platform.common.Constants;
import com.campus.platform.common.ResultCode;
import com.campus.platform.dto.AdminLoginDTO;
import com.campus.platform.dto.LoginDTO;
import com.campus.platform.dto.RegisterDTO;
import com.campus.platform.dto.WxBindDTO;
import com.campus.platform.dto.WxLoginDTO;
import com.campus.platform.entity.Admin;
import com.campus.platform.entity.User;
import com.campus.platform.mapper.AdminMapper;
import com.campus.platform.mapper.UserMapper;
import com.campus.platform.utils.JwtUtils;
import com.campus.platform.utils.WxUtils;
import com.campus.platform.vo.AdminLoginVO;
import com.campus.platform.vo.LoginVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 认证服务：Web注册/登录、小程序 wx.login 自动建号、账号合并绑定、管理员登录。
 * 双登录体系统一用户（架构设计 1.1 难点4），两端发同一套 JWT（claims: uid, role）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final AdminMapper adminMapper;
    private final JwtUtils jwtUtils;
    private final WxUtils wxUtils;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * Web 注册（学号+密码+昵称）。
     */
    public LoginVO register(RegisterDTO dto) {
        Long count = userMapper.selectCount(new LambdaQueryWrapper<User>()
                .eq(User::getStudentNo, dto.getStudentNo()));
        if (count > 0) {
            throw new BizException(ResultCode.BAD_REQUEST, "该学号已注册");
        }
        User user = new User();
        user.setStudentNo(dto.getStudentNo());
        user.setNickname(dto.getNickname());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setStatus(Constants.USER_STATUS_NORMAL);
        user.setLastLoginTime(LocalDateTime.now());
        userMapper.insert(user);
        return buildLoginVO(user);
    }

    /**
     * Web 账号密码登录。
     */
    public LoginVO login(LoginDTO dto) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getStudentNo, dto.getStudentNo()));
        if (user == null || user.getPassword() == null
                || !passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new BizException(ResultCode.BAD_REQUEST, "学号或密码错误");
        }
        if (Constants.USER_STATUS_BANNED == user.getStatus()) {
            throw new BizException(ResultCode.FORBIDDEN, "账号已被禁用，请联系管理员");
        }
        user.setLastLoginTime(LocalDateTime.now());
        userMapper.updateById(user);
        return buildLoginVO(user);
    }

    /**
     * 小程序登录：code 换 openid，不存在则自动建号。
     */
    public LoginVO wxLogin(WxLoginDTO dto) {
        String openid = wxUtils.code2session(dto.getCode());
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getOpenid, openid));
        if (user == null) {
            // 自动建号（无密码，后续可绑定学号合并）
            user = new User();
            user.setOpenid(openid);
            user.setNickname("微信用户" + openid.substring(Math.max(0, openid.length() - 6)));
            user.setStatus(Constants.USER_STATUS_NORMAL);
            userMapper.insert(user);
        }
        if (Constants.USER_STATUS_BANNED == user.getStatus()) {
            throw new BizException(ResultCode.FORBIDDEN, "账号已被禁用，请联系管理员");
        }
        user.setLastLoginTime(LocalDateTime.now());
        userMapper.updateById(user);
        return buildLoginVO(user);
    }

    /**
     * 小程序绑定学号/手机号（A3 账号合并）：
     * 若学号已存在 Web 账号且密码校验通过 → 把当前 openid 合并到该账号，删除自动建号的临时账号；
     * 若学号不存在 → 直接给当前账号补学号。
     */
    public LoginVO wxBind(Long uid, WxBindDTO dto) {
        User current = userMapper.selectById(uid);
        if (current == null) {
            throw new BizException(ResultCode.UNAUTHORIZED);
        }
        User target = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getStudentNo, dto.getStudentNo()));
        if (target != null && !target.getId().equals(uid)) {
            // 合并到已有 Web 账号：需校验该账号密码
            if (StrUtil.isBlank(dto.getPassword()) || target.getPassword() == null
                    || !passwordEncoder.matches(dto.getPassword(), target.getPassword())) {
                throw new BizException(ResultCode.BAD_REQUEST, "该学号已有账号，请输入正确的账号密码完成绑定");
            }
            target.setOpenid(current.getOpenid());
            if (StrUtil.isNotBlank(dto.getPhone())) {
                target.setPhone(dto.getPhone());
            }
            userMapper.updateById(target);
            // 删除自动建号的临时账号（毕设体量直接物理删除）
            userMapper.deleteById(uid);
            return buildLoginVO(target);
        }
        // 学号未被占用：直接补到当前账号
        current.setStudentNo(dto.getStudentNo());
        if (StrUtil.isNotBlank(dto.getPhone())) {
            current.setPhone(dto.getPhone());
        }
        userMapper.updateById(current);
        return buildLoginVO(current);
    }

    /**
     * 管理员独立登录（role=admin 的 JWT）。
     */
    public AdminLoginVO adminLogin(AdminLoginDTO dto) {
        Admin admin = adminMapper.selectOne(new LambdaQueryWrapper<Admin>()
                .eq(Admin::getUsername, dto.getUsername()));
        if (admin == null || !passwordEncoder.matches(dto.getPassword(), admin.getPassword())) {
            throw new BizException(ResultCode.BAD_REQUEST, "用户名或密码错误");
        }
        if (admin.getStatus() != null && admin.getStatus() == 1) {
            throw new BizException(ResultCode.FORBIDDEN, "管理员账号已被禁用");
        }
        String token = jwtUtils.generate(admin.getId(), Constants.ROLE_ADMIN);
        return new AdminLoginVO(token, admin);
    }

    /** 密码校验（供 UserService 改密复用） */
    public boolean matches(String raw, String encoded) {
        return passwordEncoder.matches(raw, encoded);
    }

    /** BCrypt 加密 */
    public String encode(String raw) {
        return passwordEncoder.encode(raw);
    }

    private LoginVO buildLoginVO(User user) {
        String token = jwtUtils.generate(user.getId(), Constants.ROLE_STUDENT);
        return new LoginVO(token, user);
    }
}
