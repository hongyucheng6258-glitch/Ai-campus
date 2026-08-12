# 上传资源数据库存储实施计划

> 依据设计文档：`docs/superpowers/specs/2026-08-12-database-upload-storage-design.md`
> 
> 目标：所有新上传图片、PDF 和通用文件写入数据库，历史 MinIO 资源继续可访问；不迁移历史对象、不双写、不删除 MinIO 能力。

## 实施前提

- 后端使用 Java 17、Spring Boot 3.2.5、MyBatis-Plus 和 MySQL。
- 当前图片上传已通过 `MinioUtils.uploadImageAsDataUri()` 返回 Base64，但通用文件上传和 PDF 上传仍调用 `MinioUtils.upload()`。
- `upload_resource.resource_url` 当前为 `MEDIUMTEXT`，`pdf_document.file_url` 当前为 `VARCHAR(255)`。
- 当前环境未提供可用的 Git 命令，因此实施时可以执行测试和构建，但不能依赖 Git 提交步骤。
- 每个任务完成后运行该任务列出的验证命令，再进入下一个任务。

## 文件变更总览

### 新增文件

- `web/backend/src/main/resources/db/migrate_v6_all_uploads_to_db.sql`
  - 将通用上传资源和 PDF 地址字段扩展为 `LONGTEXT`。
- `web/backend/src/main/java/com/campus/platform/utils/DataUriUtils.java`
  - 负责把 `MultipartFile` 转换为 Data URI，统一 MIME 类型和异常处理。
- `web/backend/src/test/java/com/campus/platform/utils/DataUriUtilsTest.java`
  - 验证二进制内容、MIME 类型和默认类型。

### 修改文件

- `web/backend/src/main/resources/db/schema.sql`
  - 与 v6 迁移保持一致，更新 `upload_resource.resource_url` 和 `pdf_document.file_url`。
- `web/backend/src/main/resources/application.yml`
  - 将 multipart 请求上限调整到能够承载 20MB 原始文件上传的值，并补充数据库包大小配置说明或部署项。
- `web/backend/src/main/java/com/campus/platform/service/UploadService.java`
  - 图片和通用文件均转 Data URI 后写入数据库，不再为新上传调用 MinIO。
- `web/backend/src/main/java/com/campus/platform/service/PdfService.java`
  - PDF 解析继续使用原始 MultipartFile，文件地址改为 Data URI 写入 `pdf_document.file_url`。
- `web/backend/src/main/java/com/campus/platform/utils/MinioUtils.java`
  - 保留 `upload()` 和 `readPublicAsset()`，仅清理图片转码职责和过时注释，确保历史 MinIO 读取能力不变。
- `web/backend/src/main/java/com/campus/platform/entity/PdfDocument.java`
  - 保持字段名和实体映射不变，只在必要时更新字段注释。
- `web/backend/src/test/java/com/campus/platform/service/UploadServiceTest.java`
  - 新增上传服务单元测试，验证数据库写入和 MinIO 不调用。
- `web/backend/src/test/java/com/campus/platform/service/PdfServiceTest.java`
  - 新增 PDF 上传测试，验证 Data URI 保存和解析异常状态。
- `web/frontend/student/src/utils/image.mjs`
  - 明确保留 `data:` 资源并覆盖完整 MIME 类型。
- `web/frontend/student/src/utils/image.test.mjs`
  - 增加 Data URI 和历史 MinIO URL 兼容测试。
- `web/frontend/admin/src/utils/image.js`
  - 明确保留 `data:` 资源，不拼接主机地址。
- `web/frontend/admin/src/utils/image.test.mjs`
  - 增加管理端 Data URI 兼容测试。
- `miniprogram/frontend/utils/avatar.js`
  - 检查并保证 Data URI 不被转换成后端 URL。
- `miniprogram/frontend/utils/request.js`
  - 保持历史 MinIO URL 归一化逻辑，同时对 Data URI 原样放行。
- `miniprogram/frontend/utils/avatar.test.js`
  - 增加 Data URI 和历史 MinIO 资源测试。

## 任务 1：先建立失败测试

