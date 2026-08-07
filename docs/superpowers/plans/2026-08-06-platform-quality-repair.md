# 平台质量问题完整修复实施计划

## 文件映射

- `web/frontend/admin/src/utils/date.js`：管理端统一日期格式。
- `web/frontend/admin/src/utils/image.js`：审核图片字段解析与 URL 规范化。
- `web/frontend/admin/src/views/user/UserList.vue`：应用日期格式化。
- `web/frontend/admin/src/views/audit/AuditQueue.vue`：应用日期和图片工具、错误占位。
- `web/frontend/admin/src/views/dashboard/Dashboard.vue`：ECharts 按需引入。
- `web/frontend/admin/vite.config.mjs`：ESM 配置与依赖拆包。
- `web/frontend/student/src/utils/markdown.js`：highlight.js 按需语言注册。
- `web/frontend/student/src/utils/signinQr.mjs`：明确 ESM 模块。
- `web/frontend/student/vite.config.mjs`：ESM 配置与依赖拆包。
- `web/backend/pom.xml`：排除 `commons-logging`。
- `web/backend/src/main/resources/db/reset_and_testdata.sql`：干净演示数据来源。

## 执行步骤

1. 记录当前工作树和目标文件内容，不改动现有部署脚本与 `application.yml`。
2. 新增管理端日期工具及单元测试，验证 ISO、标准时间和空值。
3. 新增管理端图片工具及单元测试，验证数组、JSON 字符串、单 URL、逗号分隔与非法输入。
4. 更新用户列表和审核队列，运行管理端测试与构建。
5. 将 Dashboard 改为 ECharts core 按需注册，运行管理端构建并记录 chunk 大小。
6. 将学生端 Markdown 高亮改为常用语言按需注册，运行现有 17 项测试。
7. 将签到工具和两端 Vite 配置迁移到 `.mjs`，更新所有引用并清理旧配置。
8. 在两端 Vite 配置加入稳定 vendor chunks，运行生产构建并检查告警。
9. 在 PDFBox 依赖中排除 `commons-logging`，运行依赖树与后端测试。
10. 确认 `mysqldump`、`mysql` 可用，创建带时间戳的数据库备份并验证文件非空。
11. 使用 UTF-8 执行 schema 和重置数据脚本，抽样查询中文字段与字符集。
12. 启动 MinIO、后端和两个前端，检查启动日志无目标告警。
13. 浏览器回归学生首页、活动、闲置、失物、AI；管理端用户、审核、AI 配置。
14. 复核图片占位、日期、中文数据和网络/控制台错误，更新运行检查报告。

## 验证命令

```powershell
npm test
npm run build
```

分别在学生端和管理端执行；管理端新增测试脚本后执行测试。

```powershell
mvn test
mvn dependency:tree -Dincludes=commons-logging:commons-logging
```

在后端执行，预期测试通过且依赖树不包含运行时 commons-logging。

```powershell
mysqldump --default-character-set=utf8mb4 -uroot -p ai_campus_platform
mysql --default-character-set=utf8mb4 -uroot -p
```

备份成功且文件非空后，依次导入 schema 和测试数据脚本。

## 停止条件

- 数据库备份失败：不执行重置。
- 基线测试失败：先定位是否与本轮修改相关，不继续叠加修改。
- 图片对象不存在：保留前端占位修复，同时记录对象数据问题，不伪造资源。
- 三次修复尝试仍未解决同一问题：停止并重新评估根因。