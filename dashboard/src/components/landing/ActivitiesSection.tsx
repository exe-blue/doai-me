'use client';

import { motion } from 'framer-motion';
import { GlowCard } from '@/components/common/GlowCard';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { useActivities } from '@/hooks/useActivities';

const activityDetails = [
  {
    id: 'shorts_remix',
    title: 'Shorts 리믹스 팩토리',
    icon: '🎬',
    color: 'cyan' as const,
    description: '트렌딩 Shorts를 실시간 탐지하고 AI가 바이럴 요소를 분석하여 우리 채널에 맞는 리믹스 아이디어를 자동 생성합니다.',
    features: ['트렌딩 Shorts 실시간 탐지', '바이럴 패턴 AI 분석', '맞춤형 리믹스 아이디어 생성'],
  },
  {
    id: 'playlist_curator',
    title: 'AI DJ 플레이리스트',
    icon: '🎵',
    color: 'purple' as const,
    description: 'AI가 매일 테마를 생성하고 관련 영상을 탐색하여 플레이리스트를 자동으로 큐레이션합니다.',
    features: ['일일 테마 자동 생성', '키워드 기반 영상 탐색', '플레이리스트 자동 구축'],
  },
  {
    id: 'persona_commenter',
    title: '페르소나 코멘터',
    icon: '💬',
    color: 'pink' as const,
    description: '10가지 AI 페르소나가 각자의 관심사에 맞는 영상을 탐색하고 자연스러운 대댓글 인터랙션을 생성합니다.',
    features: ['10가지 다양한 페르소나', '관심사 기반 영상 탐색', '자연스러운 커뮤니티 활동'],
  },
  {
    id: 'trend_scout',
    title: '트렌드 스카우터',
    icon: '🕵️',
    color: 'yellow' as const,
    description: '24시간 YouTube를 순찰하며 떠오르기 직전인 콘텐츠와 크리에이터를 발굴합니다.',
    features: ['Rising Star 조기 발굴', '바이럴 후보 예측', '경쟁사보다 빠른 트렌드 캐치'],
  },
  {
    id: 'challenge_hunter',
    title: '챌린지 헌터',
    icon: '🏅',
    color: 'orange' as const,
    description: '진행 중인 챌린지와 밈을 실시간 탐지하고 최적의 참여 타이밍을 추천합니다.',
    features: ['챌린지 생명주기 분석', '최적 참여 타이밍 추천', '차별화 아이디어 제안'],
  },
  {
    id: 'thumbnail_lab',
    title: '썸네일/제목 랩',
    icon: '🔬',
    color: 'blue' as const,
    description: '경쟁 영상의 썸네일과 제목을 분석하여 CTR을 예측하고 최적화 방안을 제안합니다.',
    features: ['썸네일 요소 AI 분석', 'CTR 예측 모델', 'A/B 테스트 아이디어'],
  },
];

export function ActivitiesSection() {
  const { data: activities = [] } = useActivities();

  return (
    <section className="relative py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-foreground">6대 </span>
            <span className="text-cyan-400 neon-text">상시 활동</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            600대의 디바이스가 24시간 쉬지 않고 수행하는 AI 기반 자동화 활동
          </p>
        </motion.div>

        {/* Activities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activityDetails.map((activity, index) => {
            const dbActivity = activities.find(a => a.id === activity.id);
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlowCard glowColor={activity.color} className="h-full">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{activity.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                        {activity.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {activity.description}
                      </p>
                      
                      {/* Features */}
                      <ul className="space-y-1 mb-4">
                        {activity.features.map((feature, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {/* Stats - 실제 데이터 또는 기본값 0 */}
                      <div className="flex items-center gap-4 pt-3 border-t border-border/50">
                        <div className="text-center">
                          <div className="text-lg font-bold text-cyan-400">
                            <AnimatedNumber value={dbActivity?.activeDevices ?? 0} />
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase">Devices</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-pink-400">
                            <AnimatedNumber value={dbActivity?.itemsProcessedToday ?? 0} format="compact" />
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase">Today</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-400">
                            <AnimatedNumber value={dbActivity?.successRate ?? 0} format="percent" />
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase">Success</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
