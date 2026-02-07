// apps/web/app/channel/components/ChannelHeroSection.tsx
// Channel 페이지 히어로 섹션 - 매체 운영자용 소개

'use client';

import Image from 'next/image';
import { Tv, Eye, BarChart3, Rss } from 'lucide-react';

export function ChannelHeroSection() {
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
                Channel
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              당신의 채널이
              <br />
              <span className="text-[#FFCC00]">얼마나 시청</span>되는지 확인하세요
            </h1>

            <p className="text-neutral-400 text-lg mb-6 max-w-xl">
              YouTube 채널을 연동하면 새로운 영상이 자동으로 등록되고,
              실시간으로 시청 통계를 확인할 수 있습니다.
              TV 편성표처럼 채널별 성과를 한눈에 파악하세요.
            </p>

            {/* 주요 기능 */}
            <div className="flex flex-wrap gap-4">
              <FeatureBadge icon={Rss} text="자동 영상 등록" />
              <FeatureBadge icon={Eye} text="실시간 시청 통계" />
              <FeatureBadge icon={BarChart3} text="채널별 분석" />
            </div>
          </div>

          {/* 오른쪽: 통계 */}
          <div className="flex-shrink-0 grid grid-cols-2 gap-4">
            <StatBox value="24h" label="자동 확인 주기" color="text-[#FFCC00]" />
            <StatBox value="Real-time" label="시청 현황" color="text-green-400" />
            <StatBox value="Auto" label="영상 등록" color="text-blue-400" />
            <StatBox value="TV Style" label="편성표 UI" color="text-purple-400" />
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
