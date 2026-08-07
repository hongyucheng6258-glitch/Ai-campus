package com.campus.platform.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.platform.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Update;

/**
 * User Mapper（MyBatis-Plus BaseMapper，CRUD 零 XML）。
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {

    /**
     * 释放临时微信账号的 openid，但保留账号本身及其关联数据。
     */
    @Update("UPDATE user SET openid = NULL WHERE id = #{uid}")
    int clearOpenidById(Long uid);
}
