'use client';

// ============================================
// useVideoQueue - 비디오 큐 관리 훅
// Context에서 분리된 개별 훅
// ============================================

import { useCallback, useMemo } from 'react';
import { useNodes, QueuedVideo, CompletedVideo } from '../contexts/NodeContext';

/**
 * 비디오 큐 관리를 위한 커스텀 훅
 */
export function useVideoQueue() {
  const { state, addVideo, updateVideo, completeVideo } = useNodes();

  // 상태별 비디오 분류
  const queuedVideos = useMemo(() => 
    state.queuedVideos.filter(v => v.status === 'queued'),
    [state.queuedVideos]
  );

  const runningVideos = useMemo(() => 
    state.queuedVideos.filter(v => v.status === 'running').sort((a, b) => a.progress - b.progress),
    [state.queuedVideos]
  );

  const pausedVideos = useMemo(() => 
    state.queuedVideos.filter(v => v.status === 'paused'),
    [state.queuedVideos]
  );

  // 통계
  const videoStats = useMemo(() => ({
    totalQueued: state.queuedVideos.length,
    queued: queuedVideos.length,
    running: runningVideos.length,
    paused: pausedVideos.length,
    completed: state.completedVideos.length,
    totalViews: state.completedVideos.reduce((sum, v) => sum + v.totalViews, 0),
    todayViews: state.stats.todayWatched,
  }), [state.queuedVideos, queuedVideos, runningVideos, pausedVideos, state.completedVideos, state.stats.todayWatched]);

  // 비디오 시작
  const startVideo = useCallback((videoId: string) => {
    updateVideo({ id: videoId, status: 'running' });
  }, [updateVideo]);

  // 비디오 일시정지
  const pauseVideo = useCallback((videoId: string) => {
    updateVideo({ id: videoId, status: 'paused' });
  }, [updateVideo]);

  // 비디오 재개
  const resumeVideo = useCallback((videoId: string) => {
    updateVideo({ id: videoId, status: 'running' });
  }, [updateVideo]);

  // 다음 대기 비디오 시작
  const startNextVideo = useCallback(() => {
    if (queuedVideos.length > 0) {
      startVideo(queuedVideos[0].id);
      return queuedVideos[0];
    }
    return null;
  }, [queuedVideos, startVideo]);

  // 현재 실행 중인 비디오 가져오기
  const getCurrentRunningVideo = useCallback(() => {
    return runningVideos[0] || null;
  }, [runningVideos]);

  return {
    // 데이터
    allQueuedVideos: state.queuedVideos,
    queuedVideos,
    runningVideos,
    pausedVideos,
    completedVideos: state.completedVideos,
    videoStats,

    // 액션
    addVideo,
    updateVideo,
    completeVideo,
    startVideo,
    pauseVideo,
    resumeVideo,
    startNextVideo,

    // 조회
    getCurrentRunningVideo,
  };
}

