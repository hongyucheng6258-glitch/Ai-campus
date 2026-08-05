package com.campus.platform.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.platform.entity.Admin;
import org.apache.ibatis.annotations.Mapper;

/**
 * Admin Mapper（MyBatis-Plus BaseMapper，CRUD 零 XML）。
 */
@Mapper
public interface AdminMapper extends BaseMapper<Admin> {
}
