// apps/web/app/work/components/VideoQueueList.tsx
// 영상 대기열 목록 - 실시간 로그 지원

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock, Play, CheckCircle, XCircle, Loader2, RefreshCw, Ban,
  Search, SkipForward, Eye, ThumbsUp, MessageSquare,
  Smartphone, ChevronDown, ChevronUp, Tv
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVideoQueue, cancelVideo, getRealtimeLogs } from '../actions';

interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  status: 'ready' | 'processing' | 'completed' | 'failed';
  targetDevices: number;
  completedDevices: number;
  createdAt: string;
  channelTitle?: string;
  source?: 'direct' | 'channel';
}

// 디바이스 실시간 상태
interface DeviceLog {
  deviceId: string;
  deviceName: string;
  status: 'waiting' | 'searching' | 'ad_skip' | 'watching' | 'liking' | 'commenting' | 'completed' | 'failed';
  progress?: number;
  watchTime?: number;
  message?: string;
  updatedAt: string;
}

// 상태별 설정
const DEVICE_STATUS_CONFIG = {
  waiting: { icon: Clock, label: '대기', color: 'text-neutral-400' },
  searching: { icon: Search, label: '검색 중', color: 'text-blue-400' },
  ad_skip: { icon: SkipForward, label: '광고 스킵', color: 'text-yellow-400' },
  watching: { icon: Eye, label: '시청 중', color: 'text-green-400' },
  liking: { icon: ThumbsUp, label: '좋아요', color: 'text-pink-400' },
  commenting: { icon: MessageSquare, label: '댓글 작성', color: 'text-purple-400' },
  completed: { icon: CheckCircle, label: '완료', color: 'text-green-500' },
  failed: { icon: XCircle, label: '실패', color: 'text-red-400' },
};

