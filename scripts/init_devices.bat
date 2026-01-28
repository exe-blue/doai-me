@echo off
REM ============================================
REM DoAi.Me Android Device Initialization (Windows)
REM ============================================
REM 사용법: init_devices.bat [command] [device_id]
REM ============================================

setlocal enabledelayedexpansion

set AUTOX_PACKAGE=org.autojs.autoxjs.v6
set SCRIPT_DIR=/sdcard/Scripts/DoAiMe

if "%1"=="" goto :help
if "%1"=="help" goto :help
if "%1"=="list" goto :list
if "%1"=="init" goto :init_all
if "%1"=="init-one" goto :init_one
if "%1"=="status" goto :status
if "%1"=="scrcpy" goto :scrcpy

goto :help

:list
echo.
echo [INFO] 연결된 기기 목록:
adb devices -l
goto :end

:init_all
echo.
echo [INFO] 모든 기기 초기화 시작...
for /f "tokens=1" %%d in ('adb devices ^| findstr /r "device$"') do (
    call :init_device %%d
)
echo [SUCCESS] 초기화 완료
goto :end

:init_one
if "%2"=="" (
    echo [ERROR] 기기 ID를 지정해주세요
    goto :end
)
call :init_device %2
goto :end

:init_device
set DEVICE_ID=%1
echo.
echo [INFO] 기기 초기화: %DEVICE_ID%

REM 1. Doze 모드 비활성화
adb -s %DEVICE_ID% shell dumpsys deviceidle disable >nul 2>&1
echo   [OK] Doze 모드 비활성화

REM 2. 화면 항상 켜짐
adb -s %DEVICE_ID% shell settings put global stay_on_while_plugged_in 3
echo   [OK] 화면 항상 켜짐 설정

REM 3. AutoX.js 백그라운드 실행 허용
adb -s %DEVICE_ID% shell appops set %AUTOX_PACKAGE% RUN_IN_BACKGROUND allow >nul 2>&1
echo   [OK] AutoX.js 백그라운드 허용

REM 4. 배터리 최적화 예외
adb -s %DEVICE_ID% shell dumpsys deviceidle whitelist +%AUTOX_PACKAGE% >nul 2>&1
echo   [OK] 배터리 최적화 예외

REM 5. WiFi 절전 모드 비활성화
adb -s %DEVICE_ID% shell settings put global wifi_sleep_policy 2
echo   [OK] WiFi 절전 모드 비활성화

REM 6. 화면 밝기 최소화
adb -s %DEVICE_ID% shell settings put system screen_brightness 10
echo   [OK] 화면 밝기 최소화

REM 7. 화면 꺼짐 시간 30분
adb -s %DEVICE_ID% shell settings put system screen_off_timeout 1800000
echo   [OK] 화면 꺼짐 시간 30분

REM 8. 스크립트 디렉토리 생성
adb -s %DEVICE_ID% shell mkdir -p %SCRIPT_DIR% >nul 2>&1
echo   [OK] 스크립트 디렉토리 생성

echo [SUCCESS] 기기 초기화 완료: %DEVICE_ID%
goto :eof

:status
echo.
for /f "tokens=1" %%d in ('adb devices ^| findstr /r "device$"') do (
    echo ================================================
    echo [INFO] 기기: %%d
    echo ------------------------------------------------
    echo [Battery]
    adb -s %%d shell dumpsys battery | findstr /i "level status plugged"
    echo.
    echo [AutoX.js]
    adb -s %%d shell "ps -A | grep autox" 2>nul || echo   Not running
    echo ================================================
    echo.
)
goto :end

:scrcpy
if "%2"=="" (
    echo [ERROR] 기기 ID를 지정해주세요
    goto :end
)
echo [INFO] Scrcpy 시작: %2
start scrcpy -s %2 --video-bit-rate=1M --max-fps=5 --no-audio --no-control
goto :end

:help
echo.
echo DoAi.Me Device Initialization Script (Windows)
echo ===============================================
echo.
echo Usage: init_devices.bat [command] [device_id]
echo.
echo Commands:
echo   list              연결된 기기 목록
echo   init              모든 기기 초기화
echo   init-one [id]     특정 기기 초기화
echo   status            모든 기기 상태 확인
echo   scrcpy [id]       Scrcpy로 화면 보기
echo   help              도움말
echo.
goto :end

:end
endlocal

