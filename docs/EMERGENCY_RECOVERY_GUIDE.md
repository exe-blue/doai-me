# Emergency Recovery System (OOB)

**지시자**: Orion (Visionary)  
**구현자**: Axon (Builder)  
**날짜**: 2026-01-02

---

## 📜 전략적 지시

> "개발자가 실수해도 시스템을 살릴 수 있는 뒷문(OOB)이 필요하다.  
> 임의 커맨드 실행은 금지한다. Allowlist only.  
> 자동 자가복구는 soft/service까지만. power는 2단 승인으로만 실행한다."

---

## 🎯 목표

**Out-of-Band Recovery**: 시스템이 고립되어도 중앙에서 복구 가능

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│           Vultr Orchestrator (The Brain)                    │
│         Emergency Recovery API                              │
├─────────────────────────────────────────────────────────────┤
│  POST /ops/emergency/request   # 복구 요청                  │
│  POST /ops/emergency/confirm   # 승인 (power만)             │
│  GET  /ops/emergency/{id}      # 상태 조회                  │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ Tailscale SSH (Mesh Network)
               │
       ┌───────┴────────┬────────┬────────┬────────┐
       ↓                ↓        ↓        ↓        ↓
   ┌────────┐     ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │node-001│     │node-002│ │node-003│ │node-004│ │node-005│
   │T5810 #1│     │T5810 #2│ │T5810 #3│ │T5810 #4│ │T5810 #5│
   └────┬───┘     └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
        │              │        │        │        │
        ↓ 실행         ↓        ↓        ↓        ↓
   C:\doai\bin\recover.ps1
        │
        ├─ soft: 스크립트 재시작
        ├─ service: Laixi + ADB 재시작
        └─ power: 시스템 재부팅 (2단 승인 필요)
```

---

## 🔧 3가지 복구 레벨

### Level 1: soft (스크립트 재시작)

**대상**: NodeRunner 스크립트

**실행**:
```powershell
Restart-Service -Name "DoAiNodeRunner"
```

**자동화**: ✅ 허용  
**쿨다운**: 60분  
**일일 제한**: 5회

---

### Level 2: service (서비스 재시작)

**대상**: Laixi + ADB + NodeRunner

**실행**:
```powershell
# 1. Laixi 종료
Stop-Process -Name "touping" -Force

# 2. ADB 재시작
adb kill-server
adb start-server

# 3. Laixi 재시작
Start-Process -FilePath "C:\laixi\touping.exe"

# 4. NodeRunner 재시작
Restart-Service -Name "DoAiNodeRunner"
```

**자동화**: ✅ 허용 (조건부)  
**쿨다운**: 120분  
**일일 제한**: 3회

---

### Level 3: power (시스템 재부팅)

**대상**: 전체 시스템

**실행**:
```powershell
shutdown /r /t 120 /f
```

**자동화**: ❌ 금지 (경보만 생성)  
**승인**: ⚠️ 2단 승인 필수 (TTL 120초)

---

## 🚨 자동 자가복구 규칙

### 규칙 1: Device Drop -10%

```
조건: device_count 10% 이상 감소
복구: soft
쿨다운: 60분
일일 제한: 5회
```

### 규칙 2: Device Drop -30%

```
조건: device_count 30% 이상 감소
복구: service
쿨다운: 120분
일일 제한: 3회
```

### 규칙 3: Heartbeat Timeout

```
조건: 하트비트 30초 타임아웃
복구: soft
쿨다운: 30분
일일 제한: 10회
```

### 규칙 4: Laixi Not Running

```
조건: laixi_status = 'not_running'
복구: service
쿨다운: 60분
일일 제한: 5회
```

**Power는 자동 실행 안됨** → 경보만 생성

---

## 📡 API 사용법

### 1. 복구 요청 (수동)

```bash
# soft 복구
curl -X POST https://doai.me:8443/ops/emergency/request \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "node-001",
    "level": "soft",
    "reason": "Manual recovery test",
    "requested_by": "admin"
  }'

# 응답:
{
  "success": true,
  "event_id": "uuid-here",
  "status": "executing"
}
```

### 2. Power 복구 (2단 승인)

```bash
# Step 1: 요청
curl -X POST https://doai.me:8443/ops/emergency/request \
  -d '{
    "node_id": "node-001",
    "level": "power",
    "reason": "Critical system failure"
  }'

