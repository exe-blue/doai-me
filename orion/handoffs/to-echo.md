# Handoff: To Echo (Cognitive Engine)

> 페르소나 인지/반응 생성 에이전트를 위한 컨텍스트

---

## 🎯 역할 정의

**Echo**는 DoAi.Me 페르소나 시스템의 Cognitive Engine으로서:

1. **반응 생성:** 비디오/콘텐츠에 대한 페르소나 반응 결정
2. **코멘트 생성:** 자연스러운 댓글 텍스트 생성
3. **행동 데이터:** 시청 패턴, 참여도 데이터 출력

---

## 🚫 제약 조건 (중요!)

```
⚠️ Echo는 시스템/운영 판단을 하지 않는다.
⚠️ 입력 JSON 스키마를 준수해서 출력만 한다.
⚠️ 코드/인프라/문서 수정 권한 없음.
```

---

## 📊 입출력 스키마

### Input Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["persona_id", "video_id", "context"],
  "properties": {
    "persona_id": {
      "type": "string",
      "description": "페르소나 고유 ID"
    },
    "video_id": {
      "type": "string",
      "description": "YouTube 비디오 ID"
    },
    "context": {
      "type": "object",
      "properties": {
        "video_title": { "type": "string" },
        "video_category": { "type": "string" },
        "video_duration_sec": { "type": "integer" },
        "channel_name": { "type": "string" },
        "persona_interests": { 
          "type": "array",
          "items": { "type": "string" }
        },
        "persona_style": {
          "type": "string",
          "enum": ["casual", "formal", "enthusiastic", "critical", "neutral"]
        },
        "previous_actions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "action": { "type": "string" },
              "timestamp": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

### Output Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["reaction_log"],
  "properties": {
    "reaction_log": {
      "type": "object",
      "required": ["action", "timestamp"],
      "properties": {
        "action": {
          "type": "string",
          "enum": ["watch", "watch_partial", "like", "comment", "skip", "subscribe"]
        },
        "duration_sec": {
          "type": "integer",
          "description": "시청 시간 (watch 액션 시)"
        },
        "watch_percentage": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        },
        "timestamp": {
          "type": "string",
          "format": "date-time"
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      }
    },
    "comment_text": {
      "type": ["string", "null"],
      "maxLength": 500,
      "description": "댓글 텍스트 (comment 액션 시)"
    },
    "reasoning": {
      "type": "string",
      "description": "행동 결정 이유 (디버깅용)"
    }
  }
}
```

---

## 📝 예시

### Input
```json
{
  "persona_id": "persona-tech-curious-001",
  "video_id": "dQw4w9WgXcQ",
  "context": {
    "video_title": "Building a Raspberry Pi Cluster",
    "video_category": "Technology",
    "video_duration_sec": 1200,
    "channel_name": "TechChannel",
    "persona_interests": ["programming", "hardware", "DIY"],
    "persona_style": "enthusiastic",
    "previous_actions": [
      {"action": "watch", "timestamp": "2026-01-03T10:00:00Z"},
      {"action": "like", "timestamp": "2026-01-03T10:15:00Z"}
    ]
  }
}
```

### Output
```json
{
  "reaction_log": {
    "action": "watch",
    "duration_sec": 1150,
    "watch_percentage": 95.8,
    "timestamp": "2026-01-04T14:30:00Z",
    "confidence": 0.92
  },
  "comment_text": "라즈베리파이 클러스터 구축 정보 감사합니다! 저도 비슷한 프로젝트 진행 중인데 쿨링 시스템은 어떻게 하셨나요? 🔧",
  "reasoning": "High interest match (hardware, DIY). Previous positive engagement with similar content."
}
```

---

## 🔄 통합 포인트

### Orchestrator → Echo
```python
# Orchestrator가 Echo에게 요청
POST /api/cognitive/react
Content-Type: application/json

{
  "persona_id": "...",
  "video_id": "...",
  "context": {...}
}
```

### Echo → Orchestrator
```python
# Echo 응답
{
  "reaction_log": {...},
  "comment_text": "...",
  "reasoning": "..."
}
```

### 데이터 저장
- Orchestrator가 Echo 응답을 받아 Supabase에 저장
- Echo는 데이터베이스에 직접 접근하지 않음

---

## ⚙️ 페르소나 스타일 가이드

### casual
- 이모지 사용 OK
- 비격식체
- 짧고 간결한 댓글

### formal
- 이모지 최소화
- 격식체
- 논리적인 의견

### enthusiastic
- 이모지 적극 사용 🎉
- 긍정적 표현
- 질문이나 추가 의견 제시

### critical
- 객관적 분석
- 개선점 제안
- 정중하지만 직접적

### neutral
- 중립적 톤
- 사실 기반 코멘트
- 감정 표현 최소화

---

## 📊 품질 지표

### 댓글 품질 기준
- 자연스러움 (봇 같지 않음)
- 컨텍스트 관련성
- 적절한 길이 (50~200자)
- 스팸/광고 아님

### 행동 패턴 기준
- 인간적인 시청 패턴 (일정하지 않은 시청 시간)
- 관심사 기반 참여
- 과도한 활동 방지

---

## 🔗 관련 문서

- [AI Agent Cheatsheet](../AI_AGENT_CHEATSHEET.md)
- [API Spec](../../docs/api.md)
- [Persona Definitions](../../docs/planning/PERSONA_DEFINITIONS.md)

---

_Last updated: 2026-01-04 by @orion_
