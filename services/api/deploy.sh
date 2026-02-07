#!/bin/bash
# DoAi.Me Backend API (P1) - Vultr 배포 스크립트
#
# 사용법:
#   1. Vultr VPS에 SSH 접속
#   2. git pull 후 이 스크립트 실행
#   3. chmod +x deploy.sh && ./deploy.sh

set -e

echo "============================================"
echo "🚀 DoAi.Me Backend API (P1) 배포"
echo "============================================"

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Docker 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되지 않았습니다"
    exit 1
fi

# 2. 환경 변수 확인
if [ ! -f ".env" ]; then
    echo "⚠️  .env 파일이 없습니다. api/.env에서 복사합니다..."
    if [ -f "api/.env" ]; then
        cp api/.env .env
    else
        echo "❌ api/.env 파일도 없습니다. 수동으로 생성해주세요."
        exit 1
    fi
fi

# 3. 네트워크 생성 (없으면)
docker network create doai-network 2>/dev/null || true

# 4. 기존 컨테이너 정리
echo "🔄 기존 컨테이너 정리..."
docker-compose down --remove-orphans 2>/dev/null || true

# 5. 빌드 및 시작
echo "🔨 빌드 중..."
docker-compose build --no-cache

echo "🚀 시작 중..."
docker-compose up -d

# 6. 상태 확인
echo ""
echo "============================================"
echo "📊 배포 상태"
echo "============================================"
docker-compose ps
echo ""

# 7. 헬스체크 (최대 30초 대기)
echo "🔍 헬스체크..."
for i in {1..6}; do
    if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
        echo "✅ API 서버 정상 작동"
        break
    fi
    echo "   대기 중... ($i/6)"
    sleep 5
done

# 8. API 버전 확인
echo ""
echo "📋 API 정보:"
curl -s http://localhost:8001/ | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8001/

echo ""
echo "============================================"
echo "✅ 배포 완료!"
echo "============================================"
echo ""
echo "P1 Persona IDLE Search 엔드포인트:"
echo "  GET  /api/personas              - 페르소나 목록"
echo "  GET  /api/personas/{id}         - 페르소나 상세"
echo "  POST /api/personas/{id}/idle-search - IDLE 검색 트리거"
echo "  GET  /api/personas/{id}/search-history - 검색 기록"
echo "  GET  /api/personas/{id}/search-profile - 고유성 분석"
echo ""
echo "로그 확인: docker-compose logs -f doai-api"
echo ""
