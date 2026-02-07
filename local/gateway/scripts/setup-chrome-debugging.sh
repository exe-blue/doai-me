#!/bin/bash
#
# Chrome Debugging Setup Script for Android Devices
#
# 이 스크립트는 Android 디바이스에서 Chrome의 원격 디버깅을 활성화합니다.
#
# 사용법:
#   ./setup-chrome-debugging.sh                 # 모든 연결된 디바이스
#   ./setup-chrome-debugging.sh <serial>        # 특정 디바이스
#
# 요구사항:
#   - ADB가 설치되어 있어야 함
#   - 디바이스가 USB 디버깅이 활성화되어 있어야 함
#
# @author Axon (Tech Lead)
# @version 1.0.0

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Chrome 패키지 목록
CHROME_PACKAGES=(
    "com.android.chrome"
    "com.chrome.beta"
    "com.chrome.dev"
    "com.chrome.canary"
)

# 디바이스에서 Chrome 패키지 찾기
find_chrome_package() {
    local serial=$1

    for pkg in "${CHROME_PACKAGES[@]}"; do
        if adb -s "$serial" shell pm list packages | grep -q "$pkg"; then
            echo "$pkg"
            return 0
        fi
    done

    return 1
}

# Chrome DevTools 활성화 확인
check_devtools_enabled() {
    local serial=$1

    # devtools_remote 소켓 확인
    if adb -s "$serial" shell cat /proc/net/unix 2>/dev/null | grep -q "devtools_remote"; then
        return 0
    fi

    return 1
}

# Chrome 강제 종료
stop_chrome() {
    local serial=$1
    local package=$2

    log_info "Stopping Chrome on $serial..."
    adb -s "$serial" shell am force-stop "$package" 2>/dev/null || true
    sleep 1
}

# Chrome 시작 (디버깅 모드)
start_chrome_debug() {
    local serial=$1
    local package=$2

    log_info "Starting Chrome with debugging on $serial..."

    # 방법 1: Activity로 시작 (권장)
    adb -s "$serial" shell am start -n "$package/com.google.android.apps.chrome.Main" 2>/dev/null || \
    adb -s "$serial" shell am start -n "$package/org.chromium.chrome.browser.ChromeTabbedActivity" 2>/dev/null || \
    adb -s "$serial" shell monkey -p "$package" -c android.intent.category.LAUNCHER 1 2>/dev/null

    sleep 2
}

# 디바이스 설정
setup_device() {
    local serial=$1

    log_info "Setting up device: $serial"

    # 1. Chrome 패키지 찾기
    local chrome_pkg
    chrome_pkg=$(find_chrome_package "$serial")

    if [ -z "$chrome_pkg" ]; then
        log_error "Chrome not found on device $serial"
        return 1
    fi

    log_info "Found Chrome: $chrome_pkg"

    # 2. Chrome 종료
    stop_chrome "$serial" "$chrome_pkg"

    # 3. Chrome 시작
    start_chrome_debug "$serial" "$chrome_pkg"

    # 4. DevTools 소켓 확인
    sleep 2
    if check_devtools_enabled "$serial"; then
        log_success "DevTools enabled on $serial"

        # 소켓 정보 출력
        local socket
        socket=$(adb -s "$serial" shell cat /proc/net/unix 2>/dev/null | grep "devtools_remote" | head -1 | awk '{print $NF}')
        log_info "Socket: $socket"
    else
        log_warn "DevTools socket not found on $serial"
        log_info "Note: Chrome may need to have a tab open for devtools to be available"
    fi

    # 5. 포트 포워딩 테스트
    local local_port=$((9300 + RANDOM % 100))
    log_info "Testing port forwarding on port $local_port..."

    # 기존 포워딩 제거
    adb -s "$serial" forward --remove-all 2>/dev/null || true

    # 새 포워딩 설정
    if adb -s "$serial" forward "tcp:$local_port" "localabstract:chrome_devtools_remote" 2>/dev/null; then
        log_success "Port forwarding established: localhost:$local_port -> chrome_devtools_remote"

        # 연결 테스트
        sleep 1
        if curl -s "http://127.0.0.1:$local_port/json/version" 2>/dev/null | grep -q "Browser"; then
            log_success "Chrome DevTools accessible at http://127.0.0.1:$local_port"
        else
            log_warn "Chrome DevTools not responding (Chrome may need an active tab)"
        fi

        # 포워딩 정리
        adb -s "$serial" forward --remove "tcp:$local_port" 2>/dev/null || true
    else
        log_warn "Port forwarding failed - trying alternative socket..."

        # 대체 소켓 시도
        if adb -s "$serial" forward "tcp:$local_port" "tcp:9222" 2>/dev/null; then
            log_success "Alternative forwarding: localhost:$local_port -> tcp:9222"
        fi

        adb -s "$serial" forward --remove "tcp:$local_port" 2>/dev/null || true
    fi

    echo ""
    return 0
}

# 모든 디바이스 목록 가져오기
get_devices() {
    adb devices | grep -E "^\S+\s+device$" | awk '{print $1}'
}

# 메인 실행
main() {
    log_info "Chrome Debugging Setup Script"
    log_info "=============================="
    echo ""

    # ADB 확인
    if ! command -v adb &> /dev/null; then
        log_error "ADB not found. Please install Android SDK Platform Tools."
        exit 1
    fi

    # 디바이스 목록
    local devices
    if [ -n "$1" ]; then
        # 특정 디바이스
        devices=("$1")
    else
        # 모든 디바이스
        mapfile -t devices < <(get_devices)
    fi

    if [ ${#devices[@]} -eq 0 ]; then
        log_error "No devices found. Make sure USB debugging is enabled."
        exit 1
    fi

    log_info "Found ${#devices[@]} device(s)"
    echo ""

    # 각 디바이스 설정
    local success_count=0
    local fail_count=0

    for serial in "${devices[@]}"; do
        if setup_device "$serial"; then
            ((success_count++))
        else
            ((fail_count++))
        fi
    done

    # 결과 요약
    echo ""
    log_info "=============================="
    log_info "Setup Complete"
    log_success "Success: $success_count device(s)"
    if [ $fail_count -gt 0 ]; then
        log_error "Failed: $fail_count device(s)"
    fi

    echo ""
    log_info "Next steps:"
    log_info "1. Start the gateway: npm run dev"
    log_info "2. Chrome automation will auto-connect to devices"
    log_info "3. Use the API to send Chrome tasks"
}

# 스크립트 실행
main "$@"
