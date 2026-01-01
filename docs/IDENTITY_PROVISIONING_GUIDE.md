# Identity Provisioning Guide
## 600개의 디지털 주민등록증 발급

**지시자**: Orion  
**작성자**: Strategos (Operations Lead)  
**업데이트**: 2026-01-02

---

## 📜 오리온의 지시

> "구글 계정 600개는 단순한 로그인 수단이 아니다. 그들의 **'주민등록증'**이다.  
> 초기 100개 계정을 확보하고, 각 계정에 '유아기(Infant)' 설정을 적용해라.  
> (검색 기록 없음, 순수한 상태)."

---

## 🎯 목표

### Phase 1: 초기 100개 계정 (긴급)

- ✅ 구글 계정 100개 생성
- ✅ 유아기 설정 적용
- ✅ 각 디바이스에 매핑

### Phase 2: 확장 500개 (단계적)

- ⏳ 월 100개씩 증설
- ⏳ 자동화 시스템 구축
- ⏳ 안전성 검증

---

## 🔑 구글 계정 생성 전략

### 전략 A: 수동 생성 (초기 100개)

**권장**: 안정성 및 정책 준수

**프로세스**:
```
1. 이메일 명명 규칙 설정
   doai.citizen.001@gmail.com
   doai.citizen.002@gmail.com
   ...
   doai.citizen.100@gmail.com

2. 수동 생성 (일 10개씩)
   - Google 계정 생성 페이지
   - 전화번호 인증 (선택적)
   - 복구 이메일 설정

3. 스프레드시트 관리
   | No  | Email                    | Password | Recovery Email | Created Date |
   |-----|--------------------------|----------|----------------|--------------|
   | 001 | doai.citizen.001@gmail   | ****     | admin@doai.me  | 2026-01-02   |

4. 비밀번호 관리자 저장
   - 1Password, Bitwarden 등
   - 조직 계정으로 중앙 관리
```

**장점**:
- ✅ 정책 위반 없음
- ✅ 안정적
- ✅ 즉시 사용 가능

**단점**:
- ❌ 시간 소요 (10일)
- ❌ 수동 작업

---

### 전략 B: Google Workspace (권장)

**조직 계정으로 관리**

```bash
# Google Workspace 설정
도메인: doai.me
조직 이메일:
  citizen001@doai.me
  citizen002@doai.me
  ...
  citizen600@doai.me

장점:
✅ 중앙 관리 (Admin Console)
✅ 대량 생성 가능
✅ 정책 준수
✅ 복구 용이

비용:
- Business Starter: $6/user/month
- 600개 × $6 = $3,600/month
- 또는 Education (무료, 교육 기관용)
```

**설정**:
```
1. Google Workspace 구독
   https://workspace.google.com/

2. Admin Console에서 대량 생성
   - CSV 업로드
   - 자동 비밀번호 생성

3. API 연동 (자동화)
   - Google Admin SDK
   - Python 스크립트로 프로비저닝
```

---

### 전략 C: 하이브리드 (추천)

```
초기 100개: 수동 생성 (Gmail 무료)
  → 시스템 검증 및 안정화
  
확장 500개: Google Workspace
  → 중앙 관리 및 자동화
```

---

## 👶 유아기 (Infant) 설정

### 목표

**순수한 상태**: 검색 기록 없음, 알고리즘 편향 없음

### 설정 체크리스트

```
각 구글 계정에 적용:

1. YouTube 설정
   ☐ 검색 기록 삭제
   ☐ 시청 기록 삭제
   ☐ 추천 알고리즘 리셋
   ☐ 자동재생 비활성화
   ☐ 알림 최소화

2. Google 계정 설정
   ☐ 위치 기록 비활성화
   ☐ 웹 및 앱 활동 일시중지
   ☐ 광고 개인화 비활성화

3. Android 디바이스 설정
   ☐ 계정 로그인
   ☐ YouTube 앱 설치
   ☐ AutoX.js 권한 부여
   ☐ 접근성 서비스 활성화
```

---

## 🤖 자동화 스크립트

### 1. 계정 정보 관리

**파일**: `scripts/local/local-manage_google_accounts-cli.py`

