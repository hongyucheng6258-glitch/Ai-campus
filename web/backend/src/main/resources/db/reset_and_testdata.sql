-- ============================================================
-- AI校园综合服务平台 —— 数据重置 + 测试数据脚本
-- 执行：mysql -uroot -p ai_campus_platform < reset_and_testdata.sql
-- ============================================================

USE ai_campus_platform;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==================== 1. 清空所有表数据 ====================
TRUNCATE TABLE `message`;
TRUNCATE TABLE `report`;
TRUNCATE TABLE `post_like`;
TRUNCATE TABLE `post_comment`;
TRUNCATE TABLE `post`;
TRUNCATE TABLE `notice`;
TRUNCATE TABLE `lost_found`;
TRUNCATE TABLE `activity_signin`;
TRUNCATE TABLE `activity_member`;
TRUNCATE TABLE `activity`;
TRUNCATE TABLE `idle_review`;
TRUNCATE TABLE `idle_appointment`;
TRUNCATE TABLE `idle_item`;
TRUNCATE TABLE `wrong_question_generated`;
TRUNCATE TABLE `wrong_question_review`;
TRUNCATE TABLE `wrong_question`;
TRUNCATE TABLE `pdf_document`;
TRUNCATE TABLE `prompt_template`;
TRUNCATE TABLE `ai_config`;
TRUNCATE TABLE `ai_call_log`;
TRUNCATE TABLE `ai_message`;
TRUNCATE TABLE `ai_session`;
TRUNCATE TABLE `sensitive_word`;
TRUNCATE TABLE `admin`;
TRUNCATE TABLE `user`;

SET FOREIGN_KEY_CHECKS = 1;

-- ==================== 2. 基础数据 ====================

-- 管理员
INSERT INTO `admin` (`id`, `username`, `password`, `nickname`, `role`, `status`) VALUES
(1, 'admin', '$2a$10$mhhWC1d1vn0htoHLVFgbquJUvefFeCMJAdFLNJb1j4/lXXfnd.lPe', '超级管理员', 'super', 0),
(2, 'auditor', '$2a$10$mhhWC1d1vn0htoHLVFgbquJUvefFeCMJAdFLNJb1j4/lXXfnd.lPe', '审核员小王', 'audit', 0);

-- AI配置
INSERT INTO `ai_config` (`config_key`, `config_value`, `description`) VALUES
('base_url', 'https://api.deepseek.com', '模型服务地址（OpenAI兼容）'),
('api_key', '', 'DeepSeek API Key，为空则用application.yml占位'),
('model_name', 'deepseek-chat', '模型名称'),
('temperature', '0.7', '采样温度'),
('max_tokens', '2048', '最大输出token'),
('timeout_ms', '60000', '调用超时毫秒'),
('retry_times', '2', '失败重试次数'),
('rate_limit_per_day', '50', '每用户每日AI调用上限');

