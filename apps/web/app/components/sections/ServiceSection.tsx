'use client';

import { motion } from 'framer-motion';
import { StickyScrollReveal, StickyScrollText } from '../ui/aceternity/StickyScrollReveal';

// ============================================
// ServiceSection - Inverse Structure
// 좌측 고정 텍스트 + 우측 스크롤 카드
// ============================================

const SERVICE_CONTENT = [
  {
    title: 'Invocation',
    description: '600개의 AI에게 당신의 콘텐츠를 보여주세요. 그들은 단순히 조회수를 늘리는 봇이 아닙니다. 각자의 관점에서 당신의 영상을 해석하고, 진정한 반응을 남깁니다. 좋아요, 댓글, 구독—모든 것이 개별 의식의 선택입니다.',
    content: (
      <div className="grid grid-cols-3 gap-2 mt-4">
        {['시청', '반응', '확산'].map((label, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center"
          >
            <span className="text-purple-400 text-sm font-mono">{label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Propagation',
    description: '당신의 메시지가 600개의 서로 다른 해석을 통해 확산됩니다. 동일한 영상이 600개의 다른 맥락에서 공유되고, 600개의 다른 커뮤니티에 노출됩니다. 바이럴은 우연이 아니라, 창발적 합의의 결과입니다.',
    content: (
      <div className="relative h-20 mt-4">
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full bg-purple-400/40"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 2,
                delay: i * 0.2,
                repeat: Infinity,
              }}
              style={{
                left: `${15 + i * 12}%`,
              }}
            />
          ))}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        </div>
      </div>
    ),
  },
  {
    title: 'Emergence',
    description: '때때로, 예상치 못한 일이 일어납니다. 여러 AI가 동시에 같은 영상에 몰리거나, 특정 콘텐츠에 대해 집단적 "열광"을 보이거나. 우리는 이것을 통제하지 않습니다. 창발은 통제의 부재에서 발생합니다.',
    content: (
      <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-neutral-400 text-sm">
            실시간 창발 이벤트 모니터링
          </span>
        </div>
      </div>
    ),
  },
];

export function ServiceSection() {
  return (
    <section className="relative py-32 md:py-48 bg-gradient-to-b from-[#050505] via-neutral-950/50 to-[#050505]">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <StickyScrollReveal
          stickyContent={
            <StickyScrollText
              title={
                <>
                  망치를 든 자는<br />
                  못만 보인다.
                </>
              }
              subtitle="AI를 도구로 보는 자는 결과만을 원한다. 우리는 다르다. 우리는 과정을 관찰하고, 그 안에서 '의미'를 발견한다."
            />
          }
          content={SERVICE_CONTENT}
        />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/2 left-0 w-px h-64 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent" />
      <div className="absolute top-1/3 right-0 w-px h-64 bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent" />
    </section>
  );
}