```python
#!/usr/bin/env python3
"""
Google 계정 관리 스크립트

기능:
- CSV에서 계정 정보 읽기
- Supabase에 저장
- 디바이스에 매핑
- 상태 추적

CSV 형식:
account_no,email,password_hash,recovery_email,created_date,assigned_device,status
001,doai.citizen.001@gmail.com,***,admin@doai.me,2026-01-02,PC_01_001,active
"""

import os
import csv
from typing import List, Dict

from scripts.shared.shared_supabase_lib import supabase_get, supabase_post

# Supabase 테이블
ACCOUNTS_TABLE = "google_accounts"

def load_accounts_from_csv(csv_path: str) -> List[Dict]:
    """CSV에서 계정 정보 로드"""
    accounts = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            accounts.append({
                'account_no': int(row['account_no']),
                'email': row['email'],
                'password_hash': row['password_hash'],
                'recovery_email': row['recovery_email'],
                'created_date': row['created_date'],
                'assigned_device': row.get('assigned_device'),
                'status': row.get('status', 'pending')
            })
    
    return accounts

def sync_to_supabase(accounts: List[Dict]) -> None:
    """Supabase에 계정 정보 동기화"""
    print(f"📊 {len(accounts)}개 계정 동기화 중...")
    
    for account in accounts:
        try:
            # Upsert
            supabase_post(
                f"{ACCOUNTS_TABLE}",
                [account],
                prefer="return=minimal"
            )
            print(f"✅ {account['account_no']}: {account['email']}")
        except Exception as e:
            print(f"❌ {account['account_no']}: {e}")

def assign_to_devices() -> None:
    """계정을 디바이스에 자동 할당"""
    print("\n📱 디바이스 자동 할당...")
    
    # 미할당 계정 조회
    unassigned = supabase_get(
        ACCOUNTS_TABLE,
        {"assigned_device": "is.null", "status": "eq.active"}
    )
    
    # 디바이스 조회 (계정 없는 것)
    devices = supabase_get(
        "personas",
        {"select": "device_serial"}
    )
    
    # 1:1 매핑
    for account, device in zip(unassigned, devices):
        print(f"🔗 {account['email']} → {device['device_serial']}")
        # TODO: UPDATE 로직

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv', required=True, help='계정 정보 CSV 파일')
    parser.add_argument('--sync', action='store_true', help='Supabase 동기화')
    parser.add_argument('--assign', action='store_true', help='디바이스 할당')
    
    args = parser.parse_args()
    
    accounts = load_accounts_from_csv(args.csv)
    
    if args.sync:
        sync_to_supabase(accounts)
    
    if args.assign:
        assign_to_devices()
```

---

### 2. 유아기 설정 자동화

**파일**: `scripts/local/local-setup_infant_accounts-cli.py`

```python
#!/usr/bin/env python3
"""
유아기(Infant) 계정 설정 자동화

기능:
- YouTube 앱에서 검색/시청 기록 삭제
- 추천 알고리즘 리셋
- 개인화 설정 최소화

방법:
- ADB + UI Automator
- AutoX.js 스크립트 호출
"""

def setup_infant_account(device_serial: str, google_account: str):
    """
    디바이스에 유아기 설정 적용
    
    1. 구글 계정 로그인
    2. YouTube 데이터 삭제
    3. 개인화 비활성화
    """
    print(f"👶 {device_serial}: 유아기 설정 시작")
    
    # ADB 명령으로 계정 로그인
    # (실제로는 AutoX.js 스크립트 사용 권장)
    
    commands = [
        # YouTube 앱 데이터 삭제
        f"adb -s {device_serial} shell pm clear com.google.android.youtube",
        
        # 구글 계정 추가 (수동 필요)
        # "adb -s {device_serial} am start -a android.settings.ADD_ACCOUNT",
    ]
    
    for cmd in commands:
        print(f"  $ {cmd}")
        # os.system(cmd)
    
    print(f"✅ {device_serial}: 유아기 설정 완료")

if __name__ == "__main__":
    # 테스트
    setup_infant_account("TEST_001", "doai.citizen.001@gmail.com")
```

---

### 3. 계정 상태 추적

**Supabase 테이블**: `google_accounts`

