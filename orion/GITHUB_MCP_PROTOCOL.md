# GitHub MCP 운영 규약

> **Version:** 1.0.0
> **Last Updated:** 2026-01-04
> **Author:** @strategos
> **Status:** ACTIVE

---

## 🎯 목표

1. **"대화"가 아니라 레포 아티팩트(문서/PR/이슈)로 시스템을 움직인다.**
2. **Vultr 초기화 같은 사고가 나도 repo만 있으면 재현/복구가 가능해야 한다.**

---

## 📜 핵심 원칙 6개

| # | 원칙 | 구현 위치 |
|---|------|----------|
| 1 | 결정은 항상 기록 | `orion/decisions.md` |
| 2 | 운영은 항상 런북화 | `orion/runbooks/*.md` |
| 3 | 변경은 무조건 PR | main 보호 브랜치 |
| 4 | 코드 과도함은 CI로 억제 | lint/test/size rule |
| 5 | 비밀은 repo에 없다 | `.env.example` + secrets |
| 6 | 장애는 incident 이슈로 회귀 가능 | Issue 템플릿 고정 |

---

## 📁 레포 폴더 구조 (표준)

```
repo/
├── apps/
│   ├── web/                 # Vercel (Next.js) - /admin 포함
│   ├── orchestrator/        # Vultr (FastAPI) - 중앙 brain
│   └── node-runner/         # 로컬 노드 실행기 (초경량)
├── packages/
│   └── shared/              # 공통 타입/스키마 (optional)
├── infra/
│   ├── caddy/               # Caddyfile 템플릿, 배포 스크립트
│   ├── systemd/             # 서비스 유닛 파일
│   └── docker/              # (선택) compose로 로컬 재현
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── api.md               # REST/WSS contract
│   └── troubleshooting.md
├── orion/
│   ├── decisions.md
│   ├── roadmap.md
│   ├── GITHUB_MCP_PROTOCOL.md  # 이 문서
│   ├── handoffs/
│   │   ├── to-axon.md
│   │   ├── to-aria.md
│   │   ├── to-strategos.md
│   │   └── to-echo.md
│   ├── runbooks/
│   │   ├── recover.md
│   │   ├── caddy.md
│   │   ├── adb.md
│   │   └── tailscale.md
│   └── incidents/
│       └── template.md
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
│       ├── bug.md
│       ├── incident.md
│       └── feature.md
├── .env.example
└── README.md
```

---

## 🌿 브랜치 전략

| 브랜치 | 용도 | 보호 |
|--------|------|------|
| `main` | 항상 배포 가능한 상태 | ✅ PR만 허용 |
| `dev` | 통합 테스트용 (선택) | |
| `feature/*` | 기능 개발 | |
| `ops/*` | 런북/인프라 변경 | |
| `hotfix/*` | 긴급 수정 | |

### 규칙
- **main은 PR로만 머지**
- PR 머지 조건: 테스트 통과 + 템플릿 체크리스트 완료

---

## 🏷️ 이슈 라벨 체계

### Type (무엇을)
- `type:feature` - 새 기능
- `type:bug` - 버그 수정
- `type:incident` - 장애/인시던트
- `type:chore` - 잡무/정리

### Area (어디서)
- `area:orchestrator` - Vultr FastAPI
- `area:node` - Node Runner
- `area:web` - Dashboard
- `area:infra` - 인프라/배포
- `area:docs` - 문서

### Priority (얼마나 급한가)
- `prio:P0` - 즉시 (장애 수준)
- `prio:P1` - 높음 (이번 주)
- `prio:P2` - 보통 (백로그)

### Risk (위험도)
- `risk:security` - 보안 관련
- `risk:outage` - 장애 위험
- `risk:data` - 데이터 손실 위험

### Owner (담당자)
- `owner:axon` - Tech Lead
- `owner:aria` - Product
- `owner:orion` - Operations
- `owner:strategos` - Strategy AI
- `owner:echo` - Cognitive Engine
- `owner:shiva` - TBD

---

## 🔐 Secrets / 설정값 표준

### 토큰 생성
```bash
# 64자리 hex 토큰 생성 (32바이트)
openssl rand -hex 32
```

### 토큰 종류
| 토큰 | 용도 | 권한 |
|------|------|------|
| `ORCH_ADMIN_TOKEN` | Vercel/관리용 | Full Access |
| `ORCH_NODE_TOKEN` | 노드용 | Limited Access |

### 저장 위치
| 환경 | 위치 |
|------|------|
| Vultr (Orchestrator) | `/etc/doai/orchestrator.env` + systemd |
| Vercel (Web) | Vercel 환경변수 |
| NodeRunner (각 노드) | `/etc/doai/node.env` |

### .env.example
```env
# Orchestrator (Vultr)
ORCH_BASE_URL=https://api.doai.me
ORCH_ADMIN_TOKEN=replace_me
ORCH_NODE_TOKEN=replace_me

SUPABASE_URL=replace_me
SUPABASE_ANON_KEY=replace_me
SUPABASE_SERVICE_ROLE_KEY=replace_me

# optional
TAILSCALE_AUTHKEY=replace_me
```

---

## 📏 코드 정리 규칙 (Axon 적용 기준)

### 강제 룰

1. **엔트리포인트 3개만 유지**
   - `apps/orchestrator/main.py`
   - `apps/node-runner/main.py`
   - `apps/web/` (Next.js)

2. **공통 로직은 `packages/shared`로 이동, 중복 제거**

3. **로그는 표준 로거 1개로 통일**
   - print/console 난사 금지

4. **실제로 쓰는 모듈만 남기기**
   - import tree 기반으로 미사용 폴더 삭제

5. **동시성은 한 방식만**
   - asyncio면 끝까지 asyncio

---

## 📋 핵심 문서 매핑

| 목적 | 문서 |
|------|------|
| 시스템 구조 | `docs/architecture.md` |
| API 계약 | `docs/api.md` |
| 보안 가이드 | `docs/security.md` |
| 문제 해결 | `docs/troubleshooting.md` |
| 기술 결정 | `orion/decisions.md` |
| 로드맵 | `orion/roadmap.md` |
| 비상 복구 | `orion/runbooks/recover.md` |
| Admin 스펙 | `docs/admin-dashboard-spec.md` |

---

## 🔗 관련 문서

- [AI Agent Cheatsheet](./AI_AGENT_CHEATSHEET.md)
- [Decisions Log](./decisions.md)
- [Roadmap](./roadmap.md)

