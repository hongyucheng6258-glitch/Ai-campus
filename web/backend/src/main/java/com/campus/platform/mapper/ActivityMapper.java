package com.campus.platform.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.platform.entity.Activity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Activity Mapper（MyBatis-Plus BaseMapper，CRUD 零 XML）。
 */
@Mapper
public interface ActivityMapper extends BaseMapper<Activity> {
}
