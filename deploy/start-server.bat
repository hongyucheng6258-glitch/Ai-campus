@echo off
chcp 65001 >nul
REM 说明：此处刻意不启用 enabledelayedexpansion —— 本脚本无需 !var! 语法，
REM       而延迟扩展会吞掉变量值中的感叹号，导致含 "!" 的密码被静默截断。
setlocal
title AI 校园综合服务平台 - 后端服务 (server)

REM =====================================================================
REM  AI 校园综合服务平台 · 后端一键启动脚本（Windows / 双击可运行）
REM  最后更新：2026-08-04
REM
REM  用法一：直接双击本文件，使用下方默认参数启动
REM  用法二：先在命令行 set 环境变量再运行，实现参数覆盖，例如：
REM            set MYSQL_PASSWORD=你的密码
REM            set AI_API_KEY=sk-你的真实密钥
REM            deploy\start-server.bat
REM
REM  本脚本以 UTF-8 编码保存（无 BOM），配合 chcp 65001 保证中文不乱码。
REM =====================================================================

echo.
echo ============================================================
echo    AI 校园综合服务平台 - 后端服务
echo ============================================================
echo.

REM ---------- 0. 定位项目根目录（本脚本位于 deploy\ 下，上一级即项目根） ----------
cd /d "%~dp0.."
set "PROJECT_ROOT=%CD%"
set "JAR_PATH=%PROJECT_ROOT%\web\backend\target\platform-server.jar"

REM ---------- 1. 环境检查：JDK ----------
where java >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 java 命令。
    echo        请先安装 JDK 17 或更高版本，并将其 bin 目录加入 PATH。
    echo.
    pause
    exit /b 1
)

REM ---------- 2. 环境检查：可执行 jar ----------
if not exist "%JAR_PATH%" (
    echo [错误] 未找到可执行 jar 文件：
    echo        %JAR_PATH%
    echo.
    echo        请先在项目根目录执行打包命令：
    echo            cd web/backend
    echo            mvn -DskipTests package
    echo.
    pause
    exit /b 1
)

REM =====================================================================
REM  3. 可覆盖参数默认值
REM     规则：若外部已用 set / 系统环境变量定义过，则沿用外部值；
REM           否则使用此处默认值。java 子进程会继承这些环境变量，
REM           application.yml 中的 ${VAR:default} 占位符即可读取到。
REM =====================================================================

REM ---- 服务端口 ----
if not defined SERVER_PORT set "SERVER_PORT=8080"

REM ---- MySQL ----
if not defined MYSQL_HOST     set "MYSQL_HOST=localhost"
if not defined MYSQL_PORT     set "MYSQL_PORT=3306"
if not defined MYSQL_DB       set "MYSQL_DB=ai_campus_platform"
if not defined MYSQL_USER     set "MYSQL_USER=root"
if not defined MYSQL_PASSWORD set "MYSQL_PASSWORD=666666"

REM ---- Redis（无密码时保持 REDIS_PASSWORD 不定义即可） ----
if not defined REDIS_HOST set "REDIS_HOST=localhost"
if not defined REDIS_PORT set "REDIS_PORT=6379"
REM 示例：set REDIS_PASSWORD=YourRedisPass

REM ---- MinIO 对象存储 ----
REM  默认值 = 本机实测值，与 deploy\start-minio.bat 启动 MinIO 时用的
REM  MINIO_ROOT_USER / MINIO_ROOT_PASSWORD 必须一一对应，否则上传报签名错误。
REM    MINIO_ENDPOINT   : API 端口 9000（MinIO 默认，启动命令未显式指定）
REM    MINIO_ACCESS_KEY : 对应 MINIO_ROOT_USER
REM    MINIO_SECRET_KEY : 对应 MINIO_ROOT_PASSWORD
REM    MINIO_BUCKET     : 桶名，程序首次上传时自动创建并设匿名读，无需手工建桶
REM  覆盖示例：set MINIO_SECRET_KEY=你的新密码
if not defined MINIO_ENDPOINT   set "MINIO_ENDPOINT=http://localhost:9000"
if not defined MINIO_ACCESS_KEY set "MINIO_ACCESS_KEY=admin"
if not defined MINIO_SECRET_KEY set "MINIO_SECRET_KEY=12345678"
if not defined MINIO_BUCKET     set "MINIO_BUCKET=campus"

REM ---- JWT 签名密钥（生产环境务必替换为 32 位以上随机串） ----
if not defined JWT_SECRET set "JWT_SECRET=campus-platform-jwt-secret-key-2024-graduation-project-must-be-long-enough"

REM ---- AI 网关（DeepSeek） ----
REM  配置优先级：ai_config 表非空值 > 本处环境变量 > application.yml 默认值。
REM  本项目真实 Key 已写入 ai_config 表的 api_key 行（不硬编码进脚本/源码），
REM  因此下面保持占位符 sk-xxx 即可，AI 功能仍可正常使用。
REM  仅在「DB 里 api_key 被清空」或「想临时换一个 Key 且不改库」时才需要覆盖：
REM      set AI_API_KEY=sk-你的真实密钥
REM  ⚠️ 注意：若 DB 中 api_key 非空，它会盖过这里的环境变量（改 Key 请优先改库或用管理后台）。
if not defined AI_BASE_URL set "AI_BASE_URL=https://api.deepseek.com"
if not defined AI_API_KEY  set "AI_API_KEY=sk-xxx"
if not defined AI_MODEL    set "AI_MODEL=deepseek-chat"

