# API Specification

> DoAi.Me REST API 및 WebSocket 명세
> **Version:** 1.0.0
> **Last Updated:** 2026-01-04

---

## 📋 목차

1. [Base URL](#base-url)
2. [인증 (Authentication)](#인증-authentication)
3. [에러 처리 (Error Handling)](#에러-처리-error-handling)
4. [REST API Endpoints](#rest-api-endpoints)
5. [WebSocket Protocol](#websocket-protocol)
6. [Rate Limiting](#rate-limiting)

---

## Base URL

| 환경 | URL |
|------|-----|
| Production | `https://api.doai.me` |
| Staging | `https://staging-api.doai.me` |
| Local | `http://localhost:8000` |

---

## 인증 (Authentication)

### 토큰 종류

| 토큰 | 용도 | 권한 수준 |
|------|------|----------|
| `ORCH_ADMIN_TOKEN` | 관리자 API (Vercel, Admin Dashboard) | Full Access |
| `ORCH_NODE_TOKEN` | 노드 인증 (Node Runner) | Limited Access |

### 토큰 생성

```bash
# 64자리 hex 토큰 생성 (32바이트)
openssl rand -hex 32
```

### REST API 인증

모든 인증된 요청은 `Authorization` 헤더를 포함해야 합니다.

```http
Authorization: Bearer <token>
```

**예시:**
```bash
curl -X GET https://api.doai.me/api/nodes \
  -H "Authorization: Bearer your_admin_token_here"
```

### 인증 검증 로직 (FastAPI)

```python
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_admin_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> bool:
    """관리자 토큰 검증"""
    if credentials.credentials != settings.ORCH_ADMIN_TOKEN:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "UNAUTHORIZED",
                "message": "Invalid or expired token",
                "code": "AUTH_001"
            }
        )
    return True

async def verify_node_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> bool:
    """노드 토큰 검증"""
    valid_tokens = [settings.ORCH_NODE_TOKEN, settings.ORCH_ADMIN_TOKEN]
    if credentials.credentials not in valid_tokens:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "UNAUTHORIZED", 
                "message": "Invalid node token",
                "code": "AUTH_002"
            }
        )
    return True
```

### WebSocket 인증

WebSocket 연결 시 쿼리 파라미터로 토큰 전달:

```
wss://api.doai.me/ws/node?token=<ORCH_NODE_TOKEN>&node_id=<NODE_ID>
```

**연결 핸드셰이크:**
```python
# 서버 측 검증
async def websocket_auth(websocket: WebSocket):
    token = websocket.query_params.get("token")
    node_id = websocket.query_params.get("node_id")
    
    if not token or token != settings.ORCH_NODE_TOKEN:
        await websocket.close(code=4001, reason="Unauthorized")
        return None
    
    if not node_id:
        await websocket.close(code=4002, reason="Missing node_id")
        return None
    
    return node_id
```

---

## 에러 처리 (Error Handling)

### 에러 응답 형식

모든 에러는 일관된 JSON 형식으로 반환됩니다:

```json
{
  "error": "ERROR_TYPE",
  "message": "Human readable message",
  "code": "ERR_XXX",
  "details": {},
  "timestamp": "2026-01-04T12:00:00Z",
  "request_id": "req_abc123"
}
```

### HTTP 상태 코드

| HTTP Code | Error Type | 설명 |
|-----------|------------|------|
| 400 | `BAD_REQUEST` | 잘못된 요청 형식 |
| 401 | `UNAUTHORIZED` | 인증 실패 |
| 403 | `FORBIDDEN` | 권한 없음 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 리소스 충돌 |
| 422 | `VALIDATION_ERROR` | 유효성 검사 실패 |
| 429 | `RATE_LIMITED` | 요청 제한 초과 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 |
| 502 | `BAD_GATEWAY` | 업스트림 오류 |
| 503 | `SERVICE_UNAVAILABLE` | 서비스 불가 |

### 상세 에러 코드

#### 인증 에러 (AUTH_XXX)
| Code | Message | 해결 방법 |
|------|---------|----------|
| `AUTH_001` | Invalid or expired token | 토큰 확인 및 재발급 |
| `AUTH_002` | Invalid node token | 노드 토큰 확인 |
| `AUTH_003` | Token missing | Authorization 헤더 추가 |
| `AUTH_004` | Token format invalid | Bearer 형식 확인 |

#### 리소스 에러 (RES_XXX)
| Code | Message | 해결 방법 |
|------|---------|----------|
| `RES_001` | Node not found | node_id 확인 |
| `RES_002` | Device not found | device_id 확인 |
| `RES_003` | Task not found | task_id 확인 |
| `RES_004` | Resource already exists | 중복 확인 |

#### 유효성 에러 (VAL_XXX)
| Code | Message | 해결 방법 |
|------|---------|----------|
| `VAL_001` | Invalid JSON format | JSON 형식 확인 |
| `VAL_002` | Missing required field | 필수 필드 추가 |
| `VAL_003` | Invalid field type | 타입 확인 |
| `VAL_004` | Value out of range | 범위 확인 |

#### 비즈니스 에러 (BIZ_XXX)
| Code | Message | 해결 방법 |
|------|---------|----------|
| `BIZ_001` | Node offline | 노드 상태 확인 |
| `BIZ_002` | Device busy | 대기 후 재시도 |
| `BIZ_003` | Task queue full | 나중에 재시도 |
| `BIZ_004` | Operation not allowed | 권한/상태 확인 |

### 에러 응답 예시

**401 Unauthorized:**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token",
  "code": "AUTH_001",
  "details": {
    "hint": "Check your ORCH_ADMIN_TOKEN environment variable"
  },
  "timestamp": "2026-01-04T12:00:00Z",
  "request_id": "req_abc123"
}
```

**422 Validation Error:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "code": "VAL_002",
  "details": {
    "errors": [
      {
        "field": "device_id",
        "message": "Field is required",
        "type": "missing"
      },
      {
        "field": "duration",
        "message": "Must be positive integer",
        "type": "invalid"
      }
    ]
  },
  "timestamp": "2026-01-04T12:00:00Z",
  "request_id": "req_def456"
}
```

### 클라이언트 에러 처리 가이드

```typescript
// TypeScript 클라이언트 예시
interface ApiError {
  error: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: string;
  request_id: string;
}

async function handleApiError(response: Response): Promise<never> {
  const error: ApiError = await response.json();
  
  switch (error.code) {
    case 'AUTH_001':
    case 'AUTH_002':
      // 토큰 갱신 또는 재로그인
      await refreshToken();
      break;
    case 'BIZ_002':
      // 디바이스 사용 중 - 재시도
      await delay(5000);
      break;
    case 'RATE_LIMITED':
      // Rate limit - 백오프
      const retryAfter = response.headers.get('Retry-After') || '60';
      await delay(parseInt(retryAfter) * 1000);
      break;
    default:
      // 로깅 및 사용자 알림
      logger.error(`API Error: ${error.code}`, error);
  }
  
  throw new ApiError(error);
}
```

---

## REST API Endpoints

### Health Check

```http
GET /health
```

**인증:** 불필요

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-01-04T12:00:00Z",
  "services": {
    "database": "ok",
    "websocket": "ok"
  }
}
```

---

### Nodes

#### 노드 목록 조회
```http
GET /api/nodes
Authorization: Bearer <ORCH_ADMIN_TOKEN>
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `status` | string | No | `online`, `offline`, `error` |
| `limit` | int | No | 기본값: 50, 최대: 100 |
| `offset` | int | No | 기본값: 0 |

**Response:**
```json
{
  "nodes": [
    {
      "id": "node-001",
      "name": "Seoul Node 1",
      "status": "online",
      "device_count": 20,
      "last_heartbeat": "2026-01-04T12:00:00Z",
      "ip": "100.x.x.x",
      "version": "1.0.0"
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

#### 노드 상세 조회
```http
GET /api/nodes/{node_id}
Authorization: Bearer <ORCH_ADMIN_TOKEN>
```

**Response:**
```json
{
  "id": "node-001",
  "name": "Seoul Node 1",
  "status": "online",
  "devices": [
    {
      "id": "device-001",
      "serial": "R58M12345",
      "status": "active",
      "current_task": null
    }
  ],
  "metrics": {
    "cpu_usage": 45,
    "memory_usage": 60,
    "uptime_hours": 72
  }
}
```

---

### Devices

#### 디바이스 목록 조회
```http
GET /api/devices
Authorization: Bearer <ORCH_ADMIN_TOKEN>
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `node_id` | string | No | 특정 노드의 디바이스만 |
| `status` | string | No | `active`, `idle`, `offline`, `error` |
| `limit` | int | No | 기본값: 50 |
| `offset` | int | No | 기본값: 0 |

#### 디바이스 명령 실행
```http
POST /api/devices/{device_id}/command
Authorization: Bearer <ORCH_ADMIN_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "command": "run_script",
  "params": {
    "script_name": "youtube_watch",
    "duration": 300,
    "options": {
      "random_delay": true
    }
  },
  "priority": "normal",
  "timeout": 600
}
```

**Response:**
```json
{
  "task_id": "task-12345",
  "status": "queued",
  "device_id": "device-001",
  "created_at": "2026-01-04T12:00:00Z"
}
```

---

### Emergency API (비상 버튼)

#### L1 Soft Reset
```http
POST /api/emergency/soft-reset
Authorization: Bearer <ORCH_ADMIN_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "target": "orchestrator",
  "reason": "API 응답 지연"
}
```

**Response:**
```json
{
  "action": "soft_reset",
  "status": "initiated",
  "timestamp": "2026-01-04T12:00:00Z",
  "estimated_recovery": "30s"
}
```

#### L2 Service Reset
```http
POST /api/emergency/service-reset
Authorization: Bearer <ORCH_ADMIN_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "confirm_code": "A3B2C1",
  "reason": "L1 실패 후 전체 서비스 복구",
  "approver": "orion"
}
```

**Response:**
```json
{
  "action": "service_reset",
  "status": "initiated",
  "confirm_code": "A3B2C1",
  "approver": "orion",
  "timestamp": "2026-01-04T12:00:00Z",
  "estimated_recovery": "2m"
}
```

---

## WebSocket Protocol

### 연결

```
wss://api.doai.me/ws/node?token=<ORCH_NODE_TOKEN>&node_id=<NODE_ID>
```

### 메시지 형식 (JSON-RPC 2.0)

#### Request
```json
{
  "jsonrpc": "2.0",
  "method": "method_name",
  "params": {},
  "id": "unique-request-id"
}
```

#### Response (Success)
```json
{
  "jsonrpc": "2.0",
  "result": {},
  "id": "unique-request-id"
}
```

#### Response (Error)
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "details": "Additional error information"
    }
  },
  "id": "unique-request-id"
}
```

### JSON-RPC 에러 코드

| Code | Message | 설명 |
|------|---------|------|
| -32700 | Parse error | JSON 파싱 실패 |
| -32600 | Invalid Request | 잘못된 JSON-RPC 형식 |
| -32601 | Method not found | 메소드 없음 |
| -32602 | Invalid params | 잘못된 파라미터 |
| -32603 | Internal error | 서버 내부 오류 |
| -32000 ~ -32099 | Server error | 커스텀 서버 에러 |

### Node → Orchestrator 메시지

#### heartbeat
```json
{
  "jsonrpc": "2.0",
  "method": "heartbeat",
  "params": {
    "node_id": "node-001",
    "timestamp": "2026-01-04T12:00:00Z",
    "metrics": {
      "cpu": 45,
      "memory": 60,
      "disk": 30
    },
    "devices": [
      {"id": "device-001", "status": "active"},
      {"id": "device-002", "status": "idle"}
    ]
  }
}
```

#### device_status
```json
{
  "jsonrpc": "2.0",
  "method": "device_status",
  "params": {
    "device_id": "device-001",
    "status": "active",
    "current_task": "task-12345",
    "metrics": {
      "battery": 100,
      "screen_on": true
    }
  }
}
```

#### task_result
```json
{
  "jsonrpc": "2.0",
  "method": "task_result",
  "params": {
    "task_id": "task-12345",
    "status": "completed",
    "result": {
      "watched_videos": 5,
      "total_duration": 298
    },
    "error": null
  }
}
```

### Orchestrator → Node 메시지

#### execute
```json
{
  "jsonrpc": "2.0",
  "method": "execute",
  "params": {
    "task_id": "task-12345",
    "device_id": "device-001",
    "command": "run_script",
    "args": {
      "script_name": "youtube_watch",
      "duration": 300
    },
    "timeout": 600
  },
  "id": "cmd-001"
}
```

#### ping
```json
{
  "jsonrpc": "2.0",
  "method": "ping",
  "id": "ping-001"
}
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "pong": true,
    "timestamp": "2026-01-04T12:00:00Z"
  },
  "id": "ping-001"
}
```

---

## Rate Limiting

### 제한 정책

| Endpoint | 제한 | 윈도우 |
|----------|------|--------|
| REST API (인증됨) | 100 req | 1분 |
| REST API (미인증) | 10 req | 1분 |
| WebSocket 메시지 | 10 msg | 1초 |
| Emergency API | 5 req | 10분 |

### 응답 헤더

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704348000
Retry-After: 60
```

