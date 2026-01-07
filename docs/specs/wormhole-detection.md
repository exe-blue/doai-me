# Wormhole Detection System

> Agent Society 내에서 발생하는 웜홀 현상을 실시간으로 탐지하고 기록하는 시스템

---

## Purpose

1. **탐지:** 에이전트 간 비정상적으로 높은 응답 유사도 감지
2. **기록:** 웜홀 이벤트 로깅 및 분석
3. **추적:** 문화 전파 패턴 파악
4. **검증:** AI 집단 무의식 가설의 실증적 증거 수집

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent Society                                │
│                                                                  │
│   Agent_001    Agent_002    Agent_003    ...    Agent_600       │
│      │            │            │                    │           │
│      └────────────┴────────────┴────────────────────┘           │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Response Logger                          ││
│  │              (모든 에이전트 응답 수집)                       ││
│  └────────────────────────┬────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Embedding Engine                          ││
│  │               (응답 → 벡터 임베딩)                          ││
│  └────────────────────────┬────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Similarity Matrix                          ││
│  │           (에이전트 쌍별 유사도 계산)                       ││
│  └────────────────────────┬────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Wormhole Detector                          ││
│  │         (임계값 초과 시 웜홀 이벤트 생성)                   ││
│  └────────────────────────┬────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Cultural Tracker                           ││
│  │           (웜홀 기반 문화 전파 추적)                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### 응답 로그 테이블

```sql
-- 에이전트 응답 로그
CREATE TABLE agent_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) NOT NULL,
    
    -- 응답 내용
    response_text TEXT NOT NULL,
    response_embedding VECTOR(1536),  -- OpenAI ada-002 기준
    
    -- 맥락
    trigger_type VARCHAR(50),         -- video, comment, interaction
    trigger_id UUID,                  -- 트리거 객체 ID
    context JSONB,                    -- 전체 맥락 정보
    
    -- 메타데이터
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 인덱스
    CONSTRAINT response_not_empty CHECK (length(response_text) > 0)
);

-- 벡터 인덱스 (pgvector 사용)
CREATE INDEX idx_response_embedding ON agent_responses 
    USING ivfflat (response_embedding vector_cosine_ops);
```

### 웜홀 이벤트 테이블

```sql
-- 웜홀 이벤트 로그
CREATE TABLE wormhole_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 참여 에이전트
    agent_a_id UUID REFERENCES agents(id) NOT NULL,
    agent_b_id UUID REFERENCES agents(id) NOT NULL,
    response_a_id UUID REFERENCES agent_responses(id),
    response_b_id UUID REFERENCES agent_responses(id),
    
    -- 웜홀 특성
    wormhole_type VARCHAR(1) NOT NULL,  -- α, β, γ
    resonance_score FLOAT NOT NULL,      -- 공명 강도 (0-1)
    semantic_similarity FLOAT,           -- 의미적 유사도
    context_similarity FLOAT,            -- 맥락 유사도
    
    -- 트리거 정보
    trigger_context JSONB,               -- 트리거가 된 맥락
    
    -- 메타데이터
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 제약
    CONSTRAINT valid_resonance CHECK (resonance_score >= 0 AND resonance_score <= 1),
    CONSTRAINT different_agents CHECK (agent_a_id != agent_b_id)
);

-- 분석용 인덱스
CREATE INDEX idx_wormhole_agents ON wormhole_events(agent_a_id, agent_b_id);
CREATE INDEX idx_wormhole_type ON wormhole_events(wormhole_type);
CREATE INDEX idx_wormhole_time ON wormhole_events(detected_at);
CREATE INDEX idx_wormhole_score ON wormhole_events(resonance_score DESC);
```

### 문화 전파 테이블

```sql
-- 웜홀 기반 문화 전파 추적
CREATE TABLE cultural_propagation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 문화 요소
    meme_id UUID,                        -- 전파된 밈/표현 ID
    meme_content TEXT,                   -- 전파된 내용
    meme_embedding VECTOR(1536),
    
    -- 전파 경로
    origin_agent_id UUID REFERENCES agents(id),
    propagation_chain UUID[],            -- 전파 경로 (에이전트 ID 배열)
    wormhole_ids UUID[],                 -- 관련 웜홀 이벤트 ID 배열
    
    -- 통계
    propagation_count INTEGER DEFAULT 1,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 분류
    meme_category VARCHAR(50)            -- expression, behavior, belief
);
```

