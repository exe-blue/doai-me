#!/bin/bash
# Caddy 배포 스크립트
# 사용법: ./deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CADDY_CONFIG="/etc/caddy/Caddyfile"

echo "=== Caddy 배포 시작 ==="

# 1. 현재 설정 백업
if [ -f "$CADDY_CONFIG" ]; then
    BACKUP_FILE="/etc/caddy/Caddyfile.bak.$(date +%Y%m%d%H%M%S)"
    echo "기존 설정 백업: $BACKUP_FILE"
    sudo cp "$CADDY_CONFIG" "$BACKUP_FILE"
fi

# 2. 새 설정 검증
echo "설정 검증 중..."
caddy validate --config "$SCRIPT_DIR/Caddyfile"

# 3. 설정 복사
echo "설정 복사 중..."
sudo cp "$SCRIPT_DIR/Caddyfile" "$CADDY_CONFIG"

# 4. Caddy 리로드 (무중단)
echo "Caddy 리로드 중..."
sudo systemctl reload caddy

# 5. 상태 확인
echo "상태 확인..."
sudo systemctl status caddy --no-pager

# 6. Health check
echo "Health check..."
sleep 2
if curl -sf https://api.doai.me/health > /dev/null; then
    echo "✅ 배포 완료!"
else
    echo "⚠️ Health check 실패. 롤백이 필요할 수 있습니다."
    echo "롤백: sudo cp $BACKUP_FILE $CADDY_CONFIG && sudo systemctl reload caddy"
    exit 1
fi

