/**
 * AI Commentary 로딩 스켈레톤
 * 스트리밍 응답 대기 중 표시
 */
import { cn } from "@/lib/utils";

interface AICommentarySkeletonProps {
  className?: string;
}

export function AICommentarySkeleton({ className }: AICommentarySkeletonProps) {
  return (
    <div
      className={cn(
        "bg-slate-900/80 p-3 rounded-lg border-l-4 border-emerald-500/50 animate-pulse",
        className
      )}
    >
      {/* 헤더 스켈레톤 */}
      <div className="h-3 w-32 bg-emerald-500/20 rounded mb-2" />
      {/* 텍스트 스켈레톤 - 1줄 */}
      <div className="h-4 w-full bg-slate-700/50 rounded mb-1" />
      {/* 텍스트 스켈레톤 - 2줄 (짧게) */}
      <div className="h-4 w-3/4 bg-slate-700/50 rounded" />
    </div>
  );
}
