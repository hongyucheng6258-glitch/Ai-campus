package com.campus.platform.chat.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatSessionRegistry {
    private static final int MAX_CONNECTIONS_PER_USER = 5;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<Long, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    public boolean register(Long userId, WebSocketSession session) {
        Set<WebSocketSession> userSessions = sessions.computeIfAbsent(userId, key -> ConcurrentHashMap.newKeySet());
        userSessions.removeIf(value -> !value.isOpen());
        if (userSessions.size() >= MAX_CONNECTIONS_PER_USER) return false;
        session.getAttributes().put("chatUserId", userId);
        userSessions.add(session);
        return true;
    }

    public void unregister(WebSocketSession session) {
        Object value = session.getAttributes().get("chatUserId");
        if (!(value instanceof Long userId)) return;
        Set<WebSocketSession> userSessions = sessions.get(userId);
        if (userSessions == null) return;
        userSessions.remove(session);
        if (userSessions.isEmpty()) sessions.remove(userId, userSessions);
    }

    public void send(Long userId, Object payload) {
        Set<WebSocketSession> userSessions = sessions.get(userId);
        if (userSessions == null || userSessions.isEmpty()) return;
        try {
            String json = objectMapper.writeValueAsString(payload);
            for (WebSocketSession session : userSessions) {
                if (!session.isOpen()) continue;
                try {
                    synchronized (session) {
                        session.sendMessage(new TextMessage(json));
                    }
                } catch (IOException error) {
                    log.warn("私信 WebSocket 推送失败, userId={}, sessionId={}", userId, session.getId(), error);
                }
            }
        } catch (Exception error) {
            log.warn("私信 WebSocket 序列化失败, userId={}", userId, error);
        }
    }
}
