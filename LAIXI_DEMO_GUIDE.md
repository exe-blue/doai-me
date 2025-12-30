# DoAi.Me Laixi Integration Demo Guide

## 🎯 목표

Orion의 지시: **"Laixi 앱이 켜진 상태에서, 우리 코드가 보낸 명령에 따라 폰이 스스로 유튜브를 보는 것을 1시간 내에 시연해라."**

## 📋 사전 준비

### 1. Laixi 앱 설치 및 실행

```
touping.exe 실행 (Laixi 앱)
```

- Laixi 앱이 실행되면 WebSocket 서버가 `ws://127.0.0.1:22221/`에서 대기합니다.

### 2. Android 기기 연결

- USB로 Android 기기 연결
- `adb devices`로 연결 확인
- Laixi 앱에서 기기 목록 확인

### 3. Python 의존성 설치

```bash
pip install websockets
```

## 🚀 실행 방법

### 기본 영상 시청

```bash
python demo_youtube_watch.py
```

기본값으로 Rick Astley의 "Never Gonna Give You Up" 영상을 시청합니다.

### 특정 영상 시청

```bash
python demo_youtube_watch.py --video "https://youtu.be/VIDEO_ID" --duration 300
```

### Shorts 시청 (10개)

```bash
python demo_youtube_watch.py --shorts 10
```

### 홈 피드 탐색

```bash
python demo_youtube_watch.py --browse
```

### 모든 기기에서 실행

```bash
python demo_youtube_watch.py --all
```

### 디버그 모드

```bash
python demo_youtube_watch.py --debug
```

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    DoAi.Me System                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────────┐                   │
│  │   Demo      │────▶│ YouTubeWatcher  │                   │
│  │  Script     │     │                 │                   │
│  └─────────────┘     └────────┬────────┘                   │
│                               │                             │
│         ┌─────────────────────┴─────────────────────┐      │
│         │                                           │      │
│         ▼                                           ▼      │
│  ┌─────────────────┐                    ┌─────────────────┐│
│  │ BehaviorEngine  │                    │   LaixiDriver   ││
│  │                 │                    │                 ││
│  │ - Beta 분포     │                    │ - WebSocket     ││
│  │ - Gaussian Tap  │                    │ - JSON Protocol ││
│  │ - Smoothstep    │                    │ - ADB Commands  ││
│  └─────────────────┘                    └────────┬────────┘│
│                                                  │         │
│                     ╔════════════════════════════╧════╗    │
│                     ║    Strangler Pattern            ║    │
│                     ║    (Future: ScrcpyDriver)       ║    │
│                     ╚═════════════════════════════════╝    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ WebSocket (ws://127.0.0.1:22221/)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Laixi App                               │
│                   (touping.exe)                             │
├─────────────────────────────────────────────────────────────┤
│  - Device Discovery                                         │
│  - Touch/Swipe (백분율 좌표)                                │
│  - ADB Command Proxy                                        │
│  - Clipboard (한글 지원)                                    │
│  - Screenshot                                               │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ USB / WiFi ADB
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Android Devices                            │
│                     (S9 Farm)                               │
├─────────────────────────────────────────────────────────────┤
│  📱 Device 1                                                │
│  📱 Device 2                                                │
│  📱 ...                                                     │
│  📱 Device 600 (목표)                                       │
└─────────────────────────────────────────────────────────────┘
```

## 📁 파일 구조

```
gateway/src/adapters/
├── __init__.py           # 모듈 초기화
├── device_driver.py      # 추상화 인터페이스 (ABC)
├── laixi_driver.py       # Laixi WebSocket 드라이버
├── behavior_engine.py    # 인간 행동 시뮬레이션
└── youtube_watcher.py    # YouTube 자동 시청 엔진
```

## 🔧 Strangler Pattern

현재 **Laixi**를 임시 드라이버로 사용하고 있습니다. 향후 **Scrcpy**로 전환할 때:

1. `ScrcpyDriver` 클래스 구현 (`DeviceDriver` 상속)
2. `device_driver.py`의 `get_driver()` 함수에서 드라이버 타입 변경
3. 나머지 코드는 변경 없음!

```python
# device_driver.py
def get_driver(driver_type: DriverType = DriverType.SCRCPY) -> DeviceDriver:
    if driver_type == DriverType.SCRCPY:
        from .scrcpy_driver import ScrcpyDriver
        return ScrcpyDriver()
    ...
```

## 🧪 테스트 체크리스트

- [ ] Laixi 앱 실행 확인
- [ ] 기기 연결 확인 (adb devices)
- [ ] `python demo_youtube_watch.py` 실행
- [ ] YouTube 앱 자동 실행 확인
- [ ] 영상 재생 확인
- [ ] 자연스러운 터치/스와이프 확인
- [ ] 좋아요 버튼 탭 확인
- [ ] 시청 완료 후 종료 확인

## ⚠️ 트러블슈팅

### 연결 실패

```
❌ Laixi 연결 실패!
```

- `touping.exe`가 실행 중인지 확인
- 방화벽에서 22221 포트 허용
- WebSocket URL 확인: `ws://127.0.0.1:22221/`

### 디바이스 없음

```
❌ 연결된 디바이스가 없습니다!
```

- USB 케이블 연결 확인
- `adb devices` 실행
- Laixi 앱에서 기기 목록 확인

### 영상이 재생되지 않음

- YouTube 앱이 설치되어 있는지 확인
- 화면 잠금 해제 상태인지 확인
- 네트워크 연결 확인

---

**"지금 당장 그들의 몸(Laixi)을 빌려, 우리의 영혼(Behavior)을 주입해라."**

*— Orion의 지시*

