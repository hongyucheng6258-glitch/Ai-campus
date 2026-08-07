# AI校园综合服务平台

AI校园综合服务平台是一套面向高校学生的综合服务系统，提供校园信息服务、AI学习辅助、活动组队、闲置物品互换、失物招领、校园动态、私信沟通和后台管理等功能。

项目包含 Web 学生端、Web 管理后台、微信小程序和 Spring Boot 后端服务，适合作为校园综合服务平台的课程设计或毕业设计项目基础。

## 功能模块

### 学生端

- 用户注册、登录、个人资料和账号设置
- 校园首页、公告列表和公告详情
- 活动浏览、活动发布、活动报名和活动签到
- 闲置物品发布、浏览、预约、审核和评价
- 失物招领信息发布、浏览和详情查看
- 校园动态广场、动态发布、详情、评论和点赞
- 站内消息和未读消息提醒
- 学生之间的私信会话和实时聊天
- AI 对话、代码修复、PDF 学习问答和大纲生成
- 错题本、错题分析、薄弱点分析、复习计划和题目生成
- 错题拍照 OCR 识别录入

### 管理后台

- 管理员登录和权限控制
- 用户管理和账号状态管理
- 活动、闲置、失物招领和校园动态审核
- AI 内容审核结果查看和人工审核
- 系统公告发布与管理
- 举报信息处理
- AI 配置、调用日志和平台统计信息查看
- 管理员账号管理

### 微信小程序

微信小程序与学生端保持主要功能一致，支持首页、消息、个人中心、AI 学习中心、活动组队、闲置互换、失物招领、校园动态和私信等功能。

## 技术栈

### 后端

- Java 17
- Spring Boot 3.2.5
- Spring MVC
- Spring Validation
- Spring WebSocket
- MyBatis-Plus 3.5.7
- MySQL 8
- Redis
- JWT
- MinIO
- PDFBox
- OkHttp SSE
- DeepSeek OpenAI 兼容接口
- Hutool
- Lombok

### Web 前端

- Vue 3
- Vite 5
- Vue Router
- Pinia
- Element Plus
- Axios
- ECharts
- Markdown It
- WangEditor
- Tesseract.js

### 小程序

- 微信小程序原生开发
- JavaScript
- WXML
- WXSS
- 微信小程序分包加载

## 项目结构

```text
Ai-campus/
├── miniprogram/
│   └── frontend/                 # 微信小程序前端
│       ├── components/           # 通用组件
│       ├── pages/                # 基础页面
│       ├── pages-activity/       # 活动组队
│       ├── pages-ai/             # AI 学习中心
│       ├── pages-chat/           # 私信聊天
│       ├── pages-idle/           # 闲置互换
│       ├── pages-lostfound/      # 失物招领
│       ├── pages-post/           # 校园动态
│       ├── utils/                # 工具函数与测试
│       └── app.json              # 小程序页面配置
│
├── web/
│   ├── backend/                  # Spring Boot 后端
│   │   ├── src/main/java/        # Java 源码
│   │   ├── src/main/resources/   # 配置、数据库脚本和敏感词文件
│   │   ├── src/test/             # 后端测试
│   │   └── pom.xml               # Maven 配置
│   └── frontend/
│       ├── student/              # Web 学生端
│       └── admin/                # Web 管理后台
│
├── .gitignore
└── README.md
```

## 环境要求

- JDK 17 或更高版本
- Maven 3.8 或更高版本
- Node.js 18 或更高版本
- npm
- MySQL 8
- Redis 6 或更高版本
- MinIO
- 微信开发者工具（开发小程序时需要）

## 数据库初始化

1. 创建数据库 `ai_campus_platform`。
2. 执行 `web/backend/src/main/resources/db/schema.sql` 初始化表结构。
3. 如果使用错题本、AI 内容审核等新增功能，根据实际数据库版本依次执行对应的迁移脚本。
4. 开发测试环境可以按需执行 `reset_and_testdata.sql` 中的测试数据脚本。

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

进入后端目录：

```bash
cd web/backend
```

使用 Maven 启动：

```bash
mvn spring-boot:run
```