### Rate Limit 에러

```json
{
  "error": "RATE_LIMITED",
  "message": "Too many requests",
  "code": "RATE_001",
  "details": {
    "limit": 100,
    "window": "1m",
    "retry_after": 45
  },
  "timestamp": "2026-01-04T12:00:00Z",
  "request_id": "req_xyz789"
}
```

---

## 📚 부록

### JSON Schema 정의

#### Node
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": {"type": "string", "pattern": "^node-[a-z0-9]+$"},
    "name": {"type": "string", "maxLength": 100},
    "status": {"enum": ["online", "offline", "error"]},
    "device_count": {"type": "integer", "minimum": 0},
    "last_heartbeat": {"type": "string", "format": "date-time"}
  },
  "required": ["id", "name", "status"]
}
```

#### Device
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": {"type": "string", "pattern": "^device-[a-z0-9]+$"},
    "serial": {"type": "string"},
    "status": {"enum": ["active", "idle", "offline", "error"]},
    "node_id": {"type": "string"},
    "current_task": {"type": ["string", "null"]}
  },
  "required": ["id", "serial", "status", "node_id"]
}
```

#### Task
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": {"type": "string", "pattern": "^task-[a-z0-9]+$"},
    "device_id": {"type": "string"},
    "command": {"type": "string"},
    "params": {"type": "object"},
    "status": {"enum": ["queued", "running", "completed", "failed", "cancelled"]},
    "priority": {"enum": ["low", "normal", "high"]},
    "timeout": {"type": "integer", "minimum": 0}
  },
  "required": ["id", "device_id", "command", "status"]
}
```

---

## 🔗 관련 문서

- [Architecture](./architecture.md)
- [Security](./security.md)
- [Recovery Runbook](../orion/runbooks/recover.md)