### 步骤 1：创建 Data URI 工具测试

创建 `web/backend/src/test/java/com/campus/platform/utils/DataUriUtilsTest.java`，使用 `MockMultipartFile` 构造 `image/png` 和无 MIME 类型的文件，断言：

- 结果以 `data:image/png;base64,` 开头。
- Base64 解码后与原始字节完全相同。
- MIME 为空时结果使用 `application/octet-stream`。
- 输入为空时抛出 `BizException`。

### 步骤 2：创建上传服务测试

创建 `web/backend/src/test/java/com/campus/platform/service/UploadServiceTest.java`，使用 Mockito 注入 `UploadService`，Mock `UploadResourceMapper` 和 `DataUriUtils`。测试：

- `uploadImage()` 返回 Data URI，并插入一条 `resourceType=image` 的记录。
- `uploadFile()` 返回 Data URI，并插入一条 `resourceType=file` 的记录。
- 两个方法都不调用 `MinioUtils.upload()` 或 `uploadImageAsDataUri()`。
- 超过图片 3MB、文件 20MB 和非法图片类型时抛出 `BizException`。

### 步骤 3：创建 PDF 服务测试

创建 `web/backend/src/test/java/com/campus/platform/service/PdfServiceTest.java`，Mock `PdfDocumentMapper`、`DataUriUtils` 和 `PdfUtils` 所需的静态调用或采用可测试的解析边界。测试：

- PDF 上传将 Data URI 写入 `PdfDocument.fileUrl`。
- PDFBox 使用原始 MultipartFile 内容，不调用 MinIO 上传。
- 解析成功时状态为 1。
- 文本为空时插入状态为 2 的记录并抛出扫描件业务异常。
- 非 PDF 和超过 20MB 时在解析前拒绝。

### 步骤 4：运行失败测试

在 `e:\work\毕业设计\web\backend` 执行：

```powershell
mvn -Dtest=DataUriUtilsTest,UploadServiceTest,PdfServiceTest test
```

预期：新测试因类、构造器或当前 MinIO 调用链尚未改造而失败；失败原因应指向预期缺口，而不是编译环境错误。

## 任务 2：实现统一 Data URI 编码

### 步骤 1：新增 `DataUriUtils`

创建 `web/backend/src/main/java/com/campus/platform/utils/DataUriUtils.java`：

- 使用 Spring `MultipartFile` 输入。
- 校验 `null` 或空文件。
- 使用 `file.getContentType()`，为空时使用 `application/octet-stream`。
- 使用 `Base64.getEncoder()` 编码 `file.getBytes()` 或输入流内容。
- 输出 `data:<mime>;base64,<base64>`。
- 捕获 `IOException` 并转换为统一上传失败异常。
- 不记录 Data URI 内容到日志。

工具只负责编码，不负责数据库插入、MinIO 上传或权限判断。

### 步骤 2：运行工具测试

```powershell
mvn -Dtest=DataUriUtilsTest test
```

预期：`DataUriUtilsTest` 全部通过。

### 步骤 3：修正图片上传调用

修改 `UploadService`：

- 注入 `DataUriUtils`。
- `uploadImage()` 使用 `dataUriUtils.toDataUri(file)`。
- 保留当前图片 MIME 白名单和 3MB 限制。
- `record()` 继续写入 `upload_resource`，`fileSize` 使用原始 `file.getSize()`。
- 删除对 `MinioUtils` 的注入，避免新图片上传意外依赖 MinIO。

### 步骤 4：修改通用文件上传调用

在 `UploadService.uploadFile()` 中：

- 保留 20MB 大小校验。
- 使用 `dataUriUtils.toDataUri(file)`。
- 记录 `resourceType=file`、原始 MIME 类型和原始字节数。
- 不调用 `minioUtils.upload()`。
- 保持返回类型 `UploadVO` 和字段名不变。

### 步骤 5：运行上传服务测试

```powershell
mvn -Dtest=UploadServiceTest test
```

预期：图片与通用文件测试通过，且 Mockito 验证没有 MinIO 上传调用。

## 任务 3：改造 PDF 上传

### 步骤 1：调整 `PdfService` 依赖

