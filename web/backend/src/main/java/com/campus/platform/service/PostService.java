package com.campus.platform.service;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.platform.aigateway.SensitiveWordService;
import com.campus.platform.common.BizException;
import com.campus.platform.common.Constants;
import com.campus.platform.common.PageResult;
import com.campus.platform.common.ResultCode;
import com.campus.platform.dto.CommentDTO;
import com.campus.platform.dto.PostPublishDTO;
import com.campus.platform.entity.Post;
import com.campus.platform.entity.PostComment;
import com.campus.platform.entity.PostLike;
import com.campus.platform.entity.User;
import com.campus.platform.mapper.PostCommentMapper;
import com.campus.platform.mapper.PostLikeMapper;
import com.campus.platform.mapper.PostMapper;
import com.campus.platform.mapper.UserMapper;
import com.campus.platform.vo.CommentVO;
import com.campus.platform.vo.PostVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 动态广场服务（C6）：发布（待审）→ 点赞（防重）→ 评论（DFA机审）。
 */
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostMapper postMapper;
    private final PostCommentMapper commentMapper;
    private final PostLikeMapper likeMapper;
    private final UserMapper userMapper;
    private final SensitiveWordService sensitiveWordService;
    private final MessageService messageService;
    private final ContentAiAuditService contentAiAuditService;

    /** 发动态（先审后发） */
    public Post publish(Long userId, PostPublishDTO dto) {
        if (sensitiveWordService.contains(dto.getContent())) {
            throw new BizException(ResultCode.SENSITIVE_WORD);
        }
        Post post = new Post();
        post.setUserId(userId);
        post.setContent(dto.getContent());
        post.setImages(IdleService.toJson(dto.getImages()));
        post.setLikeCount(0);
        post.setCommentCount(0);
        post.setAuditStatus(Constants.AUDIT_PENDING);
        postMapper.insert(post);
        contentAiAuditService.audit(Constants.BIZ_POST, post, userId, null, dto.getContent());
        return post;
    }

    /** 动态广场（公开，仅审核通过） */
    public PageResult<PostVO> list(Long currentUid, String keyword, int pageNum, int pageSize) {
        String normalizedKeyword = keyword == null ? null : keyword.trim();
        Page<Post> page = postMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Post>()
                        .eq(Post::getAuditStatus, Constants.AUDIT_PASS)
                        .like(normalizedKeyword != null && !normalizedKeyword.isEmpty(), Post::getContent, normalizedKeyword)
                        .orderByDesc(Post::getId));
        List<Post> records = page.getRecords();
        // 批量查作者与当前用户点赞状态
        Map<Long, User> userMap = records.isEmpty() ? Map.of() :
                userMapper.selectBatchIds(records.stream().map(Post::getUserId).distinct().toList())
                        .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<Long, Boolean> likedMap = (currentUid == null || records.isEmpty()) ? Map.of() :
                likeMapper.selectList(new LambdaQueryWrapper<PostLike>()
                        .eq(PostLike::getUserId, currentUid)
                        .in(PostLike::getPostId, records.stream().map(Post::getId).toList()))
                        .stream().collect(Collectors.toMap(PostLike::getPostId, l -> true));
        return PageResult.of(page, p -> {
            PostVO vo = new PostVO();
            BeanUtil.copyProperties(p, vo);
            vo.setImageList(IdleService.parseJson(p.getImages()));
            User u = userMap.get(p.getUserId());
            vo.setNickname(u == null ? "" : u.getNickname());
            vo.setAvatar(u == null ? null : u.getAvatar());
            vo.setLiked(likedMap.getOrDefault(p.getId(), false));
            return vo;
        });
    }

    /** 点赞（联合唯一索引防重复） */
    @Transactional
    public void like(Long userId, Long postId) {
        Post post = checkVisible(postId);
        Long exist = likeMapper.selectCount(new LambdaQueryWrapper<PostLike>()
                .eq(PostLike::getPostId, postId).eq(PostLike::getUserId, userId));
        if (exist > 0) {
            throw new BizException(ResultCode.DUPLICATE_OPERATION, "你已点赞过该动态");
        }
        PostLike like = new PostLike();
        like.setPostId(postId);
        like.setUserId(userId);
        likeMapper.insert(like);
        post.setLikeCount(post.getLikeCount() + 1);
        postMapper.updateById(post);
    }

    /** 取消点赞 */
    @Transactional
    public void unlike(Long userId, Long postId) {
        Post post = checkVisible(postId);
        long deleted = likeMapper.delete(new LambdaQueryWrapper<PostLike>()
                .eq(PostLike::getPostId, postId).eq(PostLike::getUserId, userId));
        if (deleted > 0) {
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
            postMapper.updateById(post);
        }
    }

    /**
     * 评论（DFA 机审：命中敏感词直接落库为隐藏状态并提示）。
     */
    @Transactional
    public PostComment comment(Long userId, Long postId, CommentDTO dto) {
        Post post = checkVisible(postId);
        PostComment comment = new PostComment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent(dto.getContent());
        // DFA 机审（Q3：评论走敏感词机审 + 举报兜底）
        if (sensitiveWordService.contains(dto.getContent())) {
            comment.setStatus(Constants.COMMENT_HIDDEN);
            commentMapper.insert(comment);
            throw new BizException(ResultCode.SENSITIVE_WORD);
        }
        comment.setStatus(Constants.COMMENT_NORMAL);
        commentMapper.insert(comment);
        post.setCommentCount(post.getCommentCount() + 1);
        postMapper.updateById(post);
        // 被评论消息（P1 触发点）
        if (!post.getUserId().equals(userId)) {
            User from = userMapper.selectById(userId);
            messageService.send(post.getUserId(), Constants.MSG_INTERACT,
                    "你的动态有新评论",
                    String.format("「%s」评论了你的动态：%s",
                            from == null ? "有用户" : from.getNickname(),
                            dto.getContent().length() > 50 ? dto.getContent().substring(0, 50) + "..." : dto.getContent()),
                    Constants.BIZ_POST, postId);
        }
        return comment;
    }

    /** 评论列表（公开，仅正常状态） */
    public PageResult<CommentVO> comments(Long postId, int pageNum, int pageSize) {
        Page<PostComment> page = commentMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<PostComment>()
                        .eq(PostComment::getPostId, postId)
                        .eq(PostComment::getStatus, Constants.COMMENT_NORMAL)
                        .orderByAsc(PostComment::getId));
        List<PostComment> records = page.getRecords();
        Map<Long, User> userMap = records.isEmpty() ? Map.of() :
                userMapper.selectBatchIds(records.stream().map(PostComment::getUserId).distinct().toList())
                        .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return PageResult.of(page, c -> {
            CommentVO vo = new CommentVO();
            BeanUtil.copyProperties(c, vo);
            User u = userMap.get(c.getUserId());
            vo.setNickname(u == null ? "" : u.getNickname());
            vo.setAvatar(u == null ? null : u.getAvatar());
            return vo;
        });
    }

    private Post checkVisible(Long postId) {
        Post post = postMapper.selectById(postId);
        if (post == null || post.getAuditStatus() != Constants.AUDIT_PASS) {
            throw new BizException(ResultCode.NOT_FOUND, "动态不存在或未通过审核");
        }
        return post;
    }
}
