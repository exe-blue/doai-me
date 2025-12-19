# AIFarm Frontend

Vercel을 이용한 AIFarm 프론트엔드 배포

## 📁 디렉토리 구조

```
frontend/
├── vercel.json          # Vercel 배포 설정
├── README.md            # 이 파일
└── public/              # 정적 파일 (Vercel output)
    ├── index.html       # 메인 페이지 (태스크 관리)
    ├── dashboard.html   # 실시간 대시보드
    ├── tasks.html       # 태스크 페이지 리다이렉트
    ├── css/
    │   ├── style.css    # 메인 스타일
    │   └── dashboard.css # 대시보드 스타일
    └── js/
        ├── config.js    # API 설정
        ├── app.js       # 메인 애플리케이션
        └── dashboard.js # 대시보드 로직
```

## 🚀 Vercel 배포 방법

### 방법 1: Vercel CLI 사용

```bash
# Vercel CLI 설치
npm install -g vercel

# frontend 디렉토리로 이동
cd frontend

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 방법 2: GitHub 연동

1. GitHub에 레포지토리 푸시
2. [Vercel Dashboard](https://vercel.com/dashboard)에서 "New Project" 클릭
3. GitHub 레포지토리 선택
4. Root Directory를 `frontend`로 설정
5. "Deploy" 클릭

### 방법 3: Vercel Dashboard에서 직접 업로드

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. "Add New..." → "Project" 클릭
3. `frontend` 폴더를 드래그 앤 드롭

## ⚙️ 설정

### 백엔드 API URL 설정

`public/js/config.js` 파일에서 API URL을 설정합니다:

```javascript
const CONFIG = {
    // 배포 시 실제 백엔드 URL로 변경
    API_BASE_URL: 'https://your-backend-api.example.com',
    WS_BASE_URL: 'wss://your-backend-api.example.com',
    // ...
};
```

### Vercel API 프록시 설정 (선택사항)

`vercel.json`의 `rewrites` 섹션에서 API 프록시를 설정합니다:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-api.example.com/api/:path*"
    }
  ]
}
```

## 📱 페이지 설명

### 메인 페이지 (`/`)
- YouTube 태스크 관리
- 배치 제출 (5개 단위)
- 태스크 CRUD 기능

### 대시보드 (`/dashboard`)
- 600대 디바이스 실시간 모니터링
- 활동 분포 차트
- 폰보드 상태 맵
- 에이전트 순위
- 실시간 발견 피드
- 24시간 타임라인

## 🔧 로컬 개발

```bash
# 간단한 HTTP 서버로 테스트
cd frontend/public
python -m http.server 3000

# 또는 Node.js serve 사용
npx serve public
```

브라우저에서 `http://localhost:3000` 접속

## 📋 환경 변수 (Vercel)

Vercel 대시보드에서 환경 변수를 설정할 수 있습니다:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `VITE_API_URL` | 백엔드 API URL | `https://api.aifarm.example.com` |
| `VITE_WS_URL` | WebSocket URL | `wss://api.aifarm.example.com` |

## 🎨 커스터마이징

### 테마 색상
`public/css/style.css`의 `:root` 섹션에서 CSS 변수를 수정:

```css
:root {
    --accent-primary: #6366f1;    /* 메인 색상 */
    --accent-secondary: #8b5cf6;  /* 보조 색상 */
    /* ... */
}
```

### 폰트
현재 사용 중인 폰트:
- **Pretendard**: 한글 UI
- **Space Grotesk**: 대시보드 제목
- **JetBrains Mono**: 숫자, 코드

## 🔒 보안

- CORS 설정은 백엔드에서 관리
- API 키는 환경 변수로 관리
- CSP 헤더는 `vercel.json`에서 설정

## 📞 문의

문제가 있으면 이슈를 등록해주세요.

