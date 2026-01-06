# DoAi.Me Local YouTube Watcher

로컬 단일 파일 테스트용 AutoX.js 스크립트

## 파일 구조

```
local-test/
├── videos.txt          # 영상 목록 (CSV 형식)
├── youtube_watcher.js  # 메인 스크립트
└── README.md           # 이 문서
```

## 사용 방법

### 1. 폰에 파일 복사

```bash
# ADB로 파일 전송
adb push videos.txt /sdcard/DoAiMe/videos.txt
adb push youtube_watcher.js /sdcard/DoAiMe/youtube_watcher.js
```

### 2. AutoX.js 앱에서 스크립트 실행

1. AutoX.js 앱 열기
2. `/sdcard/DoAiMe/youtube_watcher.js` 열기
3. 실행 버튼 클릭

## 영상 목록 형식 (videos.txt)

CSV 형식으로 첫 줄은 헤더:

```csv
제목,URL
Never Gonna Give You Up,https://www.youtube.com/watch?v=dQw4w9WgXcQ
PSY - GANGNAM STYLE,https://www.youtube.com/watch?v=9bZkp7q19f0
```

## 기능 상세

### 시청 비율
- **30% ~ 79%** 랜덤 시청
- 영상 길이 모를 경우 3분으로 추정

### 인간 동작 시뮬레이션 (9가지)

| 동작 | 확률 | 설명 |
|------|------|------|
| 집중 시청 | 25% | 아무 동작 없이 시청 |
| 랜덤 탭 | 15% | 화면 임의 위치 탭 |
| 스크롤 | 15% | 댓글 보기 시뮬레이션 |
| 재생/일시정지 | 10% | 영상 토글 |
| 볼륨 조절 | 8% | 좌측 스와이프 |
| 밝기 조절 | 8% | 우측 스와이프 |
| 시크바 드래그 | 8% | 영상 탐색 |
| 더블탭 스킵 | 6% | 10초 앞/뒤 |
| 전체화면 | 5% | 전체화면 토글 |

### 동작 간격
- **5초 ~ 15초** 랜덤 간격으로 동작 수행
- **70%** 확률로 인간 동작 발생

## 설정 변경

스크립트 상단 `CONFIG` 객체 수정:

```javascript
const CONFIG = {
    MIN_WATCH_PERCENT: 30,      // 최소 시청 비율
    MAX_WATCH_PERCENT: 79,      // 최대 시청 비율
    HUMAN_ACTION_PROBABILITY: 0.7,  // 인간 동작 확률
    MIN_ACTION_INTERVAL: 5000,  // 최소 동작 간격 (ms)
    MAX_ACTION_INTERVAL: 15000, // 최대 동작 간격 (ms)
    DEBUG: true                 // 디버그 로그
};
```

## 실행 흐름

```
STEP 1: CSV 파일에서 영상 목록 로드
        ↓
STEP 2: YouTube 앱 실행
        ↓
STEP 3: 영상 URL로 열기
        ↓
STEP 4: 인간 동작 시뮬레이션 (랜덤)
        ↓
STEP 5: 30~79% 시청
        ↓
STEP 6: 영상 종료, 다음 영상으로
        ↓
     (반복)
```

## 필요 권한

- **접근성 서비스**: AutoX.js 접근성 활성화 필요
- **화면 캡처**: 스크린샷 권한 (선택적)

## 주의사항

1. YouTube 앱이 설치되어 있어야 함
2. 네트워크 연결 필요
3. 화면 꺼짐 방지 설정 권장
