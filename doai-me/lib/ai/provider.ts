/**
 * AI Provider 설정
 * Vercel AI SDK + Google Gemini 연동
 */
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Google Generative AI 프로바이더 생성
export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

// 기본 모델: Gemini 2.0 Flash (빠른 응답, 비용 효율)
export const model = gemini("gemini-2.0-flash-exp");

// 고품질 분석용 모델 (필요시 사용)
export const modelPro = gemini("gemini-1.5-pro-latest");

// 모델 설정 타입
export interface AIModelConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
}

// 기본 설정
export const defaultConfig: AIModelConfig = {
  temperature: 0.3, // 일관된 응답을 위해 낮게 설정
  maxOutputTokens: 200, // 1-2문장 응답에 적합
  topP: 0.9,
};
