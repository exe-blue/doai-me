@echo off
REM ============================================================
REM DoAi Gateway Runner - Windows Batch Startup Script
REM ============================================================
REM
REM Usage:
REM   start-gateway.bat                    - Start with default config
REM   start-gateway.bat workstation-1.env  - Start with specific config
REM   start-gateway.bat --help             - Show help
REM
REM ============================================================

setlocal enabledelayedexpansion

REM Set title
title DoAi Gateway Runner

REM Get script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Display banner
echo.
echo ============================================================
echo   DoAi Gateway Runner v1.0.0
echo   YouTube Automation ^& Device Control System
echo ============================================================
echo.

REM Check for Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo         Please install Node.js 18 or later.
    echo         Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Display Node.js version
for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo [Setup] Node.js version: %NODE_VERSION%

REM Check if config argument provided
set "CONFIG_FILE="
if not "%~1"=="" (
    if "%~1"=="--help" goto :help
    if "%~1"=="-h" goto :help
    set "CONFIG_FILE=%~1"
    echo [Config] Using config: %CONFIG_FILE%
)

REM Set environment variable if config provided
if not "%CONFIG_FILE%"=="" (
    set "GATEWAY_CONFIG=%CONFIG_FILE%"
)

REM Check gateway dependencies
set "GATEWAY_PATH=%SCRIPT_DIR%..\..\local\gateway"
if not exist "%GATEWAY_PATH%\node_modules" (
    echo [Setup] Gateway dependencies not installed.
    echo [Setup] Installing dependencies...
    cd /d "%GATEWAY_PATH%"
    call npm install
    cd /d "%SCRIPT_DIR%"
)

REM Start gateway
echo.
echo [Gateway] Starting...
echo.

node index.js %*

if errorlevel 1 (
    echo.
    echo [ERROR] Gateway exited with error code %errorlevel%
    pause
)

exit /b %errorlevel%

:help
echo.
echo Usage: start-gateway.bat [config-file] [options]
echo.
echo Options:
echo   config-file        Config file name from configs/ directory
echo   --help, -h         Show this help message
echo.
echo Examples:
echo   start-gateway.bat                     Start with default config
echo   start-gateway.bat workstation-1.env   Start with workstation-1 config
echo   start-gateway.bat workstation-2.env   Start with workstation-2 config
echo.
echo Environment Variables:
echo   GATEWAY_CONFIG     Config file name (default: default.env)
echo   PORT               Gateway server port (default: 3100)
echo   LAIXI_ENABLED      Enable Laixi connection (true/false)
echo   LAIXI_URL          Laixi WebSocket URL
echo.
exit /b 0
