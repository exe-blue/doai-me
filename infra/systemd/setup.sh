#!/bin/bash
# Systemd 서비스 설정 스크립트
# 사용법: sudo ./setup.sh [orchestrator|node-runner|all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSTEMD_DIR="/etc/systemd/system"

setup_user() {
    echo "=== doai 사용자 설정 ==="
    if ! id "doai" &>/dev/null; then
        sudo useradd -r -s /bin/false -d /opt/aifarm doai
        echo "doai 사용자 생성됨"
    else
        echo "doai 사용자 이미 존재"
    fi
    
    # ADB 접근 그룹
    sudo usermod -aG plugdev doai 2>/dev/null || true
}

setup_directories() {
    echo "=== 디렉토리 설정 ==="
    sudo mkdir -p /etc/doai
    sudo mkdir -p /var/log/doai
    sudo chown doai:doai /var/log/doai
}

setup_orchestrator() {
    echo "=== Orchestrator 서비스 설정 ==="
    sudo cp "$SCRIPT_DIR/doai-orchestrator.service" "$SYSTEMD_DIR/"
    sudo systemctl daemon-reload
    sudo systemctl enable doai-orchestrator
    echo "doai-orchestrator 서비스 등록됨"
}

setup_node_runner() {
    echo "=== Node Runner 서비스 설정 ==="
    sudo cp "$SCRIPT_DIR/doai-node-runner.service" "$SYSTEMD_DIR/"
    sudo systemctl daemon-reload
    sudo systemctl enable doai-node-runner
    echo "doai-node-runner 서비스 등록됨"
}

case "${1:-all}" in
    orchestrator)
        setup_user
        setup_directories
        setup_orchestrator
        ;;
    node-runner)
        setup_user
        setup_directories
        setup_node_runner
        ;;
    all)
        setup_user
        setup_directories
        setup_orchestrator
        setup_node_runner
        ;;
    *)
        echo "사용법: $0 [orchestrator|node-runner|all]"
        exit 1
        ;;
esac

echo ""
echo "=== 완료 ==="
echo "환경변수 파일을 설정하세요:"
echo "  - /etc/doai/orchestrator.env"
echo "  - /etc/doai/node.env"
echo ""
echo "서비스 시작:"
echo "  sudo systemctl start doai-orchestrator"
echo "  sudo systemctl start doai-node-runner"

