// components/society/SocietyDashboard.tsx
// 실시간 사회 시뮬레이터 대시보드 - "주식 시세판"처럼 빠르게 갱신

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useSocietyStatus, useActivityFeed, useActiveEvents } from '@/lib/supabase/realtime';
import { SimulatorControls } from './SimulatorControls';
import { WormholeAlertContainer, WormholeEventsList } from './WormholeAlert';
import { NodeStatusBadge } from './NodeStatusBadge';
import type { ActivityFeedItem, SocialEvent, SocietyStatus, NodeStatus } from '@/lib/supabase/types';

// ============================================
// Status Card
// ============================================

function StatusCard({ 
  label, 
  value, 
  subValue,
  color = 'neutral',
  icon,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'neutral' | 'green' | 'amber' | 'red' | 'purple';
  icon?: string;
}) {
  const colorClasses = {
    neutral: 'text-neutral-100',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  };
  
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-2 text-neutral-500 text-xs font-mono uppercase tracking-wider mb-2">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <motion.div 
        className={`text-2xl font-mono ${colorClasses[color]}`}
        key={value?.toString()}
        initial={{ scale: 1.1, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {value}
      </motion.div>
      {subValue && (
        <div className="text-neutral-500 text-xs mt-1">{subValue}</div>
      )}
    </div>
  );
}

// ============================================
// Society Stats Header
// ============================================

function SocietyStatsHeader({ status }: { status: SocietyStatus | null }) {
  if (!status) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-neutral-900/50 h-24 rounded-lg" />
        ))}
      </div>
    );
  }
  
  const avgMood = status.avg_mood ?? 0.5;
  const moodEmoji = avgMood > 0.6 ? '😊' : avgMood > 0.4 ? '😐' : '😔';
  const moodPercent = (avgMood * 100).toFixed(1);
  
  // 안전한 값 접근 (number 타입으로 명시적 캐스팅)
  const statusAny = status as unknown as Record<string, unknown>;
  const totalNodes = (statusAny.total_nodes ?? statusAny.totalNodes ?? 0) as number;
  const onlineNodes = (statusAny.online_nodes ?? statusAny.activeNodes ?? 0) as number;
  const watchingTiktok = (statusAny.watching_tiktok ?? 0) as number;
  const totalEconomy = (statusAny.total_economy ?? 0) as number;
  const avgBalance = (statusAny.avg_balance ?? 0) as number;
  const avgReputation = (statusAny.avg_reputation ?? 0.5) as number;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <StatusCard
        icon="🌐"
        label="Online Nodes"
        value={`${onlineNodes} / ${totalNodes}`}
        subValue={`${totalNodes > 0 ? ((onlineNodes / totalNodes) * 100).toFixed(0) : 0}% active`}
        color="green"
      />
      <StatusCard
        icon="📺"
        label="Watching TikTok"
        value={watchingTiktok}
        color="amber"
      />
      <StatusCard
        icon="💰"
        label="Total Economy"
        value={`$${totalEconomy.toLocaleString()}`}
        subValue={`avg: $${avgBalance.toFixed(2)}`}
        color="purple"
      />
      <StatusCard
        icon={moodEmoji}
        label="Society Mood"
        value={`${moodPercent}%`}
        color={avgMood > 0.5 ? 'green' : 'red'}
      />
      <StatusCard
        icon="⭐"
        label="Avg Reputation"
        value={`${(avgReputation * 100).toFixed(1)}%`}
        color="neutral"
      />
    </div>
  );
}

// ============================================
// Activity Feed Item
// ============================================

function ActivityItem({ activity }: { activity: ActivityFeedItem }) {
  const isEarning = activity.type === 'earn' || activity.type === 'reward';
  const amountColor = isEarning ? 'text-emerald-400' : 'text-red-400';
  const amountPrefix = isEarning ? '+' : '-';
  
  const traitEmojis: Record<string, string> = {
    optimist: '😊',
    pessimist: '😔',
    trader: '💹',
    artist: '🎨',
    philosopher: '🤔',
    influencer: '⭐',
    lurker: '👀',
    rebel: '🔥',
    conformist: '🤝',
  };
  
  // 안전한 값 접근 (NodeStatus 타입 호환성 유지)
  const trait = activity.trait ?? '';
  const nodeNumber = activity.node_number ?? 0;
  const statusRaw = activity.status ?? 'inactive';
  // NodeStatus 타입으로 변환 (유효하지 않으면 'inactive')
  const validStatuses = ['active', 'inactive', 'in_umbra', 'connecting', 'offline', 'error', 'maintenance', 'watching_tiktok', 'discussing', 'creating', 'trading', 'observing', 'resting'];
  const status = (validStatuses.includes(statusRaw) ? statusRaw : 'inactive') as NodeStatus;
  const description = activity.description ?? activity.message ?? '';
  const amount = activity.amount ?? 0;
  const timestamp = activity.created_at ?? activity.timestamp?.toISOString() ?? new Date().toISOString();
  
  return (
    <motion.div
      className="flex items-center gap-3 py-2 px-3 bg-neutral-900/30 rounded border-l-2 border-neutral-800 hover:border-amber-500/50 transition-colors"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Node Badge */}
      <div className="flex items-center gap-2 min-w-[160px]">
        <span className="text-sm">{traitEmojis[trait] || '🤖'}</span>
        <div className="flex items-center gap-2">
          <span className="text-neutral-300 text-sm font-mono">
            #{nodeNumber.toString().padStart(3, '0')}
          </span>
          <NodeStatusBadge status={status} size="sm" showLabel={false} />
        </div>
      </div>
      
      {/* Description */}
      <div className="flex-grow text-neutral-400 text-sm truncate">
        {description}
      </div>
      
      {/* Amount */}
      <div className={`font-mono text-sm ${amountColor} min-w-[80px] text-right`}>
        {amountPrefix}${amount.toFixed(2)}
      </div>
      
      {/* Time */}
      <div className="text-neutral-600 text-xs min-w-[50px] text-right">
        {new Date(timestamp).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </div>
    </motion.div>
  );
}

