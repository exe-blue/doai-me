# YouTube Farm - 간소화된 아키텍처

## 🎯 핵심 원칙

> **"AutoX.js가 직접 서버와 통신"**
> 
> Laixi는 스크립트 실행만 담당하고, 중간 브릿지(PC Agent) 불필요!

## 📊 시스템 구성

```
┌─────────────────────────────────────────────────────────────┐
│                        인프라                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📱 Galaxy S9 x 300대                                       │
│     └─ AutoX.js 실행 (HTTP 클라이언트)                      │
│                                                             │
│  🖥️ Mini PC x 15대 (각 20대 관리)                           │
│     └─ Laixi 실행 (USB 연결 + 스크립트 배포)                │
│                                                             │
│  ☁️ Vultr VPS (158.247.210.152)                             │
│     └─ FastAPI 서버 (작업 분배 + 결과 수집)                  │
│                                                             │
│  🌐 Vercel (Phase 3)                                        │
│     └─ 대시보드 프론트엔드                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 작업 플로우 (단순화)

```
┌─────────────────────────────────────────────────────────────┐
│                     작업 플로우                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 관리자                                                  │
│   │                                                         │
│   │ 1. 오늘 작업 등록 (30-50개 영상)                        │
│   │    POST /api/tasks                                      │
│   ▼                                                         │
│  ┌─────────────────────────────┐                            │
│  │   중앙 서버 (Vultr)         │                            │
│  │   FastAPI + SQLite          │                            │
│  │                             │                            │
│  │   - 작업 큐 관리            │                            │
│  │   - 기기별 할당             │                            │
│  │   - 결과 집계               │                            │
│  └──────────────┬──────────────┘                            │
│                 │                                           │
│                 │ HTTP API (직접 통신!)                     │
│                 │                                           │
│  ┌──────────────▼──────────────┐                            │
│  │   AutoX.js on Galaxy S9     │                            │
│  │                             │                            │
│  │   2. GET /api/tasks/next    │  작업 요청                 │
│  │   3. YouTube 앱 제어        │  영상 검색/시청            │
│  │   4. POST /complete         │  결과 보고                 │
│  │   5. 반복...                │                            │
│  └─────────────────────────────┘                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Laixi의 역할

Laixi는 **초기 설정 및 스크립트 배포**만 담당:

```json
// 1. 모든 기기에 AutoX.js 스크립트 실행
{
  "action": "ExecuteAutoJs",
  "comm": {
    "deviceIds": "all",
    "filePath": "C:\\Scripts\\youtube_simple.js"
  }
}

// 이후 AutoX.js가 알아서 서버와 통신
// Laixi 개입 없음!
```

### Laixi를 사용하는 경우

| 용도 | Laixi API |
|------|-----------|
| 스크립트 시작 | `ExecuteAutoJs` |
| 스크립트 중지 | `StopAutoJs` |
| 기기 상태 확인 | `List` |
| 스크린샷 | `screen` |
| 긴급 조작 | `pointerEvent` |

### Laixi를 사용하지 않는 경우

| 용도 | 처리 방법 |
|------|-----------|
| 작업 분배 | 서버 API |
| 결과 수집 | 서버 API |
| 기기 모니터링 | 서버 API (last_seen) |

## 📡 API 설계

### 핵심 API (4개)

```
POST /api/tasks           # 작업 등록
GET  /api/tasks/next      # 다음 작업 가져오기 (핵심!)
POST /api/tasks/{id}/complete  # 완료 보고
GET  /api/tasks/status    # 현황 요약
```

### `/api/tasks/next` 동작

```python
# 동시성 처리 (SQLite)
async with db.execute("BEGIN IMMEDIATE"):  # 즉시 잠금
    # 1. pending 작업 중 우선순위 높은 것 선택
    task = await db.fetchone("""
        SELECT * FROM tasks 
        WHERE status = 'pending' 
        ORDER BY priority DESC, created_at ASC 
        LIMIT 1
    """)
    
    # 2. assigned로 변경 + device_id 할당
    if task:
        await db.execute("""
            UPDATE tasks 
            SET status = 'assigned', device_id = ?, assigned_at = NOW()
            WHERE id = ?
        """, (device_id, task.id))
```

## 💾 데이터베이스 (SQLite)

