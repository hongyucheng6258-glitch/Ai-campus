@echo off
chcp 65001 >nul
REM 说明：与 start-server.bat 保持一致，此处刻意不启用 enabledelayedexpansion ——
REM       延迟扩展会吞掉变量值中的感叹号，导致含 "!" 的密码被静默截断。
setlocal
title AI 校园综合服务平台 - MinIO 对象存储

REM =====================================================================
REM  AI 校园综合服务平台 · MinIO 一键启动脚本（Windows / 双击可运行）
REM  最后更新：2026-08-04
REM
REM  作用：把本机实测可用的 MinIO 启动命令固化下来，避免每次手敲环境变量。
REM        等价于手工执行：
REM            set MINIO_ROOT_USER=minioadmin
REM            set MINIO_ROOT_PASSWORD=请设置强密码
REM            E:\minio\minio.exe server E:\minio-data --console-address ":9001"
REM
REM  用法一：直接双击本文件
REM  用法二：先 set 环境变量再运行，实现参数覆盖，例如：
REM            set MINIO_DATA_DIR=D:\minio-data
REM            deploy\start-minio.bat
REM
REM  重要：本脚本设置的账号密码，必须与后端 start-server.bat 中的
REM        MINIO_ACCESS_KEY / MINIO_SECRET_KEY 一一对应，否则后端上传
REM        会报签名错误。两处默认值均为 admin / 12345678，已对齐。
REM
REM  本脚本以 UTF-8 编码保存（无 BOM），配合 chcp 65001 保证中文不乱码。
REM =====================================================================

echo.
echo ============================================================
echo    AI 校园综合服务平台 - MinIO 对象存储
echo ============================================================
echo.

REM =====================================================================
REM  1. 可覆盖参数默认值
REM     规则：若外部已用 set / 系统环境变量定义过，则沿用外部值；
REM           否则使用此处默认值（本机实测值）。
REM =====================================================================

REM ---- minio.exe 可执行文件路径 ----
if not defined MINIO_EXE set "MINIO_EXE=E:\minio\minio.exe"

REM ---- 数据目录（存放 bucket 与 .minio.sys 元数据，勿手工删改） ----
if not defined MINIO_DATA_DIR set "MINIO_DATA_DIR=E:\minio-data"

REM ---- 控制台端口。API 端口固定 9000，是 MinIO 默认值，启动命令不显式指定 ----
if not defined MINIO_CONSOLE_PORT set "MINIO_CONSOLE_PORT=9001"

REM ---- root 账号密码。后端以此作为 accessKey / secretKey 连接 ----
REM     MinIO 要求 MINIO_ROOT_PASSWORD 长度至少 8 位，12345678 恰好满足。
if not defined MINIO_ROOT_USER     set "MINIO_ROOT_USER=admin"
if not defined MINIO_ROOT_PASSWORD set "MINIO_ROOT_PASSWORD=12345678"

REM ---------- 2. 环境检查：minio.exe ----------
if not exist "%MINIO_EXE%" (
    echo [错误] 未找到 minio.exe：
    echo        %MINIO_EXE%
    echo.
    echo        请从 https://dl.min.io/server/minio/release/windows-amd64/minio.exe
    echo        下载后放到该路径，或先 set MINIO_EXE=你的实际路径 再运行本脚本。
    echo.
    pause
    exit /b 1
)

REM ---------- 3. 数据目录不存在则自动创建 ----------
if not exist "%MINIO_DATA_DIR%" (
    echo [信息] 数据目录不存在，正在创建：%MINIO_DATA_DIR%
    mkdir "%MINIO_DATA_DIR%"
    if errorlevel 1 (
        echo [错误] 数据目录创建失败，请检查磁盘是否存在或是否有写入权限。
        echo.
        pause
        exit /b 1
    )
)

REM ---------- 4. 端口占用提醒（不阻断，仅提示） ----------
netstat -ano | findstr ":9000" | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo [警告] 端口 9000 已被占用，可能 MinIO 已在运行。
    echo        若本次启动报 "Specified port is already in use"，说明无需重复启动。
    echo.
)

echo [信息] minio.exe   : %MINIO_EXE%
echo [信息] 数据目录    : %MINIO_DATA_DIR%
echo [信息] API 地址    : http://localhost:9000
echo [信息] 控制台地址  : http://localhost:%MINIO_CONSOLE_PORT%
echo [信息] 登录账号    : %MINIO_ROOT_USER%
echo [信息] 登录密码    : %MINIO_ROOT_PASSWORD%
echo.
echo [提示] 浏览器打开控制台即可查看已上传的文件：
echo            http://localhost:%MINIO_CONSOLE_PORT%
echo.
echo [提示] 无需手工创建 bucket，也无需手工设置 Public 权限。
echo        后端 MinioUtils.ensureBucket 会在「首次上传文件时」自动创建
echo        campus 桶并写入匿名读策略，图片/PDF 即可被前端直接访问。
echo.
echo [信息] 正在启动，按 Ctrl+C 可停止服务...
echo ------------------------------------------------------------
echo.

REM ---------- 5. 启动 ----------
REM  注意：API 端口不写 --address，沿用 MinIO 默认的 9000，
REM        与 application.yml 的 MINIO_ENDPOINT 默认值保持一致。
"%MINIO_EXE%" server "%MINIO_DATA_DIR%" --console-address ":%MINIO_CONSOLE_PORT%"

set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo ------------------------------------------------------------
if "%EXIT_CODE%"=="0" (
    echo [信息] MinIO 已正常退出。
) else (
    echo [错误] MinIO 异常退出，退出码：%EXIT_CODE%
    echo        常见原因：端口 9000 / %MINIO_CONSOLE_PORT% 被占用；数据目录无写权限；
    echo        密码短于 8 位。排查步骤见 deploy\部署说明.md 第 13.8 节。
)
echo.
pause

REM ---------------------------------------------------------------------
REM  注意：下面一行的 endlocal 与 exit /b 必须写在同一行、用半角 and 符号
REM        连接，绝不可拆成两行！原因与 start-server.bat 末尾完全相同：
REM        cmd 会在执行整行前完成百分号变量展开，拆行后 endlocal 先销毁
REM        局部环境，EXIT_CODE 失效，退出码恒为 0。
REM ---------------------------------------------------------------------
endlocal & exit /b %EXIT_CODE%