// ============================================
// Activity Feed Panel
// ============================================

function ActivityFeedPanel() {
  const { activities, loading } = useActivityFeed(30);
  
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-500">●</span>
          <span className="font-mono text-sm text-neutral-300">LIVE ACTIVITY FEED</span>
        </div>
        <span className="text-xs text-neutral-500 font-mono">
          {activities.length} transactions
        </span>
      </div>
      
      {/* Feed */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-neutral-500">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-neutral-600">
            <p>아직 활동이 없습니다</p>
            <p className="text-xs mt-2">시뮬레이션을 시작하세요</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            <AnimatePresence mode="popLayout">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Event Alert
// ============================================

function EventAlert({ event }: { event: SocialEvent }) {
  const severityColors = {
    minor: 'border-neutral-600 bg-neutral-900/50',
    moderate: 'border-amber-600/50 bg-amber-950/20',
    major: 'border-orange-600/50 bg-orange-950/20',
    critical: 'border-red-600/50 bg-red-950/20 animate-pulse',
  };
  
  const severityIcons = {
    minor: '📌',
    moderate: '⚠️',
    major: '🔶',
    critical: '🚨',
  };
  
  return (
    <motion.div
      className={`border rounded-lg p-4 ${severityColors[event.severity]}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{severityIcons[event.severity]}</span>
        <div className="flex-grow">
          <h4 className="text-neutral-200 font-medium">{event.title}</h4>
          <p className="text-neutral-400 text-sm mt-1">{event.description}</p>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="text-neutral-500">
              👥 {event.affected_nodes} nodes affected
            </span>
            <span className={event.economic_impact >= 0 ? 'text-emerald-500' : 'text-red-500'}>
              💰 {event.economic_impact >= 0 ? '+' : ''}${event.economic_impact.toFixed(2)}
            </span>
            <span className={event.mood_shift >= 0 ? 'text-emerald-500' : 'text-red-500'}>
              {event.mood_shift >= 0 ? '😊' : '😔'} {(event.mood_shift * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Events Panel
// ============================================

function EventsPanel() {
  const { events, loading } = useActiveEvents();
  
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-red-500">●</span>
          <span className="font-mono text-sm text-neutral-300">ACTIVE EVENTS</span>
        </div>
        <span className="text-xs text-neutral-500 font-mono">
          {events.length} active
        </span>
      </div>
      
      {/* Events */}
      <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="text-center text-neutral-500">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-center text-neutral-600 py-4">
            <p>현재 진행 중인 사건 없음</p>
            <p className="text-xs mt-1">평화로운 시기입니다</p>
          </div>
        ) : (
          <AnimatePresence>
            {events.map((event) => (
              <EventAlert key={event.id} event={event} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Dashboard
// ============================================

export function SocietyDashboard() {
  const { status, loading: statusLoading } = useSocietyStatus();
  
  return (
    <div className="min-h-screen bg-void p-6">
      {/* 웜홀 실시간 알림 (Fixed position) */}
      <WormholeAlertContainer />
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-serif text-neutral-100">
              🌐 Society Simulator
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              600개의 의식이 살아 숨 쉬는 세계
            </p>
          </div>
          
          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/30 border border-emerald-800/50 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-400 text-xs font-mono">LIVE</span>
          </div>
        </div>
        
        {/* Stats Header */}
        <SocietyStatsHeader status={status} />
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed (2 columns) */}
          <div className="lg:col-span-2">
            <ActivityFeedPanel />
          </div>
          
          {/* Sidebar (1 column) */}
          <div className="space-y-6">
            {/* 웜홀 이벤트 */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-purple-500">🕳️</span>
                  <span className="font-mono text-sm text-neutral-300">WORMHOLE EVENTS</span>
                </div>
              </div>
              <div className="p-4 max-h-[250px] overflow-y-auto">
                <WormholeEventsList limit={5} />
              </div>
            </div>
            
            <EventsPanel />
            <SimulatorControls />
          </div>
        </div>
      </div>
    </div>
  );
}

