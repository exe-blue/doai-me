# DoAi.Me Architecture

> 시스템 전체 아키텍처 문서

## 개요

DoAi.Me는 대규모 안드로이드 디바이스 팜을 관리하고 자동화하는 시스템입니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Vercel    │    │   Vultr     │    │  Supabase   │         │
│  │   (Web)     │───▶│(Orchestrator│───▶│    (DB)     │         │
│  │             │    │   FastAPI)  │    │             │         │
│  └─────────────┘    └──────┬──────┘    └─────────────┘         │
│                            │ WSS                                 │
│                            │ Tailscale VPN                       │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                    LOCAL NODES                                   │
│  ┌─────────────────────────┴─────────────────────────┐          │
│  │              Node Runner (Python)                  │          │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐           │          │
│  │  │  ADB    │  │  Laixi  │  │ Device  │           │          │
│  │  │ Manager │  │   SDK   │  │ Monitor │           │          │
│  │  └────┬────┘  └────┬────┘  └────┬────┘           │          │
│  └───────┼────────────┼────────────┼────────────────┘          │
│          │            │            │                            │
│     ┌────┴────────────┴────────────┴────┐                      │
│     │        Android Devices (S9)        │                      │
│     │    ┌─────┐ ┌─────┐ ┌─────┐ ...    │                      │
│     │    │AutoX│ │AutoX│ │AutoX│        │                      │
│     │    │ .js │ │ .js │ │ .js │        │                      │
│     │    └─────┘ └─────┘ └─────┘        │                      │
│     └───────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 컴포넌트

### 1. Web Dashboard (Vercel)
- **기술:** Next.js, TypeScript
- **역할:** 관리자 UI, 모니터링 대시보드
- **위치:** `apps/web/`

### 2. Orchestrator (Vultr)
- **기술:** Python FastAPI
- **역할:** 중앙 제어, 작업 분배, 상태 관리
- **위치:** `apps/orchestrator/`
- **포트:** 8000 (Caddy를 통해 HTTPS)

### 3. Node Runner (Local)
- **기술:** Python
- **역할:** 로컬 디바이스 관리, ADB 제어, 명령 실행
- **위치:** `apps/node-runner/`

### 4. AutoX.js (Android)
- **기술:** JavaScript (AutoX.js 엔진)
- **역할:** 안드로이드 네이티브 자동화
- **위치:** `autox-scripts/`

---

## 통신 프로토콜

### REST API
- **Web → Orchestrator:** 관리 명령, 상태 조회
- **인증:** `Authorization: Bearer <ORCH_ADMIN_TOKEN>`

### WebSocket
- **Node ↔ Orchestrator:** 실시간 양방향 통신
- **프로토콜:** JSON-RPC over WSS
- **인증:** 연결 시 `ORCH_NODE_TOKEN` 검증

### ADB
- **Node Runner → Devices:** USB/TCP 연결
- **명령:** shell, push, pull, logcat

---

## 데이터 흐름

### 작업 실행 흐름
```
1. Admin → Web Dashboard → Orchestrator (REST)
2. Orchestrator → Node Runner (WSS command)
3. Node Runner → ADB → Device
4. Device → AutoX.js 실행
5. AutoX.js 결과 → ADB → Node Runner
6. Node Runner → Orchestrator (WSS result)
7. Orchestrator → Supabase (저장)
8. Web Dashboard 업데이트
```

### 상태 동기화
```
1. Node Runner: 주기적 heartbeat (30초)
2. Device Status: 변경 시 즉시 보고
3. Orchestrator: 상태 집계 및 저장
```

---

## 보안 모델

### 네트워크
- **Tailscale:** 노드-서버 간 암호화된 VPN
- **HTTPS:** 모든 외부 통신

### 인증
- **ORCH_ADMIN_TOKEN:** 관리자 API 접근 (높은 권한)
- **ORCH_NODE_TOKEN:** 노드 인증 (제한된 권한)

### 권한 분리
- 노드는 자신에게 할당된 디바이스만 제어 가능
- 관리 API는 별도 토큰으로 보호

---

## 스케일링

### 현재 지원
- 노드: 20대
- 디바이스/노드: 30대
- 총: ~600대 디바이스

### 확장 계획
- 수평 확장: 노드 추가
- Orchestrator: 단일 인스턴스 (추후 클러스터링)

---

## 장애 복구

- **서버 장애:** [runbooks/recover.md](../orion/runbooks/recover.md)
- **노드 장애:** 자동 재연결 (exponential backoff)
- **디바이스 장애:** 자동 감지 및 격리

---

## 관련 문서

- [API 명세](./api.md)
- [보안 가이드](./security.md)
- [문제해결](./troubleshooting.md)