REM ---- 微信小程序 ----
if not defined WX_APPID  set "WX_APPID=wx-placeholder-appid"
if not defined WX_SECRET set "WX_SECRET=wx-placeholder-secret"

REM ---- 活动签到二维码 HMAC 密钥 ----
if not defined SIGNIN_SECRET set "SIGNIN_SECRET=campus-activity-signin-hmac-secret"

REM =====================================================================
REM  4. 关键防护：清除可能污染端口配置的环境变量
REM
REM     背景：Spring Boot 的 relaxed binding 使用
REM           ConfigurationPropertyName.adapt(name, '_') 解析环境变量名，
REM           连续下划线产生的空元素会被丢弃，因此名为 SERVER__PORT
REM           （双下划线）的环境变量会被映射成配置项 server.port。
REM
REM     现象：某些 CI / 容器 / IDE / AI 沙箱环境会注入 SERVER__PORT=0，
REM           而环境变量优先级（第 9 级）高于 application.yml（第 13/14 级），
REM           于是 yml 里写的 8080 被静默忽略，日志显示
REM           "Tomcat initialized with port 0"，实际监听 OS 分配的随机端口。
REM
REM     处理：① 在本脚本作用域内清空该变量（setlocal 保证不影响系统环境）；
REM           ② 再用命令行参数 --server.port 显式指定（第 3 级，优先级最高）。
REM     双保险，确保端口一定是 %SERVER_PORT%。
REM
REM     提示输出：与 start-server.ps1 行为对齐 —— 仅当该变量确实存在时才打印
REM               提示，让使用者知道脚本做了这层防护（措辞与 .ps1 逐字一致）。
REM =====================================================================
if defined SERVER__PORT echo [提示] 检测到环境变量 SERVER__PORT，已在本次启动中清除（详见部署说明第十三章）。
set "SERVER__PORT="

echo [信息] 项目根目录 : %PROJECT_ROOT%
echo [信息] 启动 jar    : %JAR_PATH%
echo [信息] 服务端口    : %SERVER_PORT%
echo [信息] MySQL       : %MYSQL_HOST%:%MYSQL_PORT%/%MYSQL_DB% (user=%MYSQL_USER%)
echo [信息] Redis       : %REDIS_HOST%:%REDIS_PORT%
echo [信息] MinIO       : %MINIO_ENDPOINT% (bucket=%MINIO_BUCKET%, user=%MINIO_ACCESS_KEY%)
echo [信息] AI 网关     : %AI_BASE_URL% (model=%AI_MODEL%)
if "%AI_API_KEY%"=="sk-xxx" (
    echo [提示] 环境变量 AI_API_KEY 为占位符 sk-xxx，将使用 ai_config 表中的 api_key。
    echo        这是本项目的常规配置方式；若该表 api_key 行为空，AI 接口会返回 code=1002，
    echo        排查步骤见 deploy\部署说明.md 第 13.4 节。
)
echo [提示] 文件上传功能依赖 MinIO，请确认已先运行 deploy\start-minio.bat（API 9000 / 控制台 9001）。
echo.
echo [信息] 正在启动，按 Ctrl+C 可停止服务...
echo ------------------------------------------------------------
echo.

REM ---------- 5. 启动 ----------
java -Dfile.encoding=UTF-8 ^
     -Duser.timezone=Asia/Shanghai ^
     -Xms256m -Xmx1024m ^
     -jar "%JAR_PATH%" ^
     --server.port=%SERVER_PORT%

set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo ------------------------------------------------------------
if "%EXIT_CODE%"=="0" (
    echo [信息] 服务已正常退出。
) else (
    echo [错误] 服务异常退出，退出码：%EXIT_CODE%
    echo        请向上翻阅日志定位原因，常见问题见 deploy\部署说明.md 第十三章。
)
echo.
pause

REM ---------------------------------------------------------------------
REM  注意：下面一行的 endlocal 与 exit /b 必须写在同一行、用半角 and 符号
REM        连接，绝不可拆成两行！
REM
REM  原因：cmd 在执行一整行之前，会先完成该行内所有百分号变量的展开。
REM        两条命令写在同一行时，EXIT_CODE 早在 endlocal 真正执行前就已
REM        被替换成字面量（如 1），因此退出码能被正确回传给调用方。
REM
REM  反例：若拆成两行，endlocal 会先销毁 setlocal 建立的局部环境，
REM        EXIT_CODE 随之失效，下一行展开为空，实际执行的是不带参数的
REM        exit /b，退出码恒为 0，调用方 / CI 无法感知启动失败。
REM
REM  另注：本段注释刻意不写出半角 and 符号本身。cmd 在解析阶段就会把它
REM        当作命令分隔符处理，即便位于 REM 行内也可能生效，导致其后的
REM        文字被误当成命令执行。
REM ---------------------------------------------------------------------
endlocal & exit /b %EXIT_CODE%
