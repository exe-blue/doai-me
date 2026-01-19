/**
 * AI 스트리밍 텍스트 표시 컴포넌트
 * 타이핑 효과와 함께 텍스트 표시
 */
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AIStreamingTextProps {
  text: string;
  isStreaming?: boolean;
  className?: string;
}

export function AIStreamingText({
  text,
  isStreaming = false,
  className,
}: AIStreamingTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [showCursor, setShowCursor] = useState(isStreaming);

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  // 커서 깜빡임 효과
  useEffect(() => {
    if (!isStreaming) {
      setShowCursor(false);
      return;
    }

    setShowCursor(true);
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <span className={cn("text-sm text-white leading-relaxed", className)}>
      {displayText}
      {showCursor && (
        <span className="inline-block w-0.5 h-4 bg-emerald-400 ml-0.5 animate-pulse" />
      )}
    </span>
  );
}
