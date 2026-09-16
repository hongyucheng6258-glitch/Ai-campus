package com.campus.platform.module.post.mapper;

import com.campus.platform.module.post.entity.Post;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * Post Mapper（MyBatis-Plus BaseMapper，CRUD 零 XML）。
 */
@Mapper
public interface PostMapper extends BaseMapper<Post> {
}
