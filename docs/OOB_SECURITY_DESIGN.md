# DoAi.Me OOB Security Design v1

> **Strategos 설계 / Axon 구현**

이 문서는 DoAi.Me 시스템의 Out-of-Band (OOB) 보안 설계를 정의합니다.

## 목표

1. **개발자가 실수해도 시스템을 되살릴 수 있는 OOB 통로** 구축
2. Vultr(중앙) ↔ 로컬 노드 간 주 통신(WSS 443)이 끊겨도:
   - 관리자 PC와 Vultr가 노드에 접속 가능
   - 노드끼리는 격리
   - 자동 복구 + 박스 전원제어로 회복

## 전제

- 로컬 노드는 NAT/공유기 뒤에 있음
- **Inbound 포트포워딩 없이** Outbound 기반 연결
- **Tailscale**로 OOB 접속

---

## 1. Tailscale 구성

### 1.1 구성 요소

| 구성 요소 | 설명 |
|-----------|------|
| Tailnet | `doai` (조직 단위) |
| Identity | SSO 또는 관리자 계정 2개 (Shiva/Backup) |
| 태그 | 노드 역할별 권한 부여 |

### 1.2 태그 정의

| 태그 | 역할 |
|------|------|
| `tag:node` | 모든 로컬 실행 노드 |
| `tag:orchestrator` | Vultr 중앙 서버 |
| `tag:admin` | 관리자 PC (Shiva) |
| `tag:logserver` | 로그/메트릭 수집 서버 |

### 1.3 ACL 정책

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["group:admins", "tag:orchestrator"],
      "dst": ["tag:node:22", "tag:node:8000"]
    },
    {
      "action": "accept",
      "src": ["tag:node"],
      "dst": ["tag:logserver:443", "tag:logserver:8443"]
    }
  ]
}
```

**의미:**
- **Isolation**: 노드↔노드 통신 규칙 없음 → 자동 deny
- **Control**: Admin/Orchestrator → Node SSH(22), Agent API(8000) 허용
- **Monitoring**: Node → LogServer HTTPS/메트릭 허용

### 1.4 키 관리

#### A) Tailscale Auth Key
- **Reusable**: No (1회성)
- **Expiry**: 1시간
- **Pre-authorized**: Yes
- **Tags**: 등록 즉시 태그 부여

#### B) SSH 접근
- **Tailscale SSH** 사용 권장
- `doaiops` 계정으로 접근
- MFA 강제 (SSO 연동 시)

#### C) 회수/폐기
- 노드 분실/오염 시: Tailscale 콘솔에서 disable
- 관리자 계정은 SSO/MFA 필수

---

## 2. Failure Mode Response

### 2.1 감시 신호 (Signals)

| 메트릭 | 설명 |
|--------|------|
| `node_heartbeat_age_sec` | 마지막 하트비트 이후 시간 |
| `device_count_adb` | ADB device 상태 개수 |
| `device_count_expected` | 기대 디바이스 수 |
| `adb_server_ok` | ADB 서버 응답 성공 여부 |
| `unauthorized_count` | unauthorized 개수 |
| `ws_connected` | WSS 연결 상태 |
| `box_tcp_ok` | 박스 TCP 접속 성공 여부 |

### 2.2 Threshold 값

#### P0 장애 (즉시 복구)

| 조건 | Threshold | 연속 횟수 |
|------|-----------|-----------|
| 하트비트 끊김 | > 45초 | 2회 |
| 디바이스 급감 | < 90% | 3회 (90초) |
| ADB 서버 이상 | false | 2회 |
| Unauthorized 폭증 | >= 3개 | 2회 |

#### P1 경고 (관찰)

| 조건 | Threshold | 지속 시간 |
|------|-----------|-----------|
| 디바이스 감소 | < 97% | 5분 |
| WSS 끊김 | false | 30초 |

### 2.3 Escalation 경로

```
Step 1 (Soft)     → Step 2 (Restart)    → Step 3 (Box Reset)
쿨다운: 3분         쿨다운: 15분            쿨다운: 30분
```

#### Step 1: Soft Recovery
- `adb kill-server && adb start-server`
- 에이전트 재시작
- **조건**: P0 트리거 1회 발생

#### Step 2: Service Restart
- 전체 서비스 재시작
- USB 스택 리프레시
- **조건**: Step 1 후 5분 내 회복 실패

#### Step 3: Box Power Control
- 박스 TCP 명령 (전원 Off/On)
- **조건**: Step 2 후 회복 실패 + `box_tcp_ok=true`

---

## 3. Box Control Protocol

### 3.1 Transport

- **Protocol**: TCP
- **Destination**: `<BOX_IP>:56666`
- **Payload**: Binary bytes (HEX)

### 3.2 명령 형식

```
예: AA 01 88 84 01 00 DD
→ bytes: 0xAA 0x01 0x88 0x84 0x01 0x00 0xDD
```

| 명령 | HEX |
|------|-----|
| All Power ON | `AA 01 88 84 01 00 DD` |
| All Power OFF | `AA 01 88 84 00 00 DD` |
| All OTG Mode | `AA 01 88 82 01 00 DD` |
| All USB Mode | `AA 01 88 82 00 00 DD` |

### 3.3 프로토콜 테스트

```bash
# 1. 포트 열림 확인
nc -vz <BOX_IP> 56666

