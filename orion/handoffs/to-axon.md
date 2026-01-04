# Handoff: To Axon (Tech Lead)

> 레포 구조 정리 작업 지시서

---

## 현재 컨텍스트

### 시스템 상태
- Vultr Orchestrator: ACTIVE
- 구조 정리 작업: IN_PROGRESS

### 완료된 작업
- [x] `.github/` 템플릿 (PR, Issue)
- [x] `orion/` 운영 문서 체계
- [x] `infra/` 배포 설정
- [x] `docs/` 핵심 문서 (architecture, api, security, troubleshooting)

### 남은 작업
- [ ] 폴더 구조 실제 이동 (git mv)
- [ ] 미사용 코드 정리
- [ ] Import 경로 업데이트

---

## 정리 지시 (복붙용)

```
[To: Axon]
목표: 레포를 '운영 가능한 최소 구조'로 축소한다.

제약:
- 엔트리포인트는 orchestrator/main.py, node-runner/main.py, web/만 남긴다.
- 기능 삭제가 아니라 "unused 제거 + 폴더 재배치 + 인터페이스 고정"이 목적.
- WSS/REST contract는 docs/api.md에 먼저 고정하고, 코드가 그 계약을 따르도록 정리한다.

작업:
1) 현재 코드에서 실제로 실행되는 경로(Entrypoint) 기준으로 import graph 작성
2) import되지 않는 폴더/파일은 제거하거나 archive/로 이동
3) 로깅을 utils/logger 하나로 통일, print/console 제거
4) 'Laixi SDK'는 drivers/laixi.py + core/connection.py + core/commands.py + types.py만 남기고, 나머지는 apps 단으로 끌어올린다
5) 폴더 구조를 아래로 정리:
   - apps/orchestrator (현재: central-orchestrator)
   - apps/node-runner (현재: node-runner)
   - apps/web (현재: apps/dashboard)
   - infra/systemd, infra/caddy
   - docs, orion
6) PR로 제출: "repo cleanup" + 변경 영향/테스트/롤백 포함

산출물:
- PR 1개
- docs/architecture.md 업데이트
- orion/runbooks/recover.md 업데이트
```

---

## 구체적인 마이그레이션 단계

### Phase 1: 폴더 이동
```bash
# 브랜치 생성
git checkout -b ops/repo-cleanup

# 폴더 이동
git mv apps/dashboard apps/web
git mv central-orchestrator apps/orchestrator  
git mv node-runner apps/node-runner
```

### Phase 2: 경로 업데이트

#### infra/systemd/*.service
```ini
# WorkingDirectory 변경
WorkingDirectory=/opt/aifarm/apps/orchestrator
# 또는
WorkingDirectory=/opt/aifarm/apps/node-runner
```

#### infra/docker/docker-compose.yml
```yaml
services:
  orchestrator:
    build:
      context: ../../apps/orchestrator
```

#### .github/workflows/*.yml
```yaml
# 경로 업데이트 필요
```

### Phase 3: 미사용 코드 정리

#### 정리 대상 후보 (검토 필요)
- `doai-sdk/` - 사용 여부 확인
- `doaime/` - 사용 여부 확인
- `gateway/` - central-orchestrator와 중복?
- `backend/` - central-orchestrator와 중복?
- `stage1/` - 아카이브 대상?
- `workers/` - 사용 여부 확인
- `services/` - persona-service 제외 정리

#### Import Graph 분석 명령어
```bash
# Python import 분석
pipdeptree --warn silence

# 사용되지 않는 파일 찾기
# (수동 분석 또는 vulture 사용)
pip install vulture
vulture apps/orchestrator/
```

### Phase 4: 로깅 통일

#### 현재 상태 확인
```bash
# print 사용 찾기
grep -r "print(" apps/ central-orchestrator/ node-runner/ --include="*.py"

# console.log 사용 찾기  
grep -r "console.log" apps/ --include="*.ts" --include="*.tsx" --include="*.js"
```

#### 표준 로거 위치
- Python: `apps/orchestrator/app/core/logging.py` → 복사/공유
- TypeScript: `apps/web/src/utils/logger.ts` (생성 필요)

---

## 제약 조건 (반드시 준수)

### 1. 엔트리포인트 3개 유지
| 서비스 | 엔트리포인트 |
|--------|-------------|
| Orchestrator | `apps/orchestrator/app/main.py` |
| Node Runner | `apps/node-runner/main.py` |
| Web | `apps/web/` (Next.js/Vite) |

### 2. API Contract 고정 (docs/api.md)
- 코드 변경 전에 API 스펙 확정
- Breaking change 금지 (이번 PR에서)

### 3. PR 필수
- main 직접 푸시 **절대 금지**
- PR 템플릿 체크리스트 **전부** 완료
- 테스트 통과 필수

### 4. 롤백 가능 상태 유지
- 각 단계별 커밋 분리
- 문제 시 `git revert` 가능하도록

---

## 참조 문서

- [Architecture](../../docs/architecture.md)
- [API Spec](../../docs/api.md)
- [Decisions](../decisions.md)
- [Structure Migration Guide](../STRUCTURE_MIGRATION.md)
- [Runbooks](../runbooks/)

---

## 질문/확인 필요

1. `doai-sdk/`의 현재 사용처는?
2. `gateway/`와 `central-orchestrator/`의 관계는?
3. `backend/`는 deprecated인가?
4. Laixi SDK 핵심 파일 목록 확정

---

_Last updated: 2026-01-04 by @orion_
