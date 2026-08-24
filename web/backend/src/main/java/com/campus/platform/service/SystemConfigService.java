package com.campus.platform.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.campus.platform.common.BizException;
import com.campus.platform.common.ResultCode;
import com.campus.platform.config.SystemConfigHolder;
import com.campus.platform.entity.SystemConfig;
import com.campus.platform.mapper.SystemConfigMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 管理端-通用系统配置服务。
 * 配置修改后调用 {@link SystemConfigHolder#refresh()} 即时生效，无需重启。
 */
@Service
@RequiredArgsConstructor
public class SystemConfigService {

    private final SystemConfigMapper systemConfigMapper;
    private final SystemConfigHolder systemConfigHolder;

    /** 读取全部配置（按 category + sort 排序） */
    public List<SystemConfig> listAll() {
        return systemConfigMapper.selectList(new LambdaQueryWrapper<SystemConfig>()
                .orderByAsc(SystemConfig::getCategory)
                .orderByAsc(SystemConfig::getSort));
    }

    /** 按分组读取配置 */
    public List<SystemConfig> listByCategory(String category) {
        return systemConfigMapper.selectList(new LambdaQueryWrapper<SystemConfig>()
                .eq(StrUtil.isNotBlank(category), SystemConfig::getCategory, category)
                .orderByAsc(SystemConfig::getSort));
    }

    /**
     * 批量更新配置值 → 刷新缓存即时生效。
     * 仅更新已存在的 key；不存在的 key 会被忽略（避免误创建垃圾配置）。
     */
    @Transactional
    public void updateConfigs(Map<String, String> configs) {
        if (configs == null || configs.isEmpty()) {
            throw new BizException(ResultCode.BAD_REQUEST, "配置不能为空");
        }
        for (Map.Entry<String, String> e : configs.entrySet()) {
            String key = e.getKey();
            String value = e.getValue() == null ? "" : e.getValue();
            int updated = systemConfigMapper.update(null, new LambdaUpdateWrapper<SystemConfig>()
                    .eq(SystemConfig::getConfigKey, key)
                    .set(SystemConfig::getConfigValue, value));
            if (updated == 0) {
                // 允许新增配置项（管理端"新增配置"场景）
                SystemConfig config = new SystemConfig();
                config.setConfigKey(key);
                config.setConfigValue(value);
                config.setValueType("string");
                config.setCategory("basic");
                config.setSort(999);
                systemConfigMapper.insert(config);
            }
        }
        systemConfigHolder.refresh();
    }

    /** 新增配置项 */
    @Transactional
    public SystemConfig create(SystemConfig config) {
        if (StrUtil.isBlank(config.getConfigKey())) {
            throw new BizException(ResultCode.BAD_REQUEST, "配置键不能为空");
        }
        Long exists = systemConfigMapper.selectCount(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigKey, config.getConfigKey()));
        if (exists != null && exists > 0) {
            throw new BizException(ResultCode.BAD_REQUEST, "配置键已存在");
        }
        if (StrUtil.isBlank(config.getValueType())) config.setValueType("string");
        if (StrUtil.isBlank(config.getCategory())) config.setCategory("basic");
        if (config.getSort() == null) config.setSort(999);
        systemConfigMapper.insert(config);
        systemConfigHolder.refresh();
        return config;
    }

    /** 更新配置项（含元信息：类型/分组/说明/排序） */
    @Transactional
    public SystemConfig update(Long id, SystemConfig config) {
        SystemConfig existing = systemConfigMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ResultCode.NOT_FOUND, "配置项不存在");
        }
        existing.setConfigValue(config.getConfigValue());
        if (StrUtil.isNotBlank(config.getValueType())) existing.setValueType(config.getValueType());
        if (StrUtil.isNotBlank(config.getCategory())) existing.setCategory(config.getCategory());
        if (StrUtil.isNotBlank(config.getDescription())) existing.setDescription(config.getDescription());
        if (config.getSort() != null) existing.setSort(config.getSort());
        systemConfigMapper.updateById(existing);
        systemConfigHolder.refresh();
        return existing;
    }

    /** 删除配置项 */
    @Transactional
    public void delete(Long id) {
        systemConfigMapper.deleteById(id);
        systemConfigHolder.refresh();
    }

    /** 刷新缓存（手动触发） */
    public void refresh() {
        systemConfigHolder.refresh();
    }
}
