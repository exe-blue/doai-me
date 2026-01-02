# Strategos Deployment Guide
## 초경량 실행기 NodeRunner 배포

**지시자**: Strategos (Operations Commander)  
**구현자**: Axon (Builder)  
**날짜**: 2026-01-02

---

## 📜 Strategos의 요구사항

> "중앙 오케스트레이터는 Vultr에 있고, 로컬 노드(5대 워크스테이션)는 **'초경량 실행기(NodeRunner)'**로 동작한다."
>
> "통신은 NAT 문제를 피하기 위해 노드→Vultr로 Outbound WSS(443) 장기 연결(Reverse Connection) 방식."
>
> "iDRAC가 없으므로 Tailscale OOB가 필수이며, 노드끼리는 격리한다."

---

## 🎯 시스템 구조

```
┌──────────────────────────────────────────────────────────────┐
│           Vultr Orchestrator (The Brain)                    │
│         wss://doai.me:8443/node                              │
│         Monitoring API: /monitoring/*                        │
└──────┬───────┬───────┬───────┬───────┬──────────────────────┘
       │       │       │       │       │
   WSS │   WSS │   WSS │   WSS │   WSS │  (Outbound 443)
       │       │       │       │       │
   ┌───▼───┬───▼───┬───▼───┬───▼───┬───▼───┐
   │TITAN-01│TITAN-02│TITAN-03│TITAN-04│TITAN-05│
   │Genesis│Prometheus│Atlas│Hyperion│Kronos │
   ├───────┼───────┼───────┼───────┼───────┤
   │  초경량 NodeRunner (Daemon)          │
   │  - WSS Client                        │
   │  - Job Executor                      │
   │  - Heartbeat (10초)                  │
   │  - Auto Reconnect                    │
   ├───────┴───────┴───────┴───────┴───────┤
   │  Local Services                       │
   │  - Laixi (touping)                   │
   │  - ADB Server                         │
   │  - recover.sh/ps1 (3단계)            │
   │  - watchdog (5분마다)                │
   └───┬───────┬───────┬───────┬───────┬───┘
       │       │       │       │       │
       ↓       ↓       ↓       ↓       ↓
    120대   120대   120대   120대   120대
    
    총 600대 안드로이드 디바이스
```

---

## 🚀 A. NodeRunner 서비스 설치

### Linux (systemd)

```bash
# 1. 프로젝트 클론
sudo mkdir -p /opt/doai
cd /opt/doai
sudo git clone https://github.com/exe-blue/doai-me.git noderunner
cd noderunner

# 2. 가상환경 및 의존성
sudo python3 -m venv venv
sudo ./venv/bin/pip install -r requirements.txt

# 3. systemd 서비스 파일 복사
sudo cp doai-noderunner.service /etc/systemd/system/

# 4. NODE_ID 수정 (각 노드별로 다르게)
sudo vi /etc/systemd/system/doai-noderunner.service
# Environment="NODE_ID=TITAN-01"  # TITAN-01 ~ TITAN-05

# 5. 서비스 활성화
sudo systemctl daemon-reload
sudo systemctl enable doai-noderunner
sudo systemctl start doai-noderunner

# 6. 상태 확인
sudo systemctl status doai-noderunner
sudo journalctl -u doai-noderunner -f
```

### Windows (NSSM)

```powershell
# 1. 프로젝트 클론
cd C:\
git clone https://github.com/exe-blue/doai-me.git doai
cd C:\doai\noderunner

# 2. 가상환경
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# 3. NSSM 다운로드
# https://nssm.cc/download

# 4. 서비스 등록
nssm install DoAiNodeRunner "C:\doai\noderunner\venv\Scripts\python.exe" "C:\doai\noderunner\main.py"
nssm set DoAiNodeRunner AppDirectory "C:\doai\noderunner"
nssm set DoAiNodeRunner AppEnvironmentExtra NODE_ID=TITAN-01 WSS_SERVER_URL=wss://doai.me:8443/node
nssm set DoAiNodeRunner AppStdout "C:\doai\logs\noderunner.log"
nssm set DoAiNodeRunner AppStderr "C:\doai\logs\noderunner-error.log"
nssm set DoAiNodeRunner AppRotateFiles 1
nssm set DoAiNodeRunner AppRotateOnline 1
nssm set DoAiNodeRunner AppRotateSeconds 86400

# 5. 서비스 시작
nssm start DoAiNodeRunner

# 6. 상태 확인
nssm status DoAiNodeRunner
Get-Content C:\doai\logs\noderunner.log -Tail 50
```

