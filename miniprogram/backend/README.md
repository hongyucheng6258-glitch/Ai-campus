# 小程序端后端说明（miniprogram/backend）

> 本目录**不存放独立后端代码**。

## 结论先行
微信小程序端与 Web 学生端 / 管理端 **共用同一套 Spring Boot 后端**，即 `../web/backend/`（相对本文件的上一级 `web/backend`）。

整个系统只有 **一个后端、一个数据库**，由 `web/backend` 提供统一 REST API：
- Web 学生端（`web/frontend/student`）、管理端（`web/frontend/admin`）调用 `/api`
- 小程序端（`miniprogram/frontend`）调用 `/api`

## 为什么不在小程序端再放一份后端？
后端与数据库强耦合（同一套 `ai_config`、同一套用户/业务表）。若小程序端复制一份 `server`：
1. 两份代码极易出现配置 / 接口漂移，维护成本翻倍；
2. 小程序的 `code2session`、JWT 签发逻辑必须与 Web 完全一致，复制即埋雷；
3. 部署时要起两个进程、连同一个库，纯属自找麻烦。

因此本项目采用「**单后端多端**」架构：小程序端只放前端代码（`miniprogram/frontend`），后端直接复用 `web/backend`。

## 小程序端如何连后端？
- 本地开发：后端地址 `http://localhost:8080`
- 前端请求基类：`miniprogram/frontend/utils/request.js` 中的 `BASE_URL`
- 部署到服务器后，把 `BASE_URL` 改成后端域名（如 `https://your-domain.com/api`），详见 `deploy/部署说明.md` 第十三章

## 如何启动后端（即 web/backend）？
任选其一（均会自动读取 `web/backend/src/main/resources/application.yml`）：
- Windows 一键：`deploy/start-server.bat` 或 `deploy/start-server.ps1`
- 手动：`cd web/backend && mvn -DskipTests package && java -jar target/platform-server.jar`

## 目录约定
```
miniprogram/
├── backend/     ← 本说明文件（无代码，复用 web/backend）
└── frontend/    ← 微信小程序前端源码（用「微信开发者工具」打开此目录）
```
