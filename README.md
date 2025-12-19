# AIFarm - WiFi 연결 폰보드 자동화 시스템

WiFi로 연결된 폰보드(최대 600대)를 ADB 명령과 API를 통해 자동화하는 시스템입니다.

## 🌟 주요 특징

- **600대 디바이스 관리**: 30개 폰보드 × 20대 슬롯 = 600대 동시 제어
- **6대 상시 활동**: Shorts 리믹스, 플레이리스트 큐레이터, 페르소나 코멘터, 트렌드 스카우트, 챌린지 헌터, 썸네일 랩
- **스마트 스케줄링**: Active(500대)/Reserve(60대)/Maintenance(40대) 풀 관리
- **자연스러운 행동**: HID 입력, 시간대별 활동 강도, 페르소나 기반 댓글
- **실시간 대시보드**: WebSocket 기반 600대 모니터링, 발견물 피드

## 📁 프로젝트 구조

```
aifarm/
├── src/                          # 소스 코드
│   ├── core/                     # 핵심 모듈
│   │   ├── exceptions.py         # 커스텀 예외 클래스
│   │   └── retry.py              # 재시도 데코레이터
│   ├── controller/               # 디바이스 제어
│   │   ├── device_manager.py     # uiautomator2 기반 디바이스 관리
│   │   ├── adb_controller.py     # ADB 명령 실행
│   │   ├── xinhui_controller.py  # xinhui(touping) 연동
│   │   ├── hid_input.py          # HID 수준 입력
│   │   └── screen_capture.py     # 화면 캡처/스트리밍
│   ├── agent/                    # 에이전트 시스템 (NEW!)
│   │   ├── scheduler.py          # 디바이스 스케줄러 (풀 관리)
│   │   ├── activity_types.py     # 6대 활동 타입 정의
│   │   ├── routine_activities.py # 상시 활동 핸들러
│   │   ├── activity_manager.py   # 활동 관리자
│   │   ├── logging_system.py     # 활동 로깅/하트비트
│   │   ├── persona_system.py     # 페르소나 코멘터 (10개)
│   │   ├── rest_timing.py        # 자연스러운 휴식 타이밍
│   │   ├── dashboard_api.py      # 실시간 대시보드 WebSocket
│   │   ├── youtube_watch_flow.py # YouTube 시청 플로우
│   │   └── request_handler.py    # 요청 배치 처리
│   ├── automation/               # 자동화 에이전트
│   │   ├── base_agent.py         # 기본 에이전트 클래스
│   │   └── youtube_agent.py      # YouTube 자동화 에이전트
│   ├── modules/                  # 모듈형 태스크 시스템
│   │   ├── task_registry.py      # 태스크 레지스트리
│   │   ├── execution_engine.py   # 실행 엔진
│   │   └── tasks/                # 내장 태스크
│   ├── data/                     # 데이터 연동
│   │   ├── base_loader.py        # 데이터 로더 베이스
│   │   ├── sheet_loader.py       # Google Sheets 로더
│   │   ├── supabase_client.py    # Supabase 클라이언트
│   │   └── supabase_executor.py  # Supabase 태스크 실행기
│   ├── web/                      # 웹 인트라넷
│   │   ├── server.py             # FastAPI 서버 (대시보드 포함)
│   │   ├── templates/            # HTML 템플릿
│   │   │   ├── index.html        # YouTube 태스크 관리
│   │   │   └── dashboard.html    # 실시간 대시보드
│   │   └── static/               # CSS/JS
│   │       ├── css/
│   │       │   ├── style.css
│   │       │   └── dashboard.css
│   │       └── js/
│   │           ├── app.js
│   │           └── dashboard.js
│   ├── models/                   # 데이터 모델
│   │   └── youtube_task.py       # YouTube 태스크 모델
│   ├── services/                 # 서비스
│   │   ├── task_storage.py       # 태스크 저장소
│   │   └── comment_generator.py  # AI 댓글 생성
│   └── utils/                    # 유틸리티
│       └── ip_generator.py       # IP 주소 생성
├── scripts/                      # 실행 스크립트
├── config/                       # 설정 파일
├── supabase/                     # Supabase 마이그레이션
├── examples/                     # 예제 코드
├── run_intranet.py               # 인트라넷 서버 실행
├── main.py                       # 메인 실행 파일
├── requirements.txt              # Python 패키지 의존성
└── README.md                     # 프로젝트 문서
```

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# Python 가상환경 생성 (권장)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt
```

### 2. 설정 파일 구성

```bash
# 환경 변수 설정 (선택사항 - Supabase/Sheets 사용 시)
cp config/env.example.txt .env
# .env 파일 편집하여 값 입력
```

### 3. 실행

```bash
# 기본 예제 실행
python examples/basic_usage.py

