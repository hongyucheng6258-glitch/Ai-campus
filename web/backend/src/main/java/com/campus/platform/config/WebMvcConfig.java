package com.campus.platform.config;

import com.campus.platform.interceptor.AdminInterceptor;
import com.campus.platform.interceptor.JwtInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置：拦截器注册 + 跨域。
 *
 * <p>BUG-02 修复说明：原代码将 {@code /api/idle/{id:\d+}} 等含 {id} 的路径放入
 * excludePathPatterns，导致这些路径上的 PUT/DELETE 写操作也被匿名放行，存在越权风险。
 * Spring 的 InterceptorRegistration 不支持按 HTTP 方法排除，因此这里<b>移除</b>所有
 * 含 {id} 的路径排除项；这些路径的 GET（详情/评论列表）在 Controller 内部通过
 * {@code UserContext.get()} 可选获取登录态（详见 IdleController.detail、PostController.list）。
 * 仅保留纯列表/聚合/鉴权等无需登录即可访问的匿名路径。
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final JwtInterceptor jwtInterceptor;
    private final AdminInterceptor adminInterceptor;

    @Value("${security.trusted-origins:http://localhost:5173,http://127.0.0.1:5173}")
    private String[] trustedOrigins;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 管理端拦截器：仅校验 /api/admin/** 且 role=admin
        registry.addInterceptor(adminInterceptor)
                .addPathPatterns("/api/admin/**")
                .excludePathPatterns("/api/admin/auth/login");

        // 学生端拦截器：拦截所有 /api/**，排除管理端（由 AdminInterceptor 负责）和公开接口
        registry.addInterceptor(jwtInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/admin/**",
                        "/api/auth/register",
                        "/api/auth/login",
                        "/api/auth/wx-login",
                        "/api/assets/**",
                        "/api/idle/list",
                        "/api/activity/list",
                        "/api/lostfound/list",
                        "/api/notice/list",
                        "/api/post/list",
                        "/api/home/aggregate",
                        "/error",
                        "/favicon.ico"
                );
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(trustedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
