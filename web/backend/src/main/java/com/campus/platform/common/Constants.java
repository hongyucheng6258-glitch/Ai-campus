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
