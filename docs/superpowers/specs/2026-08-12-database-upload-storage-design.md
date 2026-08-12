# 上传资源数据库存储设计

## 文档信息

- 日期：2026-08-12
- 状态：已确认，待实施
- 适用范围：Spring Boot 后端、Web 前端、小程序前端、MySQL 数据库

## 背景

当前系统存在两种上传资源存储方式：图片由上传接口转换为 Base64 Data URI 并写入数据库，普通文件和 PDF 仍上传到 MinIO。业务表中的头像、帖子图片、活动图片等字段已经扩展为 `MEDIUMTEXT`，但 `upload_resource.resource_url` 仍不足以可靠容纳最大 20MB 文件转换后的 Base64 内容，`pdf_document.file_url` 仍为 `VARCHAR(255)`。

本次改造将所有新上传的图片和文件存入数据库，同时保留现有 MinIO 读取能力，使历史 MinIO URL 无需迁移即可继续访问。

## 目标

- 新上传的图片、PDF 和其他允许上传的文件全部持久化到 MySQL。
- 统一使用 Base64 Data URI 表示数据库中的二进制资源。
- 保留历史 MinIO URL，不迁移、不删除历史对象。
- 前端同时兼容 Base64 Data URI、后端 MinIO 代理路径和历史 HTTP/HTTPS 地址。
- 保留资源所有者、类型、MIME 类型、原始文件大小和业务绑定信息。
- 保持现有上传接口响应结构，减少前端业务改动。

## 非目标

- 不把历史 MinIO 对象批量迁移到数据库。
- 不删除 MinIO 配置、客户端、代理读取接口或历史对象。
- 不对新资源执行数据库与 MinIO 双写。
- 不新增独立文件服务器或对象存储服务。
- 不改变 PDF 文本提取、内容审核和业务发布流程。

## 方案比较

### 方案 A：新资源只写数据库，历史 MinIO 继续读取

优点是满足当前需求、改动范围可控，并避免历史数据迁移风险。缺点是系统需要长期兼容两种资源标识。

### 方案 B：数据库与 MinIO 双写

优点是具备额外副本，缺点是上传事务、失败补偿、资源一致性和存储成本明显增加，不符合本次最小改造目标。

### 方案 C：迁移全部历史资源后移除 MinIO

优点是存储模型完全统一，缺点是迁移过程复杂，可能出现对象缺失、网络失败和长事务，并且违背保留历史 MinIO 资源的要求。

最终采用方案 A。

## 数据模型

### upload_resource

`upload_resource` 作为上传资源登记表，继续保存以下信息：

- `owner_user_id`：上传用户。
- `resource_url`：新资源保存 Base64 Data URI，历史记录允许保留 MinIO URL 或代理路径。
- `resource_type`：`image` 或 `file`。
- `content_type`：实际 MIME 类型。
- `file_size`：编码前原始字节数。
- `biz_type`、`biz_id`：资源被聊天或业务记录消费后的绑定信息。

`resource_url` 从 `MEDIUMTEXT` 调整为 `LONGTEXT`。MySQL `MEDIUMTEXT` 最大约 16MB，无法容纳 20MB 文件经 Base64 编码后的约 26.7MB 文本；`LONGTEXT` 可以覆盖当前上传上限。

### pdf_document

`pdf_document.file_url` 从 `VARCHAR(255)` 调整为 `LONGTEXT`，用于保存新 PDF 的 Base64 Data URI，同时兼容已有 MinIO URL。字段名暂不更改，避免影响实体映射和现有查询。

### 业务图片字段

头像、帖子、活动、闲置、失物招领、公告、错题和聊天等现有图片字段继续保留当前结构。图片上传上限为 3MB，经 Base64 编码后约 4MB，单图片字段使用 `MEDIUMTEXT` 可以容纳；保存 JSON 图片数组的字段仍需受业务上传数量限制约束。

## 资源编码

新增通用的 MultipartFile 转 Data URI 能力，输出格式为：

