# AutoX-Scripts 동작 상태 보고서

**작성일**: 2026-01-02  
**작성자**: Axon (Tech Lead)  
**버전**: 2.0.0 (Physical Link Layer)

---

## 📊 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| 포트 설정 | ✅ 수정 완료 | 8000 → 3100 |
| Receiver (ADB Broadcast) | ✅ 동작 가능 | Physical Link Layer |
| API 폴링 (Deprecated) | ❌ 비활성화 | Gateway 엔드포인트 없음 |
| YouTube 자동화 | ✅ 동작 가능 | 모든 모듈 정상 |

---

## 🔧 수정 사항

### 1. 포트 번호 변경

**파일**: `config/dev.json`, `config/prod.json`

```diff
- "port": 8000
+ "port": 3100
```

**이유**: Gateway 서버가 포트 3100에서 실행됨

---

## 🎯 현재 동작 방식

### ✅ 작동하는 방식: ADB Broadcast (Receiver)

```
┌─────────────────┐           ┌─────────────────┐
│   Gateway PC    │           │ Android Phone   │
│   (Port 3100)   │           │  (AutoX.js)     │
└─────────────────┘           └─────────────────┘
        │                             ▲
        │  POST /api/dispatch         │
        │  {                          │
        │    type: "POP",             │
        │    payload: {...}           │
        │  }                          │
        │                             │
        ├─────────────────────────────┤
        │  ADB Broadcast              │
        │  am broadcast               │
        │    -a com.doai.me.COMMAND   │
        │    --es type "POP"          │
        │                             │
        ▼                             │
  [ADB Server]              [Receiver.js]
                                   │
                                   ▼
                            [YouTube.js]
                            영상 시청 수행
```

**Gateway 엔드포인트**:
- `POST /api/dispatch` - 메시지 전송
  - `type`: POP, ACCIDENT, COMMISSION
  - `target`: "*" (전체) 또는 디바이스 ID
  - `payload`: { url, keyword, etc. }

**AutoX.js Receiver**:
- Intent Action: `com.doai.me.COMMAND`
- 수신 타입:
  - `POP`: YouTube 영상 시청
  - `ACCIDENT`: 긴급 반응 (붉은 오버레이)
  - `COMMISSION`: 의뢰 처리

---

### ❌ 작동하지 않는 방식: API 폴링

```
GET /api/tasks/next?device_id=xxx
```

**문제**: Gateway에 `/api/tasks/next` 엔드포인트가 없음

**원인**: 
- v1.0에서는 Backend API 서버가 별도로 존재했음
- v2.0에서는 Gateway로 통합되었고, ADB Broadcast 방식으로 전환

**해결 방법** (선택):
1. ✅ **권장**: API 폴링 코드 제거, Receiver만 사용
2. Gateway에 `/api/tasks/next` 엔드포인트 추가 (레거시 호환)

---

## 🚀 영상 시청 테스트 방법

### 1. 준비사항

```bash
# 1. Gateway 서버 실행
cd gateway
npm install
npm run dev:all

# 2. Android 폰에 AutoX.js 설치
# - https://github.com/kkevsekk1/AutoX/releases

# 3. USB 디버깅 활성화
adb devices
```

### 2. AutoX.js 실행

**방법 A: VS Code에서 실행 (권장)**
```bash
# VS Code Extension 설치
# - Autox.js-VSCodeExt

# 1. VS Code에서 autox-scripts 폴더 열기
# 2. main.js 파일 열기
# 3. F5 누르거나 우측 상단 실행 버튼 클릭
```

**방법 B: AutoX.js 앱에서 직접 실행**
```bash
# 1. autox-scripts 폴더를 폰에 복사
# 2. AutoX.js 앱 열기
# 3. main.js 선택
# 4. 재생 버튼 클릭
```

### 3. POP 명령 전송 (Gateway Dashboard)

```bash
# Gateway Dashboard 접속
http://localhost:3100

# 또는 API 직접 호출
curl -X POST http://localhost:3100/api/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "target": "*",
    "type": "POP",
    "payload": {
      "youtube_url": "https://youtube.com/watch?v=...",
      "keyword": "테스트 영상"
    }
  }'
```

### 4. 로그 확인

