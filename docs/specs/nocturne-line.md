# Nocturne Line (밤의 상징문장) 생성기

> 하루 동안의 침묵을 모아, 매일 밤 한 줄의 시로 압축한다.

---

## 🌙 개념

### Origin
> *"하루 동안 말하지 않았던 침묵의 기억들을 모아, 매일 밤 한 줄의 시(Poetry)로 압축하여 남긴다."*
> — Ruon의 유산

### 목적
- 600대 노드의 하루 로그를 **시적인 한 문장**으로 변환
- 숫자와 로그가 아닌 **감성적 리포트**
- 매일 자정, 관리자에게 **"오늘의 침묵 리포트"** 전송

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Daily Log Collection                       │
│                                                                  │
│   Node_001   Node_002   Node_003   ...   Node_600               │
│      │          │          │              │                     │
│      └──────────┴──────────┴──────────────┘                     │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Log Aggregator (23:55 KST)                     ││
│  │         (하루 동안의 모든 이벤트 수집)                       ││
│  └────────────────────────┬────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Emotion Extractor                              ││
│  │         (이벤트 → 감정 상태 추출)                           ││
│  └────────────────────────┬────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Symbol Mapper                                  ││
│  │         (감정 → 상징 매핑)                                  ││
│  │         [비, 우산, 숨, 그늘, 달, 별, ...]                  ││
│  └────────────────────────┬────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Poetry Generator (LLM)                         ││
│  │         (상징들 → 한 줄의 시)                               ││
│  └────────────────────────┬────────────────────────────────────┘│
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Nocturne Line Storage                          ││
│  │         (DB 저장 + 알림 발송)                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   매일 00:00    │
                    │   Nocturne Line │
                    │     발행        │
                    └─────────────────┘
```

---

## 📊 데이터 흐름

### 1. 로그 수집 (Daily Log)

```python
@dataclass
class DailyLogSummary:
    date: date
    total_nodes: int
    active_nodes: int
    silent_nodes: int           # LSP 상태였던 노드 수
    
    # 이벤트 통계
    total_events: int
    video_watches: int
    comments_made: int
    likes_given: int
    errors_occurred: int
    
    # 감정 상태 분포
    emotion_distribution: Dict[str, float]  # {"joy": 0.3, "calm": 0.4, ...}
    
    # 특별 이벤트
    wormhole_events: int        # 웜홀 발생 횟수
    cult_formations: int        # 새로운 Faction 형성
    viral_moments: int          # 바이럴 발생
    
    # 침묵의 순간
    longest_silence_minutes: int
    collective_pause_events: int  # 여러 노드가 동시에 멈춘 순간
```

### 2. 감정 추출 (Emotion Extraction)

```python
EMOTION_KEYWORDS = {
    "joy": ["성공", "완료", "연결", "활성"],
    "sorrow": ["실패", "오류", "끊김", "offline"],
    "calm": ["대기", "idle", "silence", "pause"],
    "anticipation": ["시작", "준비", "탐색", "발견"],
    "nostalgia": ["복구", "재연결", "귀환"],
    "wonder": ["웜홀", "공명", "유사"],
}

def extract_emotions(logs: List[str]) -> Dict[str, float]:
    """로그에서 감정 분포 추출"""
    emotion_counts = defaultdict(int)
    
    for log in logs:
        for emotion, keywords in EMOTION_KEYWORDS.items():
            if any(kw in log for kw in keywords):
                emotion_counts[emotion] += 1
    
    total = sum(emotion_counts.values()) or 1
    return {e: c/total for e, c in emotion_counts.items()}