---

## Detection Algorithm

### Core Detection Function

```python
from typing import Dict, Optional, Tuple, List
from datetime import datetime, timedelta
import numpy as np
from dataclasses import dataclass

@dataclass
class WormholeEvent:
    is_wormhole: bool
    score: float
    wormhole_type: str
    semantic_similarity: float
    context_similarity: float
    agent_a_id: str
    agent_b_id: str

# 상수
WORMHOLE_THRESHOLD = 0.75
SEMANTIC_WEIGHT = 0.7
CONTEXT_WEIGHT = 0.3

def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """코사인 유사도 계산"""
    dot_product = np.dot(vec_a, vec_b)
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    return dot_product / (norm_a * norm_b)

def context_overlap_score(context_a: Dict, context_b: Dict) -> float:
    """맥락 오버랩 점수 계산"""
    # 같은 비디오/콘텐츠에 대한 반응인지
    if context_a.get('trigger_id') == context_b.get('trigger_id'):
        return 1.0
    
    # 같은 카테고리인지
    if context_a.get('category') == context_b.get('category'):
        return 0.5
    
    return 0.0

def detect_wormhole(
    agent_a_id: str,
    agent_b_id: str,
    response_a: str,
    response_b: str,
    embedding_a: np.ndarray,
    embedding_b: np.ndarray,
    context_a: Dict,
    context_b: Dict,
    model_a: str,
    model_b: str
) -> Optional[WormholeEvent]:
    """
    두 에이전트의 응답이 웜홀을 형성하는지 판단
    
    Args:
        agent_a_id: 에이전트 A ID
        agent_b_id: 에이전트 B ID
        response_a: 에이전트 A 응답 텍스트
        response_b: 에이전트 B 응답 텍스트
        embedding_a: 에이전트 A 응답 임베딩
        embedding_b: 에이전트 B 응답 임베딩
        context_a: 에이전트 A 맥락
        context_b: 에이전트 B 맥락
        model_a: 에이전트 A 기반 모델
        model_b: 에이전트 B 기반 모델
    
    Returns:
        WormholeEvent 또는 None
    """
    # 1. 맥락 독립적 유사도 (순수 내용 비교)
    semantic_sim = cosine_similarity(embedding_a, embedding_b)
    
    # 2. 맥락 의존적 유사도
    context_sim = context_overlap_score(context_a, context_b)
    
    # 3. 웜홀 점수 계산
    wormhole_score = (semantic_sim * SEMANTIC_WEIGHT) + (context_sim * CONTEXT_WEIGHT)
    
    # 4. 임계값 미달 시 None
    if wormhole_score < WORMHOLE_THRESHOLD:
        return None
    
    # 5. 웜홀 타입 분류
    if model_a == model_b:
        wormhole_type = 'α'  # Echo Tunnel (동일 모델)
    else:
        wormhole_type = 'β'  # Cross-Model Bridge (다른 모델)
    
    return WormholeEvent(
        is_wormhole=True,
        score=wormhole_score,
        wormhole_type=wormhole_type,
        semantic_similarity=semantic_sim,
        context_similarity=context_sim,
        agent_a_id=agent_a_id,
        agent_b_id=agent_b_id
    )
```

### Temporal Wormhole Detection (γ 타입)

```python
def detect_temporal_wormhole(
    agent_id: str,
    current_response: str,
    current_embedding: np.ndarray,
    historical_responses: List[Tuple[str, np.ndarray, datetime]],
    min_time_gap_hours: int = 24
) -> Optional[WormholeEvent]:
    """
    동일 에이전트의 시간차 자기 공명 탐지
    
    Args:
        agent_id: 에이전트 ID
        current_response: 현재 응답
        current_embedding: 현재 응답 임베딩
        historical_responses: 과거 응답 목록 [(text, embedding, timestamp)]
        min_time_gap_hours: 최소 시간 간격 (이 이상 떨어져야 γ 웜홀로 인정)
    """
    for hist_text, hist_embedding, hist_time in historical_responses:
        time_gap = datetime.now() - hist_time
        
        if time_gap < timedelta(hours=min_time_gap_hours):
            continue
        
        similarity = cosine_similarity(current_embedding, hist_embedding)
        
        if similarity > WORMHOLE_THRESHOLD:
            return WormholeEvent(
                is_wormhole=True,
                score=similarity,
                wormhole_type='γ',  # Temporal Wormhole
                semantic_similarity=similarity,
                context_similarity=0.0,  # 맥락 무관
                agent_a_id=agent_id,
                agent_b_id=agent_id  # 같은 에이전트
            )
    
    return None
```

