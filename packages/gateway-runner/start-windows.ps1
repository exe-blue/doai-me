# DoAi Gateway Runner - Windows PowerShell Startup Script
# 워크스테이션별 Gateway 실행

param(
    [string]$ConfigPath = "",
    [string]$WorkstationId = "",
    [int]$GatewayPort = 0,
    [switch]$Dev,
    [switch]$Background
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DoAi Gateway Runner v1.0.0" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 설정 파일 경로
if ($ConfigPath -eq "") {
    $ConfigPath = Join-Path $ScriptDir "configs\default.json"
}

if ($env:GATEWAY_CONFIG -eq $null -or $env:GATEWAY_CONFIG -eq "") {
    $env:GATEWAY_CONFIG = $ConfigPath
}

# 환경변수 오버라이드
if ($WorkstationId -ne "") {
    $env:WORKSTATION_ID = $WorkstationId
}
if ($GatewayPort -gt 0) {
    $env:GATEWAY_PORT = $GatewayPort.ToString()
}

# Node.js 확인
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Node.js가 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "        https://nodejs.org/ 에서 설치해 주세요." -ForegroundColor Yellow
    exit 1
}
Write-Host "[Node] $nodeVersion" -ForegroundColor Green

# Gateway 의존성 확인
$gatewayNodeModules = Join-Path $ScriptDir "..\..\local\gateway\node_modules"
if (-not (Test-Path $gatewayNodeModules)) {
    Write-Host "[Setup] Gateway 의존성 설치 중..." -ForegroundColor Yellow
    Push-Location (Join-Path $ScriptDir "..\..\local\gateway")
    npm install
    Pop-Location
}

Write-Host "[Config] $env:GATEWAY_CONFIG" -ForegroundColor Cyan
Write-Host ""

# Gateway 실행
if ($Background) {
    Write-Host "[Gateway] 백그라운드로 시작 중..." -ForegroundColor Green
    $logFile = Join-Path $ScriptDir "logs\gateway.log"
    $logDir = Split-Path -Parent $logFile
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    Start-Process -FilePath "node" -ArgumentList "index.js" -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.err"
    Write-Host "[Gateway] PID 확인: Get-Process -Name node" -ForegroundColor Yellow
} else {
    Write-Host "[Gateway] 시작 중..." -ForegroundColor Green
    if ($Dev) {
        node index.js --dev
    } else {
        node index.js
    }
}
