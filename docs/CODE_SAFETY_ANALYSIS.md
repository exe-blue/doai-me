# 코드 안정성 분석 보고서

**분석자**: Axon (Builder)  
**날짜**: 2026-01-02  
**대상**: persona-automation 시스템

---

## 🔴 발견된 위험 요소 (15개)

### Category A: 무한 루프 위험

#### 1. main-persona.js - 메인 루프
**위치**: `while (isRunning)`
**위험**: isRunning이 false로 변경되지 않으면 영구 실행
**시나리오**:
- 종료 신호 없음
- try-catch에서 모든 에러 catch → 계속 실행
- 메모리 누적

**해결책**: 
- 최대 실행 시간 설정
- 에러 카운터 (연속 10회 → 종료)
- 메모리 체크

---

#### 2. CommandFetcher.startPeriodicCheck()
**위치**: `setInterval(... , 60000)`
**위험**: cleanup 함수가 호출되지 않으면 타이머 무한 실행
**시나리오**:
- 스크립트 강제 종료 시 타이머 남음
- 메모리 누수

**해결책**:
- Global cleanup handler 등록
- Process exit 이벤트 처리

---

### Category B: 정의되지 않은 상황

#### 3. API 응답 undefined/null
**위치**: `api.getTodayVideos()`, `api.getPersona()`
**위험**: undefined 객체 접근 → TypeError
**시나리오**:
```javascript
const videos = await api.getTodayVideos();  // undefined
videos.length  // ❌ TypeError: Cannot read property 'length' of undefined
```

**해결책**: Null 체크 강화

---

#### 4. YouTube 앱 실행 실패
**위치**: `youtube.launchYouTube()`
**위험**: false 반환 후에도 다음 단계 진행
**시나리오**:
```javascript
if (!youtube.launchYouTube()) {
    throw new Error('실행 실패');  // ❌ catch에서 sleep만 하고 재시도 없음
}
```

**해결책**: 재시도 로직 (최대 3회)

---

#### 5. OpenAI API 타임아웃
**위치**: `openaiHelper.callOpenAI()`
**위험**: timeout 30초 초과 시 응답 없음
**시나리오**:
- OpenAI 서버 느림
- 네트워크 불안정
- 무한 대기

**해결책**: 타임아웃 후 기본 댓글 사용

---

#### 6. 파일 읽기 실패
**위치**: `files.read('./config/variables.json')`
**위험**: 파일 없으면 crash
**시나리오**:
- 설정 파일 삭제
- 경로 오류
- 권한 없음

**해결책**: try-catch + 기본값

---

### Category C: 비합리적 입력

#### 7. 확률 값 범위 초과
**입력**: `commentProbability: 1.5` (150%)
**위험**: 논리 오류, 항상 실행
**해결책**: 0-1 범위 검증

---

#### 8. 슬립 시간 음수/거대값
**입력**: `minSleepMs: -1000` 또는 `maxSleepMs: 999999999`
**위험**: sleep 오작동, 시스템 멈춤
**해결책**: 최소/최대 제한 (5초~10분)

---

#### 9. 빈 키워드 풀
**입력**: `keywordPool: []`
**위험**: 랜덤 선택 시 undefined
**해결책**: 기본 키워드 보장

---

#### 10. OpenAI 토큰 0
**입력**: `maxTokens: 0`
**위험**: 응답 없음
**해결책**: 최소값 10

---

### Category D: 리소스 고갈

#### 11. 스크린샷 파일 누적
**위치**: `captureScreen()` → `/sdcard/DoAi/screenshots/`
**위험**: 저장공간 부족
**시나리오**:
- 하루 1000장 × 600대 = 600,000장
- 1장 500KB = 300GB/일

**해결책**:
- 파일 자동 삭제 (1일 후)
- 최대 개수 제한

---

#### 12. 메모리 누수 (실행 기록)
**위치**: `commandFetcher.executedVideoIds` Set
**위험**: 무한 증가
**시나리오**:
- 하루 100개 × 365일 = 36,500개 메모리 유지

**해결책**: 자정 초기화 (이미 구현됨 ✅)

---

### Category E: 동시성 문제

#### 13. 여러 영상 동시 실행
**위치**: `commandFetcher` 콜백
**위험**: for 루프에서 여러 영상 순차 실행 → 시간 초과
**시나리오**:
- 10개 영상 × 60초 = 10분
- 다음 체크까지 완료 못함

**해결책**: 한 번에 1개만 실행

---

#### 14. YouTube 앱 중복 실행
**위치**: `launchYouTube()` 여러 곳 호출
**위험**: 앱 충돌
**시나리오**:
- 자율 탐색 중 지시 실행
- 2개 루프가 동시에 YouTube 제어

**해결책**: 실행 Lock (한 번에 하나만)

---

### Category F: 네트워크 오류

#### 15. API 연속 실패
**위치**: 모든 `api.*` 호출
**위험**: 네트워크 끊김 시 무한 재시도
**시나리오**:
- Supabase 연결 끊김
- 60초마다 계속 실패 로그
- 메모리/CPU 낭비

**해결책**: Circuit Breaker (5회 실패 → 10분 대기)

---

## 🛡️ 안전 장치 구현 우선순위

### P0 (즉시 수정 필수)
1. ✅ 메인 루프 종료 조건
2. ✅ Null 체크 강화
3. ✅ 파일 읽기 예외 처리
4. ✅ 확률/슬립 값 검증
5. ✅ YouTube 실행 Lock

### P1 (1주일 내)
6. ⏳ 재시도 로직 (3회)
7. ⏳ Circuit Breaker
8. ⏳ 스크린샷 정리
9. ⏳ 메모리 모니터링

### P2 (필요시)
10. ⏳ Rate Limiting
11. ⏳ 건강 체크
12. ⏳ 자동 복구

---

## 🔧 수정 계획

### 단계 1: 입력 검증 (validation.js)
- 모든 설정값 범위 체크
- 기본값 보장

### 단계 2: 에러 핸들링 (error-handler.js)
- 재시도 로직
- Circuit Breaker
- 우아한 종료

### 단계 3: 리소스 관리 (resource-manager.js)
- 파일 정리
- 메모리 체크
- Lock 관리

---

**즉시 P0 수정을 시작합니다!**
