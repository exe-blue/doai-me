# =============================================================================
# DoAi.Me Emergency Recovery Script
# C:\doai\bin\recover.ps1
#
# 오리온의 원칙:
# "Allowlist only. 임의 커맨드 실행 금지."
#
# 사용법:
#   powershell -ExecutionPolicy Bypass -File C:\doai\bin\recover.ps1 -Level soft
#   powershell -ExecutionPolicy Bypass -File C:\doai\bin\recover.ps1 -Level service
#   powershell -ExecutionPolicy Bypass -File C:\doai\bin\recover.ps1 -Level power
#
# @author Axon (Builder)
# @version 1.0.0
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('soft','service','power')]
    [string]$Level
)

# 로깅
$LogFile = "C:\doai\logs\recover-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

Write-Log "╔════════════════════════════════════════════════════════╗"
Write-Log "║  DoAi.Me Emergency Recovery                          ║"
Write-Log "║  Level: $Level"
Write-Log "╚════════════════════════════════════════════════════════╝"

# =============================================================================
# LEVEL: SOFT (스크립트 재시작)
# =============================================================================

if ($Level -eq 'soft') {
    Write-Log "🔧 [SOFT] 스크립트 재시작 시작"
    
    try {
        # NodeRunner 재시작
        Write-Log "  → NodeRunner 재시작"
        Restart-Service -Name "DoAiNodeRunner" -Force -ErrorAction Stop
        Start-Sleep -Seconds 5
        
        # 상태 확인
        $service = Get-Service -Name "DoAiNodeRunner"
        if ($service.Status -eq 'Running') {
            Write-Log "✅ [SOFT] NodeRunner 재시작 완료"
        } else {
            throw "NodeRunner 시작 실패"
        }
        
        exit 0
    }
    catch {
        Write-Log "❌ [SOFT] 실패: $_"
        exit 1
    }
}

# =============================================================================
# LEVEL: SERVICE (서비스 재시작)
# =============================================================================

elseif ($Level -eq 'service') {
    Write-Log "🔧 [SERVICE] 서비스 재시작 시작"
    
    try {
        # 1. Laixi 프로세스 종료
        Write-Log "  → Laixi 종료"
        Stop-Process -Name "touping" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        # 2. ADB 서버 재시작
        Write-Log "  → ADB 재시작"
        & adb kill-server
        Start-Sleep -Seconds 2
        & adb start-server
        Start-Sleep -Seconds 5
        
        # 3. Laixi 재시작
        Write-Log "  → Laixi 재시작"
        Start-Process -FilePath "C:\laixi\touping.exe" -WorkingDirectory "C:\laixi" -WindowStyle Hidden
        Start-Sleep -Seconds 10
        
        # 4. 디바이스 확인
        $devices = & adb devices | Select-String "device$"
        $deviceCount = $devices.Count
        Write-Log "  → 디바이스: $deviceCount 대"
        
        # 5. NodeRunner 재시작
        Write-Log "  → NodeRunner 재시작"
        Restart-Service -Name "DoAiNodeRunner" -Force -ErrorAction Stop
        Start-Sleep -Seconds 5
        
        # 6. 상태 확인
        $service = Get-Service -Name "DoAiNodeRunner"
        if ($service.Status -eq 'Running') {
            Write-Log "✅ [SERVICE] 서비스 재시작 완료 (디바이스: $deviceCount)"
            exit 0
        } else {
            throw "NodeRunner 시작 실패"
        }
    }
    catch {
        Write-Log "❌ [SERVICE] 실패: $_"
        exit 1
    }
}

# =============================================================================
# LEVEL: POWER (전원 재부팅)
# =============================================================================

elseif ($Level -eq 'power') {
    Write-Log "🔧 [POWER] 시스템 재부팅 시작"
    Write-Log "⚠️  경고: 2분 후 재부팅됩니다"
    
    try {
        # 로그 플러시
        Start-Sleep -Seconds 1
        
        # 재부팅 (2분 후)
        shutdown /r /t 120 /c "DoAi.Me Emergency Recovery - Power Reboot" /f
        
        Write-Log "✅ [POWER] 재부팅 예약 완료 (2분 후)"
        Write-Log "취소: shutdown /a"
        
        exit 0
    }
    catch {
        Write-Log "❌ [POWER] 실패: $_"
        exit 1
    }
}

Write-Log "❌ 알 수 없는 레벨: $Level"
exit 1
