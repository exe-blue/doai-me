# DoAi.Me Local Node

Laixi 그룹 기능을 활용한 Phoneboard Controller

## 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│  Local Node (미니PC)                                     │
│  ├── Scheduler: 30초 주기 하트비트 + 태스크 배치 실행   │
│  ├── Callback Server: AutoX.js 결과 수신 (port 3000)   │
│  └── State Manager: 디바이스/태스크 상태 관리          │
└──────────────────────────────────────────────────────────┘
       │                                    ▲
       │ Laixi API                          │ HTTP Callback
       │ deviceIds: "all"                   │
       ▼                                    │
┌──────────────────────────────────────────────────────────┐
│  Phoneboard (20x Galaxy S9)                              │
│  └── AutoX.js: youtube-task.js 실행                     │
└──────────────────────────────────────────────────────────┘
```

## 루프 방지 3원칙

1. **분리**: Heartbeat는 상태 보고만, 실행은 이벤트 기반
2. **락킹**: 1 디바이스 = 1 태스크, `acquireLock()` 필수
3. **타임아웃**: 모든 외부 호출에 타임아웃 (기본 10초, 최대 5분)

## 파일 구조

```
local-node/
├── index.js                  # 진입점
├── package.json
├── .env.example
│
├── lib/
│   ├── laixi.js              # Laixi API (배치 실행 지원)
│   ├── supabase.js           # Supabase 클라이언트
│   └── state.js              # 공유 상태 (락킹)
│
├── services/
│   ├── scheduler.js          # 30초 하트비트 + 태스크 할당
│   └── callback-server.js    # 결과 수신 (Express)
│
└── scripts/
    └── youtube-task.js       # AutoX.js 스크립트 템플릿
```

## 설치 및 실행

```bash
# 설치
cd local-node
npm install

# 환경 설정
cp .env.example .env
# .env 파일 편집

# 실행
npm start

# 개발 모드 (자동 재시작)
npm run dev
```

## PM2 운영

```bash
# PM2 설치
npm install -g pm2

# 시작
pm2 start index.js --name "doaime-node-01"

# 로그 확인
pm2 logs doaime-node-01

# 상태 확인
pm2 status

# 재시작
pm2 restart doaime-node-01

# 중지
pm2 stop doaime-node-01
```

## API 엔드포인트

### Callback Server

| Method | Path | 설명 |
|--------|------|------|
| POST | `/callback` | AutoX.js 태스크 완료 콜백 |
| GET | `/health` | 헬스체크 |
| GET | `/status` | 상세 상태 조회 |
| POST | `/force-complete` | 강제 완료 (디버깅용) |

### 콜백 요청 형식

```json
{
  "taskId": "uuid",
  "personaId": "uuid",
  "success": true,
  "watchDuration": 120,
  "liked": true,
  "commented": false,
  "commentText": "",
  "videoUrl": "https://youtube.com/...",
  "videoTitle": "영상 제목",
  "error": null,
  "deviceSerial": "device-001"
}
```

## Laixi 배치 실행

```json
{
  "action": "ExecuteAutoJs",
  "comm": {
    "deviceIds": "all",
    "filePath": "C:\\Scripts\\youtube-task.js"
  }
}
```

- `deviceIds`: `"all"` | `"serial1,serial2"` | 그룹명

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NODE_ID` | 노드 식별자 | hostname |
| `SUPABASE_URL` | Supabase URL | 필수 |
| `SUPABASE_SERVICE_KEY` | Supabase 서비스 키 | 필수 |
| `LAIXI_URL` | Laixi API URL | `http://127.0.0.1:9317` |
| `CALLBACK_PORT` | 콜백 서버 포트 | `3000` |
| `SCRIPT_PATH` | AutoX.js 스크립트 경로 | `./scripts/youtube-task.js` |
