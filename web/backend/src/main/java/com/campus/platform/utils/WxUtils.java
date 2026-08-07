package com.campus.platform.utils;

import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.campus.platform.common.BizException;
import com.campus.platform.common.ResultCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 微信小程序工具：code2session 换 openid。
 * 文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html
 */
@Slf4j
@Component
public class WxUtils {

    @Value("${wx.miniapp.appid}")
    private String appid;

    @Value("${wx.miniapp.secret}")
    private String secret;

    /**
     * 用 wx.login 的 code 换取 openid。
     *
     * @param code 小程序登录凭证
     * @return openid
     */
    public String code2session(String code) {
        if (StrUtil.isBlank(code)) {
            throw new BizException(ResultCode.BAD_REQUEST, "code 不能为空");
        }
        // 开发环境占位 AppID 时返回稳定的模拟 openid。
        // wx.login 每次产生的 code 都不同，不能用 code 生成身份，否则每次登录都会成为新用户并重复绑定。
        if (appid.startsWith("wx-placeholder")) {
            log.warn("小程序 appid 为占位符，返回稳定模拟 openid（仅开发联调用）");
            return "mock_openid_local_developer";
        }
        String url = StrUtil.format(
                "https://api.weixin.qq.com/sns/jscode2session?appid={}&secret={}&js_code={}&grant_type=authorization_code",
                appid, secret, code);
        try {
            String body = HttpUtil.get(url, 5000);
            JSONObject json = JSONUtil.parseObj(body);
            String openid = json.getStr("openid");
            if (StrUtil.isBlank(openid)) {
                log.error("code2session 失败: {}", body);
                throw new BizException(ResultCode.BAD_REQUEST, "微信登录失败: " + json.getStr("errmsg", "未知错误"));
            }
            return openid;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("code2session 网络异常", e);
            throw new BizException(ResultCode.SYSTEM_ERROR, "微信登录服务异常");
        }
    }
}
