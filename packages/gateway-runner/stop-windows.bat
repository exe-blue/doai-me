@echo off
REM DoAi Gateway Runner - Windows Stop Script

echo DoAi Gateway - 종료 중...

REM Node.js 프로세스 중 gateway 관련 종료
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *gateway*" 2>nul

REM 포트 3100 사용 프로세스 종료
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3100" ^| find "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
)

echo Gateway 종료 완료
