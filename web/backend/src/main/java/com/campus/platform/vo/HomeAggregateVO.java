package com.campus.platform.vo;

import com.campus.platform.entity.Activity;
import com.campus.platform.entity.IdleItem;
import com.campus.platform.entity.LostFound;
import com.campus.platform.entity.Notice;
import lombok.Data;

import java.util.List;

/**
 * 首页聚合响应（公告轮播 + 各模块最新3条）。
 */
@Data
public class HomeAggregateVO {

    /** 最新公告（轮播） */
    private List<Notice> notices;

    private List<IdleItem> idleItems;

    private List<Activity> activities;

    private List<LostFound> lostFounds;
}