```text
data:<content-type>;base64,<encoded-content>
```

编码规则：

- MIME 类型优先使用上传请求提供的 `Content-Type`。
- MIME 类型为空时使用 `application/octet-stream`，图片接口可回退为 `image/jpeg`。
- Base64 编码前先完成文件非空、大小和类型校验。
- 数据库存储原始文件大小，不把 Base64 文本长度写入 `file_size`。
- 转码失败时返回统一业务异常，不产生不完整资源记录。

## 上传流程

### 图片上传

1. `/api/upload/image` 接收图片。
2. 校验图片类型和 3MB 大小限制。
3. 转换为 Data URI。
4. 写入 `upload_resource`。
5. 返回现有 `UploadVO.url` 字段，值为 Data URI。

图片上传现有行为基本保持，仅将图片转码逻辑从 MinIO 工具职责中抽离为通用数据库资源编码职责，消除命名和职责混淆。

### 通用文件上传

1. `/api/upload/file` 接收文件。
2. 校验非空和 20MB 大小限制。
3. 转换为 Data URI。
4. 写入 `upload_resource`。
5. 返回现有 `UploadVO.url` 字段，值为 Data URI。

此流程不再调用 MinIO 上传方法，但 MinIO 上传方法本身保留，以兼容其他未迁移代码和历史维护需求。

### PDF 上传与解析

1. `/api/pdf/upload` 校验扩展名和 20MB 大小限制。
2. 将 PDF 转换为 `data:application/pdf;base64,...`。
3. 使用原始 `MultipartFile` 交给 PDFBox 提取文本，不对 Base64 反解后再解析。
4. 将 Data URI 写入 `pdf_document.file_url`。
5. 保持原有页数、全文和状态字段写入逻辑。
6. 解析失败或扫描件场景仍保留文档记录，确保上传内容和处理状态可追踪。

PDF 独立链路可以直接保存数据库资源，不强制额外写入 `upload_resource`，以避免同一大文件在数据库中保存两份。后续若需要统一资源治理，可再通过资源外键重构，但不属于本次范围。

## 历史兼容

资源值按前缀区分：

- `data:`：数据库内嵌资源，前端直接显示或下载。
- `/api/assets/`：历史 MinIO 后端代理路径，继续由 `AssetController` 和 `MinioUtils.readPublicAsset` 提供内容。
- `http://` 或 `https://`：历史绝对地址，继续按 URL 访问。

不得把历史 URL 自动转换为 Base64，也不得在读取时隐式写回数据库，以避免大批量流量触发数据库膨胀。

## 前端兼容

现有图片组件通常可以直接使用 Data URI。Web 和小程序的资源归一化函数需要遵循以下规则：

- `data:` 原样返回，不拼接后端地址。
- `http://`、`https://` 原样返回。
- `/api/assets/` 等相对地址按现有逻辑拼接后端主机。
- PDF 下载或预览不能把 Data URI 当作普通 HTTP URL发送请求；需要直接使用 Data URI，或在浏览器端转换为 Blob 后下载。

需要检查 Web 学生端、管理端和小程序端的图片 URL 归一化函数，确保不会错误处理 `data:`。

## 安全与限制

- 图片仅允许 JPEG、PNG、GIF、WebP。
- PDF 上传必须校验扩展名，并建议同时校验 MIME 类型和文件头 `%PDF-`。
- 通用文件接口维持 20MB 上限，不允许无限制写入数据库。
- 请求体与 Spring Multipart 配置必须大于或等于接口上限。
- Data URI 不写入普通日志，避免日志膨胀和敏感内容泄露。
- 查询列表时应避免无必要返回大文件字段；PDF 列表和状态接口继续只返回元数据。
- 资源归属校验继续基于 `upload_resource` 记录执行，不能仅信任客户端传入的 Data URI。

## 事务与错误处理

