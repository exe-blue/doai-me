# DoAi.Me MCP Server

Claude Desktop에서 DoAi.Me Agent Farm을 직접 조회/제어하기 위한 경량 MCP 서버입니다.

## Features

- **15개 Tool 제공**: Farm 상태, 노드 관리, 태스크, YouTube 시청, 페르소나, 복구
- **Thin Client 설계**: HTTP 프록시 역할, 기존 API 활용
- **자동 라우팅**: path prefix로 API Server/Gateway 자동 선택

## Tools

| Category | Tool | Description |
|----------|------|-------------|
| **Farm** | `farm.overview` | 전체 Farm 상태 한눈에 보기 |
| | `farm.unhealthy` | 비정상 노드만 빠르게 확인 |
| **Monitoring** | `monitoring.summary` | 시스템 전체 요약 |
| | `monitoring.alerts` | 최근 알림 조회 |
| **Nodes** | `nodes.list` | Gateway 연결 노드 목록 |
| | `nodes.detail` | 특정 노드 상세 (Gateway + OOB 통합) |
| **Tasks** | `tasks.create` | 새 Task 생성 및 노드에 할당 |
| | `tasks.status` | Task 상태 확인 |
| **YouTube** | `youtube.queue` | YouTube 시청 대기열 조회 |
| | `youtube.stats` | YouTube 시청 통계 통합 |
| **Personas** | `personas.list` | 페르소나 목록 |
| | `personas.drift` | 페르소나 성격 변화 분석 |
| **Recovery** | `recovery.execute` | 노드 복구 실행 ⚠️ |
| | `recovery.history` | 복구 이력 조회 |
| **Devices** | `devices.screenshot` | 디바이스 스크린샷 캡처 |

## Installation

```bash
# uv 사용 권장
cd services/doaime-mcp
uv pip install -e ".[dev]"
```

## Configuration

### config.yaml

```yaml
api:
  server: "http://158.247.210.152:8001"
  gateway: "http://158.247.210.152:8000"
  timeout: 30
```

### 환경변수 (우선순위 높음)

```bash
export DOAIME_API="http://your-api-server:8001"
export DOAIME_GATEWAY="http://your-gateway:8000"
export DOAIME_TIMEOUT="30"
```

## Claude Desktop 설정

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "doaime": {
      "command": "uv",
      "args": [
        "--directory",
        "C:\\path\\to\\services\\doaime-mcp",
        "run",
        "main.py"
      ],
      "env": {
        "DOAIME_API": "http://158.247.210.152:8001",
        "DOAIME_GATEWAY": "http://158.247.210.152:8000"
      }
    }
  }
}
```

## Development

### 테스트 실행

```bash
cd services/doaime-mcp
python -m pytest tests/ -v
```

### 로컬 실행

```bash
python main.py
```

## Project Structure

```
services/doaime-mcp/
├── pyproject.toml           # 패키지 정의
├── main.py                  # Entry point (stdio)
├── config.yaml              # 환경 설정
├── src/
│   ├── __init__.py
│   ├── server.py            # MCP Server 초기화
│   ├── tools/
│   │   ├── farm.py          # farm.* tools
│   │   ├── monitoring.py    # monitoring.* tools
│   │   ├── nodes.py         # nodes.* tools
│   │   ├── tasks.py         # tasks.* tools
│   │   ├── youtube.py       # youtube.* tools
│   │   ├── personas.py      # personas.* tools
│   │   ├── recovery.py      # recovery.* tools
│   │   └── devices.py       # devices.screenshot
│   └── utils/
│       ├── client.py        # HTTP 클라이언트
│       └── config.py        # 설정 로더
└── tests/
    └── test_tools.py        # 단위 테스트
```

## API Routing

| Path Prefix | Target |
|-------------|--------|
| `/api/nodes/*` | Gateway (:8000) |
| `/api/tasks/*` | Gateway (:8000) |
| `/api/*` (기타) | API Server (:8001) |

## Error Handling

모든 Tool은 표준 에러 포맷을 사용합니다:

```python
{
    "success": False,
    "error": {
        "type": "connection|timeout|http|validation",
        "message": str,
        "timestamp": str
    }
}
```

## License

MIT
