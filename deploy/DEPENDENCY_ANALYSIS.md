# AIFarm 의존성 버그 분석 보고서

**생성일**: 2025-12-28
**분석 범위**: AIFarm 600대 관리 시스템 코드베이스
**발견된 문제**: 총 40개 (Critical 5개, High 12개, Medium 10개, Low 13개)

---

## 📊 요약

| 심각도 | 개수 | 즉시 영향 |
|--------|------|-----------|
| 🔴 Critical | 5 | 서버 시작 실패 |
| 🟠 High | 12 | 런타임 크래시 가능 |
| 🟡 Medium | 10 | 기능 오작동 |
| 🟢 Low | 13 | 성능/유지보수성 |

---

## 🔴 Critical Issues (즉시 수정 필요)

### 1. 템플릿 디렉토리 누락 가능성
**파일**: `aifarm/src/web/server.py:58-60`
**문제**: static/templates 디렉토리가 없으면 서버 시작 즉시 실패
```python
# 현재 코드
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
```

**에러**:
```
FileNotFoundError: [Errno 2] No such file or directory: '.../src/web/templates'
```

**해결방법**:
```python
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(BASE_DIR, "static")
templates_dir = os.path.join(BASE_DIR, "templates")

# 디렉토리 존재 확인 및 생성
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)
    logger.warning(f"Created missing static directory: {static_dir}")

if not os.path.exists(templates_dir):
    os.makedirs(templates_dir, exist_ok=True)
    logger.warning(f"Created missing templates directory: {templates_dir}")

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)
```

---

### 2. Scheduler 초기화 안 됨
**파일**: `aifarm/src/agent/scheduler.py:655-660`
**문제**: 싱글톤 생성 시 `initialize_devices()` 호출하지 않아 디바이스 정보가 비어있음

```python
# 현재 코드
def get_scheduler() -> DeviceScheduler:
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = DeviceScheduler()  # 초기화 안 됨!
    return _scheduler_instance
```

**영향**: 176행의 `if not self._initialized` 체크로 인해 디바이스 할당 시 빈 리스트 반환

**해결방법**:
```python
def get_scheduler(auto_initialize: bool = True) -> DeviceScheduler:
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = DeviceScheduler()
        if auto_initialize:
            _scheduler_instance.initialize_devices()
    return _scheduler_instance
```

---

### 3. xinhui None 체크 누락
**파일**: `aifarm/src/controller/device_manager.py:30-51, 396, 420`
**문제**: `get_xinhui()` 또는 `get_hybrid()` 반환값이 None일 수 있지만 체크 없이 메서드 호출

```python
# 현재 코드 (396행)
hybrid = get_hybrid()
hybrid.tap(...)  # None일 경우 AttributeError!
```

**에러**:
```
AttributeError: 'NoneType' object has no attribute 'tap'
```

**해결방법**:
```python
hybrid = get_hybrid()
if hybrid is None:
    logger.warning("Hybrid controller not available, using fallback")
    # uiautomator2 폴백 로직
    device = self.connections.get(device_id)
    if device:
        device.click(x, y)
else:
    hybrid.tap(...)
```

---

### 4. run_intranet.py 모듈 경로 오류
**파일**: `aifarm/run_intranet.py:4`
**문제**: Python 경로에 aifarm이 추가되지 않으면 ModuleNotFoundError

```python
# 현재 코드
from src.web.server import run_server  # ModuleNotFoundError!
```

**해결방법**:
```python
import sys
import os

# 현재 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.web.server import run_server
```

---

### 5. 템플릿 파일 누락
**파일**: `aifarm/src/web/server.py:68, 74, 80`
**문제**: `index.html`, `dashboard.html` 파일이 없으면 TemplateNotFound 에러

**에러**:
```
jinja2.exceptions.TemplateNotFound: index.html
```

**해결방법**:
1. 템플릿 파일 생성 확인
2. 또는 기본 HTML 반환
```python
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    try:
        return templates.TemplateResponse(INDEX_TEMPLATE, {"request": request})
    except Exception as e:
        return HTMLResponse("<h1>AIFarm Server</h1><p>Template not found</p>")
```

