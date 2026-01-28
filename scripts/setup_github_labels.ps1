# GitHub 라벨 일괄 생성 스크립트 (PowerShell)
# 사용법: .\setup_github_labels.ps1 -Repo "owner/repo"
# 예: .\setup_github_labels.ps1 -Repo "myorg/aifarm"
#
# 필수: GitHub CLI (gh) 설치 및 인증 완료
# 설치: winget install GitHub.cli
# 인증: gh auth login

param(
    [string]$Repo
)

if (-not $Repo) {
    $Repo = gh repo view --json nameWithOwner -q .nameWithOwner 2>$null
    if (-not $Repo) {
        Write-Host "사용법: .\setup_github_labels.ps1 -Repo 'owner/repo'"
        Write-Host "예: .\setup_github_labels.ps1 -Repo 'myorg/aifarm'"
        exit 1
    }
}

Write-Host "=== GitHub Labels 설정: $Repo ===" -ForegroundColor Cyan

function Create-Label {
    param($Name, $Color, $Description)
    
    $result = gh label create $Name --color $Color --description $Description --repo $Repo 2>&1
    if ($LASTEXITCODE -ne 0) {
        gh label edit $Name --color $Color --description $Description --repo $Repo 2>$null
    }
    Write-Host "  ✓ $Name" -ForegroundColor Green
}

Write-Host "`n--- Type 라벨 ---" -ForegroundColor Yellow
Create-Label "type:feature" "0E8A16" "새로운 기능"
Create-Label "type:bug" "D73A4A" "버그 수정"
Create-Label "type:incident" "B60205" "장애/인시던트"
Create-Label "type:chore" "FEF2C0" "잡무/정리"

Write-Host "`n--- Area 라벨 ---" -ForegroundColor Yellow
Create-Label "area:orchestrator" "1D76DB" "Orchestrator (FastAPI)"
Create-Label "area:node" "5319E7" "Node Runner"
Create-Label "area:web" "006B75" "Web Dashboard"
Create-Label "area:infra" "FBCA04" "인프라/배포"
Create-Label "area:docs" "0075CA" "문서"

Write-Host "`n--- Priority 라벨 ---" -ForegroundColor Yellow
Create-Label "prio:P0" "B60205" "긴급 (즉시 대응)"
Create-Label "prio:P1" "D93F0B" "높음 (이번 주)"
Create-Label "prio:P2" "FBCA04" "보통 (백로그)"

Write-Host "`n--- Risk 라벨 ---" -ForegroundColor Yellow
Create-Label "risk:security" "D73A4A" "보안 관련"
Create-Label "risk:outage" "B60205" "장애 위험"
Create-Label "risk:data" "E99695" "데이터 손실 위험"

Write-Host "`n--- Owner 라벨 ---" -ForegroundColor Yellow
Create-Label "owner:axon" "C5DEF5" "담당: Axon (Tech Lead)"
Create-Label "owner:aria" "D4C5F9" "담당: Aria (Product)"
Create-Label "owner:orion" "BFD4F2" "담당: Orion (Operations)"
Create-Label "owner:strategos" "0D96F2" "담당: Strategos (Strategy AI)"
Create-Label "owner:shiva" "F9D0C4" "담당: Shiva"

Write-Host "`n=== 완료! ===" -ForegroundColor Cyan
Write-Host "확인: https://github.com/$Repo/labels" -ForegroundColor Gray

