# Vultr-Centric WSS Protocol v1.0

> **"복잡한 생각은 버려라."** - Orion

## 개요

DoAi.Me 시스템의 WebSocket 기반 통신 프로토콜 명세서입니다.

## 아키텍처

```
                          ┌─────────────────┐
                          │  VULTR SERVER   │
                          │  (WSS Hub)      │
                          └────────┬────────┘
                                   │
               ┌───────────────────┼───────────────────┐
               │                   │                   │
      ┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
      │  NodeRunner #001 │ │  NodeRunner #002 │ │  NodeRunner ... │
      │  (20 S9 devices) │ │  (20 S9 devices) │ │  (20 S9 devices) │
      └──────────────────┘ └──────────────────┘ └──────────────────┘
```

## 메시지 타입

| Type | Direction | Description |
|------|-----------|-------------|
| `HELLO` | Node → Vultr | 초기 등록/인증 |
| `HELLO_ACK` | Vultr → Node | 등록 확인 |
| `HEARTBEAT` | Node → Vultr | 30초 주기 생존 신고 |
| `HEARTBEAT_ACK` | Vultr → Node | 하트비트 확인 |
| `COMMAND` | Vultr → Node | 작업 지시 |
| `RESULT` | Node → Vultr | 작업 결과 |
| `ACK` | Both | 메시지 확인 |
| `ERROR` | Both | 에러 알림 |

## 메시지 프레임

```json
{
  "version": "1.0",
  "timestamp": "2025-01-07T14:30:00.000Z",
  "message_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "HELLO",
  "node_id": "node_runner_001",
  "signature": "a1b2c3d4e5f6...",
  "payload": { ... }
}
```

## 인증 (HMAC-SHA256)

서명 대상은 `signature` 필드를 제외한 전체 메시지 객체입니다:

```python
# 서명 생성 - 'signature' 필드를 제외한 전체 메시지를 정렬된 JSON으로 직렬화
message = {"type": "HELLO", "node_id": "node_001", "payload": {...}}
# signature 필드 제외 (있다면)
message_without_sig = {k: v for k, v in message.items() if k != 'signature'}
# 결정론적 직렬화 (정렬된 키, 공백 없음)
payload_str = json.dumps(message_without_sig, sort_keys=True, separators=(',', ':'))

# Base64 디코딩된 시크릿 키 사용 (실패 시 UTF-8 폴백)
try:
    key_bytes = base64.b64decode(secret_key)
except:
    key_bytes = secret_key.encode('utf-8')

# HMAC-SHA256 서명 생성
signature = hmac.new(key_bytes, payload_str.encode(), hashlib.sha256).hexdigest()
```

## Pull-based Push

1. NodeRunner가 `HEARTBEAT` with `status=READY` 전송
2. Vultr가 대기 중인 명령 확인
3. 명령이 있으면 `COMMAND` Push
4. NodeRunner가 실행 후 `RESULT` 전송

## 파일 구조

```
cloud-gateway/
├── main.py                 # WSS Hub (FastAPI)
└── requirements.txt

apps/node-runner/
├── wss_client.py          # WSS Client
├── requirements.txt
└── config.example.env

supabase/migrations/
└── 20260107_wss_protocol_v1.sql
```

## 실행

### Vultr Server

```bash
cd cloud-gateway
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### NodeRunner

```bash
cd apps/node-runner
pip install -r requirements.txt
cp config.example.env .env
# Edit .env with your configuration
python wss_client.py
```

## 환경변수

### Vultr Server

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | 서버 포트 | `8000` |
| `VERIFY_SIGNATURE` | 서명 검증 활성화 | `true` (production) |
| `NODE_SHARED_SECRET` | 공유 시크릿 키 | - |

> ⚠️ **보안 경고**: `VERIFY_SIGNATURE=false`는 개발/테스트 환경에서만 사용해야 합니다. 
> 프로덕션 환경에서는 반드시 `true`로 설정하세요. 서명 검증을 비활성화하면 MITM 공격 및 
> 위조된 메시지에 취약해집니다.

### NodeRunner

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ID` | 노드 식별자 | hostname |
| `NODE_SECRET` | 시크릿 키 (Base64) | - |
| `VULTR_URL` | WSS 서버 URL | - |

## 명령 타입

| Command | Description |
|---------|-------------|
| `WATCH_VIDEO` | 영상 시청 |
| `RANDOM_WATCH` | 랜덤 시청 |
| `LIKE_VIDEO` | 좋아요 |
| `WRITE_COMMENT` | 댓글 작성 |
| `SUBSCRIBE_CHANNEL` | 구독 |
| `RESTART_DEVICE` | 디바이스 재시작 |
| `UPDATE_PERSONA` | 페르소나 업데이트 |
| `SYNC_STATE` | 상태 동기화 |

---

**Version**: 1.0  
**Date**: 2025-01-07  
**Author**: Strategos & Axon

