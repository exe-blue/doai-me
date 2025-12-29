'use client';

import { motion } from 'framer-motion';
import { GlowCard } from '@/components/common/GlowCard';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { ActivityIcon, getActivityName } from '@/components/common/ActivityIcon';
import { LevelBadge } from '@/components/common/LevelBadge';
import { mockDashboardStats, mockActivities, mockChannels, mockBattleLog, mockNotifications } from '@/data/mock';
import { 
  Smartphone, 
  Activity, 
  TrendingUp, 
  Lightbulb, 
  Target,
  MessageSquare,
  Trophy,
  Zap,
  Bell,
  ArrowUpRight,
  AlertTriangle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

export default function DashboardPage() {
  const stats = mockDashboardStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            대시보드
          </h1>
          <p className="text-muted-foreground">AIFarm 시스템 전체 현황</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-muted-foreground">All Systems Operational</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Smartphone className="w-5 h-5" />}
          label="Active Devices"
          value={stats.activeDevices}
          total={stats.totalDevices}
          color="cyan"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Trends Detected"
          value={stats.trendsDetectedToday}
          change="+12%"
          color="green"
        />
        <StatCard
          icon={<Lightbulb className="w-5 h-5" />}
          label="Remix Ideas"
          value={stats.remixIdeasToday}
          change="+8"
          color="yellow"
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="Comments Posted"
          value={stats.commentsPostedToday}
          change="+15%"
          color="pink"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activities Overview */}
        <div className="lg:col-span-2">
          <GlowCard glowColor="cyan" hover={false} className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                6대 활동 현황
              </h2>
              <Link href="/dashboard/activities" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                전체보기 <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {mockActivities.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{activity.icon}</span>
                    <span className="text-xs font-medium truncate">{activity.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {activity.activeDevices}/{activity.allocatedDevices}
                    </span>
                    <span className="text-green-400">{activity.successRate}%</span>
                  </div>
                  <Progress value={(activity.activeDevices / activity.allocatedDevices) * 100} className="h-1 mt-2" />
                </motion.div>
              ))}
            </div>
          </GlowCard>
        </div>

        {/* Notifications */}
        <div>
          <GlowCard glowColor="pink" hover={false} className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <Bell className="w-4 h-4" />
                알림
              </h2>
              <Badge variant="secondary" className="text-xs">
                {mockNotifications.filter(n => !n.isRead).length} new
              </Badge>
            </div>
            <ScrollArea className="h-[240px]">
              <div className="space-y-2">
                {mockNotifications.map((notification, i) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-2 rounded-lg text-xs ${
                      notification.isRead ? 'bg-background/30' : 'bg-primary/5 border border-primary/20'
                    }`}
                  >
                    <div className="font-medium mb-1">{notification.title}</div>
                    <div className="text-muted-foreground line-clamp-2">{notification.message}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ko })}
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </GlowCard>
        </div>
      </div>

      {/* Channels & Battle Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Channels */}
        <GlowCard glowColor="purple" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Trophy className="w-4 h-4 text-yellow-400" />
              Top Channels
            </h2>
            <Link href="/dashboard/channels" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              전체보기 <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {mockChannels.slice(0, 4).map((channel, i) => (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background/70 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                  i === 0 ? 'bg-yellow-500/20' : i === 1 ? 'bg-gray-500/20' : i === 2 ? 'bg-orange-500/20' : 'bg-background'
                }`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{channel.name}</div>
                  <div className="text-xs text-muted-foreground">{channel.category} • #{channel.categoryRank}</div>
                </div>
                <LevelBadge level={channel.level} size="sm" />
              </motion.div>
            ))}
          </div>
        </GlowCard>

        {/* Recent Battle Log */}
        <GlowCard glowColor="orange" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Zap className="w-4 h-4 text-orange-400" />
              Battle Log
            </h2>
            <Link href="/dashboard/battle" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              전체보기 <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {mockBattleLog.slice(0, 5).map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-2 rounded-lg bg-background/50 text-xs"
                >
                  <div className="line-clamp-2">{entry.description}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: ko })}
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </GlowCard>
      </div>

      {/* Device Health Warning */}
      {stats.errorDevices > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-4"
        >
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <div className="flex-1">
            <div className="font-medium text-red-400">디바이스 오류 감지</div>
            <div className="text-sm text-muted-foreground">
              {stats.errorDevices}개의 디바이스에서 오류가 발생했습니다. 확인이 필요합니다.
            </div>
          </div>
          <Link href="/dashboard/devices">
            <Badge variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 cursor-pointer">
              확인하기
            </Badge>
          </Link>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  total,
  change,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total?: number;
  change?: string;
  color: 'cyan' | 'green' | 'yellow' | 'pink';
}) {
  const colorClasses = {
    cyan: 'text-cyan-400 border-cyan-500/30',
    green: 'text-green-400 border-green-500/30',
    yellow: 'text-yellow-400 border-yellow-500/30',
    pink: 'text-pink-400 border-pink-500/30',
  };

  return (
    <GlowCard glowColor={color} className="!p-4">
      <div className={`flex items-center gap-2 mb-2 ${colorClasses[color]}`}>
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          <AnimatedNumber value={value} format="compact" />
          {total && <span className="text-sm text-muted-foreground">/{total}</span>}
        </div>
        {change && (
          <span className="text-xs text-green-400">{change}</span>
        )}
      </div>
    </GlowCard>
  );
}
