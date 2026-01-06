# DoAi.Me 노드별 config 파일 생성 스크립트
# Windows PowerShell에서 실행
#
# 사용법:
#   1. 아래 설정값 수정
#   2. PowerShell에서 실행: .\generate-configs.ps1
#   3. 생성된 config_NODE_XX.json 파일을 각 미니PC에 복사

# ═══════════════════════════════════════════════════════════
# 설정 (반드시 수정)
# ═══════════════════════════════════════════════════════════

$supabaseUrl = "https://YOUR_PROJECT.supabase.co"
$supabaseKey = "YOUR_ANON_KEY"

# 생성할 노드 수
$nodeCount = 15

# ═══════════════════════════════════════════════════════════
# config 파일 생성
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗"
Write-Host "║          DoAi.Me Config Generator                         ║"
Write-Host "╚═══════════════════════════════════════════════════════════╝"
Write-Host ""

# 설정 검증
if ($supabaseUrl -eq "https://YOUR_PROJECT.supabase.co") {
    Write-Host "[ERROR] supabaseUrl을 설정하세요!" -ForegroundColor Red
    exit 1
}
if ($supabaseKey -eq "YOUR_ANON_KEY") {
    Write-Host "[ERROR] supabaseKey를 설정하세요!" -ForegroundColor Red
    exit 1
}

# 출력 디렉토리
$outputDir = ".\configs"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

Write-Host "생성 중: $nodeCount 개 노드 config"
Write-Host ""

for ($i = 1; $i -le $nodeCount; $i++) {
    $nodeId = "NODE_{0:D2}" -f $i
    $nodeName = "미니PC-{0:D2}" -f $i

    $config = @"
{
  "node_id": "$nodeId",
  "node_name": "$nodeName",
  "supabase": {
    "url": "$supabaseUrl",
    "anon_key": "$supabaseKey"
  },
  "laixi": {
    "api_base": "http://127.0.0.1:8080",
    "adb_path": "C:\\Program Files\\Laixi\\tools\\platform-tools\\adb.exe"
  },
  "heartbeat": {
    "interval_ms": 30000,
    "task_poll_ms": 5000
  },
  "devices": []
}
"@

    $filePath = "$outputDir\config_$nodeId.json"
    $config | Out-File -FilePath $filePath -Encoding UTF8
    Write-Host "  [OK] $filePath" -ForegroundColor Green
}

Write-Host ""
Write-Host "완료!" -ForegroundColor Cyan
Write-Host ""
Write-Host "다음 단계:"
Write-Host "  1. configs 폴더의 각 파일을 해당 미니PC로 복사"
Write-Host "  2. 파일명을 config.json으로 변경"
Write-Host "  3. npm install && npm start"
Write-Host ""
