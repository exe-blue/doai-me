'use client';

// ============================================
// LogsPanel - 실시간 로그 패널
// 페이지네이션 및 필터링 지원
// ============================================

import React, { useRef, useEffect, useState } from 'react';
import { 
  Activity, CheckCircle2, AlertCircle, Info, RotateCcw, 
  Download, ChevronDown, Filter, X
} from 'lucide-react';
import { LogEntry, useNodes } from '../../contexts/NodeContext';

interface LogsPanelProps {
  logs: LogEntry[];
  isDark: boolean;
}

// 한 번에 표시할 로그 수
const LOGS_PER_PAGE = 20;
const MAX_DISPLAY_LOGS = 100;

export function LogsPanel({ logs, isDark }: LogsPanelProps) {
  const { clearLogs } = useNodes();
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // 표시할 로그 수
  const [displayCount, setDisplayCount] = useState(LOGS_PER_PAGE);
  
  // 레벨 필터
  const [levelFilter, setLevelFilter] = useState<LogEntry['level'] | 'all'>('all');
  
  // 필터 드롭다운 열림 상태
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 필터링된 로그
  const filteredLogs = levelFilter === 'all' 
    ? logs 
    : logs.filter(log => log.level === levelFilter);

  // 현재 표시할 로그
  const displayedLogs = filteredLogs.slice(0, displayCount);

  // 더 불러오기 가능 여부
  const hasMore = displayCount < filteredLogs.length && displayCount < MAX_DISPLAY_LOGS;

  // 남은 로그 수
  const remainingCount = Math.min(
    filteredLogs.length - displayCount,
    MAX_DISPLAY_LOGS - displayCount
  );

  // 새 로그 추가 시 스크롤 및 표시 수 초기화
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs.length]);

  // 더 불러오기
  const handleLoadMore = () => {
    setDisplayCount(prev => Math.min(prev + LOGS_PER_PAGE, MAX_DISPLAY_LOGS));
  };

  // 초기화
  const handleClear = () => {
    clearLogs();
    setDisplayCount(LOGS_PER_PAGE);
  };

  // 내보내기
  const handleExport = () => {
    const logText = logs
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
  };

  // 레벨별 통계
  const logStats = {
    all: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    success: logs.filter(l => l.level === 'success').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
  };

  return (
    <div className={`col-span-12 md:col-span-5 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-black/10'} backdrop-blur-md border rounded-lg p-5 flex flex-col min-h-[300px]`}>
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <h3 className="font-serif text-lg">실시간 로그</h3>
          <span className={`text-xs font-mono ${isDark ? 'text-neutral-600' : 'text-neutral-500'}`}>
            ({displayedLogs.length}/{filteredLogs.length})
          </span>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1">
          {/* 필터 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-1.5 rounded flex items-center gap-1 ${
                levelFilter !== 'all' 
                  ? 'bg-[#FFCC00]/20 text-[#FFCC00]' 
                  : isDark ? 'hover:bg-white/10 text-neutral-500' : 'hover:bg-black/10 text-neutral-500'
              } transition-colors`}
              title="필터"
            >
              <Filter className="w-4 h-4" />
              {levelFilter !== 'all' && (
                <span className="text-xs uppercase">{levelFilter}</span>
              )}
            </button>

            {isFilterOpen && (
              <FilterDropdown
                isDark={isDark}
                currentFilter={levelFilter}
                stats={logStats}
                onSelect={(level) => {
                  setLevelFilter(level);
                  setDisplayCount(LOGS_PER_PAGE);
                  setIsFilterOpen(false);
                }}
                onClose={() => setIsFilterOpen(false)}
              />
            )}
          </div>

          <button
            onClick={handleExport}
            className={`p-1.5 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition-colors`}
            title="로그 내보내기"
            disabled={logs.length === 0}
          >
            <Download className="w-4 h-4 text-neutral-500" />
          </button>
          <button
            onClick={handleClear}
            className={`p-1.5 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition-colors`}
            title="로그 초기화"
          >
            <RotateCcw className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
      </div>

      {/* 로그 목록 */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto font-mono text-xs space-y-1 pr-2"
      >
        {displayedLogs.length === 0 ? (
          <EmptyLogsState isDark={isDark} hasFilter={levelFilter !== 'all'} />
        ) : (
          <>
            {displayedLogs.map(log => (
              <LogItem key={log.id} log={log} isDark={isDark} />
            ))}

            {/* 더 불러오기 버튼 */}
            {hasMore && (
              <LoadMoreButton
                onClick={handleLoadMore}
                remainingCount={remainingCount}
                isDark={isDark}
              />
            )}

            {/* 최대 표시 알림 */}
            {displayCount >= MAX_DISPLAY_LOGS && filteredLogs.length > MAX_DISPLAY_LOGS && (
              <MaxLimitNotice
                totalCount={filteredLogs.length}
                maxCount={MAX_DISPLAY_LOGS}
                isDark={isDark}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// 필터 드롭다운
// ============================================

interface FilterDropdownProps {
  isDark: boolean;
  currentFilter: LogEntry['level'] | 'all';
  stats: Record<string, number>;
  onSelect: (level: LogEntry['level'] | 'all') => void;
  onClose: () => void;
}

function FilterDropdown({ isDark, currentFilter, stats, onSelect, onClose }: FilterDropdownProps) {
  const levels: Array<{ key: LogEntry['level'] | 'all'; label: string; color: string }> = [
    { key: 'all', label: '전체', color: 'text-neutral-400' },
    { key: 'info', label: '정보', color: 'text-blue-400' },
    { key: 'success', label: '성공', color: 'text-green-400' },
    { key: 'warn', label: '경고', color: 'text-yellow-400' },
    { key: 'error', label: '오류', color: 'text-red-400' },
  ];

  return (
    <>
      {/* 배경 클릭 시 닫기 */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className={`absolute right-0 top-full mt-1 z-50 ${isDark ? 'bg-neutral-900 border-white/10' : 'bg-white border-black/10'} border rounded-lg shadow-lg py-1 min-w-[140px]`}>
        {levels.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between ${
              currentFilter === key
                ? isDark ? 'bg-white/10' : 'bg-black/5'
                : isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
            } transition-colors`}
          >
            <span className={color}>{label}</span>
            <span className={isDark ? 'text-neutral-600' : 'text-neutral-400'}>
              {stats[key]}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

// ============================================
// 빈 로그 상태
// ============================================

function EmptyLogsState({ isDark, hasFilter }: { isDark: boolean; hasFilter: boolean }) {
  return (
    <div className={`text-center py-8 ${isDark ? 'text-neutral-600' : 'text-neutral-500'}`}>
      <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
      <p className="text-sm">
        {hasFilter ? '해당 레벨의 로그가 없습니다' : '로그 대기 중...'}
      </p>
    </div>
  );
}

// ============================================
// 로그 아이템
// ============================================

interface LogItemProps {
  log: LogEntry;
  isDark: boolean;
}

function LogItem({ log, isDark }: LogItemProps) {
  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return <CheckCircle2 className="w-3 h-3" />;
      case 'error': return <AlertCircle className="w-3 h-3" />;
      case 'warn': return <AlertCircle className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const getBorderColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'warn': return '#eab308';
      default: return 'transparent';
    }
  };

  const timestamp = log.timestamp instanceof Date
    ? log.timestamp.toLocaleTimeString()
    : new Date(log.timestamp).toLocaleTimeString();

  return (
    <div
      className={`flex items-start gap-2 ${isDark ? 'border-white/5' : 'border-black/5'} border-l-2 pl-2 py-1 hover:bg-white/5 transition-colors`}
      style={{ borderLeftColor: getBorderColor(log.level) }}
    >
      <span className={getLogColor(log.level)}>
        {getLogIcon(log.level)}
      </span>
      <span className="text-neutral-500 whitespace-nowrap">
        [{timestamp}]
      </span>
      <span className={`${isDark ? 'text-neutral-300' : 'text-neutral-700'} break-all`}>
        {log.message}
      </span>
      {log.nodeId && (
        <span className="text-neutral-600 whitespace-nowrap">
          ({log.nodeId})
        </span>
      )}
    </div>
  );
}

// ============================================
// 더 불러오기 버튼
// ============================================

interface LoadMoreButtonProps {
  onClick: () => void;
  remainingCount: number;
  isDark: boolean;
}

function LoadMoreButton({ onClick, remainingCount, isDark }: LoadMoreButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-3 mt-2 rounded-lg border-2 border-dashed ${
        isDark 
          ? 'border-white/10 hover:border-[#FFCC00]/50 hover:bg-[#FFCC00]/5 text-neutral-400 hover:text-[#FFCC00]' 
          : 'border-black/10 hover:border-[#FFCC00]/50 hover:bg-[#FFCC00]/5 text-neutral-500 hover:text-[#D4A000]'
      } transition-all flex items-center justify-center gap-2 text-xs font-mono`}
    >
      <ChevronDown className="w-4 h-4" />
      더 불러오기 ({remainingCount}개 남음)
    </button>
  );
}

// ============================================
// 최대 표시 알림
// ============================================

interface MaxLimitNoticeProps {
  totalCount: number;
  maxCount: number;
  isDark: boolean;
}

function MaxLimitNotice({ totalCount, maxCount, isDark }: MaxLimitNoticeProps) {
  return (
    <div className={`text-center py-3 mt-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
      <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
        최대 {maxCount}개까지 표시됩니다.
        <br />
        전체 {totalCount}개 로그 중 {totalCount - maxCount}개가 숨겨져 있습니다.
        <br />
        <span className="text-[#FFCC00]">로그 내보내기</span>로 전체 로그를 확인하세요.
      </p>
    </div>
  );
}
