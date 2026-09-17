# AI校园综合服务平台

> **开发状态：已完成开发** — 全部功能模块已开发完成并通过测试，可部署使用。

AI校园综合服务平台是一套面向高校学生的综合服务系统，覆盖**校园信息、AI 学习辅助、社交互动、物品交易、内容治理**等完整闭环：

- **校园信息**：活动发布/报名/签到、公告、校园动态、失物招领（AI 智能匹配）、闲置互换（AI 智能估价）
- **社交互动**：学习搭子（AI 匹配撮合）、校园互助问答（AI 参考回答）、私信实时聊天、他人主页聚合、内容举报
- **AI 学习**：智能对话、代码修复、PDF 学习问答、错题本（拍照 OCR 录入/智能整理/同类题生成/复习计划）、AI 辅助发布（草稿/润色/扩写）、AI 校园向导
- **智能推荐**：活动智能推荐（按报名偏好）、失物智能匹配、搭子智能匹配
- **内容治理**：AI 分级审核（低风险自动通过、中高风险人工复核）、人工审核、内容下架、举报处理、全量内容管理

平台通过 DeepSeek AI 接口提供全部 AI 能力，同时内置本地风险词规则与 AI 语义审核双保险。登录采用**图形验证码 + 数字运算验证随机切换**，注册内置**人机检测**，保障账号安全。

项目包含 **Web 学生端**、**Web 管理后台**和 **Spring Boot 后端**，后端按业务模块化分层，适合作为校园综合服务平台的课程设计或毕业设计项目基础。

## 功能总览

### 学生端

| 模块 | 功能 |
|---|---|
| 账号 | 注册（人机检测）、登录（图形验证码 / 数字运算验证随机出现）、个人资料、账号设置 |
| 首页 | 校园首页、全局搜索（活动/闲置/失物/动态）、公告列表与详情 |
| 活动 | 浏览、发布（AI 辅助起草）、报名、审批、**取消报名**、签到（二维码）、我的报名/发布、**AI 智能推荐** |
| 闲置 | 发布（AI 辅助起草）、浏览、预约、处理、评价、**AI 智能估价** |
| 失物招领 | 发布（AI 辅助起草）、浏览、**AI 智能匹配**、认领、确认、完成 |
| 学习搭子 | 发布、浏览、**AI 匹配撮合（带推荐理由）**、标记已找到 |
| 互助问答 | 提问、回答、采纳、**AI 参考回答**、我的提问/回答 |
| 动态广场 | 发布（AI 辅助起草）、详情、评论、点赞 |
| 社交 | 站内消息、私信实时聊天（含频率限制）、拉黑、举报、**他人主页聚合（发布/动态/评价）** |
| AI 学习 | AI 对话、代码修复、PDF 学习问答、大纲生成、错题本（OCR 拍照录入/智能整理/讲解/同类题生成/复习计划/薄弱点分析） |
| 用户 | 他人主页（作者名进入 TA 的发布/动态/评价聚合页） |

### 管理后台

