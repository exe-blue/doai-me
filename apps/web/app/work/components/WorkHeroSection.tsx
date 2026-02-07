// apps/web/app/work/components/WorkHeroSection.tsx
// Work 페이지 히어로 섹션 - 광고주용 소개

'use client';

import Image from 'next/image';
import { Play, Smartphone, TrendingUp, Users } from 'lucide-react';

export function WorkHeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 border border-white/10 mb-8">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/images/hero-bg.png')] bg-cover bg-center" />
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 px-8 py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* 왼쪽: 텍스트 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/logo.svg"
                alt="DoAi.Me"
                width={100}
                height={32}
                className="h-8 w-auto"
              />
              <span className="text-[#FFCC00] font-mono text-sm uppercase tracking-wider">
                Work
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              영상을 등록하면
              <br />
              <span className="text-[#FFCC00]">600+ 디바이스</span>가 시청합니다
            </h1>

            <p className="text-neutral-400 text-lg mb-6 max-w-xl">
              YouTube 영상 URL을 입력하면 실제 Android 디바이스에서 자연스러운 패턴으로 시청합니다.
              제목 검색 → 영상 선택 → 시청 → 좋아요까지 인간적인 행동 패턴을 구현합니다.
            </p>

            {/* 주요 기능 */}
            <div className="flex flex-wrap gap-4">
              <FeatureBadge icon={Play} text="제목 검색 시청" />
              <FeatureBadge icon={Smartphone} text="실제 디바이스" />
              <FeatureBadge icon={TrendingUp} text="자연스러운 패턴" />
            </div>
          </div>

          {/* 오른쪽: 통계 */}
          <div className="flex-shrink-0 grid grid-cols-2 gap-4">
            <StatBox value="600+" label="활성 디바이스" color="text-[#FFCC00]" />
            <StatBox value="30-180s" label="시청 시간" color="text-green-400" />
            <StatBox value="10%" label="좋아요 확률" color="text-blue-400" />
            <StatBox value="100%" label="타겟 범위" color="text-purple-400" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureBadge({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
      <Icon className="w-4 h-4 text-[#FFCC00]" />
      <span className="text-sm text-neutral-300">{text}</span>
    </div>
  );
}

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/5 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  );
}
