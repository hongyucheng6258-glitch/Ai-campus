package com.campus.platform.service;

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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 认证服务测试（对应 PRD A1/A2/A3/A5 + 架构设计难点4「双登录体系统一用户」）。
 *
 * 核心验证点：Web 密码登录与小程序 code2session 两端签发同一套 JWT（role=student）。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("认证服务-双登录体系")
class AuthServiceTest {

    @Mock private UserMapper userMapper;
    @Mock private AdminMapper adminMapper;
    @Mock private JwtUtils jwtUtils;
    @Mock private WxUtils wxUtils;

    @InjectMocks
    private AuthService authService;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    // ==================== A1 Web 注册/登录 ====================

    @Nested
    @DisplayName("A1 Web 账号密码注册与登录")
    class WebAuth {

        @Test
        @DisplayName("注册成功应 BCrypt 加密密码、状态正常，并签发 student JWT")
        void register_shouldEncryptPasswordAndIssueStudentToken() {
            when(userMapper.selectCount(any())).thenReturn(0L);
            when(jwtUtils.generate(any(), eq(Constants.ROLE_STUDENT))).thenReturn("TOKEN_STUDENT");

            RegisterDTO dto = new RegisterDTO();
            dto.setStudentNo("2021001");
            dto.setNickname("小明");
            dto.setPassword("123456");

            LoginVO vo = authService.register(dto);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userMapper).insert(captor.capture());
            User saved = captor.getValue();

            assertThat(saved.getStudentNo()).isEqualTo("2021001");
            assertThat(saved.getStatus()).isEqualTo(Constants.USER_STATUS_NORMAL);
            // 密码必须加密存储，不得明文
            assertThat(saved.getPassword()).isNotEqualTo("123456");
            assertThat(saved.getPassword()).startsWith("$2a$");
            assertThat(encoder.matches("123456", saved.getPassword())).isTrue();
            assertThat(saved.getLastLoginTime()).isNotNull();
            assertThat(vo.getToken()).isEqualTo("TOKEN_STUDENT");
        }

        @Test
        @DisplayName("学号重复应拒绝注册")
        void register_shouldRejectDuplicateStudentNo() {
            when(userMapper.selectCount(any())).thenReturn(1L);

            RegisterDTO dto = new RegisterDTO();
            dto.setStudentNo("2021001");
            dto.setPassword("123456");

            assertThatThrownBy(() -> authService.register(dto))
                    .isInstanceOf(BizException.class)
                    .hasMessageContaining("该学号已注册");

            verify(userMapper, never()).insert(any(User.class));
        }

        @Test
        @DisplayName("登录成功应更新最后登录时间并签发 student JWT")
        void login_shouldSucceedAndUpdateLastLoginTime() {
            User user = buildUser(1L, "2021001", encoder.encode("123456"), Constants.USER_STATUS_NORMAL);
            when(userMapper.selectOne(any())).thenReturn(user);
            when(jwtUtils.generate(eq(1L), eq(Constants.ROLE_STUDENT))).thenReturn("TOKEN_STUDENT");

            LoginDTO dto = new LoginDTO();
            dto.setStudentNo("2021001");
            dto.setPassword("123456");

            LoginVO vo = authService.login(dto);

            assertThat(vo.getToken()).isEqualTo("TOKEN_STUDENT");
            assertThat(user.getLastLoginTime()).isNotNull();
            verify(userMapper).updateById(user);
            // 口径校验：JWT 角色必须是 student，不能是 admin
            verify(jwtUtils, never()).generate(anyLong(), eq(Constants.ROLE_ADMIN));
        }

