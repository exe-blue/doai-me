# 📄 CODE_ANALYSIS_YOUTUBE.md - YouTube 자동화 시스템 코드 분석

**핸드오프 문서 버전:** 1.0  
**분석 대상:** `d:\exe.blue\aifarm\code\` 폴더  
**작성자:** Axon (Tech Lead)  
**날짜:** 2025-01-01

---

## 🗂️ 1. 파일 구조 및 출처

| 파일명 | 출처 | 설명 |
|--------|------|------|
| `spotify.js` | **Laixi 제공** | Spotify 앱 자동화 (참고용) |
| `tiktok.js` | **Laixi 제공** | TikTok 앱 자동화 (참고용) |
| `youtube_agent.js` | **우리 코드** | YouTube 자동화 - AutoX.js 버전 |
| `youtube_agent.py` | **우리 코드** | YouTube 자동화 - Python(uiautomator2) 버전 |
| `youtube_automation.js` | **우리 코드** | YouTube 자동화 - 서버 연동 버전 |
| `youtube_api_schema.md` | **우리 코드** | API 명세 문서 |
| `自动上滑脚本.js` | **Laixi 제공** | 자동 스와이프 (베지어 곡선) |
| `截图存相册.bat` | **Laixi 제공** | ADB 스크린샷 스크립트 |

---

## 🏗️ 2. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    데이터 소스 (입력)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  Tally Form │  │  Airtable   │  │  Google Sheet (CSV) │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘   │
└─────────┼────────────────┼─────────────────────┼─────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              중계 서버 (Node.js/FastAPI)                      │
│  - GET /api/videos: 영상 목록 제공                            │
│  - POST /api/results: 시청 결과 수신                          │
│  - WebSocket: 실시간 명령 전달                                │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Laixi App   │  │  Laixi App   │  │  Laixi App   │
│  (Device 1)  │  │  (Device 2)  │  │  (Device N)  │
│  + AutoX.js  │  │  + AutoX.js  │  │  + AutoX.js  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  YouTube App │  │  YouTube App │  │  YouTube App │
│  (시청/좋아요) │  │  (시청/좋아요) │  │  (시청/좋아요) │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 📊 3. 데이터 구조

### 3.1 입력 데이터 (영상 정보)

```json
{
  "id": "unique_video_id_001",
  "keyword": "요리 브이로그",
  "title": "오늘의 집밥 만들기",
  "url": "https://youtube.com/watch?v=XXXXX"
}
```

**필수 조건:** `keyword`, `title`, `url` 중 **최소 하나** 필요

### 3.2 출력 데이터 (시청 결과)

```json
{
  "device_id": "DEVICE_SERIAL_001",
  "video_id": "unique_video_id_001",
  "title": "오늘의 집밥 만들기",
  "watch_time": 180,
  "total_duration": 300,
  "commented": true,
  "comment_text": "좋은 영상이네요!",
  "liked": true,
  "search_type": 1,
  "search_rank": 5,
  "screenshot_path": "/storage/.../001.png",
  "timestamp": "2026-01-01T14:30:00.000Z",
  "status": "completed"
}
```

---

## 🔄 4. 핵심 알고리즘

### 4.1 영상 검색 프로세스 (4단계 Fallback)

```
[1단계] 키워드 검색 → 제목 매칭
    ↓ 실패 시
[2단계] 키워드 + 최근 1시간 필터 → 제목 매칭
    ↓ 실패 시
[3단계] 제목으로 직접 검색
    ↓ 실패 시
[4단계] URL 직접 입력 (딥링크)
    ↓ 실패 시
[NOT_FOUND] 영상 없음 처리
```

### 4.2 시청 패턴 (Human-like Behavior)

```javascript
// CONFIG 값
WATCH_PERCENT_MIN: 40,    // 최소 40% 시청
WATCH_PERCENT_MAX: 100,   // 최대 100% 시청
SEEK_COUNT_MIN: 5,        // 앞으로 가기 최소 5회
SEEK_COUNT_MAX: 20,       // 앞으로 가기 최대 20회

