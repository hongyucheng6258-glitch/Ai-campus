package com.campus.platform.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.platform.entity.Notice;
import org.apache.ibatis.annotations.Mapper;

/**
 * Notice Mapper（MyBatis-Plus BaseMapper，CRUD 零 XML）。
 */
@Mapper
public interface NoticeMapper extends BaseMapper<Notice> {
}