# YouTube 자동화 실행
python examples/youtube_automation.py

# API 서버 시작
python -m src.api.server
```

---

## 📖 주요 기능

### 1. 모듈형 태스크 시스템

태스크를 모듈화하여 재사용하고 확장할 수 있습니다.

```python
from src.modules import TaskRegistry, TaskConfig, BaseTask

# 커스텀 태스크 정의
@TaskRegistry.register("my_task", description="내 커스텀 태스크")
class MyTask(BaseTask):
    async def execute(self, device) -> dict:
        # 자동화 로직
        return {"success": True}

# 태스크 실행
task = TaskRegistry.create("my_task", TaskConfig(name="test"))
engine = ExecutionEngine(device_manager)
results = await engine.run_task(task)
```

### 2. 내장 태스크

| 태스크 | 설명 |
|--------|------|
| `youtube_watch` | YouTube 영상 검색 및 시청 |
| `youtube_search` | YouTube 검색만 수행 |
| `xinhui_youtube_search` | xinhui HID를 사용한 YouTube 검색 (봇 감지 우회) |
| `xinhui_youtube_engagement` | xinhui HID를 사용한 좋아요/댓글/구독 |
| `xinhui_youtube_full` | YouTube 전체 자동화 (검색 + 시청 + 인게이지먼트) |
| `xinhui_screenshot` | xinhui를 사용한 빠른 화면 캡처 |
| `app_start` | 앱 시작 |
| `app_stop` | 앱 종료 |
| `app_clear` | 앱 데이터 초기화 |
| `screen_on` | 화면 켜기 |
| `screen_off` | 화면 끄기 |
| `screenshot` | 스크린샷 저장 |
| `screen_tap` | 화면 탭 |
| `screen_swipe` | 화면 스와이프 |

### 3. 데이터 연동

#### Google Sheets

```python
from src.data.sheet_loader import YouTubeSheetLoader

loader = YouTubeSheetLoader(
    credentials_path="config/google_credentials.json",
    sheet_url="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID"
)

# 키워드 및 댓글 로드
config = loader.load_youtube_config()
```

#### Supabase

```python
from src.data.supabase_executor import SupabaseExecutor

executor = SupabaseExecutor(
    supabase_url=os.getenv("SUPABASE_URL"),
    supabase_key=os.getenv("SUPABASE_KEY"),
    device_manager=manager
)

# 대기 중인 태스크 처리
await executor.process_pending_tasks()

# 데몬 모드 (주기적 실행)
await executor.run_daemon(interval=30)
```

### 4. xinhui (HID 입력 및 화면 캡처)

xinhui(touping.exe)와 연동하여 ADB의 한계를 극복합니다.

| 기능 | ADB 한계 | xinhui 해결 |
|------|----------|-------------|
| **HID 입력** | 소프트웨어 레벨, 봇 감지됨 | 하드웨어 레벨, 봇 감지 우회 |
| **한글 입력** | `input text` 한글 깨짐 | XWKeyboard로 완벽 지원 |
| **화면 캡처** | `screencap` 느림 | 실시간 스트리밍 가능 |
| **멀티터치** | 단일 터치만 지원 | 핀치줌 등 지원 |

```python
from src.controller import get_hybrid_controller, get_hid_input

# 하이브리드 컨트롤러 (ADB/xinhui 자동 선택)
hybrid = get_hybrid_controller(prefer_xinhui=True)

# HID 탭 (봇 감지 우회)
hybrid.tap(device_id, x, y, use_hid=True)

# 한글 입력
hybrid.text(device_id, "안녕하세요! 좋은 영상 감사합니다.", use_hid=True)

# HID 입력 (자연스러운 제스처)
hid = get_hid_input()
hid.tap(device_id, x, y, natural=True)       # 랜덤 지터 적용
hid.scroll_up(device_id)                      # 위로 스크롤
hid.type_text(device_id, "댓글입니다", human_like=True)  # 인간처럼 입력
```

### 5. API 서버

```bash
# 서버 시작
python -m src.api.server
```

#### 주요 엔드포인트

| 엔드포인트 | 메소드 | 설명 |
|------------|--------|------|
| `/` | GET | API 정보 |
| `/health` | GET | 헬스 체크 |
| `/devices` | GET | 연결된 디바이스 목록 |
| `/devices/connect` | POST | 디바이스 연결 |
| `/tasks` | GET | 등록된 태스크 목록 |
| `/tasks/execute` | POST | 태스크 실행 |
| `/tasks/youtube` | POST | YouTube 자동화 실행 |

#### API 사용 예시

```bash
# 디바이스 연결
curl -X POST http://localhost:8000/devices/connect \
  -H "Content-Type: application/json" \
  -d '{"max_workers": 50}'

