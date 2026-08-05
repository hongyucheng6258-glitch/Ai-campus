package com.campus.platform.chat.service;

import com.campus.platform.common.BizException;
import com.campus.platform.entity.IdleItem;
import com.campus.platform.mapper.ActivityMapper;
import com.campus.platform.mapper.IdleItemMapper;
import com.campus.platform.mapper.LostFoundMapper;
import com.campus.platform.mapper.PostMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class ChatContextValidatorTest {

    @Test
    void contextTitleComesFromRealObjectInsteadOfClientPayload() {
        IdleItemMapper idle = mock(IdleItemMapper.class);
        IdleItem item = new IdleItem();
        item.setId(20L);
        item.setUserId(8L);
        item.setTitle("数据库真实标题");
        when(idle.selectById(20L)).thenReturn(item);
        ChatContextValidator validator = new ChatContextValidator(idle, mock(LostFoundMapper.class),
                mock(ActivityMapper.class), mock(PostMapper.class));

        assertEquals("数据库真实标题", validator.validate(7L, 8L, "idle", 20L));
    }

    @Test
    void contextPublisherMustMatchConversationTarget() {
        IdleItemMapper idle = mock(IdleItemMapper.class);
        IdleItem item = new IdleItem();
        item.setId(20L);
        item.setUserId(9L);
        when(idle.selectById(20L)).thenReturn(item);
        ChatContextValidator validator = new ChatContextValidator(idle, mock(LostFoundMapper.class),
                mock(ActivityMapper.class), mock(PostMapper.class));

        assertThrows(BizException.class, () -> validator.validate(7L, 8L, "idle", 20L));
    }
}
