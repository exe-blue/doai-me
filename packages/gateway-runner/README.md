# Gateway Runner

Standalone execution package for DoAi Gateway - YouTube automation and device control system.

## Overview

Gateway Runner provides a deployable package for running the DoAi Gateway on multiple workstations. It connects to Laixi app for device control and provides APIs for YouTube video automation.

### Features

- **Laixi Connection**: WebSocket connection to LAIXI.EXE (ws://127.0.0.1:22221/)
- **YouTube Automation API**: Search, watch, like, comment automation
- **Multi-Workstation Support**: Config templates for different deployments
- **Health Monitoring**: Health check and status monitoring scripts
- **Cross-Platform**: Windows (.bat, .ps1) and Linux/Mac (.sh) scripts

## Requirements

- **Node.js**: v18.0.0 or later
- **Gateway**: DoAi Gateway installed at `../../local/gateway`
- **Laixi** (optional): LAIXI.EXE for device control

## Quick Start

### Windows

```batch
# Start with default configuration
start-gateway.bat

# Start with specific workstation config
start-gateway.bat workstation-1.env

# Using PowerShell
.\start-gateway.ps1
.\start-gateway.ps1 -Config workstation-1.env
```

### Linux/Mac

```bash
# Make script executable
chmod +x start-gateway.sh

# Start with default configuration
./start-gateway.sh

# Start with specific workstation config
./start-gateway.sh workstation-1.env
```

## Installation

### 1. Install Gateway Dependencies

```bash
# From this directory
npm run install-gateway

# Or manually
cd ../../local/gateway
npm install
```

### 2. Configure Your Workstation

Copy and edit a config file:

```bash
# Copy default config
cp configs/default.env configs/my-workstation.env

# Edit the configuration
# - Set NODE_ID to unique identifier
# - Configure LAIXI_URL if needed
# - Enable/disable features as needed
```

### 3. Start the Gateway

```bash
# Windows
start-gateway.bat my-workstation.env

# Linux/Mac
./start-gateway.sh my-workstation.env
```

## Configuration

Configuration files are located in `configs/` directory:

| File | Description |
|------|-------------|
| `default.env` | Default template configuration |
| `workstation-1.env` | Workstation 1 configuration |
| `workstation-2.env` | Workstation 2 configuration |
| `development.env` | Development/testing configuration |

### Key Configuration Options

```env
# Server Settings
PORT=3100                    # Gateway HTTP server port
NODE_ID=workstation-1        # Unique node identifier

# Laixi Connection
LAIXI_ENABLED=true           # Enable Laixi connection
LAIXI_URL=ws://127.0.0.1:22221/  # Laixi WebSocket URL

# Cloud Gateway (Vultr)
VULTR_ENABLED=false          # Enable cloud gateway connection
VULTR_URL=ws://...           # Cloud gateway URL

# Development
MOCK_DEVICES=false           # Use mock devices for testing
LOG_LEVEL=info               # Log level: debug, info, warn, error
```

## API Endpoints

### Health & Status

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Basic health check |
| `/health/status` | GET | Detailed status with device counts |
| `/health/devices` | GET | List of connected devices |

### Device Control

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/devices` | GET | List all devices |
| `/api/control/tap` | POST | Send tap command |
| `/api/control/swipe` | POST | Send swipe command |

### YouTube Automation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/youtube/parse` | POST | Parse YouTube URL and get metadata |
| `/api/youtube/video/:id` | GET | Get video info by ID |
| `/api/youtube/thumbnail/:id` | GET | Get video thumbnail URL |

### Example: Parse YouTube URL

```bash
curl -X POST http://localhost:3100/api/youtube/parse \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "video_id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "duration_seconds": 213,
    "channel_name": "Rick Astley"
  }
}
```

## Scripts

### Health Check

```bash
# Check gateway and Laixi status
node scripts/health-check.js

# Check specific port
node scripts/health-check.js --port=3100
```

### Status

```bash
# Show detailed gateway status
node scripts/status.js
```

### Setup

```bash
# Run initial setup (installs dependencies, creates configs)
node scripts/setup.js
```

## Multi-Workstation Deployment

For deploying on multiple workstations:

1. **Copy the package** to each workstation
2. **Create unique config** for each:
   ```bash
   cp configs/default.env configs/ws-office.env
   cp configs/default.env configs/ws-home.env
   ```

3. **Set unique NODE_ID** in each config:
   ```env
   # ws-office.env
   NODE_ID=office-workstation
   PORT=3100

   # ws-home.env
   NODE_ID=home-workstation
   PORT=3100
   ```

4. **Start on each machine**:
   ```bash
   # Office machine
   ./start-gateway.sh ws-office.env

   # Home machine
   ./start-gateway.sh ws-home.env
   ```

## Troubleshooting

### Gateway not starting

1. Check Node.js version: `node --version` (must be 18+)
2. Install dependencies: `npm run install-gateway`
3. Check gateway path exists: `../../local/gateway`

### Laixi not connecting

1. Verify LAIXI.EXE is running
2. Check port 22221 is not blocked
3. Verify `LAIXI_ENABLED=true` in config

### Port already in use

Change the `PORT` in your config file:
```env
PORT=3101  # Use different port
```

### No devices found

1. Check ADB is installed: `adb devices`
2. Verify devices are connected
3. Check ADB host/port in config

## Directory Structure

```
gateway-runner/
├── index.js              # Main entry point
├── package.json          # Package configuration
├── start-gateway.bat     # Windows batch script
├── start-gateway.ps1     # PowerShell script
├── start-gateway.sh      # Linux/Mac script
├── configs/
│   ├── default.env       # Default configuration
│   ├── workstation-1.env # Workstation 1 config
│   ├── workstation-2.env # Workstation 2 config
│   └── development.env   # Development config
├── scripts/
│   ├── health-check.js   # Health check script
│   ├── status.js         # Status script
│   └── setup.js          # Setup script
└── README.md             # This file
```

## License

MIT License - DoAi.Me Team
