package com.campus.platform.common;

/**
 * 全局常量：角色、各类业务状态机、消息/场景/业务标识、Redis Key 前缀。
 */
public final class Constants {

    /** 角色 */
    public static final String ROLE_STUDENT = "student";
    public static final String ROLE_ADMIN = "admin";

    /** 审核状态（闲置/活动/失物/帖子通用） */
    public static final int AUDIT_PENDING = 0;
    public static final int AUDIT_PASS = 1;
    public static final int AUDIT_REJECT = 2;

    /** 用户状态 */
    public static final int USER_STATUS_NORMAL = 0;
    public static final int USER_STATUS_BANNED = 1;

    /** 闲置物品状态 */
    public static final int IDLE_ON_SHELF = 0;
    public static final int IDLE_RESERVED = 1;
    public static final int IDLE_FINISHED = 2;
    public static final int IDLE_OFF_SHELF = 3;

    /** 闲置预约状态 */
    public static final int APPOINT_PENDING = 0;
    public static final int APPOINT_ACCEPTED = 1;
    public static final int APPOINT_REJECTED = 2;
    public static final int APPOINT_FINISHED = 3;
    public static final int APPOINT_CANCELLED = 4;

    /** 活动状态 */
    public static final int ACTIVITY_SIGNING = 0;
    public static final int ACTIVITY_FULL = 1;
    public static final int ACTIVITY_ENDED = 2;
    public static final int ACTIVITY_OFF = 3;

    /** 活动有效展示状态（VO 层按时间动态计算，不落库） */
    public static final int ACT_DISPLAY_SIGNING = 0;        // 报名中
    public static final int ACT_DISPLAY_FULL = 1;           // 已满员
    public static final int ACT_DISPLAY_DEADLINE_PASSED = 2; // 报名已截止
    public static final int ACT_DISPLAY_ONGOING = 3;        // 活动进行中
    public static final int ACT_DISPLAY_ENDED = 4;          // 已结束
    public static final int ACT_DISPLAY_OFF = 5;            // 已下架

    /** 活动成员状态 */
    public static final int MEMBER_PENDING = 0;
    public static final int MEMBER_APPROVED = 1;
    public static final int MEMBER_REJECTED = 2;

    /** 失物招领类型 */
    public static final int LOST = 0;
    public static final int FOUND = 1;

    /** 失物招领状态 */
    public static final int LF_DOING = 0;
    public static final int LF_DONE = 1;
    public static final int LF_OFF = 2;

    /** 公告状态 */
    public static final int NOTICE_DRAFT = 0;
    public static final int NOTICE_PUBLISHED = 1;
    public static final int NOTICE_OFFLINE = 2;

    /** 评论状态 */
    public static final int COMMENT_NORMAL = 0;
    public static final int COMMENT_HIDDEN = 1;

    /** 举报状态 */
    public static final int REPORT_PENDING = 0;
    public static final int REPORT_HANDLED = 1;

    /** 消息分类 */
    public static final String MSG_SYSTEM = "system";
    public static final String MSG_INTERACT = "interact";
    public static final String MSG_AUDIT = "audit";

    /** AI 场景 */
    public static final String SCENE_CHAT = "chat";
    public static final String SCENE_PDF = "pdf";
    public static final String SCENE_CODE_FIX = "code_fix";
    public static final String SCENE_OUTLINE = "outline";
    public static final String SCENE_QUIZ = "quiz";
    public static final String SCENE_CONTENT_AUDIT = "content_audit";
    public static final String SCENE_WRONG_ANALYZE = "wrong_analyze"; // 错题智能整理
    public static final String SCENE_WRONG_EXPLAIN = "wrong_explain"; // 错题讲解/错因分析
    public static final String SCENE_REVIEW_PLAN = "review_plan";     // 复习计划
    public static final String SCENE_PRACTICE = "practice";           // 同类练习题生成

    /** 错题掌握状态 */
    public static final int WQ_STATUS_PENDING = 0;      // 待复习
    public static final int WQ_STATUS_REVIEWING = 1;    // 复习中
    public static final int WQ_STATUS_BASIC = 2;        // 基本掌握
    public static final int WQ_STATUS_MASTERED = 3;     // 已掌握

    /** 错题复习反馈掌握程度 */
    public static final int WQ_LEVEL_STILL_WRONG = 0;   // 仍然不会
    public static final int WQ_LEVEL_A_LITTLE = 1;      // 有点理解
    public static final int WQ_LEVEL_BASIC = 2;         // 基本掌握
    public static final int WQ_LEVEL_FULLY = 3;         // 已完全掌握

    /** 复习间隔（天）：连续答对 n 次后间隔 */
    public static final int[] WQ_REVIEW_INTERVALS_DAYS = {0, 1, 3, 7};

    /** 默认学科：待整理 */
    public static final String WQ_SUBJECT_UNSORTED = "待整理";

    /** AI 提纲生成模式 */
    public static final String OUTLINE_MODE_SUBJECT = "subject";
    public static final String OUTLINE_MODE_SELECTED = "selected";
    public static final String OUTLINE_MODE_ALL = "all";

    /** AI 练习题状态 */
    public static final int GENERATED_STATUS_PRACTICING = 0; // 练习中
    public static final int GENERATED_STATUS_SAVED = 1;      // 已加入错题本

    /** 业务对象标识（用于消息/通知等） */
    public static final String BIZ_IDLE = "idle";
    public static final String BIZ_ACTIVITY = "activity";
    public static final String BIZ_LOSTFOUND = "lostfound";
    public static final String BIZ_POST = "post";

    /** Redis Key 前缀 */
    public static final String REDIS_AI_RATE_LIMIT = "ai:rate:limit:";
    public static final String REDIS_AI_CONFIG = "ai:config:";
    public static final String REDIS_HOME_AGGREGATE = "home:aggregate";

    private Constants() {
    }
}
