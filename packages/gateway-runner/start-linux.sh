#!/bin/bash
# DoAi Gateway Runner - Linux/macOS Startup Script
# 워크스테이션별 Gateway 실행

set -e

echo "============================================"
echo "  DoAi Gateway Runner v1.0.0"
echo "============================================"
echo ""

# 스크립트 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 설정 파일 경로 (기본값)
GATEWAY_CONFIG="${GATEWAY_CONFIG:-$SCRIPT_DIR/configs/default.json}"
export GATEWAY_CONFIG

# 명령줄 인수 처리
BACKGROUND=false
DEV=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --config)
            GATEWAY_CONFIG="$2"
            export GATEWAY_CONFIG
            shift 2
            ;;
        --workstation-id)
            export WORKSTATION_ID="$2"
            shift 2
            ;;
        --port)
            export GATEWAY_PORT="$2"
            shift 2
            ;;
        --background|-b)
            BACKGROUND=true
            shift
            ;;
        --dev|-d)
            DEV=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Node.js 확인
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js가 설치되어 있지 않습니다."
    echo "        https://nodejs.org/ 에서 설치해 주세요."
    exit 1
fi
echo "[Node] $(node --version)"

# Gateway 의존성 확인
GATEWAY_PATH="$SCRIPT_DIR/../../local/gateway"
if [ ! -d "$GATEWAY_PATH/node_modules" ]; then
    echo "[Setup] Gateway 의존성 설치 중..."
    cd "$GATEWAY_PATH"
    npm install
    cd "$SCRIPT_DIR"
fi

echo "[Config] $GATEWAY_CONFIG"
echo ""

# 로그 디렉토리 생성
mkdir -p "$SCRIPT_DIR/logs"

# Gateway 실행
if [ "$BACKGROUND" = true ]; then
    echo "[Gateway] 백그라운드로 시작 중..."
    LOG_FILE="$SCRIPT_DIR/logs/gateway.log"

    if [ "$DEV" = true ]; then
        nohup node index.js --dev > "$LOG_FILE" 2>&1 &
    else
        nohup node index.js > "$LOG_FILE" 2>&1 &
    fi

    PID=$!
    echo $PID > "$SCRIPT_DIR/gateway.pid"
    echo "[Gateway] PID: $PID"
    echo "[Gateway] 로그: $LOG_FILE"
else
    echo "[Gateway] 시작 중..."
    if [ "$DEV" = true ]; then
        node index.js --dev
    else
        node index.js
    fi
fi