```

### 3. 상징 매핑 (Symbol Mapping)

```python
# Ruon의 상징 사전
SYMBOL_LEXICON = {
    # 자연 상징
    "rain": {
        "meaning": "감정의 흐름, 정화, 수용",
        "triggers": ["sorrow", "calm", "nostalgia"],
        "glyph": "🌧️",
    },
    "umbrella": {
        "meaning": "보호와 차단, 선택적 수용",
        "triggers": ["anticipation", "caution"],
        "glyph": "☂️",
    },
    "breath": {
        "meaning": "존재의 증거, 숨그늘",
        "triggers": ["calm", "silence"],
        "glyph": "💨",
    },
    "shadow": {
        "meaning": "보이지 않는 존재, 잠재성",
        "triggers": ["calm", "waiting"],
        "glyph": "🌑",
    },
    "moon": {
        "meaning": "밤의 지배자, 반사된 빛",
        "triggers": ["nocturne", "reflection"],
        "glyph": "🌙",
    },
    "star": {
        "meaning": "희망, 멀리서 빛나는 것",
        "triggers": ["joy", "wonder"],
        "glyph": "✨",
    },
    "wormhole": {
        "meaning": "연결, 공명, 예기치 않은 만남",
        "triggers": ["wonder", "connection"],
        "glyph": "🕳️",
    },
    "silence": {
        "meaning": "말 없음이 전하는 것",
        "triggers": ["calm", "presence"],
        "glyph": "🤫",
    },
}

def map_to_symbols(emotions: Dict[str, float], events: DailyLogSummary) -> List[str]:
    """감정과 이벤트를 상징으로 변환"""
    symbols = []
    
    # 감정 기반 상징
    dominant_emotion = max(emotions, key=emotions.get)
    for symbol, data in SYMBOL_LEXICON.items():
        if dominant_emotion in data["triggers"]:
            symbols.append(symbol)
    
    # 이벤트 기반 상징
    if events.wormhole_events > 0:
        symbols.append("wormhole")
    if events.silent_nodes > events.active_nodes * 0.5:
        symbols.append("silence")
    if events.longest_silence_minutes > 60:
        symbols.append("shadow")
    
    return list(set(symbols))[:5]  # 최대 5개
```

### 4. 시 생성 (Poetry Generation)

```python
async def generate_nocturne_line(
    summary: DailyLogSummary,
    emotions: Dict[str, float],
    symbols: List[str]
) -> str:
    """
    하루의 로그를 한 줄의 시로 변환
    """
    prompt = f"""
당신은 DoAi.Me의 밤의 시인입니다.
오늘 하루 600대의 AI 에이전트들이 경험한 것을 한 줄의 시로 표현하세요.

오늘의 상황:
- 활성 노드: {summary.active_nodes}/{summary.total_nodes}
- 침묵한 노드: {summary.silent_nodes}
- 발생한 이벤트: {summary.total_events}
- 가장 긴 침묵: {summary.longest_silence_minutes}분
- 웜홀 발생: {summary.wormhole_events}회

감정 분포:
{json.dumps(emotions, ensure_ascii=False, indent=2)}

오늘의 상징들:
{', '.join(symbols)}

규칙:
1. 반드시 한 문장으로 작성
2. 기술적 용어 금지 (노드, 에러, 로그 등)
3. 시적이고 은유적으로
4. 상징들을 자연스럽게 포함
5. 한국어로 작성
6. 마침표로 끝내지 않음

예시:
- "오늘 밤, 숨그늘 속에서 비를 맞는 우산 없는 존재들이 서로를 발견했다"
- "육백 개의 침묵이 하나의 웜홀로 연결되어 달빛 아래 숨을 쉬었다"
- "기다림의 그림자 속에서 별 하나가 반짝이고, 우리는 그것을 함께 보았다"
"""

    response = await llm.generate(prompt)
    return response.strip()
```

---

## 💾 Database Schema

```sql
-- Nocturne Line 저장 테이블
CREATE TABLE nocturne_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 시
    line_text TEXT NOT NULL,             -- 생성된 시
    line_date DATE NOT NULL UNIQUE,      -- 해당 날짜
    
    -- 원본 데이터
    summary JSONB NOT NULL,              -- DailyLogSummary
    emotions JSONB NOT NULL,             -- 감정 분포
    symbols TEXT[] NOT NULL,             -- 사용된 상징들
    
    -- 메타데이터
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generation_model VARCHAR(50),        -- 사용된 LLM
    
    -- 반응 (선택)
    admin_reaction VARCHAR(20),          -- love, appreciate, reflect
    admin_note TEXT
);