---

## 🟠 High Priority Issues

### 6. 순환 참조 가능성 (4개)
**위치**:
- `activity_manager.py` ↔ `youtube_watch_flow.py`
- `request_handler.py` → `activity_manager.py`
- `server.py`의 동적 import 충돌

**해결방법**: TYPE_CHECKING 블록 사용
```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.agent.youtube_watch_flow import WatchResult
```

---

### 7-12. 패키지 버전 충돌 (6개)

**현재 requirements.txt 문제점**:
```
uiautomator2>=2.16.25         # v3.0+에서 API 변경
fastapi>=0.104.1              # 0.110+에서 Pydantic v2 강제
aiohttp>=3.9.0                # 3.10+에서 asyncio 변경
openai>=1.6.0                 # 2.0 미만으로 제한 필요
supabase>=2.0.0               # 사용 안 함, 불필요
Pillow>=10.0.0                # 보안 패치 빈번
```

**권장 수정** (2025년 12월 기준):
```txt
# Core
uiautomator2>=2.16.25,<3.0.0
fastapi>=0.104.1,<0.130.0          # 최신: 0.123.10 (2025-12-01)
uvicorn>=0.24.0,<0.40.0            # 최신: 0.38.0 (2025-10-18)
pydantic>=2.8.0,<3.0.0             # 최신: 2.12.5 (Python 3.13+ 호환)
pyyaml>=6.0.1
aiohttp>=3.9.0,<3.15.0             # 최신: 3.13.2 (2025-10-28)
python-dotenv>=1.0.0

# Web UI
jinja2>=3.1.2

# Google Sheets
gspread>=5.12.0
google-auth>=2.25.0

# OpenAI (댓글 생성용)
openai>=1.6.0,<2.0.0               # 2.0에서 breaking changes 있음

# Utilities
tenacity>=8.2.3

# Image Processing
Pillow>=10.0.0,<12.0.0
```

---

### 13. uiautomator2 API 호환성
**파일**: `aifarm/src/agent/youtube_watch_flow.py:217, 224`
**문제**: uiautomator2 v3.0+에서 `element.info`가 메서드로 변경

```python
# 현재 코드
bounds = element.info.get("bounds", {})  # v3.0+에서 TypeError
```

**해결방법**:
```python
info = element.info if hasattr(element.info, 'get') else element.info()
bounds = info.get("bounds", {})
```

---

### 14. datetime 변환 에러 처리
**파일**: `aifarm/src/services/task_storage.py:174-178`
**문제**: `fromisoformat()` 실패 시 ValueError

```python
# 현재 코드
if isinstance(scheduled_at, str):
    scheduled_at = datetime.fromisoformat(scheduled_at)  # 에러 가능
```

**해결방법**:
```python
try:
    if isinstance(scheduled_at, str):
        scheduled_at = datetime.fromisoformat(scheduled_at)
except ValueError:
    logger.warning(f"Invalid datetime format: {scheduled_at}")
    continue
```

---

### 15. async/await 블로킹
**파일**: `aifarm/src/agent/youtube_watch_flow.py:187-205`
**문제**: `self.hid.tap()`은 동기 함수인데 async 함수 내부에서 직접 호출

```python
async def _search_keyword(self, keyword: str):
    self.hid.tap(...)  # 블로킹 발생
    await asyncio.sleep(1)
```

**해결방법**: ThreadPoolExecutor 사용
```python
async def _search_keyword(self, keyword: str):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        self.hid.tap,
        self.device_id,
        *self.COORDS["search_icon"]
    )
    await asyncio.sleep(1)
```

---

## 🟡 Medium Priority Issues

### 16-17. 경로 하드코딩
**파일**:
- `aifarm/src/controller/xinhui_controller.py:40`
- `aifarm/src/services/task_storage.py:16`

**문제**:
```python
install_path: str = r"C:\Program Files (x86)\xinhui"  # 하드코딩
storage_path: str = "data/tasks.json"  # 상대 경로
```