---

## 🔧 B. recover 스크립트 (3단계)

### Stage 1: SOFT (소프트 복구)

**대상**: NodeRunner 서비스만

**Linux**:
```bash
sudo systemctl restart doai-noderunner
```

**Windows**:
```powershell
Restart-Service -Name "DoAiNodeRunner"
```

**자동화**: ✅ 허용 (쿨다운 60분, 일일 5회)

---

### Stage 2: SERVICE (서비스 재시작)

**대상**: Laixi + ADB + NodeRunner

**Linux** (`/opt/doai/bin/recover.sh`):
```bash
# 1. Laixi 종료
pkill -f touping

# 2. ADB 재시작
adb kill-server
adb start-server

# 3. Laixi 재시작
nohup /opt/laixi/touping &

# 4. NodeRunner 재시작
sudo systemctl restart doai-noderunner
```

**Windows** (`C:\doai\bin\recover.ps1`):
```powershell
# 1. Laixi 종료
Stop-Process -Name "touping" -Force

# 2. ADB 재시작
adb kill-server
adb start-server

# 3. Laixi 재시작
Start-Process "C:\laixi\touping.exe"

# 4. NodeRunner 재시작
Restart-Service -Name "DoAiNodeRunner"
```

**자동화**: ✅ 허용 (쿨다운 120분, 일일 3회)

---

### Stage 3: POWER (시스템 재부팅)

**Linux**:
```bash
sudo shutdown -r +2 "DoAi Emergency Recovery"
```

**Windows**:
```powershell
shutdown /r /t 120 /f
```

**자동화**: ❌ 금지 (2단 승인 필요, 경보만 생성)

---

## 📊 C. 관측/로그 시스템

### 모니터링 API

**엔드포인트**:
```
GET /monitoring/nodes      # 노드별 상세 메트릭
GET /monitoring/network    # 전체 네트워크 상태
GET /monitoring/jobs       # 작업 큐 메트릭
GET /monitoring/devices    # 디바이스 분포
GET /monitoring/alerts     # 최근 알림
```

### 주요 메트릭

**노드별**:
- 디바이스 수 (connected / capacity)
- 디바이스 활용률 (%)
- CPU / Memory / Disk 사용률
- 대기/실행 중인 작업 수
- 성공률 (최근 1시간)
- 평균 처리 시간

**전체 네트워크**:
- 온라인 노드 % (예: 80%)
- 총 연결 디바이스 (예: 456/600)
- 평균 리소스 사용률
- 건강한 노드 수

**작업 큐**:
- 대기/실행/완료/실패 수
- 성공률 (최근 1시간)
- 평균 처리 시간
- 가장 오래된 대기 작업

---

## 🚨 디바이스 급감 알림

### 감지 규칙

```python
# auto_recovery.py

# -10% 감소 → soft + 경고
if drop_pct >= 10:
    alert = {
        'severity': 'WARNING',
        'node_id': node_id,
        'message': f'디바이스 감소: {prev} → {current} (-{drop_pct:.1f}%)',
        'auto_recovery': 'soft'
    }

# -30% 감소 → service + 긴급
if drop_pct >= 30:
    alert = {
        'severity': 'CRITICAL',
        'node_id': node_id,
        'message': f'디바이스 급감: {prev} → {current} (-{drop_pct:.1f}%)',
        'auto_recovery': 'service'
    }
```

### 알림 채널

```python
# TODO: 구현 필요

# 1. SMS (Twilio)
def send_sms_alert(phone_number, message):
    # Twilio API 호출
    pass

# 2. 이메일
def send_email_alert(email, subject, body):
    # SendGrid/SES API 호출
    pass

# 3. Slack/Discord
def send_slack_alert(webhook_url, message):
    # Webhook 호출
    pass

# 4. Supabase Realtime
def broadcast_alert(alert_data):
    # Supabase Realtime 브로드캐스트
    pass
```