# 태스크 실행
curl -X POST http://localhost:8000/tasks/execute \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "youtube_watch",
    "parameters": {
      "keywords": ["AI 뉴스"],
      "watch_time_range": [30, 60]
    },
    "batch_size": 50
  }'

# YouTube 자동화
curl -X POST http://localhost:8000/tasks/youtube \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["AI 뉴스", "기술 트렌드"],
    "watch_time_range": [30, 120],
    "like_probability": 0.5
  }'
```

---

## 🔧 상세 사용법

### 디바이스 연결

```python
from src.controller.device_manager import DeviceManager

manager = DeviceManager()

# 단일 디바이스 연결
manager.connect_device("10.0.10.1")

# 전체 디바이스 연결 (600대)
manager.connect_all(max_workers=50)

# 연결된 디바이스 확인
print(manager.get_connected_ips())
```

### 태스크 실행

```python
from src.modules.execution_engine import ExecutionEngine
from src.modules.tasks.youtube_task import YouTubeWatchTask, YouTubeTaskConfig

# 설정
config = YouTubeTaskConfig(
    name="youtube_test",
    keywords=["AI 뉴스", "기술 트렌드"],
    watch_time_range=(30, 120),
    like_probability=0.5,
    comment_probability=0.2,
    comments=["좋은 영상 감사합니다!"]
)

# 실행
task = YouTubeWatchTask(config)
engine = ExecutionEngine(manager)

results = await engine.run_task(task, batch_size=50)

# 결과 확인
print(engine.get_summary())
print(f"실패한 디바이스: {engine.get_failed_devices()}")
```

### 커스텀 태스크 만들기

```python
from src.modules import TaskRegistry, BaseTask, TaskConfig

@TaskRegistry.register("my_custom_task", description="커스텀 태스크")
class MyCustomTask(BaseTask):
    async def execute(self, device) -> dict:
        # 자동화 로직 구현
        device.screen_on()
        device.app_start("com.example.app")
        # ...
        return {"status": "completed"}
    
    async def on_success(self, device, result):
        print(f"성공: {result}")
    
    async def on_failure(self, device, error):
        print(f"실패: {error}")
```

---

## 📊 Supabase 설정

### 1. 테이블 생성

`supabase/migrations/001_tasks.sql` 파일을 Supabase SQL Editor에서 실행:

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    parameters JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    ...
);

CREATE TABLE task_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id),
    device_ip VARCHAR(15) NOT NULL,
    success BOOLEAN NOT NULL,
    ...
);
```

### 2. 환경 변수 설정

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=YOUR_ANON_KEY
```

### 3. 데몬 모드 실행

```bash
python examples/supabase_integration.py daemon
```

---

## 📋 Google Sheets 설정

### 1. 서비스 계정 생성

1. Google Cloud Console에서 프로젝트 생성
2. Google Sheets API 활성화
3. 서비스 계정 생성 및 JSON 키 다운로드
4. `config/google_credentials.json`으로 저장

### 2. 시트 공유

시트를 서비스 계정 이메일과 공유

### 3. 시트 구조

**keywords 워크시트:**
| keyword |
|---------|
| AI 뉴스 |
| 기술 트렌드 |

**comments 워크시트:**
| comment |
|---------|
| 좋은 영상 감사합니다! |
| 유익하네요 |

---

## 🎮 xinhui 설정

xinhui(touping.exe)는 HID 수준 입력과 화면 스트리밍을 지원하는 프로그램입니다.

### 설치 경로

기본 설치 경로: `C:\Program Files (x86)\xinhui`

### 포트 정보

| 포트 | 용도 |
|------|------|
| 10039 | 디바이스 제어 API |
| 22222 | 화면 스트리밍 |
| 32991 | 보조 통신 |

### 설정

`config/config.yaml`:

```yaml
xinhui:
  install_path: "C:\\Program Files (x86)\\xinhui"
  control_port: 10039
  stream_port: 22222
  prefer_hid: true  # HID 입력 우선 사용
  
  gesture:
    tap_duration_min: 50    # 최소 탭 지속시간 (ms)
    tap_duration_max: 150   # 최대 탭 지속시간 (ms)
    position_jitter: 5      # 위치 랜덤 오프셋 (픽셀)
  
  capture:
    format: "jpeg"
    quality: 80
    stream_fps: 15
```

### 사용 예제

```python
from src.controller.xinhui_controller import get_hybrid_controller
from src.controller.hid_input import get_hid_input
from src.controller.screen_capture import get_screen_capture

# 1. xinhui 상태 확인
from src.controller.xinhui_controller import XinhuiController
xinhui = XinhuiController()
if xinhui.is_xinhui_running():
    print("xinhui 실행 중")

