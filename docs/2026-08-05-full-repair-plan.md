# 校园综合服务平台完整修复实施计划

## 文件范围

- `web/frontend/student/src/views/idle/List.vue`：闲置列表自适应布局和状态展示。
- `web/frontend/student/src/layout/MainLayout.vue`：监听登录状态，统一管理消息轮询。
- `web/frontend/student/src/store/message.js`：轮询幂等、请求重入和清理。
- `web/frontend/student/src/utils/request.js`：登录失效状态同步。
- 临时数据脚本：仅放在临时工作目录，负责数据库检查、备份后定向清洗和 BCrypt 更新。

## 执行步骤

### 数据保护

1. 检查 MySQL 客户端和目标数据库连接。
2. 使用 `mysqldump --default-character-set=utf8mb4` 生成带时间戳的全量备份。
3. 验证备份文件存在且大小非零。
4. 查询实际数据库、表、列及连接字符集。

### 数据诊断与清洗

1. 查询用户、管理员、消息、闲置、活动、帖子和公告中的可疑乱码字段。
2. 对可稳定逆向恢复的文本执行 UTF-8/Latin-1 纠正。
3. 对 `??` 等信息已丢失的测试文本，按记录上下文替换为正常中文。
4. 使用 BCrypt 生成 `admin123` 哈希并参数化更新 `auditor`。
5. 重新查询数据并调用登录、闲置和消息接口验证。

### 前端修复

1. 修改闲置列表网格为 `repeat(auto-fill, minmax(220px, 1fr))`。
2. 为布局内容链增加 `min-width: 0`，保证窄容器可以正常收缩。
3. 监听 `userStore.isLoggedIn`，登录时启动轮询，退出时停止。
4. 保证 `startPolling` 幂等，并避免未读数请求重入。
5. 在 401 时同步清除当前用户状态，使监听逻辑停止轮询。

### 验证

1. 构建学生端和管理端。
2. 打包后端并确认服务健康。
3. 验证学生登录、首页中文、闲置列表和消息未读数。
4. 验证 `admin` 与 `auditor` 登录。
5. 回归 AI 会话和 PDF 上传接口。
6. 更新探索测试报告，记录修复结果和备份位置。
