package com.campus.platform.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.platform.entity.User;
import org.apache.ibatis.annotations.Mapper;

/**
 * User Mapper（MyBatis-Plus BaseMapper，CRUD 零 XML）。
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {
}
