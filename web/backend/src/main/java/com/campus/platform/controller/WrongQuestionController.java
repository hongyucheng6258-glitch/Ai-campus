package com.campus.platform.controller;

import com.campus.platform.common.PageResult;
import com.campus.platform.common.R;
import com.campus.platform.common.UserContext;
import com.campus.platform.dto.WrongQuestionDTO;
import com.campus.platform.entity.WrongQuestion;
import com.campus.platform.service.WrongQuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wrong-question")
@RequiredArgsConstructor
public class WrongQuestionController {
    private final WrongQuestionService wrongQuestionService;

    @GetMapping("/list")
    public R<PageResult<WrongQuestion>> list(
            @RequestParam(required = false) String subject,
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        return R.ok(wrongQuestionService.list(UserContext.getUid(), subject, pageNum, pageSize));
    }

    @GetMapping("/subjects")
    public R<List<String>> subjects() {
        return R.ok(wrongQuestionService.subjects(UserContext.getUid()));
    }

    @GetMapping("/{id}")
    public R<WrongQuestion> get(@PathVariable Long id) {
        return R.ok(wrongQuestionService.getOwned(UserContext.getUid(), id));
    }

    @PostMapping
    public R<WrongQuestion> create(@Valid @RequestBody WrongQuestionDTO dto) {
        return R.ok(wrongQuestionService.create(UserContext.getUid(), dto, "manual"));
    }

    @PutMapping("/{id}")
    public R<WrongQuestion> update(@PathVariable Long id, @Valid @RequestBody WrongQuestionDTO dto) {
        return R.ok(wrongQuestionService.update(UserContext.getUid(), id, dto));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        wrongQuestionService.delete(UserContext.getUid(), id);
        return R.ok();
    }
}
