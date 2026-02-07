// apps/web/app/channel/components/ChannelVideoSection.tsx
// 채널 영상 섹션 - 필수 영상 / 자유 영상 분리

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Star, Video, Clock, Eye, Calendar, CheckCircle, Loader2,
  Play, ChevronRight, ExternalLink, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getChannelVideos, setVideoRequired } from '../actions';

interface ChannelVideo {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
  viewCount?: number;
  isRequired: boolean;
  watchedCount: number;
  status: 'pending' | 'queued' | 'completed';
}

interface ChannelVideoSectionProps {
  channelId?: string;
}

// 날짜 포맷팅
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;

  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// 조회수 포맷팅
function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toLocaleString();
}

// 상태 뱃지 컴포넌트
function StatusBadge({ status }: { status: ChannelVideo['status'] }) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400">
          <CheckCircle className="w-3 h-3" />
          완료
        </span>
      );
    case 'queued':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400">
          <Play className="w-3 h-3" />
          대기열
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-neutral-500/10 text-neutral-400">
          <Clock className="w-3 h-3" />
          대기
        </span>
      );
  }
}

export function ChannelVideoSection({ channelId }: ChannelVideoSectionProps) {
  const [requiredVideos, setRequiredVideos] = useState<ChannelVideo[]>([]);
  const [freeVideos, setFreeVideos] = useState<ChannelVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getChannelVideos({ channelId });
      if (result.success && result.data) {
        setRequiredVideos(result.data.required);
        setFreeVideos(result.data.free);
      }
    } catch {
      console.error('Failed to fetch videos');
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // 필수 지정/해제 토글
  const handleToggleRequired = async (video: ChannelVideo) => {
    setTogglingId(video.id);
    try {
      const result = await setVideoRequired(video.id, !video.isRequired);
      if (result.success) {
        // 로컬 상태 업데이트
        if (video.isRequired) {
          // 필수 → 자유로 이동
          setRequiredVideos(prev => prev.filter(v => v.id !== video.id));
          setFreeVideos(prev => [{ ...video, isRequired: false }, ...prev]);
        } else {
          // 자유 → 필수로 이동
          setFreeVideos(prev => prev.filter(v => v.id !== video.id));
          setRequiredVideos(prev => [{ ...video, isRequired: true }, ...prev]);
        }
      }
    } catch {
      console.error('Failed to toggle required');
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFCC00]" />
      </div>
    );
  }

  if (requiredVideos.length === 0 && freeVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
        <p className="text-neutral-500">등록된 영상이 없습니다</p>
        <p className="text-sm text-neutral-600 mt-1">
          채널을 추가하면 영상이 자동으로 동기화됩니다
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 필수 영상 섹션 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-[#FFCC00] fill-[#FFCC00]" />
            필수 시청 영상
            <span className="text-sm font-normal text-neutral-500 ml-2">
              ({requiredVideos.length}개)
            </span>
          </h3>
          <p className="text-xs text-neutral-500">
            모든 디바이스가 반드시 시청해야 하는 영상
          </p>
        </div>

        {requiredVideos.length === 0 ? (
          <div className="bg-[#FFCC00]/5 border border-[#FFCC00]/20 rounded-lg p-6 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-[#FFCC00]/50" />
            <p className="text-sm text-neutral-400">
              자유 영상 목록에서 별 아이콘을 클릭하여 필수 영상을 지정하세요
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {requiredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                isToggling={togglingId === video.id}
                onToggleRequired={() => handleToggleRequired(video)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 자유 영상 섹션 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-400" />
            자유 시청 영상
            <span className="text-sm font-normal text-neutral-500 ml-2">
              ({freeVideos.length}개)
            </span>
          </h3>
          <p className="text-xs text-neutral-500">
            AI 페르소나가 자연스럽게 선택하는 영상
          </p>
        </div>

        {freeVideos.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
            <Video className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
            <p className="text-sm text-neutral-500">자유 시청 영상이 없습니다</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {freeVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                isToggling={togglingId === video.id}
                onToggleRequired={() => handleToggleRequired(video)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// 영상 카드 컴포넌트
interface VideoCardProps {
  video: ChannelVideo;
  isToggling: boolean;
  onToggleRequired: () => void;
}

function VideoCard({ video, isToggling, onToggleRequired }: VideoCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border transition-colors",
        video.isRequired
          ? "bg-[#FFCC00]/5 border-[#FFCC00]/20 hover:bg-[#FFCC00]/10"
          : "bg-white/5 border-white/10 hover:bg-white/10"
      )}
    >
      {/* 필수 토글 버튼 */}
      <button
        onClick={onToggleRequired}
        disabled={isToggling}
        className={cn(
          "p-2 rounded-lg transition-colors",
          video.isRequired
            ? "text-[#FFCC00] hover:bg-[#FFCC00]/20"
            : "text-neutral-500 hover:text-[#FFCC00] hover:bg-white/10"
        )}
        title={video.isRequired ? "필수 해제" : "필수 지정"}
      >
        {isToggling ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Star className={cn("w-5 h-5", video.isRequired && "fill-current")} />
        )}
      </button>

      {/* 썸네일 */}
      <div className="relative shrink-0">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-28 h-16 object-cover rounded"
        />
        {video.duration && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded font-mono">
            {video.duration}
          </span>
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white text-sm truncate">
          {video.title}
        </h4>
        <p className="text-xs text-neutral-500 mt-1 truncate">
          {video.channelTitle}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(video.publishedAt)}
          </span>
          {video.viewCount !== undefined && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatViewCount(video.viewCount)}
            </span>
          )}
          {video.watchedCount > 0 && (
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle className="w-3 h-3" />
              {video.watchedCount}회 시청
            </span>
          )}
        </div>
      </div>

      {/* 상태 및 액션 */}
      <div className="flex items-center gap-3">
        <StatusBadge status={video.status} />
        <a
          href={`https://youtube.com/watch?v=${video.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-neutral-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
