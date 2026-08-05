package com.campus.platform.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 工具（共享约定 #3）：
 * claims = {uid, role: "student"|"admin", exp}，有效期默认 7 天。
 */
@Component
public class JwtUtils {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expire-days:7}")
    private long expireDays;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /** 生成 token */
    public String generate(Long uid, String role) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expireDays * 24 * 3600 * 1000);
        return Jwts.builder()
                .claim("uid", uid)
                .claim("role", role)
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    /** 解析全部 claims（过期/篡改会抛异常，由拦截器捕获转401） */
    public Claims parse(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public Long getUid(String token) {
        return parse(token).get("uid", Long.class);
    }

    public String getRole(String token) {
        return parse(token).get("role", String.class);
    }
}
