'use client';

// ============================================
// useLogs - 로그 관리 훅
// 페이지네이션 및 필터링 지원
// ============================================

import { useState, useCallback, useMemo } from 'react';
import { useNodes, LogEntry } from '../contexts/NodeContext';

interface UseLogsOptions {
  /** 페이지당 로그 수 (기본: 20) */
  pageSize?: number;
  /** 초기 표시 로그 수 (기본: 20) */
  initialDisplayCount?: number;
}

/**
 * 로그 관리를 위한 커스텀 훅
 * 페이지네이션 및 필터링 지원
 */
export function useLogs(options: UseLogsOptions = {}) {
  const { pageSize = 20, initialDisplayCount = 20 } = options;
  const { state, addLog, clearLogs } = useNodes();

  // 현재 표시할 로그 수
  const [displayCount, setDisplayCount] = useState(initialDisplayCount);
  
  // 레벨 필터
  const [levelFilter, setLevelFilter] = useState<LogEntry['level'] | 'all'>('all');

  // 전체 로그
  const allLogs = state.logs;

  // 필터링된 로그
  const filteredLogs = useMemo(() => {
    if (levelFilter === 'all') return allLogs;
    return allLogs.filter(log => log.level === levelFilter);
  }, [allLogs, levelFilter]);

  // 현재 표시할 로그 (페이지네이션)
  const displayedLogs = useMemo(() => {
    return filteredLogs.slice(0, displayCount);
  }, [filteredLogs, displayCount]);

  // 더 불러오기 가능 여부
  const hasMore = displayCount < filteredLogs.length;

  // 남은 로그 수
  const remainingCount = Math.max(0, filteredLogs.length - displayCount);

  // 더 불러오기
  const loadMore = useCallback(() => {
    setDisplayCount(prev => Math.min(prev + pageSize, filteredLogs.length));
  }, [pageSize, filteredLogs.length]);

  // 특정 페이지로 이동
  const goToPage = useCallback((page: number) => {
    setDisplayCount(Math.min(page * pageSize, filteredLogs.length));
  }, [pageSize, filteredLogs.length]);

  // 표시 수 초기화
  const resetDisplay = useCallback(() => {
    setDisplayCount(initialDisplayCount);
  }, [initialDisplayCount]);

  // 로그 초기화
  const handleClearLogs = useCallback(() => {
    clearLogs();
    setDisplayCount(initialDisplayCount);
  }, [clearLogs, initialDisplayCount]);

  // 로그 레벨별 통계
  const logStats = useMemo(() => ({
    total: allLogs.length,
    info: allLogs.filter(l => l.level === 'info').length,
    success: allLogs.filter(l => l.level === 'success').length,
    warn: allLogs.filter(l => l.level === 'warn').length,
    error: allLogs.filter(l => l.level === 'error').length,
  }), [allLogs]);

  // 로그 내보내기
  const exportLogs = useCallback(() => {
    const logText = allLogs
      .map(log => {
        const timestamp = log.timestamp instanceof Date 
          ? log.timestamp.toISOString() 
          : log.timestamp;
        return `[${timestamp}] [${log.level.toUpperCase()}] ${log.message}`;
      })
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doai-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [allLogs]);

  return {
    // 데이터
    allLogs,
    filteredLogs,
    displayedLogs,
    logStats,

    // 페이지네이션
    displayCount,
    hasMore,
    remainingCount,
    pageSize,
    totalPages: Math.ceil(filteredLogs.length / pageSize),
    currentPage: Math.ceil(displayCount / pageSize),

    // 필터
    levelFilter,
    setLevelFilter,

    // 액션
    addLog,
    clearLogs: handleClearLogs,
    loadMore,
    goToPage,
    resetDisplay,
    exportLogs,
  };
}