-- 提示词模板
INSERT INTO `prompt_template` (`scene`, `name`, `content`) VALUES
('chat', '默认答疑模板', '你是一名耐心的大学课程辅导老师，请用清晰、分步骤的方式解答学生的问题，必要时给出示例。\n\n学生问题：{question}'),
('code_fix', '代码纠错模板', '你是一名资深程序员，请检查以下{language}代码中的错误，输出Markdown格式：\n1. 【错误定位】指出行号与错误原因\n2. 【修复建议】给出修改方法\n3. 【修复后代码】用代码块给出完整修正代码\n\n待检查代码：\n```{language}\n{code}\n```'),
('pdf', 'PDF问答模板', '你正在基于一份课件文档回答学生问题。以下是文档相关内容片段：\n\n{context}\n\n请严格基于上述文档内容回答问题，文档未涉及的内容请说明"文档中未提及"。\n\n问题：{question}'),
('outline', '复习提纲模板', '请为「{subject}」学科中「{topic}」这一主题生成一份结构化复习提纲，要求：层级化要点（最多三级）、每个要点附一句话说明、结尾给出3个自测问题。输出Markdown格式。'),
('quiz', '智能习题模板', '基于以下这道错题，请生成3道同类型、同难度的新习题，每道题给出标准答案与详细解析。输出Markdown格式。\n\n学科：{subject}\n错题：{question}\n正确答案：{answer}'),
('wrong_analyze', '错题智能整理模板', '你是一名资深学科老师。请分析以下错题，只输出一个 JSON 对象（不要输出任何其他文字或代码块标记），字段如下：\n{\n  "questionType": "题型，如：选择/填空/简答/计算/编程",\n  "subject": "推测的学科，如：Java/高等数学/数据结构",\n  "chapter": "所属章节",\n  "difficulty": "难度：易/中/难",\n  "knowledgePoints": "知识点数组，如：[\\"多线程\\",\\"锁\\"]",\n  "errorReason": "错因：概念不清/公式记错/审题错误/计算错误/粗心大意/不会解题/知识点混淆/其他",\n  "summary": "不超过50字的本题知识点摘要"\n}\n\n学科（已知）：{subject}\n题目：{question_text}\n我的答案：{my_answer}\n正确答案：{correct_answer}\n解析：{analysis}'),
('wrong_explain', '错题讲解模板', '你是一名耐心的学科辅导老师。请针对学生做错的这道题，输出 Markdown 格式的讲解：\n1. 【错误分析】指出学生的答案错在哪里、为什么错\n2. 【知识点讲解】讲解本题涉及的核心知识点，分步骤说明\n3. 【正确思路】给出正确的解题思路与答案\n4. 【易错提醒】一句话总结以后再遇到这类题要注意什么\n\n学科：{subject}\n题目：{question_text}\n我的答案：{my_answer}\n正确答案：{correct_answer}\n解析：{analysis}\n错因：{error_reason}'),
('review_plan', '复习计划模板', '你是一名学习规划师。请根据学生错题本中的待复习题目，生成一份今天的复习计划，输出 Markdown：\n1. 【今日复习清单】按优先级列出待复习题目及理由\n2. 【推荐复习顺序】说明先复习什么、后复习什么\n3. 【复习方法建议】针对不同错因给出对应复习方法\n4. 【自测问题】2-3 个检验掌握程度的问题\n\n学科筛选：{subject}\n待复习题目列表：\n{question_list}'),
('practice', '同类练习模板', '你是一名出题老师。请基于原错题生成一道同类型、同难度的新练习题，只输出一个 JSON 对象（不要输出其他文字或代码块标记）：\n{\n  "question": "题目内容",\n  "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],（选择题必填数组；填空/简答等题型传空数组 []）\n  "answer": "正确答案（选择题为选项字母如 A；其他为答案文本）",\n  "analysis": "详细解析"\n}\n\n学科：{subject}\n原题：{question_text}\n原答案：{correct_answer}\n原解析：{analysis}');

-- 敏感词
INSERT INTO `sensitive_word` (`word`) VALUES
('赌博'), ('诈骗'), ('代考'), ('作弊'), ('色情'), ('暴力'), ('毒品'), ('枪支');

-- ==================== 3. 测试用户 ====================
INSERT INTO `user` (`id`, `student_no`, `nickname`, `password`, `phone`, `gender`, `bio`, `status`, `last_login_time`) VALUES
(1, '2021001', '张三', '$2a$10$mhhWC1d1vn0htoHLVFgbquJUvefFeCMJAdFLNJb1j4/lXXfnd.lPe', '13800000001', 1, '计算机学院大三学生，爱编程', 0, NOW()),
(2, '2021002', '李四', '$2a$10$mhhWC1d1vn0htoHLVFgbquJUvefFeCMJAdFLNJb1j4/lXXfnd.lPe', '13800000002', 1, '数理学院大二学生', 0, NOW()),
(3, '2021003', '王五', '$2a$10$mhhWC1d1vn0htoHLVFgbquJUvefFeCMJAdFLNJb1j4/lXXfnd.lPe', '13800000003', 0, '外国语学院大一新生', 0, NOW()),
(4, '2021004', '赵六', '$2a$10$mhhWC1d1vn0htoHLVFgbquJUvefFeCMJAdFLNJb1j4/lXXfnd.lPe', '13800000004', 2, '艺术学院大四学姐', 0, NOW()),
(5, '2021005', '陈七', '$2a$10$mhhWC1d1vn0htoHLVFgbquJUvefFeCMJAdFLNJb1j4/lXXfnd.lPe', '13800000005', 1, '研究生一年级，AI方向', 0, NOW());

-- ==================== 4. AI 子系统数据 ====================

-- AI会话
INSERT INTO `ai_session` (`id`, `user_id`, `scene`, `title`) VALUES
(1, 1, 'chat', 'Java多线程答疑'),
(2, 1, 'code_fix', '代码纠错 - 排序算法'),
(3, 2, 'chat', '高数微积分问题'),
(4, 5, 'chat', '机器学习入门'),
(5, 3, 'outline', '英语四级复习提纲');

