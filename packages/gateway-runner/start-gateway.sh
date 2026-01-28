#!/bin/bash
# ============================================================
# DoAi Gateway Runner - Linux/Mac Startup Script
# ============================================================
#
# Usage:
#   ./start-gateway.sh                    - Start with default config
#   ./start-gateway.sh workstation-1.env  - Start with specific config
#   ./start-gateway.sh --help             - Show help
#
# ============================================================

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "  DoAi Gateway Runner v1.0.0"
echo -e "  YouTube Automation & Device Control System"
echo -e "${CYAN}============================================================${NC}"
echo ""

# Help function
show_help() {
    echo "Usage: $0 [config-file] [options]"
    echo ""
    echo "Options:"
    echo "  config-file        Config file name from configs/ directory"
    echo "  --help, -h         Show this help message"
    echo "  --dev              Enable development mode"
    echo "  --status           Show gateway status and exit"
    echo "  --health           Run health check and exit"
    echo ""
    echo "Examples:"
    echo "  $0                           # Start with default config"
    echo "  $0 workstation-1.env         # Start with workstation-1 config"
    echo "  $0 workstation-2.env         # Start with workstation-2 config"
    echo "  $0 --status                  # Show status"
    echo ""
    echo "Environment Variables:"
    echo "  GATEWAY_CONFIG    Config file name (default: default.env)"
    echo "  PORT              Gateway server port (default: 3100)"
    echo "  LAIXI_ENABLED     Enable Laixi connection (true/false)"
    echo "  LAIXI_URL         Laixi WebSocket URL"
    echo ""
    exit 0
}

# Check for help flag
for arg in "$@"; do
    case $arg in
        --help|-h)
            show_help
            ;;
    esac
done

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed!${NC}"
    echo "        Please install Node.js 18 or later."
    echo "        Download from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}[Setup] Node.js version: ${NODE_VERSION}${NC}"

# Check minimum Node.js version
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${YELLOW}[WARNING] Node.js 18+ recommended. Current: ${NODE_VERSION}${NC}"
fi

# Gateway path
GATEWAY_PATH="$SCRIPT_DIR/../../local/gateway"
GATEWAY_PATH=$(cd "$GATEWAY_PATH" 2>/dev/null && pwd || echo "$GATEWAY_PATH")

# Check gateway installation
if [ ! -f "$GATEWAY_PATH/package.json" ]; then
    echo -e "${RED}[ERROR] Gateway not found at: ${GATEWAY_PATH}${NC}"
    exit 1
fi

# Check dependencies
if [ ! -d "$GATEWAY_PATH/node_modules" ]; then
    echo -e "${YELLOW}[Setup] Installing gateway dependencies...${NC}"
    pushd "$GATEWAY_PATH" > /dev/null
    npm install
    popd > /dev/null
fi

# Parse arguments
CONFIG_FILE=""
DEV_MODE=""
EXTRA_ARGS=""

for arg in "$@"; do
    case $arg in
        --dev)
            DEV_MODE="--dev"
            echo -e "${YELLOW}[Mode] Development mode enabled${NC}"
            ;;
        --status)
            echo -e "${CYAN}[Status] Checking gateway status...${NC}"
            if curl -s -f "http://localhost:3100/health/status" > /dev/null 2>&1; then
                RESPONSE=$(curl -s "http://localhost:3100/health/status")
                echo -e "${GREEN}[Status] Gateway is RUNNING${NC}"
                echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'  - Uptime: {d[\"uptime\"]:.2f} seconds'); print(f'  - Devices: {d[\"devices\"][\"total\"]} (Healthy: {d[\"devices\"][\"healthy\"]})')" 2>/dev/null || echo "$RESPONSE"
            else
                echo -e "${RED}[Status] Gateway is NOT RUNNING${NC}"
            fi
            exit 0
            ;;
        --health)
            echo -e "${CYAN}[Health] Running health check...${NC}"
            node scripts/health-check.js
            exit $?
            ;;
        --config=*)
            CONFIG_FILE="${arg#*=}"
            ;;
        *.env)
            CONFIG_FILE="$arg"
            ;;
        *)
            if [[ ! "$arg" =~ ^-- ]]; then
                CONFIG_FILE="$arg"
            fi
            ;;
    esac
done

# Set config environment variable
if [ -n "$CONFIG_FILE" ]; then
    export GATEWAY_CONFIG="$CONFIG_FILE"
    echo -e "${CYAN}[Config] Using: ${CONFIG_FILE}${NC}"
fi

# Build arguments
ARGS=""
if [ -n "$DEV_MODE" ]; then
    ARGS="$ARGS $DEV_MODE"
fi
if [ -n "$CONFIG_FILE" ]; then
    ARGS="$ARGS --config=$CONFIG_FILE"
fi

# Start gateway
echo ""
echo -e "${GREEN}[Gateway] Starting...${NC}"
echo ""

exec node index.js $ARGS
