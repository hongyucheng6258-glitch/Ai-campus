package com.campus.platform.controller;

import com.campus.platform.common.PageResult;
import com.campus.platform.common.R;
import com.campus.platform.common.UserContext;
import com.campus.platform.dto.CommentDTO;
import com.campus.platform.dto.PostPublishDTO;
import com.campus.platform.entity.Post;
import com.campus.platform.entity.PostComment;
import com.campus.platform.service.PostService;
import com.campus.platform.vo.CommentVO;
import com.campus.platform.vo.PostVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/post")
@RequiredArgsConstructor
public class PostController {
    private final PostService postService;

    @PostMapping
    public R<Post> publish(@Valid @RequestBody PostPublishDTO dto) {
        return R.ok(postService.publish(UserContext.getUid(), dto));
    }

    @GetMapping("/list")
    public R<PageResult<PostVO>> list(
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        UserContext.CurrentUser current = UserContext.get();
        Long uid = current == null ? null : current.uid();
        return R.ok(postService.list(uid, pageNum, pageSize));
    }

    @PostMapping("/{id}/like")
    public R<Void> like(@PathVariable Long id) {
        postService.like(UserContext.getUid(), id);
        return R.ok();
    }

    @DeleteMapping("/{id}/like")
    public R<Void> unlike(@PathVariable Long id) {
        postService.unlike(UserContext.getUid(), id);
        return R.ok();
    }

    @PostMapping("/{id}/comment")
    public R<PostComment> comment(@PathVariable Long id, @Valid @RequestBody CommentDTO dto) {
        return R.ok(postService.comment(UserContext.getUid(), id, dto));
    }

    @GetMapping("/{id}/comments")
    public R<PageResult<CommentVO>> comments(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "20") Integer pageSize) {
        return R.ok(postService.comments(id, pageNum, pageSize));
    }
}
