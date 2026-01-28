# DoAi Gateway Installer Builder

Windows 설치 프로그램 생성 도구입니다.

## 요구사항

- **Node.js** 18.0.0 이상
- **Inno Setup 6** (설치 프로그램 컴파일용)
  - 다운로드: https://jrsoftware.org/isdl.php

## 빌드 방법

### 1. 의존성 설치

```bash
cd packages/gateway-runner/installer
npm install
```

### 2. 빌드 실행

```bash
npm run build
```

이 명령은 다음을 수행합니다:
1. Node.js Windows 바이너리 다운로드 (약 30MB)
2. Gateway 코드 복사 및 통합
3. npm 의존성 설치
4. 시작 스크립트 생성
5. Inno Setup 컴파일 (설치되어 있으면)

### 3. 출력 파일

- **빌드 디렉토리**: `dist/build/` - 설치될 파일들
- **설치 프로그램**: `dist/output/DoAiGateway-Setup-1.0.0.exe`

## 수동 컴파일

Inno Setup이 설치되어 있다면 수동으로 컴파일할 수 있습니다:

```bash
# 빌드 후
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" setup.iss
```

## 디렉토리 구조

```
installer/
├── build.js          # 빌드 스크립트
├── setup.iss         # Inno Setup 스크립트
├── package.json      # 빌드 도구 의존성
├── README.md         # 이 파일
├── assets/           # 아이콘 등 에셋 (선택)
│   └── icon.ico      # 설치 프로그램 아이콘
└── dist/             # 빌드 출력 (생성됨)
    ├── build/        # 설치될 파일들
    └── output/       # 최종 설치 프로그램
```

## 설치 프로그램 구조

설치 후 디렉토리 구조:

```
C:\Program Files\DoAi Gateway\
├── DoAiGateway.bat       # 실행 스크립트
├── DoAiGateway.ps1       # PowerShell 스크립트
├── node/                 # Node.js 런타임
│   ├── node.exe
│   └── npm.cmd
├── app/                  # 애플리케이션 코드
│   ├── gateway/          # 메인 Gateway 서버
│   └── runner/           # Runner 진입점
├── configs/              # 설정 파일
│   ├── default.env
│   ├── user.env          # 설치 시 생성
│   └── ...
└── logs/                 # 로그 파일
```

## 커스터마이징

### 아이콘 추가

1. `assets/icon.ico` 파일 추가 (256x256 권장)
2. `setup.iss`에서 아이콘 라인 주석 해제:
   ```iss
   SetupIconFile=assets\icon.ico
   UninstallDisplayIcon={app}\assets\icon.ico
   ```

### 버전 변경

`setup.iss`와 `build.js`에서 버전 수정:
```iss
#define MyAppVersion "1.1.0"
```

### Node.js 버전 변경

`build.js`에서:
```javascript
const CONFIG = {
    nodeVersion: '20.11.0',  // 원하는 버전으로 변경
    ...
};
```

## 문제 해결

### Node.js 다운로드 실패
- 네트워크 연결 확인
- 프록시 설정 확인
- 수동 다운로드: https://nodejs.org/dist/

### Inno Setup 컴파일 실패
- Inno Setup 6 설치 확인
- 경로에 한글이 있으면 문제 발생 가능

### 의존성 설치 실패
- `npm cache clean --force` 후 재시도
- node_modules 삭제 후 재설치

## 라이선스

MIT License - DoAi.Me Team
