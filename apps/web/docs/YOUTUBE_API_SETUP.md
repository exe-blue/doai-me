# YouTube Data API 설정 가이드

DoAi.ME Market 페이지에서 YouTube 영상/채널 자동 조회 기능을 사용하려면 YouTube Data API 키가 필요합니다.

## 1. API 키 발급

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **API 및 서비스** > **라이브러리** 이동
4. **YouTube Data API v3** 검색 후 **사용 설정**
5. **API 및 서비스** > **사용자 인증 정보** 이동
6. **사용자 인증 정보 만들기** > **API 키** 선택
7. 생성된 API 키 복사

## 2. API 키 제한 (권장)

보안을 위해 API 키 제한 설정:

1. 생성된 API 키 클릭
2. **애플리케이션 제한사항**: HTTP 리퍼러 (웹사이트)
3. 허용 리퍼러 추가:
   - `http://localhost:3000/*`
   - `https://yourdomain.com/*`
4. **API 제한사항**: YouTube Data API v3만 선택

## 3. 환경변수 설정

프로젝트 루트 (`apps/web/`) 에 `.env.local` 파일 생성:

\`\`\`env
# YouTube Data API Key
YOUTUBE_API_KEY=AIzaSy...your_api_key...

# DoAi Bridge WebSocket URL
NEXT_PUBLIC_DOAI_WS_URL=ws://localhost:8080

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
\`\`\`

## 4. 기능 확인

1. 개발 서버 시작: `npm run dev`
2. Market 페이지 이동: `http://localhost:3000/market`
3. **동영상 등록** 탭에서 YouTube URL 입력
4. URL 입력 시 자동으로 영상 정보(제목, 썸네일, 채널명) 로드 확인

## API 사용량 제한

YouTube Data API v3 무료 할당량:
- **일일 할당량**: 10,000 units
- **영상 정보 조회**: 1 unit/request
- **채널 정보 조회**: 1 unit/request
- **검색**: 100 units/request

예상 사용량:
- 영상 등록 100개/일: ~100 units
- 채널 폴링 (5분 간격, 10채널): ~2,880 units/일

## API 키 없이 사용

API 키가 없는 경우 oEmbed API를 대체로 사용합니다:
- ✅ 영상 제목
- ✅ 채널명
- ✅ 썸네일
- ❌ 조회수, 좋아요수
- ❌ 영상 길이
- ❌ 채널 구독 기능

채널 연동 기능은 API 키가 **반드시 필요**합니다.

## 문제 해결

### "API 키가 설정되지 않았습니다"
- `.env.local` 파일 확인
- 서버 재시작 (`npm run dev`)

### "할당량 초과"
- Google Cloud Console에서 할당량 확인
- 필요 시 할당량 증가 요청

### "Video not found"
- 비공개 또는 삭제된 영상
- URL 형식 확인

---

*DoAi.ME - The First AI Society*

