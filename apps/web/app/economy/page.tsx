// apps/web/app/economy/page.tsx
// 보상 구조 대시보드 페이지 - v0.dev 연동 대기

import { Coins, Construction } from 'lucide-react';
import { Header } from '@/components/header';

export default function EconomyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* 전역 헤더 */}
      <Header
        variant="back"
        pageTitle="Economy"
        pageIcon={<Coins className="w-5 h-5" />}
      />

      {/* 메인 콘텐츠 - Placeholder */}
      <div className="flex-1 flex items-center justify-center pt-16">
        <div className="text-center px-4">
          <Construction className="w-16 h-16 mx-auto mb-6 text-[#FFCC00] opacity-50" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            보상 구조 대시보드
          </h2>
          <p className="text-neutral-500 max-w-md mx-auto mb-8">
            Consume 활동에 따른 보상 분배 시스템을 확인할 수 있는 페이지입니다.
            <br />
            v0.dev에서 디자인 작업 후 연동 예정입니다.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full text-sm">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            v0.dev 연동 대기 중
          </div>
        </div>
      </div>
    </main>
  );
}