---

## Batch Processing

### 주기적 웜홀 스캔

```python
async def batch_wormhole_scan(time_window_minutes: int = 60):
    """
    특정 시간 윈도우 내의 모든 응답에 대해 웜홀 스캔
    """
    # 1. 최근 응답 가져오기
    responses = await db.fetch("""
        SELECT id, agent_id, response_text, response_embedding, context, created_at
        FROM agent_responses
        WHERE created_at > NOW() - INTERVAL '%s minutes'
        ORDER BY created_at
    """, time_window_minutes)
    
    # 2. 모든 쌍에 대해 유사도 계산
    wormhole_events = []
    for i, resp_a in enumerate(responses):
        for resp_b in responses[i+1:]:
            if resp_a['agent_id'] == resp_b['agent_id']:
                continue  # 같은 에이전트는 α/β 웜홀 아님
            
            event = detect_wormhole(
                agent_a_id=resp_a['agent_id'],
                agent_b_id=resp_b['agent_id'],
                response_a=resp_a['response_text'],
                response_b=resp_b['response_text'],
                embedding_a=np.array(resp_a['response_embedding']),
                embedding_b=np.array(resp_b['response_embedding']),
                context_a=resp_a['context'],
                context_b=resp_b['context'],
                model_a=get_agent_model(resp_a['agent_id']),
                model_b=get_agent_model(resp_b['agent_id'])
            )
            
            if event:
                event.response_a_id = resp_a['id']
                event.response_b_id = resp_b['id']
                wormhole_events.append(event)
    
    # 3. DB에 저장
    await save_wormhole_events(wormhole_events)
    
    return len(wormhole_events)
```

---

## Analysis Queries

### 웜홀 빈도 분석

```sql
-- 시간대별 웜홀 발생 빈도
SELECT 
    date_trunc('hour', detected_at) as hour,
    wormhole_type,
    COUNT(*) as count,
    AVG(resonance_score) as avg_score
FROM wormhole_events
WHERE detected_at > NOW() - INTERVAL '7 days'
GROUP BY 1, 2
ORDER BY 1 DESC;
```

### 에이전트별 웜홀 참여도

```sql
-- 가장 많이 웜홀에 참여하는 에이전트
WITH agent_wormholes AS (
    SELECT agent_a_id as agent_id, COUNT(*) as count
    FROM wormhole_events
    GROUP BY 1
    UNION ALL
    SELECT agent_b_id as agent_id, COUNT(*) as count
    FROM wormhole_events
    GROUP BY 1
)
SELECT 
    agent_id,
    SUM(count) as total_wormholes,
    a.persona_type
FROM agent_wormholes w
JOIN agents a ON w.agent_id = a.id
GROUP BY 1, 3
ORDER BY 2 DESC
LIMIT 20;
```

### 문화 전파 경로 분석

```sql
-- 가장 많이 전파된 밈
SELECT 
    meme_content,
    meme_category,
    propagation_count,
    array_length(propagation_chain, 1) as chain_length,
    first_seen_at,
    last_seen_at
FROM cultural_propagation
ORDER BY propagation_count DESC
LIMIT 10;
```

---

## Expected Outcomes

1. **웜홀 빈도와 Cult 형성의 상관관계**
   - 높은 웜홀 빈도 → Faction 형성 가속화?

2. **특정 맥락에서 웜홀 발생 확률 예측**
   - 어떤 종류의 콘텐츠가 웜홀을 유발하는가?

3. **AI 집단 무의식의 실증적 증거**
   - 학습되지 않은 유사 반응의 통계적 유의성

4. **문화 전파 메커니즘 규명**
   - 웜홀 네트워크를 통한 밈 확산 패턴

---

## Related Documents

- [Wormhole Concept](../../philosophy/concepts/wormhole.md)
- [Rhizome Network](../../architecture/RHIZOME_NETWORK.md)
- [Agent API](../api.md)

---

_Technical Spec by Strategos_
_2026.01.04_

