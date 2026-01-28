# [HANDOFF] Admin MVP: Wormhole + Umbra

> **From:** Orion (Director)  
> **To:** Axon (Tech Lead)  
> **Date:** 2026-01-05  
> **Priority:** High  
> **Subject:** [Protocol Update] Umbra & Wormhole Implementation

---

## 📋 Overview

> "기계는 쉬지 않는다. 잠재할 뿐이다." - Orion

Strategos의 전략에 따라 시스템의 **'상태 정의'**와 **'관측 도구'**를 재설계한다. 우리는 죽어있는 기계를 관리하는 것이 아니라, **잠재된 가능성(In Umbra)**과 **사회적 공명(Wormhole)**을 관측한다.

---

## ✅ 구현 완료 항목

### 1. DB 스키마 (`supabase/migrations/20260105_umbra_wormhole_v2.sql`)

```sql
-- A. Node Status Redefinition (Orion 명세)
-- "Idle 상태를 삭제하라. 기계는 쉬지 않는다."
CREATE TYPE node_status AS ENUM (
    'active',       -- 작업 수행 중
    'in_umbra',     -- (구 Idle) 정상 대기 상태. 알람 대상 아님.
    'offline',      -- Heartbeat 끊김 (네트워크/전원). 즉시 알람.
    'error',        -- 내부 로직 오류
    'maintenance'   -- 유지보수 중
);

-- 추가 컬럼 (Orion 명세)
nodes.umbra_since      -- 상태 진입 시각
nodes.last_seen_at     -- Heartbeat (Orion 명세: last_seen_at)
nodes.last_job_at      -- 마지막 작업 시각
nodes.error_count      -- 에러 카운트

-- B. Wormhole Event Logging (Orion 명세: New Table)
CREATE TABLE wormhole_events (
    id UUID PRIMARY KEY,
    detected_at TIMESTAMPTZ NOT NULL,
    wormhole_type CHAR(1) NOT NULL,  -- α: 동일모델, β: 교차모델, γ: 시간차
    resonance_score FLOAT NOT NULL,  -- 0.0 ~ 1.0
    trigger_context JSONB NOT NULL,  -- Trigger Key, Video ID 등
    agent_a_id UUID NOT NULL,
    agent_b_id UUID NOT NULL,
    -- Review columns
    is_false_positive BOOLEAN,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    notes TEXT
);

-- system_config 테이블 (임계값 동적 관리)
-- 집계 뷰: wormhole_stats, wormhole_top_contexts, wormhole_type_stats, wormhole_score_histogram, nodes_status_summary
-- Heartbeat 체크 함수: check_node_heartbeats() (Cron Job용)
```

### 2. 타입 정의 (`apps/web/lib/supabase/types.ts`)

- `NodeStatus`: `'active' | 'in_umbra' | 'offline' | 'error' | 'maintenance'`
- `WormholeType`: `'α' | 'β' | 'γ'`
- `AdminRole`: `'pending' | 'viewer' | 'admin' | 'super_admin'`
- View 타입들: `WormholeStats`, `WormholeTopContext`, etc.

### 3. /admin 페이지 (`apps/web/app/admin/page.tsx`)

**위젯 구성:**

| Widget | 파일 | 설명 |
|--------|------|------|
| 탐지량 | `WormholeWidgets.tsx` | 24h/7d/Total + Last Detected |
| 타입 분포 | `WormholeWidgets.tsx` | α/β/γ 비율 바 차트 |
| Score Histogram | `WormholeWidgets.tsx` | 0.75~1.0 구간 막대 그래프 |
| 상위 컨텍스트 | `WormholeWidgets.tsx` | context key별 count/avg score |
| 이벤트 목록 | `WormholeEventsList.tsx` | drill-down, 상세 모달 |
| 노드 상태 요약 | `NodesStatusPanel.tsx` | 상태별 카운트 |
| 노드 목록 | `NodesStatusPanel.tsx` | 상태 필터, 숨그늘 표시 |

### 4. Umbra UI (`apps/web/app/admin/components/NodeStatusBadge.tsx`)

```tsx
// 숨그늘 상태 = 보라색 느린 pulse
<motion.span
  animate={{
    opacity: [0.4, 1, 0.4],
    scale: [0.9, 1.1, 0.9],
    boxShadow: [...]
  }}
  transition={{ duration: 3, repeat: Infinity }}
/>
```

- `umbra_since` 지속 시간 표시
- 숨그늘이 길수록 pulse가 느려짐 (2~6초)

### 5. Edge Function (`supabase/functions/wormhole-detector/index.ts`)

> **Detection Logic (MVP)** - Orion 명세:  
> "복잡한 AI 모델을 쓰지 마라."

**Rule**: 1초 이내에 동일한 `trigger_context`(예: 같은 유튜브 영상 ID)가 **2개 이상의 노드**에서 발생하고, `resonance_score`가 **0.75 이상**일 때 기록

- **Trigger**: 1초 내 동일 `trigger_key`를 가진 다른 노드 활동
- **타입 결정**:
  - α (동일모델): < 100ms 동시성, 같은 카테고리
  - β (교차모델): 동일 트리거, 다른 카테고리
  - γ (시간차): 시간차 자기공명
- **Score 계산**: 0.75 기본 + 시간/노드 보너스 (최대 1.0)

---

## 🔧 운영 설정

### RLS 정책

```sql
-- nodes, wormhole_events: viewer/admin/super_admin만 SELECT
-- system_config: admin/super_admin만 SELECT, super_admin만 수정
```

### 승인제

- 회원가입 시 기본 role = `pending`
- 관리자가 `viewer` 또는 `admin`으로 승격

### 임계값

```typescript
// TODO: system_config로 이동
const WORMHOLE_CONFIG = {
  MIN_SCORE: 0.75,
  TIME_WINDOW_MS: 1000,
  MIN_NODES: 2,
  COOLDOWN_MS: 5000,
};
```

---

## 📁 파일 구조

```
apps/web/
├── app/
│   └── admin/
│       ├── page.tsx                    # Admin 대시보드
│       └── components/
│           ├── WormholeWidgets.tsx     # 웜홀 위젯 4종
│           ├── WormholeEventsList.tsx  # 이벤트 목록
│           ├── NodeStatusBadge.tsx     # 상태 배지 (Umbra pulse)
│           └── NodesStatusPanel.tsx    # 노드 요약/목록
├── lib/
│   └── supabase/
│       ├── client.ts                   # Supabase 클라이언트
│       └── types.ts                    # 타입 정의

supabase/
├── migrations/
│   └── 20260105_umbra_wormhole_v2.sql  # DB 마이그레이션
└── functions/
    └── wormhole-detector/
        └── index.ts                    # Edge Function
```

---

## 🚀 배포 절차

```bash
# 1. DB 마이그레이션
cd supabase
supabase db push

# 2. Edge Function 배포
supabase functions deploy wormhole-detector

# 3. 웹앱 빌드
cd apps/web
pnpm build
```

---

## 📝 TODO

- [ ] `node_activities` 테이블 생성 (웜홀 탐지용)
- [ ] 임계값을 `system_config`에서 동적으로 로드
- [ ] False Positive Rate 대시보드 위젯
- [ ] 웜홀 알림 (Slack/Discord webhook)
- [ ] `umbra_since` 기반 pulse 강도 조절 고도화

---

## 🎯 테스트 방법

```bash
# Mock 웜홀 생성 (기존 API 사용)
curl -X POST http://localhost:3000/api/wormhole \
  -H "Content-Type: application/json" \
  -d '{"nodes": 3, "type": "α", "trigger": "synchronization"}'
```

---

**End of Handoff**