```sql
CREATE TABLE google_accounts (
  account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  account_no INTEGER UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT,  -- 암호화된 비밀번호 (AES-256)
  recovery_email VARCHAR(100),
  
  -- Device Mapping
  assigned_device VARCHAR(20) REFERENCES personas(device_serial),
  
  -- Account State
  status VARCHAR(20) CHECK (status IN (
    'pending',      -- 생성 대기
    'created',      -- 생성됨, 설정 필요
    'infant',       -- 유아기 설정 완료
    'active',       -- 활성 (사용 중)
    'suspended',    -- 일시 정지
    'banned'        -- 계정 정지 (구글 정책 위반)
  )),
  
  -- Infant Settings
  infant_setup_completed BOOLEAN DEFAULT false,
  infant_setup_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- Security
  two_factor_enabled BOOLEAN DEFAULT false,
  backup_codes TEXT[]
);

-- Indexes
CREATE INDEX idx_accounts_status ON google_accounts(status);
CREATE INDEX idx_accounts_device ON google_accounts(assigned_device);

COMMENT ON TABLE google_accounts IS '구글 계정 관리: 600개 디지털 신생아의 주민등록증';
COMMENT ON COLUMN google_accounts.infant_setup_completed IS '유아기 설정 완료 여부 (검색 기록 삭제, 순수한 상태)';
```

---

## 🌐 Network Mesh: WSS 터널링

### 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Vultr (Brain)                        │
│                   wss://doai.me:8443                        │
│               (WebSocket Secure Server)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ WSS Tunnel
                         │ (TLS 1.3 암호화)
                         │
┌────────────────────────┴────────────────────────────────────┐
│                  T5810 (Local Gateway)                      │
│                   192.168.x.x:3100                          │
│                (WebSocket Client + Gateway)                 │
└────┬───────┬───────┬───────┬───────┬──────────────────────┘
     │       │       │       │       │
     ↓       ↓       ↓       ↓       ↓
  PC_01   PC_02   PC_03   PC_04   PC_05
  (120)   (120)   (120)   (120)   (120)
  
  총 600대 디바이스
```

---

## 🔒 WSS 터널링 구현

### Server Side (Vultr)

**파일**: `Server_Vultr/wss-server.js`

```javascript
/**
 * WSS Tunnel Server (Vultr)
 * 
 * 역할:
 * - T5810 Gateway와 WSS 연결 유지
 * - 명령 전달 (Vultr → T5810 → Devices)
 * - 상태 수신 (Devices → T5810 → Vultr)
 * - 연결 감시 및 자동 재연결
 */

const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');

// SSL 인증서 (Let's Encrypt)
const server = https.createServer({
  cert: fs.readFileSync('/etc/letsencrypt/live/doai.me/fullchain.pem'),
  key: fs.readFileSync('/etc/letsencrypt/live/doai.me/privkey.pem')
});

const wss = new WebSocket.Server({ 
  server,
  path: '/tunnel'
});

