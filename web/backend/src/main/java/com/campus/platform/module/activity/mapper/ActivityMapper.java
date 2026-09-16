package com.campus.platform.module.activity.mapper;

import com.campus.platform.module.activity.entity.Activity;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * Activity Mapper（MyBatis-Plus BaseMapper，CRUD 零 XML）。
 */
@Mapper
public interface ActivityMapper extends BaseMapper<Activity> {
}