修改 `web/backend/src/main/java/com/campus/platform/service/PdfService.java`：

- 注入 `DataUriUtils`，移除新上传所需的 `MinioUtils` 注入。
- 继续保留文件名 `.pdf` 校验和 20MB 上限。
- 将 `String url = minioUtils.upload(file, "pdf")` 替换为 `String url = dataUriUtils.toDataUri(file)`。
- 保持 `PdfUtils.extract(file)` 接收原始 MultipartFile。
- 保持现有成功、扫描件和损坏文件状态语义。
- 检查异常分支，确保每次失败最多插入一次文档记录。

### 步骤 2：更新 PDF 实体注释

修改 `PdfDocument.fileUrl` 的注释，说明其值可能是 Base64 Data URI 或历史 MinIO 地址；不改 Java 字段名，以保证 MyBatis-Plus 映射兼容。

### 步骤 3：运行 PDF 测试

```powershell
mvn -Dtest=PdfServiceTest test
```

预期：成功、扫描件、解析失败和参数校验测试通过。

## 任务 4：执行数据库迁移设计

### 步骤 1：新增 v6 迁移脚本

创建 `web/backend/src/main/resources/db/migrate_v6_all_uploads_to_db.sql`：

```sql
ALTER TABLE `upload_resource`
  MODIFY COLUMN `resource_url` LONGTEXT NOT NULL
  COMMENT 'Base64 Data URI 或历史 MinIO 地址';

ALTER TABLE `pdf_document`
  MODIFY COLUMN `file_url` LONGTEXT NOT NULL
  COMMENT 'Base64 Data URI 或历史 MinIO 地址';
```

脚本不得更新或删除现有资源值。

### 步骤 2：同步初始化结构

修改 `web/backend/src/main/resources/db/schema.sql`：

- `upload_resource.resource_url` 改为 `LONGTEXT NOT NULL`。
- `pdf_document.file_url` 改为 `LONGTEXT NOT NULL`。
- 注释明确支持 Base64 Data URI 和历史 MinIO 地址。

### 步骤 3：检查 SQL 一致性

使用文本搜索确认两个文件中的字段类型和注释一致：

```powershell
Select-String -Path 'src/main/resources/db/schema.sql','src/main/resources/db/migrate_v6_all_uploads_to_db.sql' -Pattern 'resource_url|file_url|LONGTEXT'
```

预期：两个目标字段均为 `LONGTEXT`，旧迁移脚本仍保留，不覆盖历史迁移顺序。

## 任务 5：调整上传和数据库配置

### 步骤 1：调整 Spring 请求限制

修改 `web/backend/src/main/resources/application.yml`：

- `max-file-size` 保持 `20MB`。
- `max-request-size` 调整到至少 `32MB`，建议 `64MB`，覆盖 Base64 返回和请求开销。
- 添加注释说明数据库端需要把 `max_allowed_packet` 配置为至少 `64MB`；该项若由部署脚本管理，则同步修改部署说明或启动配置。

### 步骤 2：检查部署配置

检查 `deploy/部署说明.md` 和部署脚本中是否有 MySQL 初始化或 `max_allowed_packet` 设置：

```powershell
Select-String -Path 'deploy\*' -Pattern 'max_allowed_packet|max-file-size|max-request-size' -Recurse
```

若存在相关配置，补充至少 `64M`；若不存在，在部署说明中加入明确的数据库配置命令，避免把临时脚本写入工作区。

## 任务 6：验证前端资源兼容

### 步骤 1：Web 学生端

检查 `web/frontend/student/src/utils/image.mjs`：

- 保留 `data:image/` 和 `data:` 判断。
- 不对 Data URI 调用后端地址拼接。
- `normalizeImages()` 继续支持 JSON 数组、单字符串和历史 URL。

在 `web/frontend/student/src/utils/image.test.mjs` 添加：

- `data:image/png;base64,AA==` 被保留。
- `data:application/pdf;base64,AA==` 不作为图片返回。
- `/api/assets/campus/x/a.jpg` 和 `https://...` 仍按原规则保留或处理。

### 步骤 2：Web 管理端

