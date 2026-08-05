<#
=====================================================================
 AI 校园综合服务平台 · 后端一键启动脚本（PowerShell 版）
 最后更新：2026-08-04
 兼容性  ：Windows PowerShell 5.1 及 PowerShell 7+

 用法一：右键本文件 → 使用 PowerShell 运行
 用法二：命令行执行（推荐，可绕过执行策略限制）
           powershell -ExecutionPolicy Bypass -File deploy\start-server.ps1
 用法三：指定端口
           powershell -ExecutionPolicy Bypass -File deploy\start-server.ps1 -Port 8081
 用法四：先设环境变量再运行，实现参数覆盖
           $env:MYSQL_PASSWORD = "你的密码"
           $env:AI_API_KEY     = "sk-你的真实密钥"
           .\deploy\start-server.ps1

 本脚本以 UTF-8 with BOM 保存，确保 Windows PowerShell 5.1 正确识别中文。
=====================================================================
#>

[CmdletBinding()]
param(
    # 服务端口；不传则读环境变量 SERVER_PORT，仍无则用 8080
    [string] $Port = ''
)

$ErrorActionPreference = 'Stop'

# ---------- 控制台编码：保证中文输出不乱码 ----------
try {
    chcp 65001 > $null
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {
    # 个别受限终端不支持切换代码页，忽略即可，不影响服务启动
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '   AI 校园综合服务平台 - 后端服务' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''

# ---------- 辅助函数：仅在环境变量未定义/为空时写入默认值 ----------
function Set-DefaultEnv {
    param(
        [Parameter(Mandatory = $true)][string] $Name,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string] $Value
    )
    $current = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if ([string]::IsNullOrEmpty($current)) {
        [Environment]::SetEnvironmentVariable($Name, $Value, 'Process')
    }
}

function Exit-WithPause {
    param([int] $Code = 0)
    Write-Host ''
    Write-Host '按回车键退出...' -NoNewline
    [void](Read-Host)
    exit $Code
}

# ---------- 0. 定位项目根目录（本脚本位于 deploy\ 下，上一级即项目根） ----------
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$JarPath     = Join-Path $ProjectRoot 'web\backend\target\platform-server.jar'
Set-Location -Path $ProjectRoot

# ---------- 1. 环境检查：JDK ----------
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if ($null -eq $javaCmd) {
    Write-Host '[错误] 未检测到 java 命令。' -ForegroundColor Red
    Write-Host '       请先安装 JDK 17 或更高版本，并将其 bin 目录加入 PATH。' -ForegroundColor Red
    Exit-WithPause 1
}

# ---------- 2. 环境检查：可执行 jar ----------
if (-not (Test-Path -LiteralPath $JarPath)) {
    Write-Host '[错误] 未找到可执行 jar 文件：' -ForegroundColor Red
    Write-Host "       $JarPath" -ForegroundColor Red
    Write-Host ''
    Write-Host '       请先在项目根目录执行打包命令：' -ForegroundColor Yellow
    Write-Host '           cd web/backend' -ForegroundColor Yellow
    Write-Host '           mvn -DskipTests package' -ForegroundColor Yellow
    Exit-WithPause 1
}

# =====================================================================
#  3. 可覆盖参数默认值
#     规则：若外部已定义同名环境变量，则沿用外部值；否则使用此处默认值。
#           java 子进程继承这些环境变量，application.yml 中的
#           ${VAR:default} 占位符即可读取到。
# =====================================================================

# ---- MySQL ----
Set-DefaultEnv 'MYSQL_HOST'     'localhost'
Set-DefaultEnv 'MYSQL_PORT'     '3306'
Set-DefaultEnv 'MYSQL_DB'       'ai_campus_platform'
Set-DefaultEnv 'MYSQL_USER'     'root'
Set-DefaultEnv 'MYSQL_PASSWORD' 'change-me'

# ---- Redis（无密码时保持 REDIS_PASSWORD 不定义即可） ----
Set-DefaultEnv 'REDIS_HOST' 'localhost'
Set-DefaultEnv 'REDIS_PORT' '6379'
# 示例：$env:REDIS_PASSWORD = 'YourRedisPass'

# ---- MinIO 对象存储 ----
#  默认值 = 本机实测值，与 deploy\start-minio.bat 启动 MinIO 时用的
#  MINIO_ROOT_USER / MINIO_ROOT_PASSWORD 必须一一对应，否则上传报签名错误。
#    MINIO_ENDPOINT   : API 端口 9000（MinIO 默认，启动命令未显式指定）
#    MINIO_ACCESS_KEY : 对应 MINIO_ROOT_USER
#    MINIO_SECRET_KEY : 对应 MINIO_ROOT_PASSWORD
#    MINIO_BUCKET     : 桶名，程序首次上传时自动创建并设匿名读，无需手工建桶
#  覆盖示例：$env:MINIO_SECRET_KEY = '你的新密码'
Set-DefaultEnv 'MINIO_ENDPOINT'   'http://localhost:9000'
Set-DefaultEnv 'MINIO_ACCESS_KEY' 'minioadmin'
Set-DefaultEnv 'MINIO_SECRET_KEY' 'change-me-minio'
Set-DefaultEnv 'MINIO_BUCKET'     'campus'

# ---- JWT 签名密钥（生产环境务必替换为 32 位以上随机串） ----
Set-DefaultEnv 'JWT_SECRET' 'change-me-with-at-least-32-random-characters'

# ---- AI 网关（DeepSeek） ----
#  配置优先级：ai_config 表非空值 > 本处环境变量 > application.yml 默认值。
#  本项目真实 Key 已写入 ai_config 表的 api_key 行（不硬编码进脚本/源码），
#  因此下面保持占位符 sk-xxx 即可，AI 功能仍可正常使用。
#  仅在「DB 里 api_key 被清空」或「想临时换一个 Key 且不改库」时才需要覆盖：
#      $env:AI_API_KEY = 'sk-你的真实密钥'
#  ⚠️ 注意：若 DB 中 api_key 非空，它会盖过这里的环境变量（改 Key 请优先改库或用管理后台）。
Set-DefaultEnv 'AI_BASE_URL' 'https://api.deepseek.com'
Set-DefaultEnv 'AI_API_KEY'  'sk-xxx'
Set-DefaultEnv 'AI_MODEL'    'deepseek-chat'

# ---- 微信小程序 ----
Set-DefaultEnv 'WX_APPID'  'wx-placeholder-appid'
Set-DefaultEnv 'WX_SECRET' 'wx-placeholder-secret'

# ---- 活动签到二维码 HMAC 密钥 ----
Set-DefaultEnv 'SIGNIN_SECRET' 'change-me-signin-hmac-secret'

# ---- 服务端口：命令行参数 > SERVER_PORT 环境变量 > 8080 ----
if ([string]::IsNullOrEmpty($Port)) {
    $Port = [Environment]::GetEnvironmentVariable('SERVER_PORT', 'Process')
}
if ([string]::IsNullOrEmpty($Port)) {
    $Port = '8080'
}

# =====================================================================
#  4. 关键防护：清除可能污染端口配置的环境变量
#
#     背景：Spring Boot 的 relaxed binding 使用
#           ConfigurationPropertyName.adapt(name, '_') 解析环境变量名，
#           连续下划线产生的空元素会被丢弃，因此名为 SERVER__PORT
#           （双下划线）的环境变量会被映射成配置项 server.port。
#
#     现象：某些 CI / 容器 / IDE / AI 沙箱环境会注入 SERVER__PORT=0，
#           而环境变量优先级（第 9 级）高于 application.yml（第 13/14 级），
#           于是 yml 里写的 8080 被静默忽略，日志显示
#           "Tomcat initialized with port 0"，实际监听 OS 分配的随机端口。
#
#     处理：① 清除当前进程内的该变量（不影响用户级/系统级环境）；
#           ② 再用命令行参数 --server.port 显式指定（第 3 级，优先级最高）。
#     双保险，确保端口一定是 $Port。
# =====================================================================
if ($null -ne [Environment]::GetEnvironmentVariable('SERVER__PORT', 'Process')) {
    Write-Host '[提示] 检测到环境变量 SERVER__PORT，已在本次启动中清除（详见部署说明第十三章）。' -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable('SERVER__PORT', $null, 'Process')
}

# ---------- 5. 打印启动参数 ----------
Write-Host "[信息] 项目根目录 : $ProjectRoot"
Write-Host "[信息] 启动 jar    : $JarPath"
Write-Host "[信息] 服务端口    : $Port"
Write-Host ("[信息] MySQL       : {0}:{1}/{2} (user={3})" -f $env:MYSQL_HOST, $env:MYSQL_PORT, $env:MYSQL_DB, $env:MYSQL_USER)
Write-Host ("[信息] Redis       : {0}:{1}" -f $env:REDIS_HOST, $env:REDIS_PORT)
Write-Host ("[信息] MinIO       : {0} (bucket={1}, user={2})" -f $env:MINIO_ENDPOINT, $env:MINIO_BUCKET, $env:MINIO_ACCESS_KEY)
Write-Host ("[信息] AI 网关     : {0} (model={1})" -f $env:AI_BASE_URL, $env:AI_MODEL)

if ($env:AI_API_KEY -eq 'sk-xxx') {
    Write-Host '[提示] 环境变量 AI_API_KEY 为占位符 sk-xxx，将使用 ai_config 表中的 api_key。' -ForegroundColor Yellow
    Write-Host '       这是本项目的常规配置方式；若该表 api_key 行为空，AI 接口会返回 code=1002，' -ForegroundColor Yellow
    Write-Host '       排查步骤见 deploy\部署说明.md 第 13.4 节。' -ForegroundColor Yellow
}
Write-Host '[提示] 文件上传功能依赖 MinIO，请确认已先运行 deploy\start-minio.bat（API 9000 / 控制台 9001）。' -ForegroundColor Yellow

Write-Host ''
Write-Host '[信息] 正在启动，按 Ctrl+C 可停止服务...' -ForegroundColor Green
Write-Host '------------------------------------------------------------'
Write-Host ''

# ---------- 6. 启动 ----------
$javaArgs = @(
    '-Dfile.encoding=UTF-8',
    '-Duser.timezone=Asia/Shanghai',
    '-Xms256m',
    '-Xmx1024m',
    '-jar', $JarPath,
    "--server.port=$Port"
)

# 交给 java 前恢复默认错误处理，避免 Spring 的 stderr 日志被当成终止性异常
$ErrorActionPreference = 'Continue'
& java $javaArgs
$exitCode = $LASTEXITCODE

Write-Host ''
Write-Host '------------------------------------------------------------'
if ($exitCode -eq 0) {
    Write-Host '[信息] 服务已正常退出。' -ForegroundColor Green
} else {
    Write-Host "[错误] 服务异常退出，退出码：$exitCode" -ForegroundColor Red
    Write-Host '       请向上翻阅日志定位原因，常见问题见 deploy\部署说明.md 第十三章。' -ForegroundColor Red
}

Exit-WithPause $exitCode