        @Test
        @DisplayName("密码错误应拒绝登录，且错误信息不泄漏账号是否存在")
        void login_shouldRejectWrongPassword() {
            User user = buildUser(1L, "2021001", encoder.encode("correct"), Constants.USER_STATUS_NORMAL);
            when(userMapper.selectOne(any())).thenReturn(user);

            LoginDTO dto = new LoginDTO();
            dto.setStudentNo("2021001");
            dto.setPassword("wrong");

            assertThatThrownBy(() -> authService.login(dto))
                    .isInstanceOf(BizException.class)
                    .hasMessage("学号或密码错误");
        }

        @Test
        @DisplayName("账号不存在应返回与密码错误相同的提示（防账号枚举）")
        void login_shouldRejectUnknownAccountWithSameMessage() {
            when(userMapper.selectOne(any())).thenReturn(null);

            LoginDTO dto = new LoginDTO();
            dto.setStudentNo("nobody");
            dto.setPassword("123456");

            assertThatThrownBy(() -> authService.login(dto))
                    .isInstanceOf(BizException.class)
                    .hasMessage("学号或密码错误");
        }

        @Test
        @DisplayName("D1：被禁用账号应 403 无法登录")
        void login_shouldRejectBannedUser() {
            User user = buildUser(1L, "2021001", encoder.encode("123456"), Constants.USER_STATUS_BANNED);
            when(userMapper.selectOne(any())).thenReturn(user);

            LoginDTO dto = new LoginDTO();
            dto.setStudentNo("2021001");
            dto.setPassword("123456");

            assertThatThrownBy(() -> authService.login(dto))
                    .isInstanceOf(BizException.class)
                    .hasFieldOrPropertyWithValue("code", ResultCode.FORBIDDEN.getCode())
                    .hasMessageContaining("账号已被禁用");
        }

