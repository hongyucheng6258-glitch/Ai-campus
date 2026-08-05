package com.campus.platform.interceptor;

import com.campus.platform.common.BizException;
import com.campus.platform.common.Constants;
import com.campus.platform.common.ResultCode;
import com.campus.platform.common.UserContext;
import com.campus.platform.utils.JwtUtils;
import com.campus.platform.utils.RedisUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import com.campus.platform.common.R;

import java.nio.charset.StandardCharsets;

/**
 * 学生端 JWT 拦截器（共享约定 #3）。
 * 从 Header Authorization: Bearer <token> 解析 {uid, role} 写入 UserContext。
 */
@Component
@RequiredArgsConstructor
public class JwtInterceptor implements HandlerInterceptor {

    private final JwtUtils jwtUtils;
    private final RedisUtils redisUtils;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String token = resolveToken(request);
        if (token == null) {
            writeUnauthorized(response, ResultCode.UNAUTHORIZED);
            return false;
        }
        try {
            Long uid = jwtUtils.getUid(token);
            String role = jwtUtils.getRole(token);
            // BUG-06 修复：管理员 Token 不能当学生 Token 用
            if (Constants.ROLE_ADMIN.equals(role)) {
                writeUnauthorized(response, ResultCode.FORBIDDEN);
                return false;
            }
            // 禁用用户黑名单校验：管理员禁用学生后，其存量 token 在下一次请求即失效
            if (redisUtils.hasKey("auth:blacklist:" + role + ":" + uid)) {
                writeUnauthorized(response, ResultCode.UNAUTHORIZED);
                return false;
            }
            UserContext.set(uid, role);
            return true;
        } catch (Exception e) {
            writeUnauthorized(response, ResultCode.UNAUTHORIZED);
            return false;
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }

    protected String resolveToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        // 兼容 query 参数（SSE EventSource 无法自定义 Header 的场景）
        return request.getParameter("token");
    }

    protected void writeUnauthorized(HttpServletResponse response, ResultCode rc) throws Exception {
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(objectMapper.writeValueAsString(R.fail(rc)));
    }
}
