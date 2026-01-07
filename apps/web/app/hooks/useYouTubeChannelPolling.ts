/**
 * useYouTubeChannelPolling
 * 
 * 구독된 YouTube 채널의 신규 영상을 주기적으로 확인하고
 * 자동으로 시청 대기열에 등록하는 커스텀 훅
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useNodes } from '../contexts/NodeContext';

interface PollResult {
  checkedChannels: number;
  newVideos: Array<{
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    registered: boolean;
  }>;
  timestamp: string;
}

interface UseYouTubeChannelPollingOptions {
  // 폴링 간격 (밀리초, 기본 5분)
  pollInterval?: number;
  // 활성화 여부
  enabled?: boolean;
  // 자동 등록 여부
  autoRegister?: boolean;
}

export function useYouTubeChannelPolling({
  pollInterval = 5 * 60 * 1000, // 5분
  enabled = true,
  autoRegister = true,
}: UseYouTubeChannelPollingOptions = {}) {
  const { addVideo, addLog } = useNodes();
  const [lastPollResult, setLastPollResult] = useState<PollResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 폴링 실행
  const poll = useCallback(async () => {
    if (isPolling) return;
    
    setIsPolling(true);
    setError(null);

    try {
      const response = await fetch('/api/youtube/poll');
      const data = await response.json();

      if (data.success) {
        setLastPollResult(data);

        // 새 영상 발견 시 로그 및 등록
        if (data.newVideos && data.newVideos.length > 0) {
          for (const video of data.newVideos) {
            addLog(
              'success',
              `🆕 신규 영상 감지: "${video.title}" (${video.channelTitle})`
            );

            // 자동 등록
            if (autoRegister && !video.registered) {
              addVideo({
                title: video.title,
                url: `https://www.youtube.com/watch?v=${video.videoId}`,
                thumbnail: video.thumbnail,
                channel: video.channelTitle,
                targetViews: 50, // 기본 목표
                source: 'auto_subscribe',
              });
              
              addLog(
                'info',
                `📥 자동 등록 완료: "${video.title}"`
              );
            }
          }
        }
      } else {
        setError(data.error || '폴링 실패');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      addLog('error', `YouTube 채널 폴링 오류: ${errorMsg}`);
    } finally {
      setIsPolling(false);
    }
  }, [isPolling, autoRegister, addVideo, addLog]);

  // 수동 폴링 트리거
  const triggerPoll = useCallback(() => {
    poll();
  }, [poll]);

  // 폴링 스케줄러
  useEffect(() => {
    if (!enabled) {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      return;
    }

    // 초기 폴링 (3초 후)
    const initialPoll = setTimeout(() => {
      poll();
    }, 3000);

    // 주기적 폴링
    const schedulePoll = () => {
      pollTimeoutRef.current = setTimeout(() => {
        poll().finally(() => {
          schedulePoll(); // 다음 폴링 스케줄
        });
      }, pollInterval);
    };

    schedulePoll();

    return () => {
      clearTimeout(initialPoll);
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [enabled, pollInterval, poll]);

  return {
    lastPollResult,
    isPolling,
    error,
    triggerPoll,
  };
}

