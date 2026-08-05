package com.campus.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 失物招领表（C4）。
 */
@Data
@TableName("lost_found")
public class LostFound {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    /** 0失物 1招领 */
    private Integer type;

    private String title;

    private String description;

    /** 图片URL JSON数组字符串 */
    private String images;

    /** 丢失/拾获地点 */
    private String location;

    /** 发生时间 */
    private LocalDateTime happenTime;

    /** 联系方式 */
    private String contact;

    private Integer auditStatus;

    private String auditReason;

    /** 0进行中 1已完成 2已下架 */
    private Integer status;

    private LocalDateTime createTime;
}