```sql
-- 작업
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    keyword TEXT,
    title TEXT NOT NULL,
    youtube_url TEXT,
    priority INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending',  -- pending/assigned/completed/failed
    device_id TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME,
    assigned_at DATETIME,
    completed_at DATETIME
);

-- 결과
CREATE TABLE task_results (
    id INTEGER PRIMARY KEY,
    task_id INTEGER,
    device_id TEXT,
    success INTEGER,
    watch_duration INTEGER,
    search_type INTEGER,  -- 1:키워드 2:필터 3:제목 4:URL
    search_rank INTEGER,
    error_message TEXT,
    created_at DATETIME
);

-- 기기
CREATE TABLE devices (
    device_id TEXT PRIMARY KEY,
    last_seen DATETIME,
    total_completed INTEGER,
    total_failed INTEGER
);
```

## 🆚 기존 아키텍처 vs 간소화 아키텍처

### ❌ 기존 (복잡)

```
웹 → 서버 → PC Agent → Laixi WebSocket → AutoX.js → 폰
              (폴링)        (브릿지)
              
문제점:
- PC Agent가 5초마다 폴링 (불필요한 트래픽)
- Laixi WebSocket 브릿지 필요 (복잡성)
- 결과도 역방향으로 전달 (지연)
- 구성 요소가 많아 장애점 증가
```

### ✅ 간소화

```
웹 → 서버 ←→ AutoX.js (on 폰)
          HTTP 직접 통신
          
장점:
- AutoX.js가 직접 HTTP 요청 (간단)
- 중간 브릿지 없음 (지연 감소)
- Laixi는 스크립트 실행만 (역할 명확)
- 장애점 감소
```

## 📱 AutoX.js 스크립트 구조

```javascript
// youtube_simple.js

var CONFIG = {
    SERVER_URL: "http://158.247.210.152:8000",
    DEVICE_ID: device.serial
};

// 메인 루프
function mainLoop() {
    while (isRunning) {
        // 1. 작업 요청
        var task = http.get(CONFIG.SERVER_URL + "/api/tasks/next", {
            device_id: CONFIG.DEVICE_ID
        }).body.json();
        
        if (!task.task) {
            sleep(60000);  // 1분 대기
            continue;
        }
        
        // 2. 영상 찾기 (4단계 검색)
        var found = findVideo(task.task);
        
        // 3. 시청
        var watchTime = watchVideo(task.task);
        
        // 4. 결과 보고
        http.postJson(CONFIG.SERVER_URL + "/api/tasks/" + task.task.task_id + "/complete", {
            device_id: CONFIG.DEVICE_ID,
            success: found,
            watch_duration: watchTime
        });
        
        // 5. 다음 작업까지 대기
        sleep(random(5000, 15000));
    }
}
```

## 🚀 배포 순서

### Phase 1: 백엔드 (현재)

```bash
# Vultr 서버에서
cd /opt/youtube-farm
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# 테스트
curl http://158.247.210.152:8000/api/tasks/status
```

### Phase 2: AutoX.js 연동

```bash
# 로컬 PC에서 Laixi로 스크립트 배포
# WebSocket: ws://127.0.0.1:22221/

{
  "action": "ExecuteAutoJs",
  "comm": {
    "deviceIds": "all",
    "filePath": "C:\\Scripts\\youtube_simple.js"
  }
}
```

### Phase 3: 대시보드

- Vercel에 React 앱 배포
- 서버 API 연동

## ❓ FAQ

### Q: Laixi WebSocket으로 직접 제어하면 안 되나요?

A: Laixi WebSocket은 `127.0.0.1:22221`로 **로컬만 접근 가능**합니다.
외부에서 접근하려면 포트포워딩/VPN이 필요하고, 보안 이슈도 있습니다.
대신 AutoX.js가 직접 HTTP로 서버와 통신하는 게 훨씬 간단합니다.

### Q: 왜 웹 서버가 필요한가요?

A: 
1. **중앙 집중 관리**: 15대 PC를 개별 관리 vs 하나의 대시보드
2. **작업 분배**: 어느 기기에 어떤 영상을 할당할지 자동 결정
3. **결과 집계**: 300대 결과를 한 곳에서 통계
4. **원격 관리**: 현장에 없어도 관리 가능

### Q: PC Agent가 정말 필요 없나요?

A: **MVP에서는 불필요**합니다.
AutoX.js가 직접 HTTP 통신할 수 있기 때문입니다.

나중에 필요한 경우:
- Laixi 기능 원격 호출 (스크린샷, 긴급 조작)
- 기기 상태 실시간 모니터링
- 스크립트 업데이트 배포