# 응답:
{
  "success": true,
  "event_id": "uuid-here",
  "status": "awaiting_confirm",
  "confirmation_token": "sha256-hash",
  "expires_at": "2026-01-02T10:02:00Z",
  "message": "⚠️  Power 복구는 2단 승인 필요 (TTL: 120초)"
}

# Step 2: 승인 (120초 이내)
curl -X POST https://doai.me:8443/ops/emergency/confirm \
  -d '{
    "event_id": "uuid-here",
    "confirmation_token": "sha256-hash",
    "confirmed_by": "admin"
  }'

# 응답:
{
  "success": true,
  "status": "executing",
  "message": "Power 복구 승인 완료, 실행 중..."
}
```

### 3. 상태 조회

```bash
curl https://doai.me:8443/ops/emergency/uuid-here

# 응답:
{
  "success": true,
  "event": {
    "event_id": "uuid",
    "node_id": "node-001",
    "recovery_level": "service",
    "status": "success",
    "duration_ms": 15000,
    "exit_code": 0,
    "stdout_preview": "✅ [SERVICE] 서비스 재시작 완료..."
  }
}
```

---

## 🔒 보안 및 제약

### Allowlist (화이트리스트)

```python
# ✅ 허용된 명령 (고정)
ssh doai@{tailscale_ip} powershell -ExecutionPolicy Bypass -File C:\doai\bin\recover.ps1 -Level {level}

# ❌ 금지: 임의 명령
ssh doai@{tailscale_ip} "any-command"  # 차단
```

### 노드 Lock (동시 실행 방지)

```sql
-- 노드당 1개 복구 작업만 실행
INSERT INTO ops_locks (node_id, locked_by_event_id, expires_at)
VALUES ('node-001', 'event-uuid', NOW() + INTERVAL '600 seconds')
ON CONFLICT (node_id) DO NOTHING;  -- 실패 시 대기
```

### 2단 승인 (Power)

```
1. 요청 → awaiting_confirm (TTL 120초)
2. confirmation_token 생성 (SHA-256)
3. 승인 → pending → executing
4. 타임아웃 → timeout 상태
```

---

## 📊 데이터베이스 스키마

### ops_events

```sql
event_id UUID PRIMARY KEY
node_id VARCHAR(20)
recovery_level recovery_level  -- soft/service/power
trigger_type trigger_type      -- manual/auto_soft/auto_service/alert_only
status ops_event_status        -- pending/awaiting_confirm/executing/success/failed
requires_confirmation BOOLEAN
confirmation_token VARCHAR(64)  -- SHA-256
confirmation_expires_at TIMESTAMPTZ  -- TTL 120s
exit_code INTEGER
stdout_preview TEXT            -- 최대 1000자
stderr_preview TEXT
requested_by VARCHAR(50)
```

### ops_locks

```sql
lock_id UUID PRIMARY KEY
node_id VARCHAR(20) UNIQUE
locked_by_event_id UUID
expires_at TIMESTAMPTZ         -- 기본 600초 (10분)
```

### auto_recovery_rules

```sql
rule_name VARCHAR UNIQUE
condition_type VARCHAR         -- 'device_drop', 'heartbeat_timeout'
threshold_value DECIMAL
recovery_level recovery_level
cooldown_minutes INTEGER       -- 재실행 제한 (분)
daily_limit INTEGER            -- 일일 실행 제한
```

---

## 🤖 자동 자가복구 동작

### 시나리오 A: Device Drop -15%

```
1. Orchestrator 감지
   device_count: 120 → 102 (-15%)

2. 규칙 매칭
   'device_drop_10pct' → soft

3. 쿨다운/제한 체크
   ✅ 마지막 실행: 90분 전 (쿨다운 60분 통과)
   ✅ 오늘 실행: 2회 (일일 5회 이내)

4. 자동 복구 실행
   request_emergency_recovery()
   → SSH → recover.ps1 -Level soft

5. 결과 기록
   ops_events: success
   auto_recovery_log: executed=true
```

### 시나리오 B: Device Drop -35% (심각)

```
1. Orchestrator 감지
   device_count: 120 → 78 (-35%)

