package com.campus.platform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 错题本（B6/B7）。
 */
@Data
@TableName("wrong_question")
public class WrongQuestion {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    /** 学科 */
    private String subject;

    private String tag;

    private String question;

    private String answer;

    private String analysis;

    /** manual手动 / ai自动 */
    private String source;

    private LocalDateTime createTime;
}