# 2. 패킷 캡처
sudo tcpdump -i any host <BOX_IP> and port 56666 -X

# 3. API로 테스트
curl -X POST http://localhost:8000/oob/box/test \
  -H "Content-Type: application/json" \
  -d '{"box_ip": "192.168.50.1", "box_port": 56666}'
```

---

## 4. 구현 인터페이스

### 4.1 Orchestrator (Vultr)

```python
# backend/api/services/oob/

class HealthCollector:
    """노드 상태 메트릭 수집"""
    async def update_node_metrics(node_id, metrics_data)
    async def get_unhealthy_nodes() -> List[NodeHealth]

class RuleEngine:
    """Threshold 판단 및 복구 결정"""
    def evaluate(node: NodeHealth) -> RuleEngineResult

class RecoveryDispatcher:
    """Tailscale SSH로 복구 실행"""
    async def execute_recovery(node_id, tailscale_ip, action)

class BoxClient:
    """박스 TCP 명령"""
    async def power_cycle_all()
    async def slot_power_cycle(slot)
```

### 4.2 Node (로컬)

```bash
# /opt/doai/bin/recover.sh

Usage: recover.sh <mode>

Modes:
  soft      - ADB/에이전트 재시작
  restart   - 전체 서비스 재시작
  box_reset - 박스 전원 제어 준비
```

---

## 5. 설치 가이드

### 5.1 Vultr Orchestrator

```bash
# 1. Tailscale 설치 및 설정
sudo ./deploy/tailscale/setup_tailscale.sh \
  --role orchestrator \
  --auth-key tskey-xxx

# 2. OOB 서비스 활성화
# backend/api/main.py에 라우터 추가
from routers.oob import router as oob_router
app.include_router(oob_router)
```

### 5.2 로컬 Node

```bash
# 1. Tailscale 설치 및 설정
sudo ./deploy/tailscale/setup_tailscale.sh \
  --role node \
  --auth-key tskey-xxx

# 2. recover.sh 설치 확인
ls -la /opt/doai/bin/recover.sh
sudo /opt/doai/bin/recover.sh soft  # 테스트

# 3. SSH 연결 테스트 (Orchestrator에서)
ssh doaiops@100.x.x.x 'echo ok'
```

### 5.3 ACL 적용

1. Tailscale Admin Console 접속
2. Access Controls 메뉴
3. `deploy/tailscale/acl.json` 내용 붙여넣기
4. Save 클릭

---

## 6. 체크리스트

### 준호(Strategos)가 해야 할 것

- [ ] Tailscale Tailnet 생성 + 관리자 계정 2개
- [ ] Vultr에 Tailscale 설치 + `tag:orchestrator`
- [ ] 로컬 노드 1대에 Tailscale 설치 + `tag:node`
- [ ] ACL JSON 적용
- [ ] Vultr ↔ Node SSH 접속 테스트 (100.x IP)
- [ ] 박스 IP 확인 + `nc -vz <box_ip> 56666`

### 프로토콜 확정 후 Axon이 업데이트할 것

- [ ] BoxClient 응답 파싱 로직 (ACK 포맷 확인 후)
- [ ] 박스 명령 실패 시 재시도 로직
- [ ] 메트릭 DB 저장 스키마

---

## 7. API Reference

### POST /oob/metrics
노드 메트릭 업데이트 (NodeRunner HEARTBEAT에서 호출)

### GET /oob/nodes
모든 노드 건강 상태 조회

### GET /oob/evaluate/{node_id}
노드 상태 평가 및 복구 추천

### POST /oob/recover
복구 실행

### POST /oob/box/test
박스 프로토콜 테스트

### POST /oob/box/command
박스 명령 직접 실행