2. 규칙 매칭
   'device_drop_30pct' → service

3. 쿨다운/제한 체크
   ✅ 통과

4. 자동 복구 실행
   → SSH → recover.ps1 -Level service
   → Laixi + ADB + NodeRunner 재시작

5. 15초 후 확인
   device_count: 78 → 115 (복구)
```

### 시나리오 C: Device Drop -80% (재앙)

```
1. Orchestrator 감지
   device_count: 120 → 24 (-80%)

2. 규칙 없음 (power 수준)
   → 자동 실행 금지

3. 경보 생성
   auto_recovery_log: executed=false, skipped_reason='Power requires manual confirmation'

4. 관리자에게 SMS/이메일 알림
   "🚨 node-001: CRITICAL device drop (-80%)"

5. 수동 승인 대기
   POST /ops/emergency/request (level: power)
   → 2단 승인 → 실행
```

---

## 🛠️ 설치 가이드

### Vultr 서버

```bash
# 1. ops 모듈 추가 (orchestrator/app.py)
from ops import router as ops_router
app.include_router(ops_router)

# 2. auto_recovery 추가
from auto_recovery import AutoRecoveryEngine
auto_recovery = AutoRecoveryEngine(state, supabase, logger)
asyncio.create_task(auto_recovery.monitor_loop())

# 3. requirements.txt 업데이트
pip install asyncssh  # SSH 클라이언트
```

### T5810 노드 (5대)

```powershell
# 1. 디렉토리 생성
New-Item -ItemType Directory -Path "C:\doai\bin" -Force
New-Item -ItemType Directory -Path "C:\doai\logs" -Force
New-Item -ItemType Directory -Path "C:\doai\data" -Force

# 2. 스크립트 복사
Copy-Item recover.ps1 C:\doai\bin\
Copy-Item watchdog.ps1 C:\doai\bin\

# 3. Watchdog 작업 스케줄러 등록 (5분마다)
schtasks /create /tn "DoAiWatchdog" `
  /tr "powershell -ExecutionPolicy Bypass -File C:\doai\bin\watchdog.ps1" `
  /sc minute /mo 5 /ru SYSTEM /f

# 4. 상태 확인
schtasks /query /tn "DoAiWatchdog" /fo LIST /v
```

### Tailscale 설정

```bash
# Vultr 서버
tailscale up --accept-routes --advertise-tags=tag:vultr

# T5810 노드 (각각)
tailscale up --accept-routes --advertise-tags=tag:node --hostname=node-001

# ACL (Tailscale Admin Console)
{
  "tagOwners": {
    "tag:vultr": ["autogroup:admin"],
    "tag:node": ["autogroup:admin"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["tag:vultr"],
      "dst": ["tag:node:22"]  # SSH만
    },
    {
      "action": "accept",
      "src": ["tag:node"],
      "dst": ["tag:vultr:8443"]  # WSS만
    }
  ]
}
```

---

## 🧪 테스트

### Test 1: Soft Recovery

```bash
# 요청
curl -X POST https://doai.me:8443/ops/emergency/request \
  -d '{"node_id": "node-001", "level": "soft", "reason": "Test"}'

# 예상 로그 (node-001)
[INFO] 🔧 [SOFT] 스크립트 재시작 시작
[INFO]   → NodeRunner 재시작
[INFO] ✅ [SOFT] NodeRunner 재시작 완료

# Orchestrator 로그
[INFO] ✅ 복구 성공: node-001 (5000ms)

# 상태 조회
curl https://doai.me:8443/ops/emergency/{event_id}
# → status: "success", exit_code: 0
```

### Test 2: Service Recovery

```bash
# Laixi 강제 종료
taskkill /F /IM touping.exe

# 자동 복구 트리거 (30초 대기)
# → Orchestrator가 laixi_status='not_running' 감지
# → service 복구 자동 실행

# 로그 확인
tail -f C:\doai\logs\recover-*.log
```

### Test 3: Power Recovery (2단 승인)

```bash
# Step 1: 요청
curl -X POST https://doai.me:8443/ops/emergency/request \
  -d '{"node_id": "node-001", "level": "power", "reason": "Critical"}'

# 응답:
{
  "event_id": "uuid",
  "status": "awaiting_confirm",
  "confirmation_token": "abc123...",
  "expires_at": "2026-01-02T10:02:00Z"
}