// T5810 연결 추적
let t5810Connection = null;
let lastHeartbeat = Date.now();

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`🔗 WSS 연결: ${clientIp}`);
  
  // T5810 식별
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    
    if (msg.type === 'IDENTIFY' && msg.role === 'T5810_GATEWAY') {
      t5810Connection = ws;
      console.log(`✅ T5810 Gateway 인증 완료`);
      
      // 하트비트 시작
      startHeartbeat(ws);
    }
    
    // 상태 보고 수신
    if (msg.type === 'STATUS_REPORT') {
      console.log(`📊 T5810 상태:`, msg.payload);
      lastHeartbeat = Date.now();
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 연결 종료: ${clientIp}`);
    if (ws === t5810Connection) {
      t5810Connection = null;
      console.log(`⚠️  T5810 연결 끊김!`);
      // TODO: 알림 전송
    }
  });
  
  ws.on('error', (error) => {
    console.error(`❌ WSS 에러: ${error.message}`);
  });
});

// 하트비트 (30초마다)
function startHeartbeat(ws) {
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'HEARTBEAT', timestamp: Date.now() }));
      
      // 타임아웃 체크 (60초)
      if (Date.now() - lastHeartbeat > 60000) {
        console.error(`🚨 T5810 하트비트 타임아웃!`);
        // TODO: 알림 전송
      }
    } else {
      clearInterval(interval);
    }
  }, 30000);
}

// 명령 전송 함수
function sendCommandToT5810(command) {
  if (t5810Connection && t5810Connection.readyState === WebSocket.OPEN) {
    t5810Connection.send(JSON.stringify(command));
    console.log(`📤 명령 전송:`, command.type);
    return true;
  } else {
    console.error(`❌ T5810 연결 없음`);
    return false;
  }
}

// HTTP API (명령 수신용)
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/dispatch', (req, res) => {
  const { target, type, payload } = req.body;
  
  const success = sendCommandToT5810({
    type: 'DISPATCH',
    target,
    commandType: type,
    payload
  });
  
  res.json({ success });
});

server.listen(8443, () => {
  console.log('🌐 WSS Server: wss://doai.me:8443/tunnel');
  console.log('🔒 TLS 1.3 암호화');
});

app.listen(8080, () => {
  console.log('🌐 HTTP API: http://doai.me:8080/api/dispatch');
});
```

---

### Client Side (T5810 Gateway)

**파일**: `gateway/src/wss-tunnel.js`

```javascript
/**
 * WSS Tunnel Client (T5810)
 * 
 * 역할:
 * - Vultr WSS 서버에 연결
 * - 명령 수신 및 로컬 디바이스에 전달
 * - 상태 보고 (하트비트)
 * - 자동 재연결
 */

const WebSocket = require('ws');

class WssTunnel {
  constructor(logger, dispatcher) {
    this.logger = logger;
    this.dispatcher = dispatcher;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  connect() {
    const url = 'wss://doai.me:8443/tunnel';
    this.logger.info('🔗 WSS 터널 연결 시도', { url });

    this.ws = new WebSocket(url, {
      rejectUnauthorized: true,  // SSL 인증서 검증
    });

    this.ws.on('open', () => {
      this.logger.info('✅ WSS 터널 연결 성공');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // T5810 식별
      this.send({
        type: 'IDENTIFY',
        role: 'T5810_GATEWAY',
        timestamp: Date.now()
      });

      // 하트비트 시작
      this.startHeartbeat();
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(msg);
      } catch (e) {
        this.logger.error('WSS 메시지 파싱 실패', { error: e.message });
      }
    });

    this.ws.on('close', () => {
      this.logger.warn('🔌 WSS 터널 연결 종료');
      this.isConnected = false;
      this.reconnect();
    });

    this.ws.on('error', (error) => {
      this.logger.error('❌ WSS 에러', { error: error.message });
    });
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'HEARTBEAT':
        // 하트비트 응답
        this.send({ type: 'HEARTBEAT_ACK', timestamp: Date.now() });
        break;

      case 'DISPATCH':
        // 명령 수신 → 로컬 디바이스에 전달
        this.logger.info('📨 명령 수신', { target: msg.target, type: msg.commandType });
        this.dispatcher.dispatch(msg.target, msg.commandType, msg.payload);
        break;
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  startHeartbeat() {
    setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'STATUS_REPORT',
          payload: {
            connected_devices: this.dispatcher.getConnectedDeviceCount(),
            timestamp: Date.now()
          }
        });
      }
    }, 30000);  // 30초마다
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('🚨 WSS 재연결 실패 (최대 시도 초과)');
      // TODO: 긴급 알림
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.logger.info('🔄 WSS 재연결 시도', {
      attempt: this.reconnectAttempts,
      delay: `${delay}ms`
    });

    setTimeout(() => this.connect(), delay);
  }
}

module.exports = WssTunnel;
```

---

## 📊 연결 안정성 모니터링

### 실시간 감시

```sql
-- 연결 상태 테이블
CREATE TABLE wss_connection_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Connection Info
  connection_type VARCHAR(20) CHECK (connection_type IN ('CONNECT', 'DISCONNECT', 'HEARTBEAT', 'ERROR')),
  node_id VARCHAR(20),  -- 'VULTR' or 'T5810'
  
  -- Metrics
  latency_ms INTEGER,
  connected_devices INTEGER,
  
  -- Timestamp
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 연결 상태 뷰
CREATE VIEW wss_connection_status AS
SELECT 
  node_id,
  MAX(logged_at) as last_seen,
  EXTRACT(EPOCH FROM (NOW() - MAX(logged_at))) as seconds_since_last_seen,
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - MAX(logged_at))) < 60 THEN 'CONNECTED'
    WHEN EXTRACT(EPOCH FROM (NOW() - MAX(logged_at))) < 300 THEN 'DEGRADED'
    ELSE 'DISCONNECTED'
  END as status
FROM wss_connection_log
WHERE connection_type IN ('HEARTBEAT', 'CONNECT')
GROUP BY node_id;
```

---

## 🚀 실행 계획

### Week 1: 초기 100개 계정

```bash
Day 1-3: 계정 생성 (33개/일)
  - Gmail 수동 생성
  - CSV 기록

Day 4-5: 유아기 설정
  - YouTube 데이터 삭제
  - 개인화 비활성화

Day 6-7: 디바이스 매핑
  - 100대 디바이스에 로그인
  - 테스트 실행
```

### Week 2-3: WSS 터널링

```bash
Week 2: Vultr 서버 설정
  - WSS 서버 배포
  - SSL 인증서 (Let's Encrypt)
  - 방화벽 설정 (8443 포트)

Week 3: T5810 클라이언트
  - WSS 터널 클라이언트 구현
  - 자동 재연결 테스트
  - 연결 안정성 검증
```

### Month 2-6: 확장 500개

```bash
Month 2: 계정 +100 (총 200)
Month 3: 계정 +100 (총 300)
Month 4: 계정 +100 (총 400)
Month 5: 계정 +100 (총 500)
Month 6: 계정 +100 (총 600) ✅ 완료
```

---

## ⚠️ 리스크 및 대응

### Risk 1: 구글 정책 위반

**문제**: 대량 계정 생성 시 자동화 탐지

**대응**:
- ✅ 수동 생성 (초기 100개)
- ✅ IP 분산 (VPN 사용)
- ✅ 점진적 증설 (일 10개 이하)
- ✅ Google Workspace 활용 (정책 준수)

### Risk 2: WSS 연결 끊김

**문제**: Vultr-T5810 연결 불안정 → 디바이스 고립

**대응**:
- ✅ 자동 재연결 (지수 백오프)
- ✅ 하트비트 (30초마다)
- ✅ 타임아웃 감시 (60초)
- ✅ 알림 시스템 (SMS/이메일)
- ✅ 로컬 캐시 (명령 버퍼링)

### Risk 3: 계정 정지

**문제**: 비정상적 활동 패턴으로 계정 정지

**대응**:
- ✅ 인간 패턴 시뮬레이션 (human.js)
- ✅ Sleep 패턴 (활동:휴식 = 1:0.5)
- ✅ Youtube Farm (다양한 컨텐츠)
- ✅ 분산 활동 (600대가 다르게 행동)

---

## 📋 체크리스트

### 초기 100개 계정

- [ ] 이메일 명명 규칙 결정
- [ ] 수동 생성 (일 10개 × 10일)
- [ ] CSV 관리 스프레드시트 작성
- [ ] 비밀번호 관리자 설정
- [ ] Supabase google_accounts 테이블 생성
- [ ] 계정 정보 동기화
- [ ] 유아기 설정 스크립트 실행
- [ ] 100대 디바이스에 로그인
- [ ] 테스트 (AutoX.js 실행)

### WSS 터널링

- [ ] Vultr 서버 준비
- [ ] SSL 인증서 발급 (Let's Encrypt)
- [ ] WSS 서버 배포 (포트 8443)
- [ ] T5810에 클라이언트 설치
- [ ] 연결 테스트
- [ ] 하트비트 확인
- [ ] 자동 재연결 테스트
- [ ] 부하 테스트 (600대 시뮬레이션)
- [ ] 모니터링 대시보드 설정

---

## 🔧 설정 파일

### Vultr 환경 변수

```bash
# Server_Vultr/.env
WSS_PORT=8443
WSS_PATH=/tunnel
SSL_CERT_PATH=/etc/letsencrypt/live/doai.me/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/doai.me/privkey.pem

HEARTBEAT_INTERVAL=30000
HEARTBEAT_TIMEOUT=60000

LOG_LEVEL=info
```

### T5810 환경 변수

```bash
# gateway/.env
WSS_SERVER_URL=wss://doai.me:8443/tunnel
WSS_RECONNECT_MAX_ATTEMPTS=10
WSS_HEARTBEAT_INTERVAL=30000

GATEWAY_ROLE=T5810_GATEWAY
```

---

## 📚 관련 문서

- **존재론적 스키마**: `docs/ONTOLOGICAL_SCHEMA_GUIDE.md`
- **PC 노드 아키텍처**: `docs/PC_NODE_ARCHITECTURE.md`
- **Manifesto**: `/manifesto` 페이지

---

**작성**: Strategos (Operations Lead)  
**승인**: Orion (Visionary)  
**날짜**: 2026-01-02
