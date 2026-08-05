# 校园平台一对一私信架构设计

## 目标

为 Web 学生端与微信小程序同步增加一对一私信能力，支持文字、图片、实时推送、历史补偿、未读与已读状态，并与闲置、失物招领、活动、动态和用户资料形成完整业务闭环。

## 设计原则

1. 现有 `message` 表继续承担系统通知，不保存聊天正文。
2. 聊天正文进入独立会话与消息表。
3. MySQL 是消息事实来源，WebSocket 只负责实时传输。
4. REST 负责会话、历史消息、发送降级、已读和断线补偿。
5. Web 与微信小程序共用同一套 JSON 协议和后端服务。
6. 消息先提交数据库事务，再进行实时推送。
7. 客户端使用 `clientMessageId` 保证重试幂等。

## 首版范围

- 一对一会话
- 文字消息
- 图片消息
- 会话列表
- 独立聊天页面
- 游标分页历史记录
- 会话未读与私信总未读
- 已读回执
- WebSocket 实时消息
- REST 断线补偿
- 业务上下文卡片
- 敏感词检测
- 拉黑与举报
- Web 和微信小程序多端同步
- 通知中心聚合提醒“收到新私信”

不包含群聊、语音、视频、文件、撤回、编辑和音视频通话。

## 数据模型

### chat_conversation

保存两个用户之间的唯一主会话，`user1_id` 始终小于 `user2_id`，并通过唯一索引防止重复会话。保存最后消息、摘要、时间和最近业务上下文。

### chat_conversation_member

保存每个参与者的未读数、最后已读消息、免打扰和本地隐藏状态。

### chat_message

保存聊天正文、类型、发送者、接收者、客户端幂等 ID、状态、已读时间和创建时间。文字消息保存文本，图片消息只保存平台上传接口返回的 URL。

### user_block

保存单向拉黑关系。拉黑后禁止双方继续发送新消息，但允许查看历史记录和解除拉黑。

## 主要接口

```text
POST   /api/chat/conversations
GET    /api/chat/conversations
GET    /api/chat/conversations/{id}
DELETE /api/chat/conversations/{id}
GET    /api/chat/conversations/{id}/messages
POST   /api/chat/conversations/{id}/messages
PUT    /api/chat/conversations/{id}/read
GET    /api/chat/unread-count
POST   /api/chat/ws-ticket
POST   /api/chat/block/{userId}
DELETE /api/chat/block/{userId}
GET    /api/chat/block/list
POST   /api/chat/messages/{id}/report
```

历史消息使用 `beforeId` 游标分页。REST 发送与 WebSocket 入站发送共用同一个领域服务，避免出现两套校验逻辑。

## WebSocket

连接地址：

```text
/ws/chat?ticket={一次性短期票据}
```

服务端事件：

```text
chat.connected
chat.message
chat.ack
chat.read-receipt
chat.unread
chat.error
ping
pong
```

发送事件必须包含 `requestId`、`conversationId`、`clientMessageId`、`messageType` 和 `content`。服务端从已认证连接获取发送者身份，不接受客户端传入的 `senderId`。

## 通知中心

新增通知类型 `private_message`，业务类型为 `conversation`，业务 ID 为会话 ID。通知内容只包含“某用户给你发来新私信”，不得复制聊天正文。同一会话只保留一条未读聚合提醒，进入会话后同步标记已读。

## 客户端设计

### Web 学生端

新增会话列表页、独立聊天页、聊天状态仓库和 WebSocket 管理器。支持历史上拉加载、文字输入、图片上传预览、发送状态、失败重试、已读标识、断线重连和业务卡片跳转。

### 微信小程序

增加 `pages-chat` 分包，包括会话列表和聊天页。全局维护 `wx.connectSocket` 连接；小程序切回前台后重新获取票据并连接；连接恢复后调用 REST 接口同步未读和历史记录。

## 业务闭环

| 模块 | 私信入口 | 会话上下文 | 后续业务动作 |
|---|---|---|---|
| 闲置物品 | 联系卖家 | 商品 | 预约、接受、完成、评价 |
| 失物招领 | 联系发布者 | 失物信息 | 核验、确认归还、完成 |
| 活动组队 | 联系发起人 | 活动 | 报名、审批、签到 |
| 动态广场 | 私信作者 | 动态摘要 | 持续交流 |
| 用户主页 | 发私信 | 用户资料 | 普通沟通 |

聊天域只提供沟通和跳转，不直接改变闲置、活动、失物等业务状态。

## 安全与可靠性

- 只能访问自己参与的会话。
- 禁止给自己发消息。
- 目标用户必须存在且状态正常。
- 文字长度限制为 1 至 2000 字并执行敏感词检测。
- 图片必须来自平台上传接口并校验文件类型、大小和归属。
- 单用户最多保留 5 个连接。
- 建议限流每秒 5 条、每分钟 100 条。
- 票据有效期 60 秒且只能使用一次。
- 消息推送失败不回滚数据库。
- 重连后通过 REST 历史接口补偿。
- 举报复用现有举报体系，目标类型扩展为 `chat_message`。

## 验收标准

1. Web 和小程序之间可实时互发文字、图片。
2. 离线消息重新上线后可以完整获取。
3. 重复 `clientMessageId` 不产生重复记录。
4. 未读数、会话已读和已读回执正确同步。
5. 通知表不保存聊天正文。
6. 拉黑后不能发送新消息。
7. 非会话成员无法读取或操作会话。
8. 五个业务入口均可创建或复用会话。
9. WebSocket 中断时 REST 功能仍可使用。
10. 后端测试、Web 构建和小程序静态检查通过。
