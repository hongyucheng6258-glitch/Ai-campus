package com.campus.platform.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.platform.entity.PromptTemplate;
import org.apache.ibatis.annotations.Mapper;

/**
 * PromptTemplate Mapper（MyBatis-Plus BaseMapper，CRUD 零 XML）。
 */
@Mapper
public interface PromptTemplateMapper extends BaseMapper<PromptTemplate> {
}
