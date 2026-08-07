package com.campus.platform.service;

import com.campus.platform.common.Constants;
import com.campus.platform.entity.LostFound;
import com.campus.platform.mapper.LostFoundMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ContentAiAuditServiceTest {

    @Mock
    private LostFoundMapper lostFoundMapper;

    @Test
    void lowRiskContentShouldAutoPassAndRecordAiDecision() {
        ContentAiAuditService service = new ContentAiAuditService(lostFoundMapper, null, null, null, null, null);

        LostFound content = new LostFound();
        content.setId(1L);
        content.setAuditStatus(Constants.AUDIT_PENDING);

        service.applyDecision(Constants.BIZ_LOSTFOUND, content, new AiAuditResult("LOW", 10, "普通校园信息", null));

        assertThat(content.getAuditStatus()).isEqualTo(Constants.AUDIT_PASS);
        assertThat(content.getAiRiskLevel()).isEqualTo(0);
        assertThat(content.getAuditSource()).isEqualTo("ai");
        verify(lostFoundMapper).updateById(content);
    }

    @Test
    void highRiskContentShouldRemainPendingForManualReview() {
        ContentAiAuditService service = new ContentAiAuditService(lostFoundMapper, null, null, null, null, null);

        LostFound content = new LostFound();
        content.setId(2L);
        content.setAuditStatus(Constants.AUDIT_PENDING);

        service.applyDecision(Constants.BIZ_LOSTFOUND, content, new AiAuditResult("HIGH", 85, "疑似外部交易引导", null));

        assertThat(content.getAuditStatus()).isEqualTo(Constants.AUDIT_PENDING);
        assertThat(content.getAiRiskLevel()).isEqualTo(2);
        assertThat(content.getAuditSource()).isEqualTo("ai");
        verify(lostFoundMapper).updateById(content);
    }
}