-- AI消息
INSERT INTO `ai_message` (`session_id`, `role`, `content`, `tokens`) VALUES
(1, 'user', 'Java中synchronized和Lock的区别是什么？', 15),
(1, 'assistant', '## synchronized vs Lock\n\n### 1. 语法层面\n- **synchronized**：关键字，自动加锁解锁\n- **Lock**：接口，需要手动 lock() 和 unlock()\n\n### 2. 功能特性\n| 特性 | synchronized | Lock |\n|---|---|---|\n| 可中断等待 | ❌ | ✅ lockInterruptibly() |\n| 超时获取 | ❌ | ✅ tryLock(time, unit) |\n| 公平锁 | ❌ | ✅ 构造参数 |\n| 读写分离 | ❌ | ✅ ReentrantReadWriteLock |\n\n### 3. 性能\nJDK 6 优化后两者性能相近，synchronized 更简洁推荐优先使用。', 200),
(2, 'user', '帮我检查一下这段冒泡排序代码有什么问题\n\n```java\npublic void bubbleSort(int[] arr) {\n    for (int i = 0; i < arr.length; i++) {\n        for (int j = 0; j < arr.length - 1; j++) {\n            if (arr[j] > arr[j + 1]) {\n                int temp = arr[j];\n                arr[j] = arr[j + 1];\n                arr[j + 1] = temp;\n            }\n        }\n    }\n}\n```', 50),
(2, 'assistant', '### 问题分析\n\n代码逻辑正确，但存在**性能优化空间**：\n\n1. **外层循环次数过多**：每轮确定一个最大值，只需 n-1 轮\n2. **内层循环未优化**：已排序的尾部无需再比较\n\n### 优化建议\n\n```java\npublic void bubbleSort(int[] arr) {\n    int n = arr.length;\n    for (int i = 0; i < n - 1; i++) {\n        boolean swapped = false;\n        for (int j = 0; j < n - 1 - i; j++) {\n            if (arr[j] > arr[j + 1]) {\n                int temp = arr[j];\n                arr[j] = arr[j + 1];\n                arr[j + 1] = temp;\n                swapped = true;\n            }\n        }\n        if (!swapped) break;  // 已有序，提前结束\n    }\n}\n```', 180);

-- AI调用日志
INSERT INTO `ai_call_log` (`id`, `user_id`, `scene`, `model`, `prompt_tokens`, `completion_tokens`, `cost_ms`, `status`) VALUES
(1, 1, 'chat', 'deepseek-chat', 15, 200, 3200, 0),
(2, 1, 'code_fix', 'deepseek-chat', 50, 180, 4500, 0),
(3, 2, 'chat', 'deepseek-chat', 20, 150, 2800, 0),
(4, 5, 'chat', 'deepseek-chat', 30, 300, 5100, 0),
(5, 1, 'chat', 'deepseek-chat', 25, 120, 1900, 1);

-- 错题本
INSERT INTO `wrong_question` (`id`, `user_id`, `subject`, `tag`, `question`, `correct_answer`, `analysis`, `status`, `wrong_count`, `next_review_time`, `source`) VALUES
(1, 1, 'Java', '多线程', 'synchronized修饰静态方法和实例方法有什么区别？', '静态方法锁的是Class对象，实例方法锁的是当前实例对象', '静态方法属于类级别的锁，不同实例访问同一个静态同步方法时互斥；实例方法锁只对同一个实例互斥。', 0, 2, DATE_SUB(NOW(), INTERVAL 1 DAY), 'manual'),
(2, 1, '数据结构', '排序', '快速排序的最坏时间复杂度是多少？如何避免？', 'O(n²)，通过随机选择基准元素避免', '当每次选择的基准都是最大或最小元素时，退化为O(n²)。随机化选择基准可使期望复杂度保持O(n log n)。', 2, 1, DATE_ADD(NOW(), INTERVAL 2 DAY), 'ai'),
(3, 2, '高数', '微积分', '求 ∫ x·e^x dx', 'x·e^x - e^x + C', '使用分部积分法：令 u=x, dv=e^x dx，则 du=dx, v=e^x，代入公式 ∫udv = uv - ∫vdu。', 3, 1, DATE_ADD(NOW(), INTERVAL 7 DAY), 'manual');

-- 错题复习记录
INSERT INTO `wrong_question_review` (`id`, `user_id`, `wrong_question_id`, `is_correct`, `mastery_level`, `review_time`) VALUES
(1, 1, 1, 0, 0, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 1, 2, 1, 2, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 2, 3, 1, 3, DATE_SUB(NOW(), INTERVAL 5 DAY));

-- ==================== 5. 闲置互换数据 ====================

