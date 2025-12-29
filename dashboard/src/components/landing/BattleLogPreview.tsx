'use client';

import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Flame, Target, Trophy, Swords } from 'lucide-react';
import { useBattleLog } from '@/hooks/useBattleLog';

const eventIcons = {
  viral_hit: Flame,
  rank_up: TrendingUp,
  rank_down: TrendingDown,
  quest_complete: Trophy,
  trend_catch: Target,
  challenge_join: Swords,
};

const eventColors = {
  viral_hit: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  rank_up: 'text-green-400 bg-green-500/10 border-green-500/30',
  rank_down: 'text-red-400 bg-red-500/10 border-red-500/30',
  quest_complete: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  trend_catch: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  challenge_join: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

export function BattleLogPreview() {
  const { data: battleLog = [] } = useBattleLog();

  return (
    <section className="relative py-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-foreground">배틀 </span>
            <span className="text-orange-400" style={{ textShadow: '0 0 20px rgba(251, 146, 60, 0.5)' }}>
              로그
            </span>
          </h2>
          <p className="text-muted-foreground text-lg">
            실시간으로 펼쳐지는 채널 간의 경쟁과 성장 이벤트
          </p>
        </motion.div>

        {/* Battle Log Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
              </div>
              <span className="text-sm font-medium">LIVE FEED</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {battleLog.length} events today
            </span>
          </div>

          {/* Log Entries */}
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {battleLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  아직 기록된 이벤트가 없습니다
                </div>
              ) : (
                battleLog.map((entry, index) => {
                  const Icon = eventIcons[entry.eventType as keyof typeof eventIcons] || Flame;
                  const colorClass = eventColors[entry.eventType as keyof typeof eventColors] || eventColors.viral_hit;
                  
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`flex items-start gap-4 p-3 rounded-lg border ${colorClass}`}
                    >
                      <div className="mt-0.5">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{entry.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.createdAt), { 
                              addSuffix: true,
                              locale: ko 
                            })}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-background/50">
                            Impact: {entry.impactScore}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </motion.div>
      </div>
    </section>
  );
}
