/**
 * AI Library - 통합 내보내기
 */
export { gemini, model, modelPro, defaultConfig } from "./provider";
export type { AIModelConfig } from "./provider";

export {
  SILENT_STRATEGIST_SYSTEM,
  PHASE_PROMPTS,
  buildContextPrompt,
} from "./prompts";
export type {
  Phase,
  SignalData,
  IndicatorData,
  PositionData,
  AICommentaryContext,
} from "./prompts";