| 模块 | 功能 |
|---|---|
| 数据大屏 | 平台运营核心指标统计 |
| 用户管理 | 用户列表、状态管理 |
| 内容审核 | 活动/闲置/失物/动态/**学习搭子**五类 UGC 审核（含 **AI 预审结论展示**：风险等级/理由/来源） |
| AI 内容审核 | AI 自动放行/待复核/拦截日志、恢复展示/维持拦截 |
| 内容管理 | 活动/闲置/失物/动态/搭子/问答六类内容统一治理（下架/恢复） |
| 举报处理 | 内容/用户/聊天举报处理（处理后红点清零） |
| 公告管理 | 发布、上下线 |
| AI 管理 | AI 配置（在线密钥）、调用日志、场景统计 |
| 活动运营 | 报名名单管理、**报名/签到报表导出**（Excel） |
| 系统配置 | 站点名称、维护模式、注册开关、**AI 审核开关**、风险词配置等 |
| 管理员 | 子管理员账号管理（角色：超级管理员/审核员） |

## AI 能力矩阵

| 场景 | 能力 |
|---|---|
| `chat` | 校园 AI 智能对话 |
| `pdf` | PDF 学习问答（大纲生成） |
| `code_fix` | 代码修复 |
| `wrong_analyze / wrong_explain` | 错题智能整理 / 错题讲解与错因分析 |
| `review_plan` | 错题复习计划 |
| `practice` | 同类练习题生成 |
| `assist_compose / assist_polish` | AI 辅助发布：草稿生成 / 润色·扩写·精简 |
| `campus_guide` | AI 校园向导：业务数据问答 |
| `lost_match` | 失物招领 AI 智能匹配 |
| `idle_estimate` | 闲置物品 AI 智能估价 |
| `partner_match` | 学习搭子 AI 匹配撮合 |
| `qa_answer` | 校园互助 AI 参考回答 |
| `activity_recommend` | 活动 AI 智能推荐 |
| `content_audit` | 内容 AI 分级审核（低风险自动通过 / 中高转人工） |

## 技术栈

### 后端

- Java 17、Spring Boot 3.2.5、Spring MVC、Spring Validation
- Spring WebSocket（实时聊天）、Spring Scheduling（活动状态自动同步）
- MyBatis-Plus 3.5.7、MySQL 8、Redis
- JWT 双重校验（签名 + 角色声明，防学生 Token 访问管理端）
- MinIO 兼容接口（图片已改为数据库 Base64 存储）
- PDFBox、OkHttp SSE（AI 流式响应）、DeepSeek OpenAI 兼容接口
- Hutool、Lombok

### Web 前端

- Vue 3、Vite 5、Vue Router、Pinia
- Element Plus、Axios、ECharts、Markdown It、WangEditor
- Tesseract.js（错题拍照 OCR 识别）

## 项目结构

```text
Ai-campus/
├── web/
│   ├── backend/                      # Spring Boot 后端
│   │   ├── src/main/java/com/campus/platform/
│   │   │   ├── common/               # 常量、结果码、公共工具
│   │   │   ├── config/               # 配置类（WebMvc、系统配置）
│   │   │   ├── interceptor/          # 拦截器（JWT、维护模式）
│   │   │   ├── utils/                # 工具类
│   │   │   └── module/               # 业务模块（按功能分类）
│   │   │       ├── auth/             #   登录注册、验证码、人机检测
│   │   │       ├── user/             #   用户、他人主页聚合
│   │   │       ├── activity/         #   活动、报名、签到、AI 推荐
│   │   │       ├── idle/             #   闲置、预约、评价、AI 估价
│   │   │       ├── lostfound/        #   失物、认领、AI 匹配
│   │   │       ├── partner/          #   学习搭子、AI 匹配
│   │   │       ├── qa/               #   互助问答、AI 参考回答
│   │   │       ├── post/             #   动态、评论、点赞
│   │   │       ├── chat/             #   私信会话、实时聊天
│   │   │       ├── message/          #   站内消息
│   │   │       ├── notice/           #   公告
│   │   │       ├── report/           #   举报
│   │   │       ├── favorite/         #   收藏
│   │   │       ├── upload/           #   文件上传
│   │   │       ├── site/             #   站点配置
│   │   │       ├── ai/               #   AI 网关、内容审核、错题本
│   │   │       └── admin/            #   管理端（审核/内容治理/统计/报表）
│   │   ├── src/main/resources/       # 配置、数据库脚本、敏感词
│   │   ├── src/test/                 # 后端测试
│   │   └── pom.xml
│   └── frontend/
│       ├── student/                  # Web 学生端（端口 5173）
│       └── admin/                    # Web 管理后台（端口 5174）
├── .gitignore
├── README.md
└── 部署说明.md
```

## 环境要求

- JDK 17+、Maven 3.8+、Node.js 18+、npm
- MySQL 8（建议 `max_allowed_packet=128M`，图片以 Base64 入库）
- Redis 6+
- MinIO（可选，仅兼容旧接口，图片已改为数据库存储）
- DeepSeek API Key（AI 能力依赖）

## 数据库初始化

1. 创建数据库 `ai_campus_platform`（字符集 `utf8mb4`）。
2. 执行 `web/backend/src/main/resources/db/schema.sql` 初始化基础表结构。
3. 依次执行迁移脚本（增量升级，按顺序）：

```text
migrate_v2_wrongbook.sql              # 错题本表
migrate_v3_wrongbook_analyze.sql      # 错题分析与薄弱点
migrate_v4_wrongbook_generated.sql    # 生成题与复习
migrate_v5_images_to_db.sql           # 图片迁移至数据库 Base64
migrate_v6_all_uploads_to_db.sql      # 全部上传文件迁移至数据库
migrate_v7_system_config.sql          # 系统配置表
2026-08-05-chat-blocker-high-migration.sql   # 上传资源表/聊天拉黑升级
2026-08-07-ai-content-audit-migration.sql    # 四类 UGC 增加 AI 审核字段
```

> 学习搭子（`study_partner`）、互助问答（`campus_question` / `campus_answer`）等社交模块表由应用启动时自动建表（MyBatis-Plus），或参照 `db` 目录新增迁移脚本同步。

4. 开发测试环境可执行 `reset_and_testdata.sql` 导入测试数据。

数据库连接信息建议通过环境变量配置，不要把真实密码提交到仓库：

```text
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=ai_campus_platform
MYSQL_USER=root
MYSQL_PASSWORD=请替换为数据库密码
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 后端启动

```bash
cd web/backend
mvn spring-boot:run
# 或打包后运行
mvn clean package
java -jar target/platform-server.jar
```

后端默认端口 `8080`，接口统一 `/api` 前缀。AI 接口需配置 `AI_API_KEY`（也可在管理后台「AI 配置」在线修改，优先级更高）。

## 学生端启动

```bash
cd web/frontend/student
npm install
npm run dev        # 端口 5173，/api、/ws 代理到后端 8080
npm run build      # 生产构建
npm test           # 运行测试
```

## 管理端启动

```bash
cd web/frontend/admin
npm install
npm run dev        # 端口 5174（strictPort，被占用会直接报错），/api 代理到后端 8080
npm run build      # 生产构建
npm test           # 运行测试
```

## 配置说明

后端主配置：`web/backend/src/main/resources/application.yml`

| 环境变量 | 作用 |
|---|---|
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_DB` / `MYSQL_USER` / `MYSQL_PASSWORD` | MySQL 连接 |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis 连接 |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | MinIO（可选） |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | AI 服务（默认 DeepSeek） |
| `JWT_SECRET` | JWT 签名密钥 |
| `SIGNIN_SECRET` | 活动签到 HMAC 密钥 |
| `TRUSTED_ORIGINS` | REST 与 WebSocket 可信来源白名单 |

AI 密钥支持环境变量与管理后台「AI 配置」页（数据库 `ai_config` 表，优先级更高）两种方式。

## 测试账号

执行 `reset_and_testdata.sql` 后可用（密码均为 `admin123`）：

| 类型 | 账号 | 说明 |
|---|---|---|
| 学生 | `2021001` 张三 / `2021002` 李四 / `2021003` 王五 / `2021004` 赵六 / `2021005` 陈七 | 各学院不同年级，覆盖多角色互动 |
| 管理员 | `admin`（超级管理员）/ `auditor`（审核员） | 管理后台登录 |

## 安全说明

- 生产部署前替换所有数据库、Redis、JWT、签到、AI 密钥；密钥通过环境变量或密钥管理服务注入，不写入源码。
- JWT 拦截器同时校验签名与角色声明，学生 Token 无法访问管理端接口。
- 内容发布经过本地风险词规则 + AI 语义分级审核，低风险自动放行、中高风险人工复核。
- 限制 MySQL/Redis/MinIO 网络访问范围，管理后台启用 HTTPS。

## 测试

```bash
cd web/backend && mvn test        # 后端测试
cd web/frontend/student && npm test
cd web/frontend/admin && npm test
```

## 默认服务地址

| 服务 | 默认地址 |
|---|---|
| 后端 API | `http://localhost:8080` |
| 学生端 | `http://localhost:5173` |
| 管理端 | `http://localhost:5174` |
| Redis | `localhost:6379` |
| MinIO API / 控制台 | `http://localhost:9000` / `http://localhost:9001` |

## 部署说明

完整的数据库、Redis、后端、前端部署流程与常见问题排查见 [部署说明.md](部署说明.md)。
