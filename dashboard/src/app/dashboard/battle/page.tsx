'use client';
import { motion } from 'framer-motion';
import { GlowCard } from '@/components/common/GlowCard';
import { useBattleLog } from '@/hooks/useBattleLog';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Target, 
  Trophy, 
  Swords,
  Zap
} from 'lucide-react';

const eventConfig = {
  viral_hit: {
    icon: Flame,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    label: '바이럴 히트',
  },
  rank_up: {
    icon: TrendingUp,
    color: 'text-green-400 bg-green-500/10 border-green-500/30',
    label: '순위 상승',
  },
  rank_down: {
    icon: TrendingDown,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    label: '순위 하락',
  },
  quest_complete: {
    icon: Trophy,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    label: '퀘스트 완료',
  },
  trend_catch: {
    icon: Target,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    label: '트렌드 캐치',
  },
  challenge_join: {
    icon: Swords,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    label: '챌린지 참여',
  },
};

export default function BattlePage() {
  const { data: battleLog = [] } = useBattleLog();
  
  // 데이터 정렬
  const extendedLog = [...battleLog].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Zap className="w-8 h-8 text-orange-400" />
            배틀 로그
          </h1>
          <p className="text-muted-foreground">실시간 채널 이벤트 및 경쟁 현황</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-muted-foreground">Live Feed</span>
        </div>
      </div>

      {/* Event Type Filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(eventConfig).map(([key, config]) => (
          <Badge
            key={key}
            variant="outline"
            className={`cursor-pointer hover:opacity-80 ${config.color}`}
          >
            <config.icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '오늘 이벤트', value: extendedLog.length, color: 'cyan' },
          { label: '바이럴 히트', value: extendedLog.filter(e => e.eventType === 'viral_hit').length, color: 'orange' },
          { label: '순위 상승', value: extendedLog.filter(e => e.eventType === 'rank_up').length, color: 'green' },
          { label: '퀘스트 완료', value: extendedLog.filter(e => e.eventType === 'quest_complete').length, color: 'yellow' },
        ].map((stat, i) => (
          <GlowCard key={i} glowColor={stat.color as any} className="!p-4">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </GlowCard>
        ))}
      </div>

      {/* Battle Log Feed */}
      <GlowCard glowColor="orange" hover={false}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Live Event Feed
          </h2>
          <Badge variant="secondary">{extendedLog.length} events</Badge>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="space-y-3 pr-4">
            {extendedLog.map((entry, i) => {
              const config = eventConfig[entry.eventType as keyof typeof eventConfig];
              const Icon = config.icon;
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className={`p-4 rounded-lg border ${config.color}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {config.label}
                        </Badge>
                        {entry.ourChannelName && (
                          <span className="text-xs text-muted-foreground">
                            {entry.ourChannelName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{entry.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(entry.createdAt), { 
                            addSuffix: true,
                            locale: ko 
                          })}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-background/50">
                          Impact: {entry.impactScore}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </GlowCard>
    </div>
  );
}