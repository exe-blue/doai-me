// apps/web/app/channel/components/ChannelStatsBar.tsx
// Channel 페이지 상단 통계 바

'use client';

import { Tv, Video, Eye, TrendingUp } from 'lucide-react';

interface ChannelStats {
  totalChannels: number;
  totalVideos: number;
  totalWatched: number;
  todayWatched: number;
}

interface ChannelStatsBarProps {
  stats: ChannelStats;
  isLoading?: boolean;
}

export function ChannelStatsBar({ stats, isLoading }: ChannelStatsBarProps) {
  const items = [
    {
      icon: Tv,
      label: '구독 채널',
      value: stats.totalChannels,
      color: 'text-[#FFCC00]',
    },
    {
      icon: Video,
      label: '등록 영상',
      value: stats.totalVideos,
      color: 'text-blue-400',
    },
    {
      icon: Eye,
      label: '총 시청',
      value: stats.totalWatched,
      color: 'text-green-400',
    },
    {
      icon: TrendingUp,
      label: '오늘 시청',
      value: stats.todayWatched,
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
export const DEFAULT_CHANNEL_STATS: ChannelStats = {
  totalChannels: 0,
  totalVideos: 0,
  totalWatched: 0,
  todayWatched: 0,
};