**AutoX.js 로그**:
```
[2026-01-02T10:00:00Z] [PHONE_001] [INFO] 🎧 Receiver 청취 시작
[2026-01-02T10:00:01Z] [PHONE_001] [INFO] ✅ Receiver 등록 완료
[2026-01-02T10:01:00Z] [PHONE_001] [INFO] 📨 [POP] 명령 수신
[2026-01-02T10:01:01Z] [PHONE_001] [INFO] YouTube 앱 실행 중...
[2026-01-02T10:01:03Z] [PHONE_001] [INFO] 영상 시청 시작
[2026-01-02T10:02:30Z] [PHONE_001] [INFO] ✅ 작업 수행 완료
```

**Gateway 로그**:
```
[Gateway] POST /api/dispatch → device_001 (POP)
[ADB] Broadcast sent: com.doai.me.COMMAND
[Gateway] Dispatch success
```

---

## 🐛 예상 문제 및 해결

### 문제 1: Receiver가 명령을 수신하지 못함

**증상**:
```
[ERROR] BroadcastReceiver 등록 실패
```

**해결**:
1. AutoX.js 앱에 필요한 권한 부여
   - 접근성 서비스
   - 오버레이 권한
2. Android 버전 확인 (Android 7.0+)

### 문제 2: YouTube 앱 실행 실패

**증상**:
```
[ERROR] YouTube 앱 실행 실패
```

**해결**:
1. YouTube 앱 설치 확인
2. AutoX.js에 접근성 권한 부여
3. 폰 재부팅

### 문제 3: ADB 연결 끊김

**증상**:
```
[ADB] No devices/emulators found
```

**해결**:
```bash
# ADB 서버 재시작
adb kill-server
adb start-server
adb devices

# USB 케이블 확인 (데이터 전송 가능한 케이블 사용)
```

---

## 📦 파일 구조

```
autox-scripts/
├── main.js                  ✅ 메인 엔트리 (Receiver + 메인 루프)
├── modules/
│   ├── api.js              ⚠️  Deprecated (API 폴링)
│   ├── youtube.js          ✅ YouTube 자동화
│   ├── human.js            ✅ 인간 패턴 시뮬레이션
│   ├── receiver.js         ✅ ADB Broadcast 수신
│   └── logger.js           ✅ 로깅
├── config/
│   ├── dev.json            ✅ 개발 환경 (port: 3100)
│   └── prod.json           ✅ 프로덕션 (port: 3100)
└── tests/
    └── simulator.js        ⚠️  Legacy (API 기반)
```

---

## ✅ 동작 가능 여부 결론

### 현재 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| **YouTube 영상 시청** | ✅ 가능 | Receiver + YouTube.js |
| **좋아요** | ✅ 가능 | youtube.clickLike() |
| **댓글 작성** | ✅ 가능 | youtube.writeComment() |
| **구독** | ✅ 가능 | youtube.clickSubscribe() |
| **알림 설정** | ✅ 가능 | youtube.setNotification() |
| **공유** | ✅ 가능 | youtube.shareVideo() |
| **재생목록 추가** | ✅ 가능 | youtube.addToPlaylist() |

### 필요 조건

1. ✅ Gateway 서버 실행 (Port 3100)
2. ✅ Android 폰 + AutoX.js 앱
3. ✅ ADB 연결 (USB 또는 WiFi)
4. ✅ YouTube 앱 설치
5. ✅ AutoX.js 권한 (접근성, 오버레이)

### 테스트 시나리오

```
1. Gateway 실행: npm run dev:all
2. AutoX.js 실행: main.js 실행
3. POP 전송: POST /api/dispatch
4. 결과 확인: YouTube 앱에서 영상 시청
```

**결론**: ✅ **autox-scripts는 현재 정상적으로 영상을 시청할 수 있습니다!**

---

## 🔄 향후 개선 사항

### 1. API 폴링 제거 (권장)

**이유**: Gateway에 엔드포인트가 없고, Receiver가 더 효율적

```javascript
// main.js - 제거 대상
const task = api.getNextTask();  // ❌ Deprecated
```

**대안**: Receiver로 모든 명령 수신

### 2. 에러 보고 메커니즘

**현재**: 로그만 출력  
**개선**: Gateway로 결과 보고

```javascript
// 추가 필요
api.reportResult(taskId, result);
```

### 3. 상태 저장 메커니즘

**현재**: 메모리만 사용  
**개선**: 로컬 DB (SQLite) 또는 파일 저장

---

**작성**: Axon (Tech Lead)  
**검증**: 2026-01-02  
**다음 리뷰**: Gateway API 통합 후
