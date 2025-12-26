#!/bin/bash
# Vultr 서버 초기 설정 스크립트

set -e

echo "=========================================="
echo "YouTube Farm 서버 설정"
echo "=========================================="

# 1. 시스템 업데이트
echo "[1/5] 시스템 업데이트..."
apt update && apt upgrade -y

# 2. Python 설치
echo "[2/5] Python 설치..."
apt install -y python3.11 python3.11-venv python3-pip

# 3. 프로젝트 디렉토리 생성
echo "[3/5] 프로젝트 설정..."
mkdir -p /opt/youtube-farm
cd /opt/youtube-farm

# 4. 가상환경 생성 및 패키지 설치
echo "[4/5] 가상환경 설정..."
python3.11 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pydantic

# 5. 서비스 등록
echo "[5/5] systemd 서비스 등록..."
cat > /etc/systemd/system/youtube-farm.service << EOF
[Unit]
Description=YouTube Farm API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/youtube-farm
ExecStart=/opt/youtube-farm/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable youtube-farm

echo "=========================================="
echo "설정 완료!"
echo ""
echo "다음 단계:"
echo "1. main.py 파일 업로드: scp backend/main.py root@158.247.210.152:/opt/youtube-farm/"
echo "2. 서비스 시작: systemctl start youtube-farm"
echo "3. 상태 확인: systemctl status youtube-farm"
echo "4. 로그 확인: journalctl -u youtube-farm -f"
echo "=========================================="

