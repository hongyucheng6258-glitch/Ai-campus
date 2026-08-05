package com.campus.platform.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.platform.common.BizException;
import com.campus.platform.common.PageResult;
import com.campus.platform.common.ResultCode;
import com.campus.platform.dto.WrongQuestionDTO;
import com.campus.platform.entity.WrongQuestion;
import com.campus.platform.mapper.WrongQuestionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 错题本服务（B6）：CRUD + 学科筛选。
 */
@Service
@RequiredArgsConstructor
public class WrongQuestionService {

    private final WrongQuestionMapper wrongQuestionMapper;

    /** 分页列表（可按学科筛选） */
    public PageResult<WrongQuestion> list(Long userId, String subject, int pageNum, int pageSize) {
        Page<WrongQuestion> page = wrongQuestionMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<WrongQuestion>()
                        .eq(WrongQuestion::getUserId, userId)
                        .eq(StrUtil.isNotBlank(subject), WrongQuestion::getSubject, subject)
                        .orderByDesc(WrongQuestion::getId));
        return PageResult.of(page);
    }

    public WrongQuestion getOwned(Long userId, Long id) {
        WrongQuestion wq = wrongQuestionMapper.selectById(id);
        if (wq == null) {
            throw new BizException(ResultCode.NOT_FOUND, "错题不存在");
        }
        if (!wq.getUserId().equals(userId)) {
            throw new BizException(ResultCode.FORBIDDEN, "无权访问该错题");
        }
        return wq;
    }

    /** 新增（source: manual/ai） */
    public WrongQuestion create(Long userId, WrongQuestionDTO dto, String source) {
        WrongQuestion wq = new WrongQuestion();
        wq.setUserId(userId);
        wq.setSubject(dto.getSubject());
        wq.setTag(dto.getTag());
        wq.setQuestion(dto.getQuestion());
        wq.setAnswer(dto.getAnswer());
        wq.setAnalysis(dto.getAnalysis());
        wq.setSource(source);
        wrongQuestionMapper.insert(wq);
        return wq;
    }

    public WrongQuestion update(Long userId, Long id, WrongQuestionDTO dto) {
        WrongQuestion wq = getOwned(userId, id);
        wq.setSubject(dto.getSubject());
        wq.setTag(dto.getTag());
        wq.setQuestion(dto.getQuestion());
        wq.setAnswer(dto.getAnswer());
        wq.setAnalysis(dto.getAnalysis());
        wrongQuestionMapper.updateById(wq);
        return wq;
    }

    public void delete(Long userId, Long id) {
        getOwned(userId, id);
        wrongQuestionMapper.deleteById(id);
    }

    /** 当前用户全部学科标签（筛选条用） */
    public java.util.List<String> subjects(Long userId) {
        return wrongQuestionMapper.selectList(new LambdaQueryWrapper<WrongQuestion>()
                        .eq(WrongQuestion::getUserId, userId)
                        .select(WrongQuestion::getSubject)
                        .groupBy(WrongQuestion::getSubject))
                .stream().map(WrongQuestion::getSubject).toList();
    }
}
