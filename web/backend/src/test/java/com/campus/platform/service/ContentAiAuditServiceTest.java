package com.campus.platform.service;

import com.campus.platform.common.Constants;
import com.campus.platform.aigateway.AiConfigHolder;
import com.campus.platform.aigateway.AiGatewayService;
import com.campus.platform.entity.LostFound;
import com.campus.platform.mapper.LostFoundMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

    @Test
    void aiFailureShouldFallbackToRuleAndAutoPassLowRisk() {
        // AI 配置了但调用失败：规则判 LOW 的内容应直接放行，避免永久停在待审核
        AiGatewayService gateway = mock(AiGatewayService.class);
        AiConfigHolder holder = mock(AiConfigHolder.class);
        when(holder.get("audit_enabled")).thenReturn("true");
        when(holder.getApiKey()).thenReturn("sk-real-key");
        when(gateway.internalChat(anyLong(), anyString(), anyString(), anyMap()))
                .thenThrow(new RuntimeException("AI down"));
        ContentAiAuditService service = new ContentAiAuditService(lostFoundMapper, null, null, null, gateway, holder);

        LostFound content = new LostFound();
        content.setId(3L);
        content.setAuditStatus(Constants.AUDIT_PENDING);

        service.audit(Constants.BIZ_LOSTFOUND, content, 1L, "捡到校园卡", "在图书馆二楼捡到一张校园卡，失主请到一楼服务台认领");

        assertThat(content.getAuditStatus()).isEqualTo(Constants.AUDIT_PASS);
        verify(lostFoundMapper).updateById(content);
    }

    @Test
    void aiFailureShouldKeepRuleInterceptionForHighRisk() {
        // AI 调用失败但内容命中本地高风险词：仍保持待审核（人工复核）
        AiGatewayService gateway = mock(AiGatewayService.class);
        AiConfigHolder holder = mock(AiConfigHolder.class);
        when(holder.get("audit_enabled")).thenReturn("true");
        when(holder.getApiKey()).thenReturn("sk-real-key");
        when(gateway.internalChat(anyLong(), anyString(), anyString(), anyMap()))
                .thenThrow(new RuntimeException("AI down"));
        ContentAiAuditService service = new ContentAiAuditService(lostFoundMapper, null, null, null, gateway, holder);

        LostFound content = new LostFound();
        content.setId(4L);
        content.setAuditStatus(Constants.AUDIT_PENDING);

        service.audit(Constants.BIZ_LOSTFOUND, content, 1L, "兼职", "加微信刷单返利，日结 300");

        assertThat(content.getAuditStatus()).isEqualTo(Constants.AUDIT_PENDING);
        verify(lostFoundMapper).updateById(content);
    }
}
