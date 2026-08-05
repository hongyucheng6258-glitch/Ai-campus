package com.campus.platform.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.platform.entity.Report;
import org.apache.ibatis.annotations.Mapper;

/**
 * Report Mapper（MyBatis-Plus BaseMapper，CRUD 零 XML）。
 */
@Mapper
public interface ReportMapper extends BaseMapper<Report> {
}
