package com.campus.platform.vo;

import com.campus.platform.entity.PostComment;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 评论 VO。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CommentVO extends PostComment {

    private String nickname;

    private String avatar;
}
