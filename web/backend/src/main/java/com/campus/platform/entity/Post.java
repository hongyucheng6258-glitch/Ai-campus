package com.campus.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 动态表（C6）。
 */
@Data
@TableName("post")
public class Post {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String content;

    /** 图片URL JSON数组字符串 */
    private String images;

    private Integer likeCount;

    private Integer commentCount;

    private Integer auditStatus;

    private String auditReason;

    private LocalDateTime createTime;
}