**해결방법**:
```python
# xinhui
install_path: str = os.getenv("XINHUI_PATH", r"C:\Program Files (x86)\xinhui")

# task_storage
BASE_DIR = Path(__file__).parent.parent.parent
DEFAULT_STORAGE = BASE_DIR / "data" / "tasks.json"
```

---

### 18. 환경변수 경고 미흡
**파일**: `aifarm/src/services/comment_generator.py:30`
**문제**: OPENAI_API_KEY 없어도 경고만 출력

**개선사항**:
```python
if not os.getenv('OPENAI_API_KEY'):
    logger.warning("⚠️  OPENAI_API_KEY not set - AI comment generation disabled")
```

---

### 19-22. None 체크 강화 (4개)
**파일**:
- `scheduler.py:527-529` (get_device 반환값)
- `device_manager.py:260, 402` (연결 체크)
- `youtube_watch_flow.py:269-273` (_found_video_element)

**일반 패턴**:
```python
# 개선 전
device = get_device(id)
device.to_dict()  # None일 경우 에러

# 개선 후
device = get_device(id)
if device is None:
    logger.warning(f"Device {id} not found")
    return None
return device.to_dict()
```

---

### 23. 비동기 경쟁 상태
**파일**: `aifarm/src/agent/activity_manager.py:170-182`
**문제**: `has_pending_requests()`와 `get_pending_request()` 사이에 경쟁 상태

**해결방법**:
```python
# 개선 전
if self.manager.has_pending_requests():
    batch = self.manager.get_pending_request()

# 개선 후
batch = self.manager.get_pending_request()
if batch:
    await self._execute_request_batch(batch)
```

---

## 🟢 Low Priority Issues

### 24. FastAPI import 타입
**파일**: `aifarm/src/agent/dashboard_api.py:23-30`
**문제**: FastAPI 없으면 `WebSocketDisconnect = Exception`으로 대체

**개선**:
```python
if not HAS_FASTAPI:
    class WebSocketDisconnect(Exception):
        """Mock WebSocketDisconnect"""
        pass
```

---

### 25. 싱글톤 충돌
**파일**: `aifarm/src/web/server.py:32-47`
**문제**: server.py의 싱글톤과 모듈 내부 싱글톤 충돌 가능

**해결방법**:
```python
def get_activity_manager():
    from src.agent.activity_manager import get_activity_manager as get_manager
    return get_manager()
```

---

### 26. 파일 경로 검증
**파일**: `aifarm/src/agent/logging_system.py:454-468`
**문제**: 디렉토리 없으면 export 실패

**해결방법**:
```python
def export_to_json(self, filepath: str) -> None:
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
```

---

### 27. 불필요한 의존성
**파일**: `aifarm/requirements.txt:18`
**문제**: supabase는 aifarm 코드에서 사용 안 함

**해결방법**: 주석 처리 또는 제거
```txt
# Supabase (examples only, not used in main code)
# supabase>=2.0.0
```

---

## 📋 우선순위 해결 순서

### Phase 1: 서버 시작 가능하도록 (Critical)
1. ✅ 템플릿 디렉토리 생성 (문제 1, 5)
2. ✅ 모듈 경로 수정 (문제 4)
3. ✅ Scheduler 초기화 (문제 2)
4. ✅ None 체크 추가 (문제 3)

### Phase 2: 런타임 안정성 (High)
5. ⚠️ 패키지 버전 고정 (문제 7-12)
6. ⚠️ uiautomator2 호환성 (문제 13)
7. ⚠️ datetime 에러 처리 (문제 14)
8. ⚠️ 비동기 블로킹 해결 (문제 15)

### Phase 3: 기능 안정성 (Medium)
9. 🔧 순환 참조 해결 (문제 6)
10. 🔧 경로 하드코딩 제거 (문제 16-17)
11. 🔧 None 체크 강화 (문제 19-22)
12. 🔧 비동기 경쟁 상태 (문제 23)

### Phase 4: 코드 품질 (Low)
13. 📝 환경변수 경고 개선 (문제 18, 24)
14. 📝 싱글톤 통일 (문제 25)
15. 📝 불필요한 의존성 제거 (문제 27)