const STATUS_CONFIG = {
  ready: {
    icon: Clock,
    label: 'Waiting',
    color: 'text-neutral-400',
    bg: 'bg-neutral-500/10',
  },
  processing: {
    icon: Play,
    label: 'In Progress',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
};

export function VideoQueueList() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [deviceLogs, setDeviceLogs] = useState<Record<string, DeviceLog[]>>({});
  const [isLoadingLogs, setIsLoadingLogs] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getVideoQueue();

      if (result.success && result.data) {
        setQueue(result.data);
      } else {
        console.error('Failed to fetch queue:', result.error);
        setQueue([]);
      }
    } catch {
      console.error('Failed to fetch queue');
      setQueue([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 실시간 로그 조회
  const fetchLogs = useCallback(async (queueItemId: string) => {
    setIsLoadingLogs(queueItemId);
    try {
      const result = await getRealtimeLogs(queueItemId);
      if (result.success && result.data) {
        setDeviceLogs(prev => ({ ...prev, [queueItemId]: result.data }));
      }
    } catch {
      console.error('Failed to fetch logs');
    } finally {
      setIsLoadingLogs(null);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    // 15초마다 대기열 갱신 (더 빠른 업데이트)
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // 확장된 항목의 로그 주기적 갱신
  useEffect(() => {
    if (!expandedItemId) return;

    fetchLogs(expandedItemId);
    const interval = setInterval(() => fetchLogs(expandedItemId), 5000);
    return () => clearInterval(interval);
  }, [expandedItemId, fetchLogs]);

  // 항목 확장/축소 토글
  const toggleExpand = (itemId: string) => {
    setExpandedItemId(prev => prev === itemId ? null : itemId);
  };

  const handleCancel = async (itemId: string) => {
    setCancellingId(itemId);
    try {
      const result = await cancelVideo(itemId);
      if (result.success) {
        // 대기열에서 제거
        setQueue((prev) => prev.filter((item) => item.id !== itemId));
      } else {
        console.error('Failed to cancel:', result.error);
      }
    } catch {
      console.error('Failed to cancel video');
    } finally {
      setCancellingId(null);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
        <Clock className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
        <p className="text-neutral-500">No videos in queue</p>
        <p className="text-sm text-neutral-600 mt-1">
          Register a video to start watching
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchQueue}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Queue Items */}
      <div className="space-y-3">
        {queue.map((item) => {
          const config = STATUS_CONFIG[item.status];
          const StatusIcon = config.icon;
          const progress =
            item.targetDevices > 0
              ? (item.completedDevices / item.targetDevices) * 100
              : 0;
          const isExpanded = expandedItemId === item.id;
          const logs = deviceLogs[item.id] || [];

          return (
            <div
              key={item.id}
              className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
            >
              <div className="p-4">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="relative shrink-0">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-24 h-14 object-cover rounded"
                    />
                    {/* 채널 출처 뱃지 */}
                    {item.source === 'channel' && item.channelTitle && (
                      <div className="absolute -top-2 -left-2 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <Tv className="w-2.5 h-2.5" />
                        CH
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* 채널명 (채널에서 자동 등록된 경우) */}
                    {item.source === 'channel' && item.channelTitle && (
                      <p className="text-xs text-purple-400 mb-1 truncate">
                        {item.channelTitle}
                      </p>
                    )}

                    <h3 className="font-medium text-white truncate text-sm">
                      {item.title}
                    </h3>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                          config.bg,
                          config.color
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-neutral-500">
                          {item.completedDevices} / {item.targetDevices} devices
                        </span>
                        <span className="text-neutral-400">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            item.status === 'completed'
                              ? "bg-green-500"
                              : item.status === 'failed'
                              ? "bg-red-500"
                              : "bg-[#FFCC00]"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-start gap-2">
                    {/* 실시간 로그 토글 버튼 */}
                    {item.status === 'processing' && (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className={cn(
                          "p-2 rounded-lg border transition-colors",
                          isExpanded
                            ? "border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]"
                            : "border-white/10 text-neutral-500 hover:bg-white/10"
                        )}
                        title="실시간 로그 보기"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Cancel Button (only for ready status) */}
                    {item.status === 'ready' && (
                      <button
                        onClick={() => handleCancel(item.id)}
                        disabled={cancellingId === item.id}
                        className={cn(
                          "p-2 rounded-lg border border-white/10 text-neutral-500",
                          "hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400",
                          "transition-colors disabled:opacity-50"
                        )}
                        title="Cancel"
                      >
                        {cancellingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Ban className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 실시간 디바이스 로그 패널 */}
              {isExpanded && item.status === 'processing' && (
                <div className="border-t border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#FFCC00]" />
                      실시간 디바이스 활동
                    </h4>
                    {isLoadingLogs === item.id && (
                      <Loader2 className="w-4 h-4 animate-spin text-[#FFCC00]" />
                    )}
                  </div>

                  {logs.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      활동 로그가 없습니다
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {logs.map((log) => {
                        const statusConfig = DEVICE_STATUS_CONFIG[log.status];
                        const LogIcon = statusConfig.icon;

                        return (
                          <div
                            key={log.deviceId}
                            className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"
                          >
                            {/* 디바이스 아이콘 */}
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                              <Smartphone className="w-4 h-4 text-neutral-400" />
                            </div>

                            {/* 디바이스 정보 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white font-medium">
                                  {log.deviceName}
                                </span>
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
                                  statusConfig.color
                                )}>
                                  <LogIcon className="w-3 h-3" />
                                  {statusConfig.label}
                                </span>
                              </div>
                              {log.message && (
                                <p className="text-xs text-neutral-500 truncate mt-0.5">
                                  {log.message}
                                </p>
                              )}
                            </div>

                            {/* 시청 시간 (시청 중인 경우) */}
                            {log.status === 'watching' && log.watchTime !== undefined && (
                              <div className="text-right">
                                <span className="text-sm font-mono text-green-400">
                                  {Math.floor(log.watchTime / 60)}:{String(log.watchTime % 60).padStart(2, '0')}
                                </span>
                                {log.progress !== undefined && (
                                  <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                    <div
                                      className="h-full bg-green-500"
                                      style={{ width: `${log.progress}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
