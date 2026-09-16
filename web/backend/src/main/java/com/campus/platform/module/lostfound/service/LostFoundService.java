package com.campus.platform.module.lostfound.service;

import com.campus.platform.module.lostfound.dto.LostFoundPublishDTO;
import com.campus.platform.module.lostfound.mapper.LostFoundMapper;
import com.campus.platform.module.lostfound.vo.LostFoundVO;
import com.campus.platform.module.lostfound.entity.LostFound;

import com.campus.platform.module.ai.service.ContentAiAuditService;
import com.campus.platform.module.idle.service.IdleService;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.platform.common.BizException;
import com.campus.platform.common.Constants;
import com.campus.platform.common.PageResult;
import com.campus.platform.common.ResultCode;
import com.campus.platform.module.user.entity.User;
import com.campus.platform.module.ai.gateway.SensitiveWordService;
import com.campus.platform.module.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 失物招领服务（C4）：发布→审核→检索→认领标记完成。
 */
@Service
@RequiredArgsConstructor
public class LostFoundService {

    private final LostFoundMapper lostFoundMapper;
    private final UserMapper userMapper;
    private final SensitiveWordService sensitiveWordService;
    private final ContentAiAuditService contentAiAuditService;

    /** 发布（待审核） */
    public LostFound publish(Long userId, LostFoundPublishDTO dto) {
        if (sensitiveWordService.contains(dto.getTitle()) || sensitiveWordService.contains(dto.getDescription())) {
            throw new BizException(ResultCode.SENSITIVE_WORD);
        }
        LostFound lf = new LostFound();
        BeanUtil.copyProperties(dto, lf);
        lf.setUserId(userId);
        lf.setImages(IdleService.toJson(dto.getImages()));
        lf.setAuditStatus(Constants.AUDIT_PENDING);
        lf.setStatus(Constants.LF_DOING);
        lostFoundMapper.insert(lf);
        contentAiAuditService.audit(Constants.BIZ_LOSTFOUND, lf, userId, dto.getTitle(), dto.getDescription());
        return lf;
    }

    /** 列表检索（公开，仅审核通过，type 筛选） */
    public PageResult<LostFoundVO> list(Integer type, String keyword, int pageNum, int pageSize) {
        Page<LostFound> page = lostFoundMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<LostFound>()
                        .eq(LostFound::getAuditStatus, Constants.AUDIT_PASS)
                        .eq(LostFound::getStatus, Constants.LF_DOING)
                        .eq(type != null, LostFound::getType, type)
                        .and(StrUtil.isNotBlank(keyword), w -> w
                                .like(LostFound::getTitle, keyword)
                                .or().like(LostFound::getDescription, keyword))
                        .orderByDesc(LostFound::getId));
        return PageResult.of(page, this::toVO);
    }

    /** 详情 */
    public LostFoundVO detail(Long id, Long currentUid) {
        LostFound lf = lostFoundMapper.selectById(id);
        if (lf == null) {
            throw new BizException(ResultCode.NOT_FOUND, "信息不存在");
        }
        boolean isOwner = currentUid != null && currentUid.equals(lf.getUserId());
        if (lf.getAuditStatus() != Constants.AUDIT_PASS && !isOwner) {
            throw new BizException(ResultCode.AUDIT_PENDING);
        }
        LostFoundVO vo = toVO(lf);
        vo.setIsOwner(isOwner);
        return vo;
    }

    /** 标记完成（仅本人） */
    public void finish(Long userId, Long id) {
        LostFound lf = lostFoundMapper.selectById(id);
        if (lf == null) {
            throw new BizException(ResultCode.NOT_FOUND, "信息不存在");
        }
        if (!lf.getUserId().equals(userId)) {
            throw new BizException(ResultCode.FORBIDDEN, "只能操作自己发布的信息");
        }
        lf.setStatus(Constants.LF_DONE);
        lostFoundMapper.updateById(lf);
    }

    /** 我的发布 */
    public PageResult<LostFoundVO> myList(Long userId, int pageNum, int pageSize) {
        Page<LostFound> page = lostFoundMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<LostFound>()
                        .eq(LostFound::getUserId, userId)
                        .orderByDesc(LostFound::getId));
        return PageResult.of(page, this::toVO);
    }

    private LostFoundVO toVO(LostFound lf) {
        LostFoundVO vo = new LostFoundVO();
        BeanUtil.copyProperties(lf, vo);
        vo.setImageList(IdleService.parseJson(lf.getImages()));
        User publisher = userMapper.selectById(lf.getUserId());
        vo.setPublisherNickname(publisher == null ? "" : publisher.getNickname());
        vo.setPublisherAvatar(publisher == null ? null : publisher.getAvatar());
        return vo;
    }
}
