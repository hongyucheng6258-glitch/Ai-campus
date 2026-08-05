# 校园平台一对一私信实施计划

> 按 TDD 顺序执行：先写失败测试，再实现最小代码，再运行验证。现有 `message` 模块保持业务通知职责，新增 `chat` 领域。

## 文件结构

### 后端新增

```text
web/backend/src/main/java/com/campus/platform/chat/
├── controller/ChatController.java
├── dto/ConversationCreateDTO.java
├── dto/ChatSendDTO.java
├── dto/ChatReadDTO.java
├── entity/ChatConversation.java
├── entity/ChatConversationMember.java
├── entity/ChatMessage.java
├── entity/UserBlock.java
├── mapper/ChatConversationMapper.java
├── mapper/ChatConversationMemberMapper.java
├── mapper/ChatMessageMapper.java
├── mapper/UserBlockMapper.java
├── service/ChatService.java
├── service/ChatNotificationService.java
├── vo/ConversationVO.java
├── vo/ChatMessageVO.java
├── websocket/ChatHandshakeInterceptor.java
├── websocket/ChatSessionRegistry.java
├── websocket/ChatWebSocketHandler.java
├── websocket/ChatWebSocketConfig.java
└── websocket/ChatWsTicketService.java
```

### Web 新增

```text
web/frontend/student/src/api/chat.js
web/frontend/student/src/store/chat.js
web/frontend/student/src/utils/chatSocket.js
web/frontend/student/src/views/chat/ConversationList.vue
web/frontend/student/src/views/chat/ChatRoom.vue
web/frontend/student/src/components/chat/MessageBubble.vue
web/frontend/student/src/components/chat/ChatComposer.vue
web/frontend/student/src/components/chat/BizContextCard.vue
```

### 小程序新增

```text
miniprogram/frontend/pages-chat/conversations/*
miniprogram/frontend/pages-chat/room/*
miniprogram/frontend/services/chat.js
miniprogram/frontend/utils/chat-socket.js
```

## 阶段一：数据库与领域约束

1. 在 `schema.sql` 新增 `chat_conversation`、`chat_conversation_member`、`chat_message`、`user_block`。
2. 为用户对、会话消息游标、幂等 ID、成员未读查询建立索引。
3. 创建对应实体和 Mapper。
4. 写 `ChatServiceTest`，验证不能给自己建会话、双方会话唯一、非成员不能访问。
5. 运行测试，确认测试因实现缺失而失败。
6. 实现最小会话创建与成员校验。
7. 再次运行测试，确保通过。

验证：

```powershell
mvn -Dtest=ChatServiceTest test
```

## 阶段二：消息发送与已读

1. 为文字消息、图片消息、幂等发送、拉黑、未读累加和已读清零编写失败测试。
2. 实现 `ChatSendDTO` 校验：`text/image`、文字 1 至 2000 字、图片 URL 必须为平台资源。
3. 在单一事务中完成消息落库、会话摘要更新、接收者未读累加和隐藏会话恢复。
4. 使用 `(sender_id, client_message_id)` 防止重复消息。
5. 实现历史消息 `beforeId` 游标分页。
6. 实现会话已读，并写入 `last_read_message_id/read_time`。
7. 运行后端测试。

验证：

```powershell
mvn -Dtest=ChatServiceTest test
```

## 阶段三：REST 与通知聚合

1. 为 `ChatController` 编写 MockMvc 测试，覆盖会话创建、列表、历史、发送、已读、未读总数、拉黑和举报。
2. 实现 `/api/chat/**` REST 接口。
3. 扩展现有通知类型，增加 `private_message`。
4. 实现会话级未读通知聚合，不复制聊天正文。
5. 进入会话并已读后同步清除对应通知提醒。
6. 执行权限与返回结构测试。

验证：

```powershell
mvn -Dtest=ChatControllerTest test
```

## 阶段四：WebSocket

1. 在 `pom.xml` 增加 `spring-boot-starter-websocket`。
2. 编写票据一次性消费、过期、伪造和连接注册测试。
3. 实现 Redis 短期票据服务，有效期 60 秒。
4. 实现 `/ws/chat` 握手拦截器和多端连接注册表。
5. 实现 `chat.send`、`chat.read`、`ping/pong` 事件。
6. 消息事务提交后推送 `chat.ack`、`chat.message`、`chat.unread` 和 `chat.read-receipt`。
7. 推送失败只记录日志，不回滚消息。
8. 运行 WebSocket 测试和后端完整测试。

验证：

```powershell
mvn test
```

## 阶段五：Web 学生端

1. 为 API 参数和聊天状态 reducer 编写 Node 测试。
2. 新增 `/chat` 与 `/chat/:conversationId` 路由。
3. 实现会话列表、聊天页、消息气泡、输入器和业务上下文卡片。
4. 实现 WebSocket 票据获取、心跳、指数退避重连和消息去重。
5. WebSocket 正常时停止轮询，断线时使用 REST 刷新未读和历史。
6. 实现文字发送、图片上传后发送、失败重试和已读回执。
7. 在消息中心增加“通知/私信”入口分区。
8. 在闲置、失物、活动、动态和用户公开资料入口增加“发私信”。
9. 运行测试与构建。

验证：

```powershell
npm test
npm run build
```

## 阶段六：微信小程序

1. 在 `app.json` 增加 `pages-chat` 分包。
2. 新增会话列表页和独立聊天页。
3. 实现 `wx.connectSocket` 全局连接、前后台恢复、心跳和重连。
4. 实现 REST 历史补偿和消息去重。
5. 使用 `wx.chooseMedia` 选择图片，上传成功后发送图片消息。
6. 将 TabBar 消息角标改为通知未读与私信未读合计。
7. 在闲置、失物和活动详情增加联系入口；动态入口随现有小程序动态模块范围接入。
8. 运行 JavaScript 语法检查与页面配置检查。

验证：

```powershell
node --check miniprogram/frontend/utils/chat-socket.js
node --check miniprogram/frontend/services/chat.js
node --check miniprogram/frontend/pages-chat/conversations/conversations.js
node --check miniprogram/frontend/pages-chat/room/room.js
```

## 阶段七：端到端闭环

1. 启动后端、Web 学生端。
2. 使用两个学生账号分别登录 Web 和小程序。
3. 从闲置详情创建会话，验证会话复用和商品上下文。
4. Web 发送文字，小程序实时接收。
5. 小程序发送图片，Web 实时接收。
6. 断开小程序网络，Web 发送消息；恢复网络后验证 REST 补偿。
7. 进入会话后验证双方未读清零和已读回执。
8. 验证通知中心只显示“收到新私信”，数据库通知记录不含正文。
9. 验证拉黑、解除拉黑、举报和越权访问。
10. 执行完整后端测试、Web 构建和现有 QA 回归。

## 完成标准

- 后端所有测试通过。
- Web 学生端构建成功。
- 小程序新增脚本通过语法检查。
- Web 与小程序互发文字和图片成功。
- 离线补偿、幂等、未读、已读、拉黑和越权规则均通过验证。
- 现有活动、闲置、失物、动态和通知功能无回归。
