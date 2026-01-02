#!/bin/bash
# =============================================================================
# DoAi.Me Emergency Recovery Script (Linux)
# /opt/doai/bin/recover.sh
#
# Strategos의 요구사항:
# "3단계 비상 버튼"
# - Stage 1: 소프트 복구 (서비스/ADB)
# - Stage 2: 서비스 재시작 (Laixi/NodeRunner)
# - Stage 3: 박스 제어 API (stub)
#
# 사용법:
#   sudo /opt/doai/bin/recover.sh soft
#   sudo /opt/doai/bin/recover.sh service
#   sudo /opt/doai/bin/recover.sh power
#
# @author Axon (Builder)
# @version 1.0.0
# =============================================================================

set -e  # Exit on error

LEVEL=$1

# 로깅
LOG_DIR="/opt/doai/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/recover-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "╔════════════════════════════════════════════════════════╗"
log "║  DoAi.Me Emergency Recovery (Linux)                  ║"
log "║  Level: $LEVEL                                        ║"
log "╚════════════════════════════════════════════════════════╝"

# =============================================================================
# STAGE 1: SOFT (서비스 재시작)
# =============================================================================

if [ "$LEVEL" = "soft" ]; then
    log "🔧 [STAGE 1: SOFT] 서비스 재시작"
    
    # NodeRunner 재시작
    log "  → NodeRunner 재시작"
    sudo systemctl restart doai-noderunner || {
        log "❌ [SOFT] NodeRunner 재시작 실패"
        exit 1
    }
    
    sleep 3
    
    # 상태 확인
    if sudo systemctl is-active --quiet doai-noderunner; then
        log "✅ [SOFT] NodeRunner 재시작 완료"
        exit 0
    else
        log "❌ [SOFT] NodeRunner 시작 실패"
        exit 1
    fi
fi

# =============================================================================
# STAGE 2: SERVICE (Laixi + ADB + NodeRunner)
# =============================================================================

if [ "$LEVEL" = "service" ]; then
    log "🔧 [STAGE 2: SERVICE] 서비스 재시작"
    
    # 1. Laixi 종료
    log "  → Laixi 종료"
    pkill -f touping || true
    sleep 2
    
    # 2. ADB 서버 재시작
    log "  → ADB 재시작"
    adb kill-server || true
    sleep 2
    adb start-server
    sleep 5
    
    # 3. Laixi 재시작 (백그라운드)
    log "  → Laixi 재시작"
    nohup /opt/laixi/touping > /dev/null 2>&1 &
    sleep 10
    
    # 4. 디바이스 확인
    DEVICE_COUNT=$(adb devices | grep -c "device$" || echo 0)
    log "  → 디바이스: $DEVICE_COUNT 대"
    
    # 5. NodeRunner 재시작
    log "  → NodeRunner 재시작"
    sudo systemctl restart doai-noderunner
    sleep 3
    
    # 6. 상태 확인
    if sudo systemctl is-active --quiet doai-noderunner; then
        log "✅ [SERVICE] 서비스 재시작 완료 (디바이스: $DEVICE_COUNT)"
        exit 0
    else
        log "❌ [SERVICE] NodeRunner 시작 실패"
        exit 1
    fi
fi

# =============================================================================
# STAGE 3: POWER (시스템 재부팅)
# =============================================================================

if [ "$LEVEL" = "power" ]; then
    log "🔧 [STAGE 3: POWER] 시스템 재부팅"
    log "⚠️  경고: 2분 후 재부팅됩니다"
    
    # 재부팅 (2분 후)
    sudo shutdown -r +2 "DoAi.Me Emergency Recovery - Power Reboot"
    
    log "✅ [POWER] 재부팅 예약 완료 (2분 후)"
    log "취소: sudo shutdown -c"
    
    exit 0
fi

log "❌ 알 수 없는 레벨: $LEVEL"
log "사용법: recover.sh {soft|service|power}"
exit 1
