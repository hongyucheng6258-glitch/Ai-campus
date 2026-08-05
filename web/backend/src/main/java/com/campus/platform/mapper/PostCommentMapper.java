package com.campus.platform.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.platform.entity.PostComment;
import org.apache.ibatis.annotations.Mapper;

/**
 * PostComment Mapper（MyBatis-Plus BaseMapper，CRUD 零 XML）。
 */
@Mapper
public interface PostCommentMapper extends BaseMapper<PostComment> {
}
