# ============================================================
# DoAi Gateway Runner - PowerShell Startup Script
# ============================================================
#
# Usage:
#   .\start-gateway.ps1                    - Start with default config
#   .\start-gateway.ps1 -Config "ws1.env"  - Start with specific config
#   .\start-gateway.ps1 -Help              - Show help
#
# ============================================================

param(
    [Parameter(Position=0)]
    [string]$Config = "",

    [switch]$Help,
    [switch]$Dev,
    [switch]$Status,
    [switch]$Health
)

# Colors for output
function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Banner
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DoAi Gateway Runner v1.0.0" -ForegroundColor White
Write-Host "  YouTube Automation & Device Control System" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Help command
if ($Help) {
    Write-Host "Usage: .\start-gateway.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Config <file>    Config file from configs/ directory"
    Write-Host "  -Dev              Enable development mode"
    Write-Host "  -Status           Show gateway status and exit"
    Write-Host "  -Health           Run health check and exit"
    Write-Host "  -Help             Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host '  .\start-gateway.ps1                      # Default config'
    Write-Host '  .\start-gateway.ps1 -Config "ws1.env"    # Workstation 1'
    Write-Host '  .\start-gateway.ps1 -Config "ws2.env"    # Workstation 2'
    Write-Host '  .\start-gateway.ps1 -Status              # Show status'
    Write-Host ""
    Write-Host "Environment Variables:"
    Write-Host "  GATEWAY_CONFIG    Config file name"
    Write-Host "  PORT              Gateway server port (default: 3100)"
    Write-Host "  LAIXI_ENABLED     Enable Laixi connection"
    Write-Host "  LAIXI_URL         Laixi WebSocket URL"
    Write-Host ""
    exit 0
}

# Check Node.js
try {
    $nodeVersion = & node --version 2>$null
    Write-Host "[Setup] Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host "        Please install Node.js 18 or later." -ForegroundColor Red
    Write-Host "        Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check minimum Node.js version
$versionNumber = [int]($nodeVersion -replace '[^\d]', '' -replace '^(\d+).*', '$1')
if ($versionNumber -lt 18) {
    Write-Host "[WARNING] Node.js 18+ recommended. Current: $nodeVersion" -ForegroundColor Yellow
}

# Gateway path
$GatewayPath = Join-Path $ScriptDir "..\..\local\gateway"
$GatewayPath = [System.IO.Path]::GetFullPath($GatewayPath)

# Check gateway installation
if (-not (Test-Path (Join-Path $GatewayPath "package.json"))) {
    Write-Host "[ERROR] Gateway not found at: $GatewayPath" -ForegroundColor Red
    exit 1
}

# Check dependencies
$NodeModulesPath = Join-Path $GatewayPath "node_modules"
if (-not (Test-Path $NodeModulesPath)) {
    Write-Host "[Setup] Installing gateway dependencies..." -ForegroundColor Yellow
    Push-Location $GatewayPath
    npm install
    Pop-Location
}

# Status check
if ($Status) {
    Write-Host "[Status] Checking gateway status..." -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3100/health/status" -TimeoutSec 5 -ErrorAction Stop
        $json = $response.Content | ConvertFrom-Json
        Write-Host "[Status] Gateway is RUNNING" -ForegroundColor Green
        Write-Host "  - Uptime: $([math]::Round($json.uptime, 2)) seconds" -ForegroundColor Gray
        Write-Host "  - Devices: $($json.devices.total) (Healthy: $($json.devices.healthy))" -ForegroundColor Gray
    } catch {
        Write-Host "[Status] Gateway is NOT RUNNING" -ForegroundColor Red
    }
    exit 0
}

# Health check
if ($Health) {
    Write-Host "[Health] Running health check..." -ForegroundColor Cyan
    & node "scripts\health-check.js"
    exit $LASTEXITCODE
}

# Set config environment variable
if ($Config) {
    $env:GATEWAY_CONFIG = $Config
    Write-Host "[Config] Using: $Config" -ForegroundColor Cyan
}

# Dev mode
$args = @()
if ($Dev) {
    Write-Host "[Mode] Development mode enabled" -ForegroundColor Yellow
    $args += "--dev"
}

if ($Config) {
    $args += "--config=$Config"
}

# Start gateway
Write-Host ""
Write-Host "[Gateway] Starting..." -ForegroundColor Green
Write-Host ""

try {
    & node index.js $args
} catch {
    Write-Host "[ERROR] Gateway failed to start: $_" -ForegroundColor Red
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Gateway exited with code: $LASTEXITCODE" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}
