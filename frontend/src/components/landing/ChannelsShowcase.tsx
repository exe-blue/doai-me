'use client';

import { motion } from 'framer-motion';
import { GlowCard } from '@/components/common/GlowCard';
import { LevelBadge } from '@/components/common/LevelBadge';
import { StatBar } from '@/components/common/StatBar';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { mockChannels } from '@/data/mock';
import { TrendingUp, Users, Eye, Trophy } from 'lucide-react';

export function ChannelsShowcase() {
  const topChannels = mockChannels.slice(0, 3);

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto">
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
            <span className="text-foreground">크리에이터 </span>
            <span className="text-pink-400 neon-text-pink">성장 게임화</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            채널을 RPG 캐릭터처럼 육성하고, 퀘스트를 완료하며, 카테고리 1위를 향해 경쟁하세요
          </p>
        </motion.div>

        {/* Channel Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {topChannels.map((channel, index) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <GlowCard 
                glowColor={index === 0 ? 'yellow' : index === 1 ? 'purple' : 'cyan'} 
                className="h-full"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-2xl">
                      {channel.category === '게임' ? '🎮' : 
                       channel.category === '뷰티' ? '💄' : 
                       channel.category === 'IT/테크' ? '💻' : 
                       channel.category === '요리' ? '🍳' : '💪'}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{channel.name}</h3>
                      <span className="text-xs text-muted-foreground">{channel.category}</span>
                    </div>
                  </div>
                  <LevelBadge level={channel.level} size="md" />
                </div>

                {/* Rank & Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-lg bg-background/50">
                  <div className="text-center">
                    <Trophy className={`w-4 h-4 mx-auto mb-1 ${
                      channel.categoryRank <= 3 ? 'text-yellow-400' : 'text-muted-foreground'
                    }`} />
                    <div className="text-lg font-bold">#{channel.categoryRank}</div>
                    <div className="text-[10px] text-muted-foreground">Category</div>
                  </div>
                  <div className="text-center">
                    <Users className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                    <div className="text-lg font-bold">
                      <AnimatedNumber value={channel.subscriberCount} format="compact" />
                    </div>
                    <div className="text-[10px] text-muted-foreground">Subs</div>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-400" />
                    <div className="text-lg font-bold text-green-400">
                      +<AnimatedNumber value={channel.weeklyGrowth} format="percent" />
                    </div>
                    <div className="text-[10px] text-muted-foreground">Weekly</div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <StatBar label="HP" value={channel.stats.hp} color="hp" size="sm" />
                  <StatBar label="MP" value={channel.stats.mp} color="mp" size="sm" />
                  <StatBar label="ATK" value={channel.stats.atk} color="atk" size="sm" />
                  <StatBar label="DEF" value={channel.stats.def} color="def" size="sm" />
                  <StatBar label="SPD" value={channel.stats.spd} color="spd" size="sm" />
                  <StatBar label="INT" value={channel.stats.int} color="int" size="sm" />
                </div>

                {/* EXP Bar */}
                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">EXP</span>
                    <span className="text-cyan-400">
                      {channel.experiencePoints.toLocaleString()} / {channel.experienceToNextLevel.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-cyan-500/20 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(channel.experiencePoints / channel.experienceToNextLevel) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>

        {/* Stats Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {[
            { stat: 'HP', name: '구독자 유지율', icon: '❤️' },
            { stat: 'MP', name: '업로드 일관성', icon: '💎' },
            { stat: 'ATK', name: '바이럴 파워', icon: '⚔️' },
            { stat: 'DEF', name: '커뮤니티 건강', icon: '🛡️' },
            { stat: 'SPD', name: '성장 속도', icon: '⚡' },
            { stat: 'INT', name: 'AI 추천 수용', icon: '🧠' },
          ].map((item, i) => (
            <div key={i} className="text-center p-3 rounded-lg bg-card/50 border border-border/30">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-xs font-bold text-muted-foreground">{item.stat}</div>
              <div className="text-[10px] text-muted-foreground/70">{item.name}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