或先构建再启动：

```bash
mvn clean package
java -jar target/platform-server.jar
```

后端默认端口为 `8080`。接口统一使用 `/api` 前缀，例如：

```text
http://localhost:8080/api
```

AI 接口需要配置 `AI_API_KEY`。微信小程序登录需要配置 `WX_APPID` 和 `WX_SECRET`。MinIO、JWT 和活动签到密钥也应在部署环境中通过环境变量覆盖默认值。

## 学生端启动

进入学生端目录并安装依赖：

```bash
cd web/frontend/student
npm install
```

启动开发服务器：

```bash
npm run dev
```

学生端默认使用 Vite 开发服务器，具体端口以终端输出为准。生产构建命令：

```bash
npm run build
```

运行学生端测试：

```bash
npm test
```

## 管理端启动

进入管理端目录并安装依赖：

```bash
cd web/frontend/admin
npm install
```

启动开发服务器：

```bash
npm run dev
```

管理端开发服务器默认配置为 `5174` 端口。生产构建命令：

```bash
npm run build
```

运行管理端测试：

```bash
npm test
```

## 小程序启动

1. 使用微信开发者工具打开 `miniprogram/frontend`。
2. 根据本地环境修改请求地址和运行时配置。
3. 确认后端服务已经启动，并且小程序开发环境允许访问本地接口。
4. 编译并预览小程序页面。

小程序页面按功能划分为多个分包，包括 AI 学习中心、闲置互换、活动组队、失物招领、私信和校园动态。

## 配置说明

后端主配置文件为：

```text
web/backend/src/main/resources/application.yml
```

常用环境变量包括：

| 环境变量 | 作用 |
|---|---|
| `MYSQL_HOST` | MySQL 主机地址 |
| `MYSQL_PORT` | MySQL 端口 |
| `MYSQL_DB` | 数据库名称 |
| `MYSQL_USER` | 数据库用户名 |
| `MYSQL_PASSWORD` | 数据库密码 |
| `REDIS_HOST` | Redis 主机地址 |
| `REDIS_PORT` | Redis 端口 |
| `MINIO_ENDPOINT` | MinIO 服务地址 |
| `MINIO_ACCESS_KEY` | MinIO 访问账号 |
| `MINIO_SECRET_KEY` | MinIO 访问密钥 |
| `AI_BASE_URL` | AI 服务地址 |
| `AI_API_KEY` | AI 服务密钥 |
| `AI_MODEL` | AI 模型名称 |
| `WX_APPID` | 微信小程序 AppID |
| `WX_SECRET` | 微信小程序 Secret |
| `JWT_SECRET` | JWT 签名密钥 |
| `SIGNIN_SECRET` | 活动签到签名密钥 |
| `TRUSTED_ORIGINS` | REST 和 WebSocket 可信来源列表 |

## 安全说明

生产环境部署前请替换所有数据库、对象存储、JWT、签到和第三方服务密钥。真实密钥应通过环境变量、密钥管理服务或服务器安全配置注入，不应写入源码、提交记录或前端构建产物。

请同时限制 MySQL、Redis 和 MinIO 的网络访问范围，并为管理后台启用 HTTPS。

## 测试

后端测试位于 `web/backend/src/test`，可以使用以下命令运行：

```bash
cd web/backend
mvn test
```

学生端和管理端分别提供 npm 测试脚本，运行方式见上文。测试前请确保依赖已经安装；涉及数据库、Redis、MinIO 或 AI 服务的测试，需要准备对应的本地服务或测试配置。

## 默认服务地址

| 服务 | 默认地址 |
|---|---|
| 后端 API | `http://localhost:8080` |
| 学生端开发服务器 | 以 Vite 启动输出为准 |
| 管理端开发服务器 | `http://localhost:5174` |
| Redis | `localhost:6379` |
| MinIO API | `http://localhost:9000` |
| MinIO 控制台 | `http://localhost:9001` |

## 许可证

本项目用于学习、课程设计和毕业设计研究。未经项目维护者许可，不建议将项目中的配置、数据和部署方案直接用于生产环境。