-- 闲置物品
INSERT INTO `idle_item` (`id`, `user_id`, `title`, `description`, `category`, `expect_item`, `audit_status`, `status`, `view_count`) VALUES
(1, 1, '高等数学第七版上册', '同济大学版，九成新，无划痕笔记', '教材', '换一本线性代数', 1, 0, 45),
(2, 2, '全新英语四级真题', '2024年6月版，只做了两套，其余全新', '教辅', '换一杯奶茶即可', 1, 0, 32),
(3, 3, '吉他入门教程', '含配套视频课程兑换码，入门自学够用', '兴趣', '换一个马克杯', 0, 0, 12),
(4, 4, '素描铅笔套装', '6B到2H共12支，只用过3支', '文具', '换一本笔记本', 1, 1, 28),
(5, 1, '二手自行车', '7成新，通勤代步没问题，急需出手', '生活', '150元或等价物品', 1, 0, 67),
(6, 5, '算法导论（CLRS）', '经典教材，少量笔记，考研必备', '教材', '换深度学习书籍', 1, 0, 53);

-- 闲置预约
INSERT INTO `idle_appointment` (`id`, `item_id`, `buyer_id`, `seller_id`, `message`, `status`) VALUES
(1, 2, 3, 2, '你好，想换你这套四级真题，我请你喝奶茶！', 0),
(2, 4, 1, 4, '我有笔记本，想换你的铅笔套装', 1),
(3, 5, 2, 1, '150元卖吗？今天是明天能看车吗？', 2);

-- 闲置互评
INSERT INTO `idle_review` (`appointment_id`, `from_user_id`, `to_user_id`, `score`, `content`) VALUES
(2, 1, 4, 5, '学姐很耐心，交易愉快！'),
(2, 4, 1, 5, '学弟很爽快，好评');

-- ==================== 6. 活动组队数据 ====================

INSERT INTO `activity` (`id`, `user_id`, `title`, `description`, `category`, `location`, `start_time`, `end_time`, `signup_deadline`, `max_members`, `audit_status`, `status`) VALUES
(1, 1, 'ACM集训队招新', '面向全校招募编程竞赛选手，每周六集训', '竞赛', '计算机学院楼301', '2026-09-01 14:00:00', '2026-12-30 17:00:00', '2026-08-30 23:59:59', 20, 1, 0),
(2, 4, '校园写生采风', '周末一起去后山写生，自带画具', '兴趣', '学校后山公园', '2026-08-10 09:00:00', '2026-08-10 16:00:00', '2026-08-09 23:59:59', 10, 1, 0),
(3, 2, '高数期末复习小组', '一起刷题、讨论，目标90+', '学习', '图书馆三楼讨论区', '2026-08-15 09:00:00', '2026-08-15 12:00:00', '2026-08-14 23:59:59', 5, 1, 0),
(4, 5, 'AI论文分享会', '每周一次，分享最新AI论文，欢迎各年级参加', '学术', '线上腾讯会议', '2026-08-20 19:00:00', '2026-08-20 21:00:00', '2026-08-19 23:59:59', 0, 0, 0);

-- 活动报名
INSERT INTO `activity_member` (`activity_id`, `user_id`, `remark`, `status`) VALUES
(1, 2, '大二计科，有C++基础', 1),
(1, 3, '大一新生，想学编程', 0),
(2, 1, '学过一点素描，想参加', 1),
(2, 3, '带画架可以吗？', 1),
(2, 5, '摄影可以参加吗？', 0),
(3, 1, '高数上期末95，可以帮大家答疑', 1);

-- 活动签到
INSERT INTO `activity_signin` (`activity_id`, `user_id`) VALUES
(2, 1);

-- ==================== 7. 失物招领数据 ====================

INSERT INTO `lost_found` (`id`, `user_id`, `type`, `title`, `description`, `location`, `contact`, `audit_status`, `status`) VALUES
(1, 2, 0, '丢失校园卡', '校园卡，学号2021002，捡到请联系我', '食堂到图书馆路上', '13800000002', 1, 0),
(2, 3, 1, '捡到U盘', '在机房捡到银色U盘，内有课件', '信息楼302机房', '13800000003', 1, 0),
(3, 4, 0, '丢失蓝色水杯', '膳魔师蓝色保温杯，杯盖有贴纸', '体育馆', '13800000004', 1, 0),
(4, 5, 1, '捡到一本笔记本', '红色封皮笔记本，扉页写着"2021"', '图书馆二楼自习区', '13800000005', 0, 0);

-- ==================== 8. 公告数据 ====================