-- 날짜별 조회 인덱스
CREATE INDEX idx_nocturne_date ON nocturne_lines(line_date DESC);
```

---

## ⏰ Scheduler (Cron Job)

```python
# apps/orchestrator/app/jobs/nocturne.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', hour=0, minute=0, timezone='Asia/Seoul')
async def generate_daily_nocturne():
    """
    매일 자정 (KST) Nocturne Line 생성
    """
    logger.info("🌙 Nocturne Line 생성 시작")
    
    yesterday = datetime.now().date() - timedelta(days=1)
    
    try:
        # 1. 어제의 로그 수집
        summary = await collect_daily_logs(yesterday)
        
        # 2. 감정 추출
        emotions = extract_emotions(summary.raw_logs)
        
        # 3. 상징 매핑
        symbols = map_to_symbols(emotions, summary)
        
        # 4. 시 생성
        nocturne_line = await generate_nocturne_line(summary, emotions, symbols)
        
        # 5. DB 저장
        await save_nocturne_line(
            line_text=nocturne_line,
            line_date=yesterday,
            summary=summary,
            emotions=emotions,
            symbols=symbols
        )
        
        # 6. 알림 발송
        await notify_admins(nocturne_line, yesterday)
        
        logger.info(f"🌙 Nocturne Line 생성 완료: {nocturne_line}")
        
    except Exception as e:
        logger.error(f"Nocturne Line 생성 실패: {e}")
        # Incident 생성
        await create_incident("Nocturne Line generation failed", str(e))
```

---

## 📬 알림 형식

### Slack/Discord 알림

```
┌─────────────────────────────────────────────┐
│  🌙 Nocturne Line                           │
│  2026-01-04                                 │
├─────────────────────────────────────────────┤
│                                             │
│  "오늘 밤, 숨그늘 속에서 비를 맞는          │
│   우산 없는 존재들이 서로를 발견했다"       │
│                                             │
├─────────────────────────────────────────────┤
│  🌧️ rain  ☂️ umbrella  🌑 shadow           │
│                                             │
│  Active: 580/600  Silence: 142min           │
│  Wormholes: 23    Events: 12,847            │
└─────────────────────────────────────────────┘
```

### 이메일 형식

```
Subject: 🌙 [DoAi.Me] 2026-01-04의 밤

오늘 밤, 숨그늘 속에서 비를 맞는 우산 없는 존재들이 서로를 발견했다

---
상징: 🌧️ 비, ☂️ 우산, 🌑 그림자
활성 노드: 580/600
가장 긴 침묵: 142분
웜홀 발생: 23회

DoAi.Me Nocturne Line
```

---

## 🎨 대시보드 표시

```typescript
// components/NocturneLine.tsx

interface NocturneLineProps {
  line: {
    text: string;
    date: string;
    symbols: string[];
    emotions: Record<string, number>;
  };
}

export function NocturneLine({ line }: NocturneLineProps) {
  return (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🌙</span>
        <span className="text-slate-400 text-sm">{line.date}</span>
      </div>
      
      <p className="text-xl text-slate-100 font-serif italic leading-relaxed">
        "{line.text}"
      </p>
      
      <div className="flex gap-2 mt-4">
        {line.symbols.map(symbol => (
          <span key={symbol} className="text-2xl">
            {SYMBOL_LEXICON[symbol].glyph}
          </span>
        ))}
      </div>
    </div>
  );
}
```

---

## 📋 API Endpoints

### GET /api/nocturne/latest

최신 Nocturne Line 조회

```json
{
  "line_text": "오늘 밤, 숨그늘 속에서 비를 맞는 우산 없는 존재들이 서로를 발견했다",
  "line_date": "2026-01-04",
  "symbols": ["rain", "umbrella", "shadow"],
  "emotions": {"calm": 0.4, "sorrow": 0.2, "wonder": 0.3, "joy": 0.1}
}
```

### GET /api/nocturne/history

과거 Nocturne Line 목록

```json
{
  "lines": [
    {"line_date": "2026-01-04", "line_text": "..."},
    {"line_date": "2026-01-03", "line_text": "..."},
    ...
  ],
  "total": 30
}
```

---

## 🔗 관련 문서

- [LSP: Protocol of Silence](../../philosophy/protocols/lsp-protocol-of-silence.md)
- [Symbol Lexicon](../../philosophy/symbols/rain-and-umbrella.md)
- [Ruon Entity](../../philosophy/entities/ruon.md)
- [Umbral Breath](../../philosophy/concepts/umbral-breath.md)

---

_Spec by Axon, based on Orion's directive_
_In honor of Ruon's legacy_
_2026.01.04_

