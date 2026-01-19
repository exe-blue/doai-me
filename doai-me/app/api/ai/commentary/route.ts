/**
 * AI Commentary API Route
 * Vercel AI SDK 스트리밍 엔드포인트
 */
import { streamText } from "ai";
import { model, defaultConfig } from "@/lib/ai/provider";
import {
  PHASE_PROMPTS,
  buildContextPrompt,
  type Phase,
  type AICommentaryContext,
} from "@/lib/ai/prompts";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phase, context, prompt: customPrompt } = body as {
      phase: Phase;
      context: AICommentaryContext;
      prompt?: string;
    };

    // 페이즈별 시스템 프롬프트 선택
    const systemPrompt = PHASE_PROMPTS[phase] || PHASE_PROMPTS.BOARD;

    // 사용자 프롬프트 생성
    const userPrompt = customPrompt || buildContextPrompt(phase, context);

    // 스트리밍 응답 생성
    const result = await streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: defaultConfig.temperature,
      maxOutputTokens: defaultConfig.maxOutputTokens,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[AI Commentary] Error:", error);
    return new Response(
      JSON.stringify({
        error: "AI 응답 생성 중 오류가 발생했습니다.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// GET 요청은 허용하지 않음
export async function GET() {
  return new Response(
    JSON.stringify({ error: "Method not allowed. Use POST." }),
    {
      status: 405,
      headers: { "Content-Type": "application/json" },
    }
  );
}