- 文件转码成功后再执行数据库插入。
- 数据库插入失败时直接返回失败，不回退写 MinIO。
- 不引入跨 MySQL 与 MinIO 的分布式事务。
- PDF 解析失败时沿用现有状态记录行为，但需确保只插入一次，避免异常分支与最终分支重复写入。
- 对超出数据库包大小限制的错误返回明确提示，并在部署配置中同步调整 `max_allowed_packet`。

## 数据库迁移

新增独立迁移脚本，至少包含：

```sql
ALTER TABLE `upload_resource`
  MODIFY COLUMN `resource_url` LONGTEXT NOT NULL;

ALTER TABLE `pdf_document`
  MODIFY COLUMN `file_url` LONGTEXT NOT NULL
  COMMENT 'Base64 Data URI 或历史 MinIO 地址';
```

同时更新 `schema.sql`，保证新建数据库和已有数据库迁移后的结构一致。迁移不修改现有字段值。

## 配置要求

20MB 文件转换为 Base64 后约为 26.7MB，再加上请求和 SQL 协议开销，需要检查并调整：

- MySQL `max_allowed_packet` 建议至少 64MB。
- Spring `spring.servlet.multipart.max-file-size` 至少 20MB。
- Spring `spring.servlet.multipart.max-request-size` 应高于单文件限制。
- 反向代理请求体限制应与后端一致。

Base64 会增加约三分之一存储空间，并增加数据库备份、复制和网络传输成本。这是本方案为简化毕业设计部署而接受的明确权衡。

## 测试方案

### 后端测试

- 图片上传返回正确的 `data:image/...;base64,...`。
- 通用文件上传返回正确的 Data URI，并写入 `upload_resource`。
- PDF 上传把 Data URI 写入 `pdf_document.file_url`，并正常完成文本提取。
- 3MB 图片和 20MB 文件边界校验正确。
- 非法图片类型、非 PDF 文件、空文件和超限文件被拒绝。
- 资源归属校验同时支持新 Data URI 记录和历史 MinIO URL 记录。
- PDF 解析失败时数据库记录数量和状态正确。

### 兼容测试

- 历史 `/api/assets/...` 图片可正常显示。
- 历史 MinIO PDF 地址仍可访问。
- 新 Base64 图片可在 Web 学生端、管理端和小程序端显示。
- 新 Base64 PDF 可预览或下载。
- 帖子、聊天、头像、活动、闲置、失物招领、公告和错题场景正常。

### 回归测试

- 执行后端单元测试。
- 执行 Web 学生端和管理端测试及构建。
- 执行小程序现有测试。
- 在实际 MySQL 配置下上传接近上限的文件，验证 `max_allowed_packet` 和响应稳定性。

## 实施顺序

1. 新增数据库迁移并更新 `schema.sql`。
2. 提取通用 Data URI 编码方法。
3. 修改通用文件上传链路。
4. 修改 PDF 上传链路。
5. 检查并修复 Web 与小程序资源归一化逻辑。
6. 增加后端和前端测试。
7. 执行构建、单元测试和历史 MinIO 兼容验证。

## 验收标准

- 新上传图片、PDF 和通用文件不再产生新的 MinIO 对象。
- 新上传资源内容可在数据库对应字段中查到。
- 图片、PDF 和通用文件均可在相应客户端正常使用。
- 历史 MinIO 资源无需修改数据库记录即可继续访问。
- 新旧资源格式不会被前端错误拼接 URL。
- 数据库迁移可在已有库执行，`schema.sql` 可用于正确初始化新库。
- 自动化测试和项目构建通过，未引入上传业务回归。

## 风险与后续建议

主要风险是 Base64 导致数据库体积、备份时间和查询传输成本增加。实现时应避免在列表接口返回大文件内容，并监控数据库包大小和慢查询。

如果系统后续进入真实生产环境，建议将对象存储恢复为主方案，数据库仅保存稳定资源标识和元数据；本设计更适合部署规模有限、强调环境独立性的毕业设计演示场景。
