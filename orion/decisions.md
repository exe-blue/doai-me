# Decisions Log

> 모든 기술적/운영적 결정을 기록합니다.
> 결정은 번복될 수 있지만, 왜 그 결정을 했는지는 기록으로 남겨야 합니다.

## Format

```
### [DECISION-XXX] 제목
- 날짜: YYYY-MM-DD
- 상태: PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED
- 결정자: @이름
- 대체: DECISION-YYY (해당하는 경우)

**배경**
왜 결정이 필요했는가?

**결정**
무엇을 결정했는가?

**대안**
고려한 다른 방법과 기각 이유

**결과**
이 결정으로 인해 예상되는 영향
```

---

## Decisions

### [DECISION-001] 레포 구조 표준화
- 날짜: 2026-01-04
- 상태: ACCEPTED
- 결정자: @orion

**배경**
기존 레포 구조가 파편화되어 있어 운영/복구가 어려움. Vultr 초기화 사고 이후 "repo만 있으면 재현 가능"해야 한다는 요구사항 발생.

**결정**
```
apps/
  web/           # Vercel (Next.js)
  orchestrator/  # Vultr (FastAPI)
  node-runner/   # 로컬 노드 실행기
packages/
  shared/        # 공통 타입/스키마
infra/
  caddy/
  systemd/
  docker/
docs/
orion/
```

**대안**
- 모노레포 유지 vs 멀티레포 분리 → 모노레포 선택 (배포 동기화 용이)
- Turborepo/Nx 도입 → 복잡도 증가로 기각

**결과**
- 엔트리포인트 3개로 축소
- import graph 기반 미사용 코드 제거
- 운영 복구 시간 단축 예상

---

### [DECISION-002] 브랜치 전략 단순화
- 날짜: 2026-01-04
- 상태: ACCEPTED
- 결정자: @orion

**배경**
GitFlow의 복잡도가 소규모 팀에 과도함. main 직접 푸시로 인한 사고 발생.

**결정**
- `main`: 항상 배포 가능 (보호 브랜치, PR만 허용)
- `dev`: 통합 테스트용 (선택)
- `feature/*`: 기능 개발
- `ops/*`: 런북/인프라 변경
- `hotfix/*`: 긴급 수정

**대안**
- Trunk-based development → 테스트 자동화 부족으로 시기상조
- GitFlow 유지 → 오버헤드 과다

**결과**
- main 보호로 사고 방지
- PR 템플릿 강제로 문서화 자동화

---

### [DECISION-003] 인증 토큰 분리
- 날짜: 2026-01-04
- 상태: ACCEPTED
- 결정자: @orion

**배경**
단일 `ORCH_SHARED_TOKEN`으로 모든 인증을 처리하면 유출 시 전체 시스템 위험.

**결정**
- `ORCH_ADMIN_TOKEN`: Vercel/관리용 (높은 권한)
- `ORCH_NODE_TOKEN`: 노드용 (제한된 권한)
- 토큰은 랜덤 32~64바이트로 생성

**대안**
- 단일 토큰 → 보안 리스크
- JWT/OAuth → 인프라 복잡도 증가, 추후 고려

**결과**
- 노드 토큰 유출 시에도 관리 기능 보호
- 토큰 로테이션 독립적 수행 가능

---

### [DECISION-004] 팀 구성 및 역할 정의
- 날짜: 2026-01-04
- 상태: ACCEPTED
- 결정자: @orion

**배경**
AI 에이전트 팀 운영을 위해 역할과 책임을 명확히 정의할 필요.

**결정**
| 멤버 | 역할 | 책임 |
|------|------|------|
| **Axon** | Tech Lead | 구현, 코드 품질, 아키텍처 결정 |
| **Aria** | Product | 기획, 설계, UX, 요구사항 정의 |
| **Orion** | Operations | 인프라, 배포, 모니터링, 런북 |
| **Strategos** | Strategy AI | 전략, 조율, 리스크 분석, 우선순위 |
| **Shiva** | TBD | 역할 확정 예정 |

**대안**
- 역할 없이 자유롭게 → 책임 소재 불명확
- 엄격한 분리 → 협업 저해

**결과**
- 명확한 담당자로 의사결정 속도 향상
- `owner:` 라벨로 GitHub에서 추적 가능

---

### [DECISION-005] GitHub 운영 규약 도입
- 날짜: 2026-01-04
- 상태: ACCEPTED
- 결정자: @orion

**배경**
"대화"가 아니라 레포 아티팩트(문서/PR/이슈)로 시스템을 움직여야 함. 장애 발생 시에도 repo만 있으면 재현/복구가 가능해야 함.

**결정**
6가지 핵심 원칙:
1. 결정은 항상 기록 (`orion/decisions.md`)
2. 운영은 항상 런북화 (`orion/runbooks/*.md`)
3. 변경은 무조건 PR (main 직접 푸시 금지)
4. 코드 과도함은 CI로 억제 (lint/test/size rule)
5. 비밀은 repo에 없다 (`.env.example` + 환경변수)
6. 장애는 incident 이슈로 회귀 가능 (템플릿 고정)

**대안**
- 문서 없이 진행 → 지식 손실, 복구 불가
- Wiki 사용 → 버전 관리 어려움, repo와 분리

**결과**
- 모든 지식이 Git 히스토리에 보존
- 새 멤버 온보딩 시간 단축
- 장애 복구 시간 단축

---

## Pending Decisions

### [DECISION-PENDING-001] Shiva 역할 정의
- 상태: PROPOSED
- 제안자: @orion

**배경**
팀원 Shiva의 역할이 아직 정의되지 않음.

**옵션**
1. QA/테스트 담당
2. DevOps 보조
3. 특정 도메인 전문가
4. 기타

**다음 단계**
- 팀 논의 후 결정
- `DECISION-00X`로 승격

---

_Last updated: 2026-01-04_
