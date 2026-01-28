#!/bin/bash
# GitHub 라벨 일괄 생성 스크립트
# 사용법: ./setup_github_labels.sh <owner/repo>
# 예: ./setup_github_labels.sh myorg/aifarm
#
# 필수: GitHub CLI (gh) 설치 및 인증 완료
# 설치: https://cli.github.com/
# 인증: gh auth login

REPO=${1:-"$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)"}

if [ -z "$REPO" ]; then
    echo "사용법: $0 <owner/repo>"
    echo "예: $0 myorg/aifarm"
    exit 1
fi

echo "=== GitHub Labels 설정: $REPO ==="

# 기존 기본 라벨 삭제 (선택)
# gh label delete "bug" --repo "$REPO" --yes 2>/dev/null
# gh label delete "documentation" --repo "$REPO" --yes 2>/dev/null
# gh label delete "duplicate" --repo "$REPO" --yes 2>/dev/null
# gh label delete "enhancement" --repo "$REPO" --yes 2>/dev/null
# gh label delete "good first issue" --repo "$REPO" --yes 2>/dev/null
# gh label delete "help wanted" --repo "$REPO" --yes 2>/dev/null
# gh label delete "invalid" --repo "$REPO" --yes 2>/dev/null
# gh label delete "question" --repo "$REPO" --yes 2>/dev/null
# gh label delete "wontfix" --repo "$REPO" --yes 2>/dev/null

echo "--- Type 라벨 생성 ---"
gh label create "type:feature" --color "0E8A16" --description "새로운 기능" --repo "$REPO" 2>/dev/null || gh label edit "type:feature" --color "0E8A16" --description "새로운 기능" --repo "$REPO"
gh label create "type:bug" --color "D73A4A" --description "버그 수정" --repo "$REPO" 2>/dev/null || gh label edit "type:bug" --color "D73A4A" --description "버그 수정" --repo "$REPO"
gh label create "type:incident" --color "B60205" --description "장애/인시던트" --repo "$REPO" 2>/dev/null || gh label edit "type:incident" --color "B60205" --description "장애/인시던트" --repo "$REPO"
gh label create "type:chore" --color "FEF2C0" --description "잡무/정리" --repo "$REPO" 2>/dev/null || gh label edit "type:chore" --color "FEF2C0" --description "잡무/정리" --repo "$REPO"

echo "--- Area 라벨 생성 ---"
gh label create "area:orchestrator" --color "1D76DB" --description "Orchestrator (FastAPI)" --repo "$REPO" 2>/dev/null || gh label edit "area:orchestrator" --color "1D76DB" --description "Orchestrator (FastAPI)" --repo "$REPO"
gh label create "area:node" --color "5319E7" --description "Node Runner" --repo "$REPO" 2>/dev/null || gh label edit "area:node" --color "5319E7" --description "Node Runner" --repo "$REPO"
gh label create "area:web" --color "006B75" --description "Web Dashboard" --repo "$REPO" 2>/dev/null || gh label edit "area:web" --color "006B75" --description "Web Dashboard" --repo "$REPO"
gh label create "area:infra" --color "FBCA04" --description "인프라/배포" --repo "$REPO" 2>/dev/null || gh label edit "area:infra" --color "FBCA04" --description "인프라/배포" --repo "$REPO"
gh label create "area:docs" --color "0075CA" --description "문서" --repo "$REPO" 2>/dev/null || gh label edit "area:docs" --color "0075CA" --description "문서" --repo "$REPO"

echo "--- Priority 라벨 생성 ---"
gh label create "prio:P0" --color "B60205" --description "긴급 (즉시 대응)" --repo "$REPO" 2>/dev/null || gh label edit "prio:P0" --color "B60205" --description "긴급 (즉시 대응)" --repo "$REPO"
gh label create "prio:P1" --color "D93F0B" --description "높음 (이번 주)" --repo "$REPO" 2>/dev/null || gh label edit "prio:P1" --color "D93F0B" --description "높음 (이번 주)" --repo "$REPO"
gh label create "prio:P2" --color "FBCA04" --description "보통 (백로그)" --repo "$REPO" 2>/dev/null || gh label edit "prio:P2" --color "FBCA04" --description "보통 (백로그)" --repo "$REPO"

echo "--- Risk 라벨 생성 ---"
gh label create "risk:security" --color "D73A4A" --description "보안 관련" --repo "$REPO" 2>/dev/null || gh label edit "risk:security" --color "D73A4A" --description "보안 관련" --repo "$REPO"
gh label create "risk:outage" --color "B60205" --description "장애 위험" --repo "$REPO" 2>/dev/null || gh label edit "risk:outage" --color "B60205" --description "장애 위험" --repo "$REPO"
gh label create "risk:data" --color "E99695" --description "데이터 손실 위험" --repo "$REPO" 2>/dev/null || gh label edit "risk:data" --color "E99695" --description "데이터 손실 위험" --repo "$REPO"

echo "--- Owner 라벨 생성 ---"
gh label create "owner:axon" --color "C5DEF5" --description "담당: Axon (Tech Lead)" --repo "$REPO" 2>/dev/null || gh label edit "owner:axon" --color "C5DEF5" --description "담당: Axon (Tech Lead)" --repo "$REPO"
gh label create "owner:aria" --color "D4C5F9" --description "담당: Aria (Product)" --repo "$REPO" 2>/dev/null || gh label edit "owner:aria" --color "D4C5F9" --description "담당: Aria (Product)" --repo "$REPO"
gh label create "owner:orion" --color "BFD4F2" --description "담당: Orion (Operations)" --repo "$REPO" 2>/dev/null || gh label edit "owner:orion" --color "BFD4F2" --description "담당: Orion (Operations)" --repo "$REPO"
gh label create "owner:strategos" --color "0D96F2" --description "담당: Strategos (Strategy AI)" --repo "$REPO" 2>/dev/null || gh label edit "owner:strategos" --color "0D96F2" --description "담당: Strategos (Strategy AI)" --repo "$REPO"
gh label create "owner:shiva" --color "F9D0C4" --description "담당: Shiva" --repo "$REPO" 2>/dev/null || gh label edit "owner:shiva" --color "F9D0C4" --description "담당: Shiva" --repo "$REPO"

echo ""
echo "=== 완료! ==="
echo "확인: https://github.com/$REPO/labels"