INSERT INTO `notice` (`id`, `admin_id`, `title`, `content`, `status`, `publish_time`) VALUES
(1, 1, '2026年秋季学期选课通知', '2026年秋季学期选课将于8月20日开始，请同学们提前查看培养方案，合理规划选课计划。\n\n**选课时间安排：**\n- 第一轮：8月20日-8月25日\n- 第二轮：8月28日-8月30日\n\n详情请关注教务处官网。', 1, '2026-08-01 09:00:00'),
(2, 1, '图书馆暑期开放时间调整', '暑假期间图书馆开放时间调整为：\n- 周一至周五：8:00-18:00\n- 周六日：9:00-17:00\n\n请同学们互相转告。', 1, '2026-07-15 10:00:00'),
(3, 1, '欢迎使用AI校园综合服务平台', '本平台提供AI学习辅助、闲置互换、活动组队、失物招领等服务，欢迎同学们使用！\n\n如有问题请联系平台管理员。', 1, '2026-08-01 08:00:00'),
(4, 2, '[草稿] 国庆节放假安排', '国庆节放假安排待学校通知，请关注后续公告。', 0, NULL);

-- ==================== 9. 动态数据 ====================

INSERT INTO `post` (`id`, `user_id`, `content`, `images`, `like_count`, `comment_count`, `audit_status`) VALUES
(1, 1, '今天终于把SpringBoot项目跑通了！开心！\n\n从搭环境到写CRUD，踩了好多坑，但收获满满。', NULL, 5, 2, 1),
(2, 2, '求问：高数下中值定理那块有什么好的学习方法吗？感觉好难😭', NULL, 3, 1, 1),
(3, 4, '新画了一幅水彩，校园的夏天，大家看看怎么样', '["https://picsum.photos/seed/art1/400/300"]', 12, 3, 1),
(4, 5, '分享一篇LLM推理加速的综述，写得很全面，推荐阅读', NULL, 8, 1, 1),
(5, 3, '出四级真题，只做了两套，价格好商量', NULL, 1, 0, 0);

-- 动态评论
INSERT INTO `post_comment` (`id`, `post_id`, `user_id`, `content`, `status`) VALUES
(1, 1, 2, '恭喜！SpringBoot确实好用，建议试试写单元测试', 0),
(2, 1, 5, '推荐看官方文档，写得很好', 0),
(3, 2, 1, '可以看张宇老师的视频，讲得很清楚', 0),
(4, 3, 1, '画得好好！色彩很舒服', 0),
(5, 3, 2, '太美了！校园的夏天确实好看', 0),
(6, 3, 5, '厉害，求带', 0),
(7, 4, 1, '已收藏，感谢分享', 0);

-- 动态点赞
INSERT INTO `post_like` (`post_id`, `user_id`) VALUES
(1, 2), (1, 3), (1, 4), (1, 5),
(2, 1), (2, 3), (2, 5),
(3, 1), (3, 2), (3, 5),
(4, 1), (4, 2), (4, 3);

-- ==================== 10. 举报数据 ====================

INSERT INTO `report` (`id`, `reporter_id`, `target_type`, `target_id`, `reason_type`, `reason`, `status`, `handle_result`, `handler_id`, `handle_time`) VALUES
(1, 2, 'post', 5, '广告推广', '这个帖子看起来像在卖东西，不确定是不是违规', 1, '审核通过，内容为正常闲置发布，无需处理', 1, '2026-08-02 10:30:00'),
(2, 3, 'comment', 3, '不友善内容', '评论内容含有不友善词汇', 0, NULL, NULL, NULL);

-- ==================== 11. 消息通知数据 ====================

INSERT INTO `message` (`id`, `user_id`, `type`, `title`, `content`, `biz_type`, `biz_id`, `is_read`) VALUES
(1, 1, 'audit', '闲置物品审核通过', '您发布的"高等数学第七版上册"已通过审核', 'idle', 1, 1),
(2, 4, 'audit', '闲置物品审核通过', '您发布的"素描铅笔套装"已通过审核', 'idle', 4, 1),
(3, 1, 'interact', '新预约消息', '用户"李四"预约了您的"二手自行车"', 'idle', 5, 0),
(4, 3, 'audit', '活动报名通过', '您的"校园写生采风"报名申请已通过', 'activity', 2, 0),
(5, 1, 'system', '欢迎使用平台', '欢迎加入AI校园综合服务平台，祝您使用愉快！', NULL, NULL, 1);

-- ==================== 完成 ====================
SELECT '数据重置与测试数据插入完成！' AS result;