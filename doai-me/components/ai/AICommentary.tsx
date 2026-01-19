/**
 * AI Commentary 메인 컴포넌트
 * The Silent Strategist 프로토콜 적용
 */
"use client";

import { useAICommentary } from "@/hooks/useAICommentary";
import { AICommentarySkeleton } from "./AICommentarySkeleton";
import { AIStreamingText } from "./AIStreamingText";
import { cn } from "@/lib/utils";
import type { Phase, AICommentaryContext } from "@/lib/ai/prompts";

interface AICommentaryProps {
  phase: Phase;
  context: AICommentaryContext;
  className?: string;
  autoGenerate?: boolean;
}

export function AICommentary({
  phase,
  context,
  className,
  autoGenerate = true,
}: AICommentaryProps) {
  const { message, isLoading, isStreaming, generate, error } = useAICommentary(
    phase,
    context,
    { autoGenerate }
  );

  // 에러 상태
  if (error) {
    return (
      <div
        className={cn(
          "bg-red-900/20 p-3 rounded-lg border-l-4 border-red-500",
          className
        )}
      >
        <h4 className="text-xs text-red-400 font-bold mb-1 tracking-wider">
          SYSTEM ERROR
        </h4>
        <p className="text-sm text-red-300">분석 서비스에 연결할 수 없습니다.</p>
      </div>
    );
  }

  // 로딩 상태 (초기 로딩, 스트리밍 시작 전)
  if (isLoading && !message) {
    return <AICommentarySkeleton className={className} />;
  }

  // 메시지가 없고 자동 생성이 아닌 경우 버튼 표시
  if (!message && !autoGenerate) {
    return (
      <div
        className={cn(
          "bg-slate-900/60 p-3 rounded-lg border-l-4 border-slate-600",
          className
        )}
      >
        <button
          onClick={() => generate()}
          className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
        >
          AI 분석 요청하기
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-slate-900/80 p-3 rounded-lg border-l-4 border-emerald-500 backdrop-blur-sm",
        className
      )}
    >
      {/* 헤더 */}
      <h4 className="text-xs text-emerald-400 font-bold mb-1 tracking-wider">
        THE SILENT STRATEGIST
      </h4>
      {/* 메시지 */}
      <AIStreamingText text={message || ""} isStreaming={isStreaming} />
    </div>
  );
}

// Re-export types for convenience
export type { Phase, AICommentaryContext };