# 2. HID 입력 (자연스러운 터치)
hid = get_hid_input()
hid.tap(device_id, 540, 960, natural=True)
hid.type_text(device_id, "안녕하세요!", human_like=True)
hid.scroll_up(device_id)
hid.pinch_out(device_id, 540, 960)  # 줌 인

# 3. 화면 캡처
capture = get_screen_capture()
image_data = capture.capture(device_id, "screenshot.png")

# 4. 화면 스트리밍
from src.controller.screen_capture import get_stream_manager
stream_mgr = get_stream_manager()
stream = stream_mgr.start_stream(device_id)
frame = stream.get_frame(timeout=1.0)
print(f"FPS: {stream.get_fps()}")
```

---

## ⚠️ 주의사항

1. **동시 연결 수**: `max_workers`를 적절히 조절하세요 (권장: 50)
2. **배치 크기**: 너무 큰 배치는 네트워크 부하를 줄 수 있습니다
3. **재시도**: 실패 시 자동 재시도가 설정되어 있습니다
4. **로깅**: 모든 작업은 로깅됩니다
5. **xinhui**: HID 입력을 위해 touping.exe가 먼저 실행되어야 합니다

---

## 🛠️ 개발

### 프로젝트 구조 이해

- **core/**: 공통 예외 및 유틸리티
- **controller/**: 디바이스 제어 로직
- **automation/**: 앱별 자동화 에이전트
- **modules/**: 모듈형 태스크 시스템
- **data/**: 외부 데이터 연동
- **api/**: REST API

### 테스트 실행

```bash
# 단위 테스트
python -m pytest tests/

# 통합 테스트 (디바이스 필요)
python examples/basic_usage.py
```

---

---

## 🎯 에이전트 활동 시스템 (NEW!)

### 6대 상시 활동

| 활동 | 코드 | 목적 | 디바이스 |
|------|------|------|----------|
| **Shorts 리믹스** | `shorts_remix` | 바이럴 콘텐츠 아이디어 수집 | 100-150대 |
| **플레이리스트 큐레이터** | `playlist_curator` | 시청시간 극대화 플레이리스트 구축 | 80-120대 |
| **페르소나 코멘터** | `persona_commenter` | 커뮤니티 구축, 자연스러운 참여 | 100-150대 |
| **트렌드 스카우트** | `trend_scout` | Rising Star 발굴, 트렌드 선점 | 80-100대 |
| **챌린지 헌터** | `challenge_hunter` | 새로운 챌린지/밈 조기 탐지 | 60-80대 |
| **썸네일 랩** | `thumbnail_lab` | 고성과 썸네일 데이터 수집 | 50-80대 |

### 스케줄링 전략

```
┌─────────────────────────────────────┐
│        Device Pool (600대)          │
├─────────────────────────────────────┤
│ Active Pool (500대, 83%)            │ ← 실제 활동 수행
│ Reserve Pool (60대, 10%)            │ ← 장애 대체용
│ Maintenance Pool (40대, 7%)         │ ← 앱 업데이트/재시작
└─────────────────────────────────────┘
```

### 시간대별 활동 강도

| 시간대 | 강도 | 설명 |
|--------|------|------|
| 00:00-06:00 | 30% | 야간 |
| 06:00-09:00 | 60% | 아침 |
| 09:00-12:00 | 100% | 오전 (피크) |
| 12:00-14:00 | 80% | 점심 |
| 14:00-18:00 | 100% | 오후 (피크) |
| 18:00-21:00 | 90% | 저녁 |
| 21:00-24:00 | 50% | 밤 |

### 페르소나 시스템

10개의 다양한 페르소나로 자연스러운 댓글 생성:

- 전문가 (투자전문가K)
- 초보자 (투자초보)
- 열정팬 (열정투자러)
- 분석가 (데이터분석가)
- 회의론자 (비판적시청자)
- 유머러스 (개그투자자)
- 공감형 (공감러)
- 조언자 (경험자)
- 관찰자 (관찰자)
- 트렌드세터 (트렌드헌터)

### 실시간 대시보드

```bash
# 인트라넷 서버 실행
python run_intranet.py
```

대시보드 URL: `http://localhost:8080/dashboard`

**주요 기능:**
- 600대 디바이스 그리드 뷰 (30×20)
- 6대 활동 분배 파이차트
- 폰보드 건강 맵 (30개)
- 에이전트 리더보드
- 발견물 피드 (실시간)
- 활동 타임라인 (24시간)

---

## 📄 라이선스

이 프로젝트는 개인 사용 목적으로 제작되었습니다.

## 🤝 기여

이슈나 개선 사항이 있으면 알려주세요!
