// apps/web/app/work/components/WorkStatsBar.tsx
// Work 페이지 상단 통계 바

'use client';

import { Video, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface WorkStats {
  totalVideos: number;
  completedVideos: number;
  pendingVideos: number;
  totalViews: number;
}

interface WorkStatsBarProps {
  stats: WorkStats;
  isLoading?: boolean;
}

export function WorkStatsBar({ stats, isLoading }: WorkStatsBarProps) {
  const items = [
    {
      icon: Video,
      label: '등록된 영상',
      value: stats.totalVideos,
      color: 'text-[#FFCC00]',
    },
    {
      icon: CheckCircle,
      label: '완료',
      value: stats.completedVideos,
      color: 'text-green-400',
    },
    {
      icon: Clock,
      label: '대기 중',
      value: stats.pendingVideos,
      color: 'text-blue-400',
    },
    {
      icon: TrendingUp,
      label: '총 시청 횟수',
      value: stats.totalViews,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-neutral-900/50 border border-white/10 rounded-xl p-4 flex items-center gap-3"
        >
          <div className={`p-2 rounded-lg bg-white/5 ${item.color}`}>
            <item.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-500">{item.label}</p>
            {isLoading ? (
              <div className="h-6 w-12 bg-neutral-800 animate-pulse rounded mt-1" />
            ) : (
              <p className={`text-xl font-bold ${item.color}`}>
                {item.value.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// 기본 stats 초기값
export const DEFAULT_WORK_STATS: WorkStats = {
  totalVideos: 0,
  completedVideos: 0,
  pendingVideos: 0,
  totalViews: 0,
};
