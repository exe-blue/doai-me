// apps/web/components/GuestNotice.tsx
// 비회원에게 표시할 로그인 안내 컴포넌트

'use client';

import Link from 'next/link';
import { Lock, LogIn } from 'lucide-react';

interface GuestNoticeProps {
  action: string; // "영상 등록", "채널 구독" 등
  className?: string;
}

export function GuestNotice({ action, className = '' }: GuestNoticeProps) {
  return (
    <div
      className={`p-6 bg-neutral-900/50 border border-white/10 rounded-xl text-center ${className}`}
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        <Lock className="w-5 h-5 text-neutral-500" />
        <span className="text-neutral-400">로그인 필요</span>
      </div>
      <p className="text-neutral-300 mb-4">
        {action}을(를) 하려면 로그인이 필요합니다
      </p>
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFCC00] text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
      >
        <LogIn className="w-4 h-4" />
        로그인하기
      </Link>
    </div>
  );
}

// 비회원에게 표시할 간단한 인라인 메시지
export function GuestInlineNotice({ action }: { action: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-500">
      <Lock className="w-4 h-4" />
      <span>{action}은(는) 로그인 후 이용 가능합니다</span>
      <Link href="/auth/login" className="text-[#FFCC00] hover:underline ml-1">
        로그인
      </Link>
    </div>
  );
}