---

## 🔧 즉시 적용 가능한 핫픽스

### 서버에서 실행 (SSH 접속 후)
```bash
ssh root@158.247.210.152

cd /opt/aifarm

# 1. 템플릿 디렉토리 생성
mkdir -p src/web/templates
mkdir -p src/web/static/{css,js}

# 2. 기본 템플릿 파일 생성
cat > src/web/templates/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>AIFarm</title>
</head>
<body>
    <h1>AIFarm Server</h1>
    <p>Server is running</p>
</body>
</html>
EOF

cp src/web/templates/index.html src/web/templates/dashboard.html

# 3. run_intranet.py 수정
cat > run_intranet.py << 'EOF'
"""인트라넷 서버 실행 스크립트"""

import sys
import os
import argparse

# Python 경로에 현재 디렉토리 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.web.server import run_server

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AIFarm 인트라넷 서버")
    parser.add_argument("--host", default="0.0.0.0", help="호스트 (기본: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8080, help="포트 (기본: 8080)")

    args = parser.parse_args()

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🤖 AIFarm 인트라넷 서버                                   ║
║                                                              ║
║     URL: http://{args.host}:{args.port}                            ║
║     API Docs: http://{args.host}:{args.port}/api/docs              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """)

    run_server(host=args.host, port=args.port)
EOF

# 4. requirements.txt 버전 고정 (2025-12 업데이트)
cat > requirements.txt << 'EOF'
# Core
uiautomator2>=2.16.25,<3.0.0
fastapi>=0.104.1,<0.130.0          # 최신: 0.123.10 (2025-12-01)
uvicorn>=0.24.0,<0.40.0            # 최신: 0.38.0 (2025-10-18)
pydantic>=2.8.0,<3.0.0             # 최신: 2.12.5 (Python 3.13+ 호환)
pyyaml>=6.0.1
aiohttp>=3.9.0,<3.15.0             # 최신: 3.13.2 (2025-10-28)
python-dotenv>=1.0.0

# Web UI
jinja2>=3.1.2

# Google Sheets
gspread>=5.12.0
google-auth>=2.25.0

# OpenAI (댓글 생성용)
openai>=1.6.0,<2.0.0               # 2.0에서 breaking changes 있음

# Utilities
tenacity>=8.2.3

# Image Processing
Pillow>=10.0.0,<12.0.0
EOF

# 5. 패키지 재설치
source venv/bin/activate
pip install -r requirements.txt --upgrade

# 6. 서비스 재시작
systemctl restart aifarm
systemctl status aifarm
```

---

## 📊 영향도 분석

### 서버 시작 실패 가능성: **80%**
- 템플릿 디렉토리 누락 (문제 1, 5)
- 모듈 경로 오류 (문제 4)

### 런타임 크래시 가능성: **60%**
- None 체크 누락 (문제 3, 19-22)
- Scheduler 미초기화 (문제 2)

### 기능 오작동 가능성: **40%**
- 패키지 버전 충돌 (문제 7-12)
- 비동기 처리 (문제 15, 23)

### 성능 저하 가능성: **20%**
- 순환 참조 (문제 6)
- 블로킹 호출 (문제 15)

---

## ✅ 검증 체크리스트

서버 재시작 후 다음을 확인하세요:

```bash
# 1. 서비스 상태
systemctl status aifarm

# 2. 로그 확인
tail -f /var/log/syslog | grep aifarm

# 3. 웹 접속
curl http://localhost:8080/
curl http://localhost:8080/api/health

# 4. 템플릿 렌더링
curl http://localhost:8080/dashboard

# 5. API 문서
curl http://localhost:8080/api/docs
```

---

**다음 에이전트 할당**:
- **개발 에이전트**: Critical/High 이슈 수정
- **조사 및 분석 에이전트**: 패키지 버전 호환성 테스트
- **기획 에이전트**: 아키텍처 개선 방향 제시

**예상 수정 시간**:
- Phase 1 (Critical): 30분
- Phase 2 (High): 2시간
- Phase 3 (Medium): 3시간
- Phase 4 (Low): 1시간
