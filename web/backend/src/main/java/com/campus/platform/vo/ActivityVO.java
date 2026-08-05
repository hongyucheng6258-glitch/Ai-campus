package com.campus.platform.vo;

import com.campus.platform.entity.Activity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

/**
 * 活动 VO：图片数组 + 发布者信息 + 已通过报名数。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ActivityVO extends Activity {

    private List<String> imageList;

    private String publisherNickname;

    private String publisherAvatar;

    /** 已通过报名数 */
    private Long memberCount;
}
