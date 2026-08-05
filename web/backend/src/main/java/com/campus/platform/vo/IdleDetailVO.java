package com.campus.platform.vo;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 闲置详情 VO：附带当前用户与该物品的关系。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class IdleDetailVO extends IdleItemVO {

    /** 是否本人发布 */
    private Boolean isOwner;

    /** 当前用户已发起的预约ID（无则null） */
    private Long myAppointmentId;

    /** 卖家历史平均评分 */
    private Double sellerAvgScore;
}
