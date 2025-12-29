'use client';

import { cn } from '@/lib/utils';
import type { ActivityType } from '@/types';

interface ActivityIconProps {
  activity: ActivityType;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
}

const activityConfig: Record<ActivityType, { icon: string; color: string; bgColor: string }> = {
  shorts_remix: {
    icon: '🎬',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20 border-cyan-500/40',
  },
  playlist_curator: {
    icon: '🎵',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20 border-purple-500/40',
  },
  persona_commenter: {
    icon: '💬',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20 border-pink-500/40',
  },
  trend_scout: {
    icon: '🕵️',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20 border-yellow-500/40',
  },
  challenge_hunter: {
    icon: '🏅',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20 border-orange-500/40',
  },
  thumbnail_lab: {
    icon: '🔬',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 border-blue-500/40',
  },
};

const sizeMap = {
  sm: 'w-8 h-8 text-base',
  md: 'w-10 h-10 text-xl',
  lg: 'w-14 h-14 text-2xl',
};

export function ActivityIcon({ activity, size = 'md', showGlow = false }: ActivityIconProps) {
  const config = activityConfig[activity];

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg border',
        config.bgColor,
        sizeMap[size],
        showGlow && 'shadow-lg'
      )}
    >
      <span>{config.icon}</span>
    </div>
  );
}

export function getActivityName(activity: ActivityType): string {
  const names: Record<ActivityType, string> = {
    shorts_remix: 'Shorts 리믹스',
    playlist_curator: '플레이리스트',
    persona_commenter: '페르소나',
    trend_scout: '트렌드 스카우터',
    challenge_hunter: '챌린지 헌터',
    thumbnail_lab: '썸네일 랩',
  };
  return names[activity];
}

export function getActivityColor(activity: ActivityType): string {
  return activityConfig[activity].color;
}
