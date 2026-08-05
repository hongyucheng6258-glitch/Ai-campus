package com.campus.platform.vo;

import com.campus.platform.entity.AiSession;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * AI 会话 VO：附带最后一条消息预览。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class SessionVO extends AiSession {

    private String lastMessage;
}
