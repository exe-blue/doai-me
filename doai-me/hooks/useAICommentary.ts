/**
 * AI Commentary 커스텀 훅
 * Vercel AI SDK useCompletion 래핑
 */
"use client";

import { useCompletion } from "@ai-sdk/react";
import { useEffect, useCallback, useRef, useMemo } from "react";
import type { Phase, AICommentaryContext } from "@/lib/ai/prompts";

// Delay to avoid firing AI completion immediately on initial mount.
// This gives React a moment to settle and prevents unintended early requests.
const AUTO_GENERATE_DELAY_MS = 100;

interface UseAICommentaryOptions {
  autoGenerate?: boolean;
  cacheKey?: string;
}

interface UseAICommentaryResult {
  message: string;
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  generate: (customPrompt?: string) => Promise<void>;
  stop: () => void;
}

export function useAICommentary(
  phase: Phase,
  context: AICommentaryContext,
  options: UseAICommentaryOptions = {}
): UseAICommentaryResult {
  const { autoGenerate = true, cacheKey } = options;
  const hasGeneratedRef = useRef(false);
  const contextKeyRef = useRef<string>("");

  // 컨텍스트 변경 감지를 위한 키 생성
  const currentContextKey = useMemo(
    () => JSON.stringify({ phase, context, cacheKey }),
    [phase, context, cacheKey]
  );

  const {
    completion,
    isLoading,
    complete,
    stop,
    error,
  } = useCompletion({
    api: "/api/ai/commentary",
    body: {
      phase,
      context,
    },
  });

  // 자동 생성 및 컨텍스트 변경 시 재생성
  useEffect(() => {
    if (!autoGenerate) return;

    // 컨텍스트가 변경되었는지 확인
    if (contextKeyRef.current === currentContextKey && hasGeneratedRef.current) {
      return;
    }

    contextKeyRef.current = currentContextKey;
    hasGeneratedRef.current = true;

    // 딜레이를 두고 생성 (컴포넌트 마운트 직후 방지)
    const timer = setTimeout(() => {
      complete("");
    }, AUTO_GENERATE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [autoGenerate, currentContextKey, complete]);

  // 수동 생성 함수
  const generate = useCallback(
    async (customPrompt?: string) => {
      await complete(customPrompt || "");
    },
    [complete]
  );

  return {
    message: completion,
    isLoading,
    isStreaming: isLoading && completion.length > 0,
    error: error || null,
    generate,
    stop,
  };
}
