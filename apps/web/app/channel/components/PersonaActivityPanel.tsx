// apps/web/app/channel/components/PersonaActivityPanel.tsx
// AI 페르소나 활동 시각화 패널 - 실시간 로그 + 통계 탭

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Smartphone, Search, SkipForward, Eye, ThumbsUp, MessageSquare,
  CheckCircle, XCircle, Clock, Loader2, Activity, BarChart3, Users,
  Play, Zap, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRealtimeActivity, getActivityStats } from '../actions';

// 페르소나 활동 타입
interface PersonaActivity {
  deviceId: string;
  deviceName: string;
  personaType: string;
  status: 'idle' | 'searching' | 'ad_skip' | 'watching' | 'liking' | 'commenting' | 'completed';
  currentVideo?: {
    title: string;
    thumbnail: string;
    channelTitle: string;
  };
  watchTime?: number;
  progress?: number;
  message?: string;
  updatedAt: string;
}

// 통계 타입
interface ActivityStats {
  avgWatchTime: number;
  completionRate: number;
  adSkipRate: number;
  interactionRate: number;
  activeDevices: number;
  totalActions: number;
}

// 상태별 설정
const STATUS_CONFIG = {
  idle: { icon: Clock, label: '대기', color: 'text-neutral-400', bg: 'bg-neutral-500/10' },
  searching: { icon: Search, label: '검색 중', color: 'text-blue-400', bg: 'bg-blue-500/10', animate: true },
  ad_skip: { icon: SkipForward, label: '광고 스킵', color: 'text-yellow-400', bg: 'bg-yellow-500/10', animate: true },
  watching: { icon: Eye, label: '시청 중', color: 'text-green-400', bg: 'bg-green-500/10', animate: true },
  liking: { icon: ThumbsUp, label: '좋아요', color: 'text-pink-400', bg: 'bg-pink-500/10', animate: true },
  commenting: { icon: MessageSquare, label: '댓글 작성', color: 'text-purple-400', bg: 'bg-purple-500/10', animate: true },
  completed: { icon: CheckCircle, label: '완료', color: 'text-green-500', bg: 'bg-green-500/10' },
};

// 페르소나 타입별 아바타 색상
const PERSONA_COLORS: Record<string, string> = {
  default: 'bg-neutral-500',
  student: 'bg-blue-500',
  worker: 'bg-green-500',
  gamer: 'bg-purple-500',
  shopper: 'bg-pink-500',
  tech: 'bg-cyan-500',
};

type TabType = 'realtime' | 'stats';