检查 `web/frontend/admin/src/utils/image.js` 与对应测试：

- 只允许图片 Data URI 进入图片展示。
- 历史相对路径和绝对 URL 保持原有行为。
- 不对 Base64 内容执行 URL 编码、截断或拼接。

### 步骤 3：小程序端

检查 `miniprogram/frontend/utils/request.js`、`miniprogram/frontend/utils/avatar.js`：

- `normalizeDeep()` 遇到 `data:` 直接返回。
- `/api/assets/` 继续拼接后端主机。
- 历史 MinIO 绝对地址继续经过现有代理归一化。
- 上传返回的 Data URI 不能被当成普通相对 URL。

### 步骤 4：运行前端测试和构建

在学生端执行：

```powershell
npm test
npm run build
```

在管理端执行：

```powershell
npm test
npm run build
```

预期：现有测试和新增 Data URI 兼容测试全部通过，Vite 构建成功。

## 任务 7：保留并验证 MinIO 历史访问

### 步骤 1：确认 MinIO 读取代码不被删除

保持以下代码存在且行为不变：

- `web/backend/src/main/java/com/campus/platform/utils/MinioUtils.java` 的 `readPublicAsset()`。
- `web/backend/src/main/java/com/campus/platform/controller/AssetController.java`。
- 小程序对 `/api/assets/` 的 URL 归一化逻辑。

### 步骤 2：增加兼容测试

使用历史代理路径样例 `/api/assets/campus/images/20260812/legacy.jpg` 和历史绝对地址样例，验证：

- 后端不会把它们当 Base64 解码。
- 前端不会把历史地址错误转换为 Data URI。
- 资源权限校验仍按原有 `ownerUserId` 和数据库登记记录执行。

### 步骤 3：执行手工验收

准备一条已有 MinIO 资源记录和一条新 Base64 资源记录，分别在 Web 学生端、管理端和小程序端打开。预期两者均可正常显示；新 PDF 可直接预览或下载，历史 PDF 仍走 MinIO 代理。

## 任务 8：全量验证

### 步骤 1：运行后端全部测试

```powershell
mvn test
```

预期：构建成功，所有测试通过；若失败，先修复回归问题再继续。

### 步骤 2：运行前端全部检查

```powershell
npm test
npm run build
```

分别在 `web/frontend/student` 和 `web/frontend/admin` 执行，确认测试和构建均成功。

### 步骤 3：检查新 MinIO 上传调用

在后端源码中搜索：

```powershell
Select-String -Path 'src\main\java\**\*.java' -Pattern 'minioUtils\.upload\(|uploadImageAsDataUri' -Recurse
```

预期：`UploadService` 和 `PdfService` 不再调用新上传方法；`MinioUtils.upload()` 可以保留给历史兼容或其他明确场景，但新图片、文件和 PDF 入口不得调用它。

### 步骤 4：检查数据库结构

在已有测试数据库执行 v6 迁移后查询：

```sql
SHOW COLUMNS FROM upload_resource LIKE 'resource_url';
SHOW COLUMNS FROM pdf_document LIKE 'file_url';
```

预期：两个字段类型均为 `LONGTEXT`，现有数据值保持不变。

## 任务 9：完成前的代码审查

逐项核对：

- 新上传入口没有任何 MinIO 写操作。
- `MinioUtils` 的读取能力、`AssetController` 和历史 URL 没有被删除。
- Base64 数据不会进入普通日志、列表接口或无关响应。
- `file_size` 保存原始文件大小。
- PDF 解析仍使用原始文件流。
- PDF 失败分支不会重复插入记录。
- SQL 初始化脚本与迁移脚本一致。
- 前端对 `data:`、相对 MinIO 代理路径、绝对 URL 的处理互不干扰。

## 交付结果

完成后应包含：

- 数据库 v6 迁移脚本。
- 同步更新的 `schema.sql` 和上传配置。
- 图片、PDF、通用文件数据库存储实现。
- 历史 MinIO 资源兼容读取实现。
- 后端与前端自动化测试更新。
- 后端测试、前端测试和生产构建的实际验证结果。