// 시청 중 랜덤 활동 (가중치 기반)
activities = {
  seek_forward: 0.1,
  seek_backward: 0.1,
  scroll_to_comments: 0.15,
  scroll_to_related: 0.15,
  pause_resume: 0.1,
  do_nothing: 0.4
};
```

### 4.3 베지어 곡선 스와이프 (Laixi 제공)

```javascript
// 탐지 회피용 곡선 스와이프
function sml_move(qx, qy, zx, zy, time) {
  var dx0 = { x: qx, y: qy };
  var dx1 = { x: random(qx-100, qx+100), y: random(qy, qy+50) };
  var dx2 = { x: random(zx-100, zx+100), y: random(zy, zy+50) };
  var dx3 = { x: zx, y: zy };
  
  for (let t = 0; t < 1; t += 0.08) {
    point = bezier_curves([dx0, dx1, dx2, dx3], t);
  }
  gesture.apply(null, points);
}
```

---

## 🔧 5. 주요 컴포넌트

### 5.1 YouTube 조작 함수 (AutoX.js)

| 함수명 | 설명 |
|--------|------|
| `launchYouTube()` | YouTube 앱 실행 |
| `goToSearch()` | 검색 화면 이동 |
| `inputSearchQuery(query)` | 검색어 입력 + Enter |
| `applyTimeFilter(type)` | 시간 필터 적용 |
| `findVideoByTitle(title)` | 스크롤하며 제목 매칭 |
| `openVideoByUrl(url)` | URL로 직접 열기 |
| `watchVideo(task)` | 영상 시청 + 랜덤 활동 |
| `clickLike()` | 좋아요 클릭 |
| `writeComment()` | 댓글 작성 |

### 5.2 UI 요소 ID (YouTube 앱)

```javascript
// 검색
"com.google.android.youtube:id/menu_search"
"com.google.android.youtube:id/search_edit_text"

// 플레이어
"com.google.android.youtube:id/player_view"
"com.google.android.youtube:id/time_bar_total_time"

// 좋아요
"com.google.android.youtube:id/like_button"
desc("이 동영상 좋아요") | desc("like this video")
```

---

## 📡 6. API 명세 요약

### 6.1 영상 목록 조회

```http
GET /api/videos
Authorization: Bearer {API_KEY}

Response:
{
  "success": true,
  "videos": [...],
  "stats": { "total": 100, "pending": 45, "completed": 50, "error": 5 }
}
```

### 6.2 결과 전송

```http
POST /api/results
Authorization: Bearer {API_KEY}
Content-Type: application/json

Body: { device_id, video_id, watch_time, ... }
```

---

## ⚙️ 7. 설정 상수 (CONFIG)

```javascript
const CONFIG = {
  DELAYS: {
    TYPE: [500, 1500],
    SCROLL: [1000, 3000],
    ACTION: [2000, 5000],
    SEARCH: [3000, 7000],
    LOAD: [2000, 4000],
  },
  
  WATCH: {
    MIN_RATIO: 0.4,
    MAX_RATIO: 1.0,
    ACTION_INTERVAL: [15000, 45000],
  },
  
  MAX_SCROLL_PAGES: {
    KEYWORD: 3,
    RECENT: 3,
    TITLE: 1
  },
  
  COMMENTS: [
    "좋은 영상이네요 👍",
    "잘 봤습니다!",
    "유익한 정보 감사합니다",
  ],
};
```

---

## ✅ 8. 핸드오프 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| 1 | YouTube 검색 로직 | ✅ |
| 2 | YouTube 시청 로직 | ✅ |
| 3 | 좋아요/댓글 로직 | ✅ |
| 4 | 베지어 곡선 스와이프 | ✅ |
| 5 | API 스키마 정의 | ✅ |
| 6 | Laixi Adapter 통합 | ✅ (gateway/src/adapters/laixi/) |
| 7 | 서버 API 구현 | ✅ (backend/api/youtube.js) |
| 8 | 한글 입력 처리 | ✅ (클립보드 방식) |
| 9 | 실행 가이드 문서 | ✅ (docs/YOUTUBE_SETUP_GUIDE.md) |

---

## 📌 9. 관련 파일 경로

```
aifarm/
├── code/                          # 원본 스크립트
│   ├── youtube_agent.js           # AutoX.js 메인 스크립트
│   ├── youtube_agent.py           # Python 버전
│   ├── youtube_automation.js      # 서버 연동 버전
│   └── youtube_api_schema.md      # API 명세
│
├── gateway/src/adapters/laixi/    # Laixi 어댑터
│   ├── LaixiAdapter.js            # WebSocket 통신
│   ├── SomaticEngine.js           # Human-like 행동
│   └── YouTubeController.js       # YouTube 전용 컨트롤러
│
├── backend/api/                   # 백엔드 API
│   └── youtube.js                 # /api/videos, /api/results
│
└── docs/                          # 문서
    ├── CODE_ANALYSIS_YOUTUBE.md   # 이 문서
    └── YOUTUBE_SETUP_GUIDE.md     # 실행 가이드
```

---

**이 문서는 핸드오프 완료 후 새 에이전트가 즉시 개발을 시작할 수 있도록 작성되었습니다.**

