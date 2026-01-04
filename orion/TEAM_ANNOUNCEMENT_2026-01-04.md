# 📢 팀 공지: GitHub 운영 규약 및 구조 정리

> **날짜:** 2026-01-04
> **작성:** Orion (Operations)
> **대상:** @axon @aria @strategos @shiva

---

## 🎯 TL;DR (3줄 요약)

1. **main 직접 푸시 금지** - 모든 변경은 PR로만
2. **새 문서 체계** - `orion/`, `docs/`, `infra/` 폴더 확인
3. **라벨 사용 필수** - Issue/PR에 `type:`, `area:`, `owner:` 라벨 붙이기

---

## 🆕 변경 사항

### 1. 레포 구조 표준화

```
aifarm/
├── apps/                    # 애플리케이션 (web, orchestrator, node-runner)
├── infra/                   # 🆕 인프라 설정 (caddy, systemd, docker)
├── docs/                    # 🆕 핵심 문서 (architecture, api, security)
├── orion/                   # 🆕 운영 문서 (decisions, runbooks, handoffs)
└── .github/                 # 🆕 GitHub 템플릿 (PR, Issue)
```

### 2. 새로운 운영 문서

| 문서 | 용도 | 담당 |
|------|------|------|
| `orion/decisions.md` | 모든 기술적 결정 기록 | 전원 |
| `orion/roadmap.md` | 마일스톤 관리 | Strategos |
| `orion/runbooks/*.md` | 운영 절차서 | Orion |
| `orion/handoffs/*.md` | 인수인계 문서 | 전원 |

### 3. GitHub 라벨 체계

```
type:feature | type:bug | type:incident | type:chore
area:orchestrator | area:node | area:web | area:infra | area:docs
prio:P0 | prio:P1 | prio:P2
owner:axon | owner:aria | owner:orion | owner:strategos | owner:shiva
```

### 4. PR/Issue 템플릿

- PR 생성 시 자동으로 체크리스트 표시됨
- Issue 생성 시 Bug/Feature/Incident 선택

---

## ✅ 각 팀원 액션 아이템

### @axon (Tech Lead)
- [ ] `orion/handoffs/to-axon.md` 확인
- [ ] 구조 마이그레이션 작업 시작 (PR: `ops/repo-cleanup`)
- [ ] 미사용 코드 정리 계획 수립

### @aria (Product)
- [ ] `orion/handoffs/to-aria.md` 확인
- [ ] 기획 문서를 `docs/planning/`에 정리
- [ ] 페르소나 시스템 요구사항 업데이트

### @strategos (Strategy AI) 🆕
- [ ] `orion/handoffs/to-strategos.md` 확인 (웰컴!)
- [ ] 현재 로드맵 검토 (`orion/roadmap.md`)
- [ ] 리스크 분석 및 우선순위 제안

### @shiva
- [ ] 역할 확정 후 handoff 문서 생성 예정

---

## 🚨 필수 규칙 (위반 시 롤백)

### 1. main 브랜치 보호
```
❌ git push origin main        # 금지!
✅ git push origin feature/xxx  # OK
✅ PR 생성 → 리뷰 → 머지        # OK
```

### 2. 결정은 기록
```
중요한 결정 → orion/decisions.md에 추가
```

### 3. 장애는 이슈로
```
장애 발생 → GitHub Issue (incident 템플릿 사용)
```

---

## 📅 다음 단계

| 단계 | 내용 | 담당 | 기한 |
|------|------|------|------|
| 1 | 라벨 설정 완료 | Orion | ✅ 완료 |
| 2 | 구조 마이그레이션 PR | Axon | 이번 주 |
| 3 | CI/CD 파이프라인 정비 | Axon | 다음 주 |
| 4 | 모니터링 구축 | Orion | 다음 주 |

---

## 🔗 참조 링크

- [Architecture](../docs/architecture.md)
- [API Spec](../docs/api.md)
- [Security Guide](../docs/security.md)
- [Troubleshooting](../docs/troubleshooting.md)
- [Recovery Runbook](./runbooks/recover.md)

---

## ❓ 질문/피드백

이 규약에 대한 의견이나 질문은 이 문서를 수정하는 PR로 제출하거나,
GitHub Discussion에서 논의해 주세요.

---

_"레포만 있으면 재현/복구 가능"을 목표로!_ 🎯

