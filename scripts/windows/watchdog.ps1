# =============================================================================
# DoAi.Me Local Watchdog
# C:\doai\bin\watchdog.ps1
#
# 역할:
# - NodeRunner/Laixi 프로세스 감시
# - 하트비트 확인
# - soft/service 자동 복구 (power는 금지)
#
# 작업 스케줄러 등록:
#   schtasks /create /tn "DoAiWatchdog" /tr "powershell -ExecutionPolicy Bypass -File C:\doai\bin\watchdog.ps1" /sc minute /mo 5 /ru SYSTEM
#
# @author Axon (Builder)
# @version 1.0.0
# =============================================================================

# 로깅
$LogFile = "C:\doai\logs\watchdog-$(Get-Date -Format 'yyyyMMdd').log"
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

Write-Log "╔════════════════════════════════════════════════════════╗"
Write-Log "║  DoAi.Me Local Watchdog                               ║"
Write-Log "╚════════════════════════════════════════════════════════╝"

# 설정
$HeartbeatFile = "C:\doai\data\last_heartbeat.txt"
$HeartbeatTimeoutSeconds = 120  # 2분
$RecoverScript = "C:\doai\bin\recover.ps1"

# =============================================================================
# 1. NodeRunner 프로세스 체크
# =============================================================================

Write-Log "🔍 NodeRunner 프로세스 체크"

$noderunnerService = Get-Service -Name "DoAiNodeRunner" -ErrorAction SilentlyContinue

if ($noderunnerService -eq $null) {
    Write-Log "❌ NodeRunner 서비스 없음"
    exit 1
}

if ($noderunnerService.Status -ne 'Running') {
    Write-Log "⚠️  NodeRunner 중지됨 → soft 복구 시작"
    
    try {
        & powershell -ExecutionPolicy Bypass -File $RecoverScript -Level soft
        Write-Log "✅ NodeRunner soft 복구 완료"
    }
    catch {
        Write-Log "❌ NodeRunner soft 복구 실패: $_"
        exit 1
    }
}
else {
    Write-Log "✅ NodeRunner 실행 중"
}

# =============================================================================
# 2. Laixi 프로세스 체크
# =============================================================================

Write-Log "🔍 Laixi 프로세스 체크"

$laixiProcess = Get-Process -Name "touping" -ErrorAction SilentlyContinue

if ($laixiProcess -eq $null) {
    Write-Log "⚠️  Laixi 프로세스 없음 → service 복구 시작"
    
    try {
        & powershell -ExecutionPolicy Bypass -File $RecoverScript -Level service
        Write-Log "✅ Laixi service 복구 완료"
    }
    catch {
        Write-Log "❌ Laixi service 복구 실패: $_"
        exit 1
    }
}
else {
    Write-Log "✅ Laixi 프로세스 실행 중 (PID: $($laixiProcess.Id))"
}

# =============================================================================
# 3. 하트비트 체크 (옵션)
# =============================================================================

if (Test-Path $HeartbeatFile) {
    Write-Log "🔍 하트비트 체크"
    
    try {
        $lastHeartbeat = Get-Content $HeartbeatFile -ErrorAction Stop
        $lastHeartbeatTime = [DateTime]::Parse($lastHeartbeat)
        $elapsed = (Get-Date) - $lastHeartbeatTime
        
        Write-Log "  → 마지막 하트비트: $lastHeartbeat ($([int]$elapsed.TotalSeconds)초 전)"
        
        if ($elapsed.TotalSeconds -gt $HeartbeatTimeoutSeconds) {
            Write-Log "⚠️  하트비트 타임아웃 ($([int]$elapsed.TotalSeconds)초) → service 복구"
            
            & powershell -ExecutionPolicy Bypass -File $RecoverScript -Level service
        }
    }
    catch {
        Write-Log "⚠️  하트비트 파일 읽기 실패: $_"
    }
}

# =============================================================================
# 4. 디바이스 수 체크
# =============================================================================

Write-Log "🔍 디바이스 수 체크"

try {
    $devices = & adb devices | Select-String "device$"
    $deviceCount = $devices.Count
    
    Write-Log "  → 연결된 디바이스: $deviceCount 대"
    
    # 예상 디바이스 수 (120대)
    $expectedCount = 120
    $dropThreshold = 0.3  # 30%
    
    if ($deviceCount -lt ($expectedCount * (1 - $dropThreshold))) {
        Write-Log "⚠️  디바이스 급감 ($deviceCount/$expectedCount) → service 복구"
        
        & powershell -ExecutionPolicy Bypass -File $RecoverScript -Level service
    }
}
catch {
    Write-Log "❌ 디바이스 체크 실패: $_"
}

# =============================================================================
# 완료
# =============================================================================

Write-Log "✅ Watchdog 체크 완료"
exit 0
