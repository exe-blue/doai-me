#!/bin/bash
# ============================================
# DoAi.Me Android Device Initialization Script
# ============================================
# 역할: 폰보드 환경(배터리 없음)에서 Galaxy S9 최적화
# 대상: 600대 기기 일괄 초기화
# ============================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# 설정
# ============================================
AUTOX_PACKAGE="org.autojs.autoxjs.v6"
SCRIPT_DIR="/sdcard/Scripts/DoAiMe"

# ============================================
# 단일 기기 초기화 함수
# ============================================
init_device() {
    local DEVICE_ID=$1
    
    log_info "기기 초기화 중: $DEVICE_ID"
    
    # 1. Doze 모드 비활성화 (배터리 최적화 끄기)
    # 왜? 폰보드는 배터리가 없으므로 Doze가 불필요하고 오히려 방해됨
    adb -s "$DEVICE_ID" shell dumpsys deviceidle disable 2>/dev/null || true
    log_success "  ├─ Doze 모드 비활성화"
    
    # 2. 화면 항상 켜짐 (충전 중)
    # 왜? 폰보드는 항상 전원 연결 상태이므로 화면을 계속 켜둠
    adb -s "$DEVICE_ID" shell settings put global stay_on_while_plugged_in 3
    log_success "  ├─ 화면 항상 켜짐 설정"
    
    # 3. AutoX.js 백그라운드 실행 허용
    # 왜? Android가 앱을 죽이지 않도록 권한 부여
    adb -s "$DEVICE_ID" shell appops set "$AUTOX_PACKAGE" RUN_IN_BACKGROUND allow 2>/dev/null || {
        log_warn "  ├─ AutoX.js 백그라운드 권한 설정 실패 (앱이 설치되어 있는지 확인)"
    }
    
    # 4. 배터리 최적화 예외 추가
    adb -s "$DEVICE_ID" shell dumpsys deviceidle whitelist +$AUTOX_PACKAGE 2>/dev/null || true
    log_success "  ├─ 배터리 최적화 예외 추가"
    
    # 5. WiFi 절전 모드 비활성화
    adb -s "$DEVICE_ID" shell settings put global wifi_sleep_policy 2
    log_success "  ├─ WiFi 절전 모드 비활성화"
    
    # 6. 화면 밝기 최소화 (전력 절약)
    adb -s "$DEVICE_ID" shell settings put system screen_brightness 10
    log_success "  ├─ 화면 밝기 최소화"
    
    # 7. 화면 꺼짐 시간 최대 (30분)
    adb -s "$DEVICE_ID" shell settings put system screen_off_timeout 1800000
    log_success "  ├─ 화면 꺼짐 시간 30분 설정"
    
    # 8. 스크립트 디렉토리 생성
    adb -s "$DEVICE_ID" shell mkdir -p "$SCRIPT_DIR" 2>/dev/null || true
    log_success "  ├─ 스크립트 디렉토리 생성"
    
    # 9. USB 디버깅 연결 유지
    adb -s "$DEVICE_ID" shell settings put global adb_enabled 1
    log_success "  └─ USB 디버깅 활성화 유지"
    
    log_success "기기 초기화 완료: $DEVICE_ID"
    echo ""
}

# ============================================
# 스크립트 배포 함수
# ============================================
deploy_scripts() {
    local DEVICE_ID=$1
    local LOCAL_SCRIPT_DIR=$2
    
    log_info "스크립트 배포 중: $DEVICE_ID"
    
    # 기존 스크립트 백업
    adb -s "$DEVICE_ID" shell "mv $SCRIPT_DIR $SCRIPT_DIR.bak.$(date +%s)" 2>/dev/null || true
    
    # 새 스크립트 배포
    adb -s "$DEVICE_ID" push "$LOCAL_SCRIPT_DIR/." "$SCRIPT_DIR/"
    
    log_success "스크립트 배포 완료: $DEVICE_ID"
}

# ============================================
# 기기 상태 확인 함수
# ============================================
check_device_status() {
    local DEVICE_ID=$1
    
    echo "================================================"
    log_info "기기 상태: $DEVICE_ID"
    echo "------------------------------------------------"
    
    # 배터리 상태
    echo "🔋 배터리:"
    adb -s "$DEVICE_ID" shell dumpsys battery | grep -E "level|status|plugged" | head -5
    
    # 메모리 상태
    echo ""
    echo "💾 메모리:"
    adb -s "$DEVICE_ID" shell cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable" | head -3
    
    # AutoX.js 상태
    echo ""
    echo "📱 AutoX.js 상태:"
    adb -s "$DEVICE_ID" shell "ps -A | grep autox" && echo "  Running" || echo "  Not running"
    
    # 네트워크 상태
    echo ""
    echo "🌐 네트워크:"
    adb -s "$DEVICE_ID" shell "ip addr show wlan0 2>/dev/null | grep inet || echo '  WiFi not connected'"
    adb -s "$DEVICE_ID" shell "ip addr show rmnet_data0 2>/dev/null | grep inet || echo '  LTE not connected'" 2>/dev/null || true
    
    echo "================================================"
    echo ""
}