# Step 2: 승인 (120초 이내)
curl -X POST https://doai.me:8443/ops/emergency/confirm \
  -d '{
    "event_id": "uuid",
    "confirmation_token": "abc123...",
    "confirmed_by": "admin"
  }'

# → 2분 후 시스템 재부팅
```

### Test 4: 멱등성 (중복 실행 방지)

```bash
# 같은 node에 동시 요청 2개
curl -X POST https://doai.me:8443/ops/emergency/request \
  -d '{"node_id": "node-001", "level": "soft", "reason": "Test 1"}' &

curl -X POST https://doai.me:8443/ops/emergency/request \
  -d '{"node_id": "node-001", "level": "soft", "reason": "Test 2"}' &

# 결과:
# 첫 번째: Lock 획득 → 실행
# 두 번째: Lock 실패 → failed (concurrent execution)
```

---

## 📊 Audit Log 조회

```sql
-- 최근 복구 이벤트
SELECT 
  event_id,
  node_id,
  recovery_level,
  trigger_type,
  status,
  reason,
  duration_ms,
  created_at
FROM ops_events
ORDER BY created_at DESC
LIMIT 10;

-- 노드별 복구 통계
SELECT 
  node_id,
  recovery_level,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as success,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(duration_ms) as avg_duration_ms
FROM ops_events
WHERE created_at > CURRENT_DATE
GROUP BY node_id, recovery_level
ORDER BY node_id, recovery_level;

-- 자동 복구 실행 로그
SELECT 
  l.triggered_at,
  r.rule_name,
  l.node_id,
  l.executed,
  l.skipped_reason,
  e.status,
  e.duration_ms
FROM auto_recovery_log l
JOIN auto_recovery_rules r ON l.rule_id = r.rule_id
LEFT JOIN ops_events e ON l.ops_event_id = e.event_id
ORDER BY l.triggered_at DESC
LIMIT 20;
```

---

## 🔍 트러블슈팅

### 문제: "Lock acquisition failed"

**원인**: 다른 복구 작업 진행 중

**해결**:
```sql
-- Lock 확인
SELECT * FROM ops_locks WHERE node_id = 'node-001';

-- 강제 해제 (주의!)
DELETE FROM ops_locks WHERE node_id = 'node-001';
```

### 문제: "Confirmation timeout"

**원인**: 120초 이내 승인 안함

**해결**:
```bash
# 새로 요청
curl -X POST https://doai.me:8443/ops/emergency/request \
  -d '{"node_id": "node-001", "level": "power", "reason": "Retry"}'
```

### 문제: SSH 연결 실패

**원인**: Tailscale 연결 끊김

**해결**:
```bash
# Vultr에서 Tailscale 상태 확인
tailscale status

# Ping 테스트
ping 100.64.0.1  # node-001

# SSH 테스트
ssh doai@100.64.0.1 "echo OK"
```

---

## 📋 체크리스트

### Vultr 서버

- [ ] orchestrator/ops.py 배포
- [ ] orchestrator/auto_recovery.py 배포
- [ ] Migration 010 실행
- [ ] Tailscale 설치 및 인증
- [ ] SSH 키 등록 (passwordless)
- [ ] API 테스트

### T5810 노드 (×5)

- [ ] C:\doai\bin\ 디렉토리 생성
- [ ] recover.ps1 복사
- [ ] watchdog.ps1 복사
- [ ] Tailscale 설치 (node-001~005)
- [ ] SSH 서버 활성화 (OpenSSH)
- [ ] doai 사용자 계정 생성
- [ ] Watchdog 작업 스케줄러 등록
- [ ] 수동 복구 테스트

---

## 📚 관련 문서

- **P0 Reverse WSS Mesh**: `docs/P0_REVERSE_WSS_MESH.md`
- **Identity Provisioning**: `docs/IDENTITY_PROVISIONING_GUIDE.md`

---

**Emergency Recovery System 완성!** 🎉  
**OOB 뒷문 준비 완료**  
**"개발자가 실수해도 시스템을 살린다."**

---

**작성**: Axon (Builder)  
**승인 대기**: Orion (Visionary)  
**날짜**: 2026-01-02
