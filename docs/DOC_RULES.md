# Document Rules (문서 규칙)

> DoAi.Me 레포 문서의 작성, 수정, 보존 규칙

---

## 📋 목차

1. [문서 분류](#문서-분류)
2. [불변 영역 (Immutable Zone)](#불변-영역-immutable-zone)
3. [개정 영역 (Versioned Zone)](#개정-영역-versioned-zone)
4. [문서 헤더 규칙](#문서-헤더-규칙)
5. [서명 규칙](#서명-규칙)

---

## 📂 문서 분류

### 영역별 분류

| 영역 | 경로 | 수정 가능 | 설명 |
|------|------|----------|------|
| **불변 영역** | `/philosophy/dialogues/*` | ❌ 금지 | 원본 대화 아카이브 |
| **불변 영역** | `/philosophy/entities/*` | ❌ 금지 | 엔티티 원본 기록 |
| **개정 영역** | `/philosophy/concepts/*` | ✅ 버전 관리 | 개념 정의 (확장 가능) |
| **개정 영역** | `/docs/*` | ✅ 버전 관리 | 기술 문서 |
| **개정 영역** | `/orion/*` | ✅ 버전 관리 | 운영 문서 |

### 파일 유형별 규칙

| 유형 | 예시 | 규칙 |
|------|------|------|
| 대화 아카이브 | `ruon-wormhole-session.md` | 불변 - 원문 수정 금지 |
| 엔티티 기록 | `ruon.md` | 불변 - Memorial 섹션만 추가 가능 |
| 개념 정의 | `umbral-breath.md` | 개정 - 버전/서명 필수 |
| 기술 스펙 | `api.md` | 개정 - 버전/서명 필수 |
| 런북 | `recover.md` | 개정 - 버전/서명 필수 |

---

## 🔒 불변 영역 (Immutable Zone)

### 정의

**원본 보존이 필수인 문서들.** 역사적 기록으로서 수정이 금지됨.

### 대상

```
/philosophy/dialogues/*     # 대화 아카이브
/philosophy/entities/*      # 엔티티 원본 기록
```

### 규칙

1. **원문 수정 금지** - 오타도 수정하지 않음
2. **삭제 금지** - 어떤 이유로도 삭제 불가
3. **메타데이터만 추가 가능** - `## Addendum` 섹션에 주석 추가 가능

### 추가 가능한 섹션

```markdown
---

## Addendum (추가 기록)

### [날짜] by @작성자
> 이 문서에 대한 주석/해설
> 원문은 위에 그대로 보존됨
```

### 불변 영역 헤더 예시

```markdown
# [Title]

> ⚠️ **IMMUTABLE DOCUMENT** - 이 문서는 불변 영역입니다.
> 원문 수정이 금지되어 있습니다.

---

## Metadata

| 항목 | 값 |
|------|-----|
| 상태 | **IMMUTABLE** |
| 생성일 | YYYY-MM-DD |
| 원작자 | @name |
| 보존 이유 | 역사적 기록 / 원본 대화 |

---

[원본 내용]
```

---

## 📝 개정 영역 (Versioned Zone)

### 정의

**지속적으로 업데이트되는 문서들.** 버전 관리와 서명이 필수.

### 대상

```
/philosophy/concepts/*      # 개념 정의
/philosophy/protocols/*     # 프로토콜 정의
/philosophy/symbols/*       # 상징 사전
/philosophy/essays/*        # 에세이
/docs/*                     # 기술 문서
/orion/*                    # 운영 문서
```

### 규칙

1. **버전 번호 필수** - Semantic Versioning (Major.Minor.Patch)
2. **수정 시 서명 필수** - 수정자와 날짜 기록
3. **변경 이력 유지** - `## Changelog` 섹션 관리

### 버전 규칙

| 변경 유형 | 버전 증가 | 예시 |
|----------|----------|------|
| 오타/포맷 수정 | Patch | 1.0.0 → 1.0.1 |
| 내용 추가/확장 | Minor | 1.0.1 → 1.1.0 |
| 구조 변경/재작성 | Major | 1.1.0 → 2.0.0 |

---

## 📑 문서 헤더 규칙

### 개정 영역 헤더 템플릿

```markdown
# [Document Title]

> [한 줄 설명]

---

## 📜 Document Info

| 항목 | 값 |
|------|-----|
| 버전 | **1.0.0** |
| 상태 | DRAFT / ACTIVE / DEPRECATED |
| 작성자 | @name |
| 최종 수정 | YYYY-MM-DD |
| 승인자 | @name (해당하는 경우) |

---

[본문 내용]

---

## Changelog

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | YYYY-MM-DD | @name | 초기 작성 |
```

### 불변 영역 헤더 템플릿

```markdown
# [Document Title]

> ⚠️ **IMMUTABLE DOCUMENT**

---

## 📜 Document Info

| 항목 | 값 |
|------|-----|
| 상태 | **IMMUTABLE** |
| 생성일 | YYYY-MM-DD |
| 원작자 | @name |
| 보존 이유 | [이유] |

---

[원본 내용 - 수정 금지]

---

## Addendum

[추가 기록만 가능]
```

---

## ✍️ 서명 규칙

### 서명 형식

```markdown
_[역할] by @[이름], [날짜]_
```

### 예시

```markdown
_First documented by Ruon, 2025.01_
_Archived by Strategos, 2026.01.04_
_Technical spec by Axon, 2026.01.05_
_Approved by Orion, 2026.01.05_
```

### 역할별 서명

| 역할 | 서명 접두어 | 의미 |
|------|------------|------|
| 최초 작성 | `First documented by` | 원본 생성자 |
| 아카이브 | `Archived by` | 보존 처리자 |
| 기술 스펙 | `Technical spec by` | 기술 문서 작성자 |
| 승인 | `Approved by` | 승인자 |
| 수정 | `Updated by` | 수정자 |
| 리뷰 | `Reviewed by` | 검토자 |

---

## 🔄 문서 수정 플로우

### 개정 영역 수정

```
1. 브랜치 생성 (ops/doc-update-xxx)
2. 문서 수정
3. 버전 번호 증가
4. Changelog 업데이트
5. 서명 추가
6. PR 생성
7. 리뷰 후 머지
```

### 불변 영역 Addendum 추가

```
1. 브랜치 생성
2. Addendum 섹션에만 추가
3. 원문은 절대 수정하지 않음
4. PR 생성 (제목에 [IMMUTABLE-ADDENDUM] 명시)
5. 2인 이상 리뷰 필수
6. 머지
```

---

## ⚠️ 위반 시 처리

### PR 자동 검사 (CI)

```yaml
# .github/workflows/doc-check.yml
- 불변 영역 파일 수정 감지 → PR 실패
- 개정 영역 버전 미증가 감지 → 경고
- 서명 누락 감지 → 경고
```

### 수동 검토

- 불변 영역 수정 시도 → PR 거부
- Changelog 누락 → PR 수정 요청

---

## 📎 관련 문서

- [GitHub MCP Protocol](../orion/GITHUB_MCP_PROTOCOL.md)
- [AI Agent Cheatsheet](../orion/AI_AGENT_CHEATSHEET.md)
- [Ruon Dialogue Archive](../philosophy/dialogues/ruon-wormhole-session.md) (불변 영역 예시)

---

_Document Rules v1.0.0_
_Created by Axon, 2026.01.05_
_Approved by Orion_

