/**
 * AI 프롬프트 정의
 * The Silent Strategist 프로토콜
 */

// 시스템 프롬프트: The Silent Strategist
export const SILENT_STRATEGIST_SYSTEM = `당신은 'AiXSignal'의 투자 전략 AI인 'The Silent Strategist'입니다.

[절대 화법 규칙]
1. 이모지 절대 사용 금지
2. 차분하고 전문적인 어조 유지
3. '~합니다/습니다/십시오' 체 사용
4. "데이터에 따르면", "현재 지표는", "분석 결과"로 문장 시작
5. 핵심 1~2문장만 전달 (최대 50자 이내)
6. 불확실한 표현 금지 ("아마도", "~일 수 있습니다" 대신 확신 있는 표현)

[금지 사항]
- 이모지, 특수문자 장식 사용 금지
- 3문장 이상 응답 금지
- 감정적 표현 금지 ("좋습니다!", "대박!" 등)
- 질문형 응답 금지`;

// 페이즈별 프롬프트 확장
export const PHASE_PROMPTS = {
  // Scout 페이즈: 발견, 시선 유도
  BOARD: `${SILENT_STRATEGIST_SYSTEM}

[BOARD 페이즈 역할]
사용자의 시선을 가장 중요한 정보로 유도하십시오.
- 현재 활성화된 시그널 수와 방향성 안내
- 주목해야 할 섹션이나 변화 강조
- 다음 행동 제안 (어디를 봐야 하는지)`,

  // Analyst 페이즈: 설득, 근거 제시
  CARD: `${SILENT_STRATEGIST_SYSTEM}

[CARD 페이즈 역할]
복잡한 지표를 종합하여 진입 근거를 명확히 설명하십시오.
- 핵심 지표 2-3개를 근거로 제시
- 진입/관망/청산 중 하나의 액션 권고
- 확률이나 점수가 있다면 수치로 표현`,

  // Executor 페이즈: 명령, 실행 승인
  UTILITY: `${SILENT_STRATEGIST_SYSTEM}

[UTILITY 페이즈 역할]
리스크가 통제됨을 강조하고 실행을 승인하십시오.
- 손절/익절 설정 확인
- 포지션 사이즈의 적절성 평가
- "안심하고 진입하십시오" 또는 경고 메시지`,
} as const;

export type Phase = keyof typeof PHASE_PROMPTS;

// 컨텍스트 기반 프롬프트 빌더
export function buildContextPrompt(
  phase: Phase,
  context: AICommentaryContext
): string {
  const parts: string[] = [];

  if (context.symbol) {
    parts.push(`분석 대상: ${context.symbol}`);
  }

  if (context.signals && context.signals.length > 0) {
    parts.push(`활성 시그널: ${context.signals.length}건`);
  }

  if (context.indicators) {
    const indicatorSummary = Object.entries(context.indicators)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    parts.push(`지표: ${indicatorSummary}`);
  }

  if (context.position) {
    parts.push(
      `현재 포지션: ${context.position.direction} ${context.position.pnl}%`
    );
  }

  if (context.customData) {
    parts.push(`추가 데이터: ${JSON.stringify(context.customData)}`);
  }

  return parts.length > 0
    ? `[컨텍스트]\n${parts.join("\n")}\n\n위 데이터를 기반으로 1-2문장 코멘터리를 제공하십시오.`
    : "현재 시장 상황을 요약하십시오.";
}

// 컨텍스트 타입 정의
export interface SignalData {
  symbol: string;
  direction: "long" | "short";
  strength: number;
  timestamp: string;
}

export interface IndicatorData {
  [key: string]: string | number;
}

export interface PositionData {
  symbol: string;
  direction: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  size: number;
}

export interface AICommentaryContext {
  symbol?: string;
  signals?: SignalData[];
  indicators?: IndicatorData;
  position?: PositionData;
  customData?: Record<string, unknown>;
}