export function PersonaActivityPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('realtime');
  const [activities, setActivities] = useState<PersonaActivity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 실시간 활동 조회
  const fetchActivities = useCallback(async () => {
    try {
      const result = await getRealtimeActivity();
      if (result.success && result.data) {
        setActivities(result.data);
      }
    } catch {
      console.error('Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 통계 조회
  const fetchStats = useCallback(async () => {
    try {
      const result = await getActivityStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch {
      console.error('Failed to fetch stats');
    }
  }, []);

  // 초기 로드 및 주기적 갱신
  useEffect(() => {
    if (activeTab === 'realtime') {
      fetchActivities();
      const interval = setInterval(fetchActivities, 5000);
      return () => clearInterval(interval);
    } else {
      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchActivities, fetchStats]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
      {/* 탭 헤더 */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('realtime')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
            activeTab === 'realtime'
              ? "bg-[#FFCC00]/10 text-[#FFCC00] border-b-2 border-[#FFCC00]"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Activity className="w-4 h-4" />
          실시간 로그
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
            activeTab === 'stats'
              ? "bg-[#FFCC00]/10 text-[#FFCC00] border-b-2 border-[#FFCC00]"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          요약 통계
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-4">
        {activeTab === 'realtime' ? (
          <RealtimeLogTab activities={activities} isLoading={isLoading} />
        ) : (
          <StatsTab stats={stats} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}

// 실시간 로그 탭
interface RealtimeLogTabProps {
  activities: PersonaActivity[];
  isLoading: boolean;
}

function RealtimeLogTab({ activities, isLoading }: RealtimeLogTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFCC00]" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Smartphone className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
        <p className="text-neutral-500">활동 중인 디바이스가 없습니다</p>
        <p className="text-sm text-neutral-600 mt-1">
          영상을 등록하면 AI 페르소나가 활동을 시작합니다
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {activities.map((activity) => {
        const statusConfig = STATUS_CONFIG[activity.status];
        const StatusIcon = statusConfig.icon;
        const personaColor = PERSONA_COLORS[activity.personaType] || PERSONA_COLORS.default;

        return (
          <div
            key={activity.deviceId}
            className={cn(
              "flex items-center gap-4 p-3 rounded-lg border transition-all",
              statusConfig.bg,
              "border-white/5"
            )}
          >
            {/* 페르소나 아바타 */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              personaColor
            )}>
              <Smartphone className="w-5 h-5 text-white" />
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm">
                  {activity.deviceName}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                  statusConfig.color,
                  statusConfig.animate && "animate-pulse"
                )}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </span>
              </div>

              {/* 현재 영상 정보 */}
              {activity.currentVideo && (
                <div className="flex items-center gap-2 mt-1">
                  <img
                    src={activity.currentVideo.thumbnail}
                    alt=""
                    className="w-8 h-5 object-cover rounded"
                  />
                  <span className="text-xs text-neutral-400 truncate">
                    {activity.currentVideo.title}
                  </span>
                </div>
              )}

              {/* 메시지 */}
              {activity.message && (
                <p className="text-xs text-neutral-500 mt-1 truncate">
                  {activity.message}
                </p>
              )}
            </div>

            {/* 시청 시간 / 진행률 */}
            {activity.status === 'watching' && (
              <div className="text-right shrink-0">
                {activity.watchTime !== undefined && (
                  <span className="text-sm font-mono text-green-400">
                    {Math.floor(activity.watchTime / 60)}:{String(activity.watchTime % 60).padStart(2, '0')}
                  </span>
                )}
                {activity.progress !== undefined && (
                  <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${activity.progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 통계 탭
interface StatsTabProps {
  stats: ActivityStats | null;
  isLoading: boolean;
}

function StatsTab({ stats, isLoading }: StatsTabProps) {
  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFCC00]" />
      </div>
    );
  }

  // 시청 시간 포맷팅
  const formatWatchTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  return (
    <div className="space-y-6">
      {/* 주요 통계 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          icon={Clock}
          label="평균 시청 시간"
          value={formatWatchTime(stats.avgWatchTime)}
          color="text-blue-400"
        />
        <StatCard
          icon={CheckCircle}
          label="완료율"
          value={`${stats.completionRate}%`}
          color="text-green-400"
        />
        <StatCard
          icon={SkipForward}
          label="광고 스킵률"
          value={`${stats.adSkipRate}%`}
          color="text-yellow-400"
        />
        <StatCard
          icon={ThumbsUp}
          label="인터랙션율"
          value={`${stats.interactionRate}%`}
          color="text-pink-400"
        />
        <StatCard
          icon={Users}
          label="활성 디바이스"
          value={stats.activeDevices.toString()}
          color="text-purple-400"
        />
        <StatCard
          icon={Zap}
          label="오늘 액션"
          value={stats.totalActions.toLocaleString()}
          color="text-[#FFCC00]"
        />
      </div>

      {/* 진행 바 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#FFCC00]" />
          성과 지표
        </h4>

        <ProgressBar
          label="완료율"
          value={stats.completionRate}
          color="bg-green-500"
        />
        <ProgressBar
          label="광고 스킵률"
          value={stats.adSkipRate}
          color="bg-yellow-500"
        />
        <ProgressBar
          label="인터랙션율"
          value={stats.interactionRate}
          color="bg-pink-500"
        />
      </div>
    </div>
  );
}

// 통계 카드 컴포넌트
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-black/30 rounded-lg p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className={cn("text-xl font-bold", color)}>{value}</p>
    </div>
  );
}

// 진행 바 컴포넌트
interface ProgressBarProps {
  label: string;
  value: number;
  color: string;
}

function ProgressBar({ label, value, color }: ProgressBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-neutral-400">{label}</span>
        <span className="text-white font-mono">{value}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
