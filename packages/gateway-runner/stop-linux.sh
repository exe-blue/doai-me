#!/bin/bash
# DoAi Gateway Runner - Linux/macOS Stop Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/gateway.pid"

echo "DoAi Gateway - 종료 중..."

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "Gateway (PID: $PID) 종료됨"
        rm -f "$PID_FILE"
    else
        echo "Gateway가 실행 중이 아닙니다 (PID: $PID)"
        rm -f "$PID_FILE"
    fi
else
    # PID 파일이 없으면 포트로 검색
    PID=$(lsof -ti:3100 2>/dev/null)
    if [ -n "$PID" ]; then
        kill "$PID"
        echo "Gateway (PID: $PID) 종료됨"
    else
        echo "실행 중인 Gateway가 없습니다"
    fi
fi
