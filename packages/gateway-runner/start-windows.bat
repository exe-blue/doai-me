@echo off
REM DoAi Gateway Runner - Windows Startup Script
REM 워크스테이션별 Gateway 실행

setlocal enabledelayedexpansion

echo ============================================
echo   DoAi Gateway Runner v1.0.0
echo ============================================
echo.

REM 설정 파일 경로 (기본값: configs/default.json)
if "%GATEWAY_CONFIG%"=="" (
    set GATEWAY_CONFIG=%~dp0configs\default.json
)

REM 작업 디렉토리 설정
cd /d "%~dp0"

REM Node.js 확인
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js가 설치되어 있지 않습니다.
    echo         https://nodejs.org/ 에서 설치해 주세요.
    pause
    exit /b 1
)

REM Gateway 의존성 확인
if not exist "..\..\local\gateway\node_modules" (
    echo [Setup] Gateway 의존성 설치 중...
    cd ..\..\local\gateway
    npm install
    cd "%~dp0"
)

echo [Config] %GATEWAY_CONFIG%
echo.

REM Gateway 실행
echo [Gateway] 시작 중...
node index.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Gateway 실행 실패
    pause
)
