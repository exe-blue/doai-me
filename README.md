# YouTube Farm

> 300대 Galaxy S9 폰팜을 이용한 YouTube 영상 시청 자동화 시스템

## 📊 시스템 구성

```
┌─────────────────────────────────────────────────────────────┐
│                        아키텍처                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 관리자                                                  │
│   │                                                         │
│   │ 작업 등록 (POST /api/tasks)                            │
│   ▼                                                         │
│  ┌─────────────────────────────┐                            │
│  │   중앙 서버 (Vultr)         │                            │
│  │   158.247.210.152:8000      │                            │
│  │                             │                            │
│  │   FastAPI + SQLite          │                            │
│  └──────────────┬──────────────┘                            │
│                 │                                           │
│                 │ HTTP API (직접 통신)                      │
│                 │                                           │
│  ┌──────────────▼──────────────┐                            │
│  │   AutoX.js on Galaxy S9     │                            │
│  │   (300대)                   │                            │
│  │                             │                            │
│  │   GET /api/tasks/next       │                            │
│  │   POST /complete            │                            │
│  └─────────────────────────────┘                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 빠른 시작

### 1. 서버 배포 (Vultr)

```bash
# 서버에 main.py 업로드
scp backend/main.py root@158.247.210.152:/opt/youtube-farm/

# 서버에서 실행
cd /opt/youtube-farm
pip install fastapi uvicorn pydantic
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. 작업 등록

```bash
# 영상 1개 등록
curl -X POST http://158.247.210.152:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "아이유 홀씨",
    "title": "아이유 홀씨 MV",
    "youtube_url": "https://youtube.com/watch?v=xxxxx",
    "priority": 8
  }'

# 여러 영상 일괄 등록
curl -X POST http://158.247.210.152:8000/api/tasks/bulk \
  -H "Content-Type: application/json" \
  -d '[
    {"keyword": "영상1", "title": "제목1", "priority": 5},
    {"keyword": "영상2", "title": "제목2", "priority": 7}
  ]'
```

### 3. AutoX.js 스크립트 실행 (Laixi)

```bash
# Laixi 관리 도구 실행
cd tools
pip install -r requirements.txt
python laixi_manager.py start  # 모든 기기에 스크립트 시작
```

또는 Laixi WebSocket 직접 호출:
```json
{
  "action": "ExecuteAutoJs",
  "comm": {
    "deviceIds": "all",
    "filePath": "C:\\Scripts\\youtube_simple.js"
  }
}
```

### 4. 현황 확인

```bash
# 작업 현황
curl http://158.247.210.152:8000/api/tasks/status

# 응답 예시
{
  "success": true,
  "summary": {
    "total": 50,
    "pending": 10,
    "assigned": 5,
    "completed": 30,
    "failed": 5
  }
}
```

## 📁 프로젝트 구조

```
youtube-farm/
├── backend/
│   ├── main.py           # FastAPI 서버
│   └── requirements.txt
├── scripts/
│   └── youtube_simple.js # AutoX.js 스크립트
├── tools/
│   ├── laixi_manager.py  # Laixi 관리 도구
│   └── requirements.txt
├── deploy/
│   └── vultr_setup.sh    # 서버 설정 스크립트
├── docs/
│   └── ARCHITECTURE_SIMPLE.md
└── README.md
```

## 🔌 API 문서

### 핵심 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/tasks` | 작업 등록 |
| POST | `/api/tasks/bulk` | 작업 일괄 등록 |
| GET | `/api/tasks/next?device_id=xxx` | 다음 작업 가져오기 |
| POST | `/api/tasks/{id}/complete` | 완료 보고 |
| GET | `/api/tasks/status` | 현황 요약 |

### 전체 API

서버 실행 후 Swagger UI: http://158.247.210.152:8000/docs

## 🔄 작업 플로우

```
09:00  관리자가 오늘의 작업 등록 (30-50개 영상)
         │
         ▼
09:05  각 폰의 AutoX.js가 서버에서 작업 요청
         GET /api/tasks/next?device_id=ABC123
         │
         ▼
09:06  서버가 작업 할당 (pending → assigned)
         {task_id: 1, keyword: "아이유", title: "..."}
         │
         ▼
09:07  폰이 YouTube 앱에서 영상 검색/시청
         4단계 검색: 키워드 → 필터 → 제목 → URL
         │
         ▼
09:15  시청 완료 후 서버에 보고
         POST /api/tasks/1/complete
         │
         ▼
09:15  다음 작업 요청... (반복)
         │
         ▼
18:00  모든 작업 완료, 현황 확인
         GET /api/tasks/status
```

## 🛠️ Laixi 관리 도구

```bash
# 대화형 모드
python laixi_manager.py

# 명령어 모드
python laixi_manager.py start      # 스크립트 시작
python laixi_manager.py stop       # 스크립트 중지
python laixi_manager.py status     # 기기 상태
python laixi_manager.py screenshot # 스크린샷
python laixi_manager.py home       # 홈 버튼
python laixi_manager.py youtube    # YouTube 실행
```

## 📱 AutoX.js 4단계 검색 로직

```
1단계: 키워드 검색
       "아이유 홀씨" 검색 → 결과에서 제목 매칭
                │
                │ 실패 시
                ▼
2단계: 키워드 + 시간 필터
       검색 후 "1시간 이내" 필터 적용
                │
                │ 실패 시
                ▼
3단계: 제목 직접 검색
       전체 제목으로 검색
                │
                │ 실패 시
                ▼
4단계: URL 직접 이동
       youtube_url로 바로 이동
```

## ❓ FAQ

### Q: PC Agent가 필요 없나요?

A: MVP에서는 **불필요**합니다. AutoX.js가 직접 HTTP로 서버와 통신합니다.

### Q: Laixi 역할은 뭔가요?

A: AutoX.js 스크립트 **시작/중지**만 담당합니다.
스크립트가 실행되면 Laixi 개입 없이 폰이 직접 서버와 통신합니다.

### Q: 왜 SQLite인가요?

A: 초기 MVP에 적합합니다. 300대 동시 요청도 충분히 처리 가능합니다.
나중에 PostgreSQL/Supabase로 쉽게 마이그레이션할 수 있습니다.

## 📋 Phase 1 완료 기준

```bash
# 이 시퀀스가 정상 동작하면 Phase 1 완료

# 1. 작업 등록
curl -X POST http://158.247.210.152:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"keyword":"테스트","title":"테스트 영상","youtube_url":"https://youtube.com/watch?v=test"}'
# → {"success":true,"task_id":1}

# 2. 작업 가져오기
curl "http://158.247.210.152:8000/api/tasks/next?device_id=test_device"
# → {"success":true,"task":{"task_id":1,"keyword":"테스트",...}}

# 3. 완료 보고
curl -X POST http://158.247.210.152:8000/api/tasks/1/complete \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test_device","success":true,"watch_duration":180}'
# → {"success":true}

# 4. 현황 확인
curl http://158.247.210.152:8000/api/tasks/status
# → {"success":true,"summary":{"total":1,"completed":1,...}}
```

## 📄 라이선스

MIT License