---

## 🔒 Tailscale 격리 정책

### ACL 설정

```json
{
  "tagOwners": {
    "tag:vultr": ["autogroup:admin"],
    "tag:titan": ["autogroup:admin"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["tag:vultr"],
      "dst": ["tag:titan:22", "tag:titan:3389"]
    },
    {
      "action": "accept",
      "src": ["tag:titan"],
      "dst": ["tag:vultr:8443"]
    }
  ],
  "groups": {
    "group:isolated-titans": ["tag:titan"]
  },
  "tests": [
    {
      "src": "tag:titan",
      "dst": "tag:titan:*",
      "deny": true
    }
  ]
}
```

**격리 원칙**:
- ✅ Vultr → Titan: SSH(22), RDP(3389)
- ✅ Titan → Vultr: WSS(8443)
- ❌ Titan ↔ Titan: 모든 포트 차단

---

## 📋 배포 체크리스트

### Vultr 서버

- [ ] Orchestrator 배포 (app.py)
- [ ] SSL 인증서 (Let's Encrypt)
- [ ] systemd 서비스 등록
- [ ] Tailscale 설치 (tag:vultr)
- [ ] Monitoring API 활성화
- [ ] Supabase 연결 설정

### Titan 노드 (×5)

**각 노드에서**:
- [ ] NodeRunner 설치
- [ ] NODE_ID 설정 (TITAN-01~05)
- [ ] systemd/NSSM 서비스 등록
- [ ] Laixi 설치 및 설정
- [ ] ADB 서버 설정
- [ ] recover.sh/ps1 배포
- [ ] watchdog 등록 (5분마다)
- [ ] Tailscale 설치 (tag:titan)
- [ ] 120대 디바이스 연결

---

## 🧪 검증

### 1. 연결 테스트

```bash
curl https://doai.me:8443/nodes

# 예상:
{
  "nodes": [
    {"node_id": "TITAN-01", "status": "online", ...},
    {"node_id": "TITAN-02", "status": "online", ...},
    ...
  ]
}
```

### 2. 관측 API 테스트

```bash
# 네트워크 상태
curl https://doai.me:8443/monitoring/network

# 노드 메트릭
curl https://doai.me:8443/monitoring/nodes

# 디바이스 분포
curl https://doai.me:8443/monitoring/devices

# 최근 알림
curl https://doai.me:8443/monitoring/alerts?hours=24
```

### 3. 복구 테스트

```bash
# Soft 복구
curl -X POST https://doai.me:8443/ops/emergency/request \
  -d '{"node_id": "TITAN-01", "level": "soft", "reason": "Test"}'

# 로그 확인
sudo journalctl -u doai-noderunner -f
```

---

## 📊 관측 대시보드

### Grafana 연동 (권장)

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'doai-orchestrator'
    static_configs:
      - targets: ['doai.me:8443']
    metrics_path: '/metrics'
```

### Supabase Realtime 구독

```javascript
// Dashboard에서
const channel = supabase.channel('node-health')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'node_health'
  }, (payload) => {
    console.log('Node status changed:', payload.new);
    // UI 업데이트
  })
  .subscribe();
```

---

## 🔥 Critical Constraints 준수 확인

| 제약 | 구현 | 검증 |
|------|------|------|
| ❌ 노드끼리 직접 통신 금지 | Tailscale ACL | ✅ |
| ✅ Vultr 연결은 443만 | Outbound WSS | ✅ |
| ✅ 3단계 자동 복구 | soft/service/power | ✅ |
| ❌ 무한 재시도 금지 | Max 10회 + Exponential Backoff | ✅ |

---

## 📚 관련 문서

- **P0 Reverse WSS Mesh**: `docs/P0_REVERSE_WSS_MESH.md`
- **Emergency Recovery**: `docs/EMERGENCY_RECOVERY_GUIDE.md`
- **네트워크 인프라**: `supabase/migrations/011_infrastructure_schema.sql`

---

**작성**: Axon (Builder)  
**승인**: Strategos (Operations Commander)  
**날짜**: 2026-01-02
