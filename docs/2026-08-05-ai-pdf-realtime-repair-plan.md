# AI 实时回答与 PDF 会话恢复修复计划

## 目标

修复两个已确认问题：

1. 普通 AI 问答后端已返回并落库，但前端因 SSE 事件名不一致无法实时显示。
2. PDF 文档仅保存在前端内存，刷新后没有根据 AI 会话恢复文档状态；已有 PDF 会话提问时也没有始终持久化 `doc_id`。

不修改数据库结构，沿用现有 `ai_session.doc_id` 和 `GET /api/pdf/{docId}` 接口。

## 修改文件

- `web/frontend/student/src/api/ai.js`
  - 兼容后端 `message` 与标准事件 `delta`。
  - 处理 CRLF、残留缓冲区、多行 `data:`、纯文本错误和未收到 `done` 的连接结束。
  - 保证成功、失败、断开时只结束一次。
- `web/frontend/student/src/views/ai/ChatView.vue`
  - 切换 PDF 会话或刷新加载会话时，根据 `docId` 恢复 PDF 详情。
  - 上传 PDF 后绑定当前 PDF 会话；没有当前会话时创建 PDF 会话并绑定文档。
  - PDF 提问后接收后端返回的 `sessionId`，更新当前会话和列表。
  - AI 流式结束、异常、网络断开时关闭 `asking` 和消息流式状态。
- `web/backend/src/main/java/com/campus/platform/service/AiChatService.java`
  - PDF 问答校验会话归属与 PDF 场景。
  - 校验 PDF 文档归属当前用户。
  - 将本次 `docId` 持久化到会话。
  - 将 PDF 同步响应升级为包含 `sessionId` 与 `answer` 的对象，兼容前端使用。
- `web/backend/src/main/java/com/campus/platform/controller/AiController.java`
  - 调整 PDF 同步接口泛型返回类型。
- `web/backend/src/main/java/com/campus/platform/aigateway/AiGatewayService.java`
  - 将增量 SSE 事件统一发送为 `delta`。
  - PDF 文档读取增加用户归属校验，避免跨用户读取文档正文。

## 测试策略

### 前端

项目没有现成的 Vitest/Jest 测试依赖，因此先使用可执行的静态回归检查，确认：

- `chatStream` 同时识别 `message` 和 `delta`。
- 流结束时调用 `onDone` 或错误回调，不会永久保持加载状态。
- PDF 会话切换路径调用 `/pdf/{docId}`。
- PDF 上传后会绑定当前会话或创建带 `docId` 的会话。

### 后端

使用现有 Maven 测试体系，新增 `AiChatServiceTest` 的单元测试，覆盖：

- 已有 PDF 会话提问时更新 `docId`。
- 非 PDF 会话不能用于 PDF 问答。
- 非当前用户的 PDF 文档被拒绝。
- 新建 PDF 会话时保留 `docId`。

## 执行顺序

1. 添加失败测试并运行，确认测试能捕获当前缺陷。
2. 修改后端 PDF 会话绑定和 SSE 事件。
3. 修改前端 SSE 解析和 PDF 会话恢复。
4. 运行后端测试和 Maven 打包。
5. 运行学生端构建。
6. 进行静态检查和可用的接口/浏览器回归验证。

## 验收标准

- AI 问答文字在不刷新页面的情况下逐段显示。
- AI 请求成功、失败或连接异常后，发送按钮都能恢复可用。
- 刷新 PDF 会话后仍显示原文件名和页数。
- 刷新后继续提问仍使用原 PDF 内容。
- 切换不同 PDF 会话时分别恢复对应文档。
- 越权 PDF 文档不会被问答接口读取。
- 前端和后端构建通过。