# ============================================
# Scrcpy 실행 함수 (대시보드 화면 보기용)
# ============================================
start_scrcpy() {
    local DEVICE_ID=$1
    
    log_info "Scrcpy 시작: $DEVICE_ID"
    
    # 오리온 지시: 최적화된 옵션
    # --video-bit-rate=1M : 저대역폭
    # --max-fps=5 : 프레임 최소화
    # --no-audio : 오디오 끄기
    # --no-control : 제어 불가 (보기 전용)
    scrcpy -s "$DEVICE_ID" --video-bit-rate=1M --max-fps=5 --no-audio --no-control &
    
    log_success "Scrcpy 실행됨 (PID: $!)"
}

# ============================================
# AutoX.js 스크립트 실행 함수
# ============================================
start_autox_script() {
    local DEVICE_ID=$1
    local SCRIPT_NAME=${2:-"Main.js"}
    
    log_info "AutoX.js 스크립트 실행: $DEVICE_ID - $SCRIPT_NAME"
    
    # Intent로 스크립트 실행 요청
    adb -s "$DEVICE_ID" shell am broadcast \
        -a "org.autojs.autoxjs.action.RUN_SCRIPT" \
        --es "path" "$SCRIPT_DIR/$SCRIPT_NAME"
    
    log_success "스크립트 실행 요청 완료"
}

# ============================================
# 메인 로직
# ============================================
main() {
    local COMMAND=${1:-"help"}
    
    case $COMMAND in
        init)
            # 모든 연결된 기기 초기화
            log_info "연결된 모든 기기 초기화 시작..."
            
            local DEVICES=$(adb devices | grep -E "device$" | awk '{print $1}')
            local COUNT=0
            
            for DEVICE_ID in $DEVICES; do
                init_device "$DEVICE_ID"
                COUNT=$((COUNT + 1))
            done
            
            log_success "총 $COUNT 대 기기 초기화 완료"
            ;;
            
        init-one)
            # 특정 기기만 초기화
            if [ -z "$2" ]; then
                log_error "기기 ID를 지정해주세요: ./init_devices.sh init-one <DEVICE_ID>"
                exit 1
            fi
            init_device "$2"
            ;;
            
        status)
            # 모든 기기 상태 확인
            local DEVICES=$(adb devices | grep -E "device$" | awk '{print $1}')
            
            for DEVICE_ID in $DEVICES; do
                check_device_status "$DEVICE_ID"
            done
            ;;
            
        status-one)
            # 특정 기기 상태 확인
            if [ -z "$2" ]; then
                log_error "기기 ID를 지정해주세요"
                exit 1
            fi
            check_device_status "$2"
            ;;
            
        deploy)
            # 스크립트 배포
            local LOCAL_DIR=${2:-"./client-android"}
            local DEVICES=$(adb devices | grep -E "device$" | awk '{print $1}')
            
            for DEVICE_ID in $DEVICES; do
                deploy_scripts "$DEVICE_ID" "$LOCAL_DIR"
            done
            ;;
            
        scrcpy)
            # Scrcpy 실행
            if [ -z "$2" ]; then
                log_error "기기 ID를 지정해주세요"
                exit 1
            fi
            start_scrcpy "$2"
            ;;
            
        run)
            # AutoX.js 스크립트 실행
            if [ -z "$2" ]; then
                log_error "기기 ID를 지정해주세요"
                exit 1
            fi
            start_autox_script "$2" "${3:-Main.js}"
            ;;
            
        list)
            # 연결된 기기 목록
            log_info "연결된 기기 목록:"
            adb devices -l
            ;;
            
        help|*)
            echo ""
            echo "DoAi.Me Device Initialization Script"
            echo "====================================="
            echo ""
            echo "Usage: ./init_devices.sh <command> [options]"
            echo ""
            echo "Commands:"
            echo "  init              모든 연결된 기기 초기화"
            echo "  init-one <id>     특정 기기만 초기화"
            echo "  status            모든 기기 상태 확인"
            echo "  status-one <id>   특정 기기 상태 확인"
            echo "  deploy [dir]      스크립트 배포 (기본: ./client-android)"
            echo "  scrcpy <id>       Scrcpy로 화면 보기"
            echo "  run <id> [script] AutoX.js 스크립트 실행"
            echo "  list              연결된 기기 목록"
            echo "  help              도움말"
            echo ""
            ;;
    esac
}

# 스크립트 실행
main "$@"