        @Test
        @DisplayName("小程序自动建号的账号（password=null）不得被空密码登录绕过")
        void login_shouldRejectNullPasswordAccount() {
            User user = buildUser(1L, "2021001", null, Constants.USER_STATUS_NORMAL);
            when(userMapper.selectOne(any())).thenReturn(user);

            LoginDTO dto = new LoginDTO();
            dto.setStudentNo("2021001");
            dto.setPassword("anything");

            assertThatThrownBy(() -> authService.login(dto))
                    .isInstanceOf(BizException.class)
                    .hasMessage("学号或密码错误");
        }
    }

    // ==================== A2 小程序登录 ====================

    @Nested
    @DisplayName("A2 小程序 code2session 登录")
    class WxAuth {

        @Test
        @DisplayName("openid 不存在应自动建号，并签发与 Web 同一套 student JWT")
        void wxLogin_shouldAutoCreateUser() {
            when(wxUtils.code2session("CODE")).thenReturn("oXyz1234567890abc");
            when(userMapper.selectOne(any())).thenReturn(null);
            when(jwtUtils.generate(any(), eq(Constants.ROLE_STUDENT))).thenReturn("TOKEN_STUDENT");

            WxLoginDTO dto = new WxLoginDTO();
            dto.setCode("CODE");

            LoginVO vo = authService.wxLogin(dto);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userMapper).insert(captor.capture());
            User created = captor.getValue();

            assertThat(created.getOpenid()).isEqualTo("oXyz1234567890abc");
            assertThat(created.getNickname()).isEqualTo("微信用户890abc");
            assertThat(created.getStatus()).isEqualTo(Constants.USER_STATUS_NORMAL);
            assertThat(created.getPassword()).isNull();
            // 关键一致性：小程序与 Web 签发同一角色的 JWT
            assertThat(vo.getToken()).isEqualTo("TOKEN_STUDENT");
            verify(jwtUtils).generate(any(), eq(Constants.ROLE_STUDENT));
        }

        @Test
        @DisplayName("openid 已存在应复用原账号，不重复建号")
        void wxLogin_shouldReuseExistingUser() {
            User existing = buildUser(9L, "2021009", null, Constants.USER_STATUS_NORMAL);
            existing.setOpenid("oExisting");
            when(wxUtils.code2session("CODE")).thenReturn("oExisting");
            when(userMapper.selectOne(any())).thenReturn(existing);
            when(jwtUtils.generate(eq(9L), eq(Constants.ROLE_STUDENT))).thenReturn("TOKEN_9");

            WxLoginDTO dto = new WxLoginDTO();
            dto.setCode("CODE");

            LoginVO vo = authService.wxLogin(dto);

            verify(userMapper, never()).insert(any(User.class));
            verify(userMapper).updateById(existing);
            assertThat(vo.getToken()).isEqualTo("TOKEN_9");
        }

        @Test
        @DisplayName("被禁用户走小程序登录同样应被 403 拦截")
        void wxLogin_shouldRejectBannedUser() {
            User banned = buildUser(9L, null, null, Constants.USER_STATUS_BANNED);
            banned.setOpenid("oBanned");
            when(wxUtils.code2session("CODE")).thenReturn("oBanned");
            when(userMapper.selectOne(any())).thenReturn(banned);

            WxLoginDTO dto = new WxLoginDTO();
            dto.setCode("CODE");

            assertThatThrownBy(() -> authService.wxLogin(dto))
                    .isInstanceOf(BizException.class)
                    .hasFieldOrPropertyWithValue("code", ResultCode.FORBIDDEN.getCode());
        }

        @Test
        @DisplayName("短 openid 生成昵称不得数组越界")
        void wxLogin_shouldHandleShortOpenid() {
            when(wxUtils.code2session("CODE")).thenReturn("abc");
            when(userMapper.selectOne(any())).thenReturn(null);
            when(jwtUtils.generate(any(), anyString())).thenReturn("T");

            WxLoginDTO dto = new WxLoginDTO();
            dto.setCode("CODE");

            authService.wxLogin(dto);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userMapper).insert(captor.capture());
            assertThat(captor.getValue().getNickname()).isEqualTo("微信用户abc");
        }
    }

    // ==================== A3 账号合并绑定 ====================

    @Nested
    @DisplayName("A3 小程序绑定学号（账号合并）")
    class WxBind {

        @Test
        @DisplayName("学号已存在且密码正确应合并 openid 并删除临时账号")
        void wxBind_shouldMergeIntoExistingWebAccount() {
            User current = buildUser(100L, null, null, Constants.USER_STATUS_NORMAL);
            current.setOpenid("oTemp");
            User target = buildUser(1L, "2021001", encoder.encode("123456"), Constants.USER_STATUS_NORMAL);

            when(userMapper.selectById(100L)).thenReturn(current);
            when(userMapper.selectOne(any())).thenReturn(target);
            when(jwtUtils.generate(eq(1L), eq(Constants.ROLE_STUDENT))).thenReturn("TOKEN_MERGED");

            WxBindDTO dto = new WxBindDTO();
            dto.setStudentNo("2021001");
            dto.setPassword("123456");
            dto.setPhone("13800138000");

            LoginVO vo = authService.wxBind(100L, dto);

            assertThat(target.getOpenid()).isEqualTo("oTemp");
            assertThat(target.getPhone()).isEqualTo("13800138000");
            verify(userMapper).updateById(target);
            verify(userMapper).deleteById(100L);
            // 合并后返回的是主账号的 token
            assertThat(vo.getToken()).isEqualTo("TOKEN_MERGED");
        }

        @Test
        @DisplayName("学号已存在但密码错误应拒绝合并（防账号劫持）")
        void wxBind_shouldRejectMergeWithWrongPassword() {
            User current = buildUser(100L, null, null, Constants.USER_STATUS_NORMAL);
            current.setOpenid("oTemp");
            User target = buildUser(1L, "2021001", encoder.encode("correct"), Constants.USER_STATUS_NORMAL);

            when(userMapper.selectById(100L)).thenReturn(current);
            when(userMapper.selectOne(any())).thenReturn(target);

            WxBindDTO dto = new WxBindDTO();
            dto.setStudentNo("2021001");
            dto.setPassword("wrong");

            assertThatThrownBy(() -> authService.wxBind(100L, dto))
                    .isInstanceOf(BizException.class)
                    .hasMessageContaining("请输入正确的账号密码");

            // 绝不能把 openid 挂到别人账号上
            verify(userMapper, never()).updateById(target);
            verify(userMapper, never()).deleteById(anyLong());
        }

        @Test
        @DisplayName("学号未被占用应直接补录到当前账号")
        void wxBind_shouldFillStudentNoWhenNotTaken() {
            User current = buildUser(100L, null, null, Constants.USER_STATUS_NORMAL);
            current.setOpenid("oTemp");

            when(userMapper.selectById(100L)).thenReturn(current);
            when(userMapper.selectOne(any())).thenReturn(null);
            when(jwtUtils.generate(eq(100L), eq(Constants.ROLE_STUDENT))).thenReturn("TOKEN_100");

            WxBindDTO dto = new WxBindDTO();
            dto.setStudentNo("2021999");

            authService.wxBind(100L, dto);

            assertThat(current.getStudentNo()).isEqualTo("2021999");
            verify(userMapper).updateById(current);
            verify(userMapper, never()).deleteById(anyLong());
        }

        @Test
        @DisplayName("当前用户不存在应返回 401")
        void wxBind_shouldRejectWhenCurrentUserMissing() {
            when(userMapper.selectById(100L)).thenReturn(null);

            WxBindDTO dto = new WxBindDTO();
            dto.setStudentNo("2021999");

            assertThatThrownBy(() -> authService.wxBind(100L, dto))
                    .isInstanceOf(BizException.class)
                    .hasFieldOrPropertyWithValue("code", ResultCode.UNAUTHORIZED.getCode());
        }
    }

    // ==================== A5 管理员登录 ====================

    @Nested
    @DisplayName("A5 管理员独立登录")
    class AdminAuth {

        @Test
        @DisplayName("管理员登录应签发 role=admin 的 JWT（与学生端隔离）")
        void adminLogin_shouldIssueAdminToken() {
            Admin admin = new Admin();
            admin.setId(1L);
            admin.setUsername("admin");
            admin.setPassword(encoder.encode("admin123"));
            admin.setStatus(0);
            when(adminMapper.selectOne(any())).thenReturn(admin);
            when(jwtUtils.generate(1L, Constants.ROLE_ADMIN)).thenReturn("TOKEN_ADMIN");

            AdminLoginDTO dto = new AdminLoginDTO();
            dto.setUsername("admin");
            dto.setPassword("admin123");

            AdminLoginVO vo = authService.adminLogin(dto);

            assertThat(vo.getToken()).isEqualTo("TOKEN_ADMIN");
            verify(jwtUtils).generate(1L, Constants.ROLE_ADMIN);
            // 绝不能给管理员发 student 角色
            verify(jwtUtils, never()).generate(anyLong(), eq(Constants.ROLE_STUDENT));
        }

        /**
         * 从 schema.sql 实时解析内置管理员的 BCrypt 哈希。
         * 刻意不硬编码哈希字符串——否则 schema.sql 一改，测试里的副本就失效，
         * 这条约定实际上就失去了回归保护能力（本用例曾因此误报过一次）。
         */
        private String readBuiltinAdminHashFromSchema() {
            java.nio.file.Path schema = java.nio.file.Paths.get("src/main/resources/db/schema.sql");
            assertThat(java.nio.file.Files.exists(schema))
                    .as("schema.sql 必须存在于 %s，否则数据库初始化脚本缺失", schema.toAbsolutePath())
                    .isTrue();
            String sql;
            try {
                sql = new String(java.nio.file.Files.readAllBytes(schema),
                        java.nio.charset.StandardCharsets.UTF_8);
            } catch (java.io.IOException e) {
                throw new IllegalStateException("读取 schema.sql 失败", e);
            }
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("'admin'\\s*,\\s*'(\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53})'")
                    .matcher(sql);
            assertThat(m.find())
                    .as("schema.sql 中应存在内置管理员 admin 的 BCrypt 密码种子记录")
                    .isTrue();
            return m.group(1);
        }

        @Test
        @DisplayName("schema.sql 内置的 admin/admin123 BCrypt 应可校验通过")
        void adminLogin_builtinCredentialShouldMatch() {
            String hashInSchema = readBuiltinAdminHashFromSchema();

            // 架构设计 10.4 约定：schema.sql 内置 admin/admin123
            assertThat(encoder.matches("admin123", hashInSchema))
                    .as("架构设计约定内置账号为 admin/admin123，该哈希必须能被 admin123 校验通过，"
                            + "否则答辩现场无法登录管理后台（D1/D2/D4/D7 全部演示不了）。实际哈希=" + hashInSchema)
                    .isTrue();
        }

        @Test
        @DisplayName("诊断：探明 schema.sql 内置哈希对应的真实明文")
        void diagnose_builtinAdminHashPlaintext() {
            String hashInSchema = readBuiltinAdminHashFromSchema();
            String[] candidates = {"admin123", "123456", "admin", "password", "admin@123", "12345678"};

            StringBuilder report = new StringBuilder("内置哈希明文探测：");
            String matched = null;
            for (String c : candidates) {
                boolean ok = encoder.matches(c, hashInSchema);
                report.append("\n  ").append(c).append(" -> ").append(ok);
                if (ok) {
                    matched = c;
                }
            }
            System.out.println(report);

            assertThat(matched)
                    .as("内置管理员哈希应对应文档约定的 admin123；实际探测结果见控制台输出")
                    .isEqualTo("admin123");
        }

        @Test
        @DisplayName("管理员密码错误应拒绝")
        void adminLogin_shouldRejectWrongPassword() {
            Admin admin = new Admin();
            admin.setId(1L);
            admin.setPassword(encoder.encode("admin123"));
            admin.setStatus(0);
            when(adminMapper.selectOne(any())).thenReturn(admin);

            AdminLoginDTO dto = new AdminLoginDTO();
            dto.setUsername("admin");
            dto.setPassword("wrong");

            assertThatThrownBy(() -> authService.adminLogin(dto))
                    .isInstanceOf(BizException.class)
                    .hasMessage("用户名或密码错误");
        }

        @Test
        @DisplayName("被禁用管理员应 403")
        void adminLogin_shouldRejectDisabledAdmin() {
            Admin admin = new Admin();
            admin.setId(1L);
            admin.setPassword(encoder.encode("admin123"));
            admin.setStatus(1);
            when(adminMapper.selectOne(any())).thenReturn(admin);

            AdminLoginDTO dto = new AdminLoginDTO();
            dto.setUsername("admin");
            dto.setPassword("admin123");

            assertThatThrownBy(() -> authService.adminLogin(dto))
                    .isInstanceOf(BizException.class)
                    .hasFieldOrPropertyWithValue("code", ResultCode.FORBIDDEN.getCode());
        }
    }

    // ==================== 工具方法 ====================

    @Test
    @DisplayName("encode/matches 应可互相校验（供改密复用）")
    void encodeAndMatches_shouldRoundTrip() {
        String encoded = authService.encode("myPassword");

        assertThat(encoded).isNotEqualTo("myPassword");
        assertThat(authService.matches("myPassword", encoded)).isTrue();
        assertThat(authService.matches("otherPassword", encoded)).isFalse();
    }

    private static User buildUser(Long id, String studentNo, String password, int status) {
        User user = new User();
        user.setId(id);
        user.setStudentNo(studentNo);
        user.setNickname("测试用户");
        user.setPassword(password);
        user.setStatus(status);
        return user;
    }
}
