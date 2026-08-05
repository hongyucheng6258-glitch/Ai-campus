package com.campus.platform.service;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.campus.platform.entity.Message;
import com.campus.platform.mapper.MessageMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MessageServiceTest {
    @Test
    void unreadBadgeExcludesPrivateMessageAggregationNotifications() {
        MessageMapper mapper = mock(MessageMapper.class);
        when(mapper.selectCount(any(Wrapper.class))).thenReturn(4L);

        MessageService service = new MessageService(mapper);

        assertEquals(4L, service.unreadCount(7L).getCount());
    }
}
