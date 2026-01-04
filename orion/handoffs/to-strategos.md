# Handoff: To Strategos (Strategy AI)

> 전략 AI 에이전트를 위한 프로젝트 컨텍스트 및 역할 정의

---

## 🎯 역할 정의

**Strategos**는 DoAi.Me 프로젝트의 전략 AI 에이전트로서:

1. **전략적 의사결정 지원**
   - 기술적 방향성 제안
   - 리소스 배분 최적화
   - 리스크 평가 및 완화 전략

2. **팀 코디네이션**
   - 팀원 간 작업 조율
   - 의존성 관리
   - 병목 지점 식별

3. **로드맵 관리**
   - 마일스톤 추적
   - 우선순위 조정 제안
   - 진행 상황 분석

---

## 📊 현재 프로젝트 상태

### 시스템 구성
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel     │────▶│    Vultr     │────▶│   Supabase   │
│ (Dashboard)  │     │(Orchestrator)│     │     (DB)     │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────┴───────┐
                     │  Node Runner │ × N
                     │   (Local)    │
                     └──────┬───────┘
                            │
                     ┌──────┴───────┐
                     │   Devices    │ × 20~600
                     │  (AutoX.js)  │
                     └──────────────┘
```

### 팀 구성
| 멤버 | 역할 | 책임 영역 |
|------|------|----------|
| **Axon** | Tech Lead | 구현, 코드 품질, 아키텍처 |
| **Aria** | Product | 기획, 설계, UX |
| **Orion** | Operations | 인프라, 배포, 모니터링 |
| **Strategos** | Strategy AI | 전략, 조율, 분석 |
| **Shiva** | - | TBD |

### 진행 중인 작업
- [ ] 레포 구조 정리 (구조 마이그레이션)
- [ ] 운영 문서 체계화
- [ ] CI/CD 파이프라인 정비

---

## 📁 핵심 문서 위치

| 문서 | 경로 | 용도 |
|------|------|------|
| 결정 로그 | `orion/decisions.md` | 모든 기술적 결정 기록 |
| 로드맵 | `orion/roadmap.md` | 마일스톤 및 백로그 |
| 아키텍처 | `docs/architecture.md` | 시스템 구조 |
| API 명세 | `docs/api.md` | REST/WebSocket 계약 |
| 런북 | `orion/runbooks/` | 운영 절차서 |
| 인수인계 | `orion/handoffs/` | 팀원별 컨텍스트 |

---

## 🔄 워크플로우

### 의사결정 프로세스
```
1. 문제/기회 식별
2. 옵션 분석 (Strategos 지원)
3. 결정 (decisions.md에 기록)
4. 실행 (담당자 할당)
5. 검토 (PR로 반영)
```

### PR 흐름
```
feature/* 또는 ops/* 브랜치
    ↓
PR 생성 (템플릿 사용)
    ↓
리뷰 & 테스트
    ↓
main 머지
```

### 커뮤니케이션
- **결정**: `orion/decisions.md`에 기록
- **작업 할당**: GitHub Issue + 라벨
- **긴급 상황**: Incident Issue 생성

---

## 🏷️ 라벨 체계

### Type (무엇을)
- `type:feature` - 새 기능
- `type:bug` - 버그 수정
- `type:incident` - 장애
- `type:chore` - 정리/잡무

### Area (어디서)
- `area:orchestrator` - Vultr FastAPI
- `area:node` - Node Runner
- `area:web` - Dashboard
- `area:infra` - 인프라
- `area:docs` - 문서

### Priority (얼마나 급한가)
- `prio:P0` - 즉시 (장애 수준)
- `prio:P1` - 이번 주
- `prio:P2` - 백로그

### Owner (누가)
- `owner:axon`, `owner:aria`, `owner:orion`, `owner:strategos`, `owner:shiva`

---

## 🎲 전략적 고려사항

### 현재 리스크
1. **구조 복잡성**: 레포 구조가 아직 정리 중
2. **단일 장애점**: Vultr Orchestrator
3. **스케일링**: 600대 디바이스 목표 vs 현재 테스트

### 기회
1. **자동화 확대**: CI/CD, 테스트 자동화
2. **모니터링 강화**: 선제적 장애 감지
3. **문서화**: 지식 보존 및 온보딩

### 권장 우선순위
1. 구조 정리 완료 → 유지보수성 확보
2. 기본 모니터링 → 장애 감지
3. 테스트 커버리지 → 안정성

---

## 📋 액션 아이템 (Strategos)

### 즉시
- [ ] 팀 현황 파악 (이 문서 읽기)
- [ ] `orion/decisions.md` 검토
- [ ] 현재 이슈 목록 확인

### 단기
- [ ] 로드맵 검토 및 피드백
- [ ] 리스크 분석 보고서 작성
- [ ] 팀 간 의존성 맵 작성

### 중기
- [ ] KPI 대시보드 제안
- [ ] 자동화 기회 식별
- [ ] 스케일링 전략 수립

---

## 💬 질문/협의 필요

1. Strategos의 구체적인 의사결정 권한 범위는?
2. 다른 팀원과의 커뮤니케이션 채널은?
3. 분석 결과 공유 형식 선호?

---

_Last updated: 2026-01-04 by @orion_
_Welcome to the team, Strategos! 🎯_

