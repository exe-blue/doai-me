// apps/web/app/work/components/WorkHistoryPanel.tsx
// Work History 패널 - 완료된 영상 이력 + 스크린샷 + 필터링

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  History, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight, RefreshCw,
  Image, X, Filter, Calendar, Tv
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkHistory, retryVideo, getScreenshots } from '../actions';

interface HistoryItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  status: 'completed' | 'partial' | 'failed';
  totalDevices: number;
  successCount: number;
  failCount: number;
  completedAt: string;
  channelTitle?: string;
  source?: 'direct' | 'channel';
}

interface Screenshot {
  id: string;
  deviceName: string;
  imageUrl: string;
  capturedAt: string;
}

type StatusFilter = 'all' | 'completed' | 'partial' | 'failed';
type SourceFilter = 'all' | 'direct' | 'channel';

export function WorkHistoryPanel() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  // 스크린샷 모달 상태
  const [screenshotModal, setScreenshotModal] = useState<{
    isOpen: boolean;
    historyItemId: string | null;
    screenshots: Screenshot[];
    isLoading: boolean;
  }>({
    isOpen: false,
    historyItemId: null,
    screenshots: [],
    isLoading: false,
  });

  const fetchHistory = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const result = await getWorkHistory({
        page,
        limit: 10,
        statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
        sourceFilter: sourceFilter !== 'all' ? sourceFilter : undefined,
      });

      if (result.success && result.data) {
        setHistory(result.data.items);
        setTotalPages(result.data.totalPages);
        setCurrentPage(result.data.currentPage);
      } else {
        console.error('Failed to fetch history:', result.error);
        setHistory([]);
      }
    } catch {
      console.error('Failed to fetch history');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, sourceFilter]);

  useEffect(() => {
    setCurrentPage(1);
    fetchHistory(1);
  }, [statusFilter, sourceFilter]);

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage, fetchHistory]);

  // 스크린샷 조회
  const openScreenshotModal = async (historyItemId: string) => {
    setScreenshotModal({
      isOpen: true,
      historyItemId,
      screenshots: [],
      isLoading: true,
    });

    try {
      const result = await getScreenshots(historyItemId);
      if (result.success && result.data) {
        setScreenshotModal(prev => ({
          ...prev,
          screenshots: result.data,
          isLoading: false,
        }));
      } else {
        setScreenshotModal(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch {
      setScreenshotModal(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  const closeScreenshotModal = () => {
    setScreenshotModal({
      isOpen: false,
      historyItemId: null,
      screenshots: [],
      isLoading: false,
    });
  };

  const handleRetry = async (itemId: string) => {
    setRetryingId(itemId);
    try {
      const result = await retryVideo(itemId);
      if (result.success) {
        // 히스토리에서 해당 항목 제거 (대기열로 이동됨)
        setHistory((prev) => prev.filter((item) => item.id !== itemId));
      } else {
        console.error('Failed to retry:', result.error);
      }
    } catch {
      console.error('Failed to retry video');
    } finally {
      setRetryingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: HistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400">
            <CheckCircle className="w-3 h-3" />
            Partial
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
        <History className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
        <p className="text-neutral-500">No history yet</p>
        <p className="text-sm text-neutral-600 mt-1">
          Completed videos will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-[#FFCC00]" />
          Work History
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500">
            {history.length} videos
          </span>
          {/* 필터 토글 버튼 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
              showFilters
                ? "bg-[#FFCC00]/10 text-[#FFCC00] border border-[#FFCC00]/30"
                : "bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10"
            )}
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* 필터 패널 */}
      {showFilters && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-wrap gap-4">
          {/* 상태 필터 */}
          <div>
            <label className="text-xs text-neutral-500 mb-2 block">Status</label>
            <div className="flex gap-2">
              {(['all', 'completed', 'partial', 'failed'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1 rounded text-xs transition-colors",
                    statusFilter === status
                      ? "bg-[#FFCC00] text-black font-medium"
                      : "bg-white/5 text-neutral-400 hover:bg-white/10"
                  )}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* 소스 필터 */}
          <div>
            <label className="text-xs text-neutral-500 mb-2 block">Source</label>
            <div className="flex gap-2">
              {(['all', 'direct', 'channel'] as SourceFilter[]).map((source) => (
                <button
                  key={source}
                  onClick={() => setSourceFilter(source)}
                  className={cn(
                    "px-3 py-1 rounded text-xs transition-colors flex items-center gap-1",
                    sourceFilter === source
                      ? "bg-[#FFCC00] text-black font-medium"
                      : "bg-white/5 text-neutral-400 hover:bg-white/10"
                  )}
                >
                  {source === 'channel' && <Tv className="w-3 h-3" />}
                  {source === 'all' ? 'All' : source === 'direct' ? 'Direct' : 'Channel'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">
                Video
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400">
                Status
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400">
                Success Rate
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400 hidden md:table-cell">
                Devices
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400 hidden lg:table-cell">
                Completed
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => {
              const successRate = item.totalDevices > 0
                ? (item.successCount / item.totalDevices) * 100
                : 0;

              return (
                <tr
                  key={item.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-16 h-10 object-cover rounded"
                      />
                      <span className="text-sm text-white truncate max-w-[200px] md:max-w-[300px]">
                        {item.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "font-mono text-sm",
                          successRate >= 90
                            ? "text-green-400"
                            : successRate >= 70
                            ? "text-yellow-400"
                            : "text-red-400"
                        )}
                      >
                        {successRate.toFixed(1)}%
                      </span>
                      <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div
                          className={cn(
                            "h-full",
                            successRate >= 90
                              ? "bg-green-500"
                              : successRate >= 70
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          )}
                          style={{ width: `${successRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center hidden md:table-cell">
                    <div className="text-sm">
                      <span className="text-green-400">{item.successCount}</span>
                      <span className="text-neutral-600 mx-1">/</span>
                      <span className="text-red-400">{item.failCount}</span>
                      <span className="text-neutral-600 mx-1">/</span>
                      <span className="text-neutral-400">{item.totalDevices}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-neutral-500 hidden lg:table-cell">
                    {formatDate(item.completedAt)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* 스크린샷 보기 버튼 */}
                      <button
                        onClick={() => openScreenshotModal(item.id)}
                        className={cn(
                          "inline-flex items-center gap-1 px-3 py-1 rounded text-xs",
                          "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                          "hover:bg-blue-500/20 transition-colors"
                        )}
                      >
                        <Image className="w-3 h-3" />
                        Screenshots
                      </button>

                      {item.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(item.id)}
                          disabled={retryingId === item.id}
                          className={cn(
                            "inline-flex items-center gap-1 px-3 py-1 rounded text-xs",
                            "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
                            "hover:bg-yellow-500/20 transition-colors",
                            "disabled:opacity-50"
                          )}
                        >
                          {retryingId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={cn(
              "p-2 rounded-lg border border-white/10 transition-colors",
              currentPage === 1
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-white/10"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-neutral-400 px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={cn(
              "p-2 rounded-lg border border-white/10 transition-colors",
              currentPage === totalPages
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-white/10"
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 스크린샷 모달 */}
      {screenshotModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* 백드롭 */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeScreenshotModal}
          />

          {/* 모달 */}
          <div className="relative w-full max-w-4xl max-h-[80vh] bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Image className="w-5 h-5 text-[#FFCC00]" />
                Screenshot Verification
              </h3>
              <button
                onClick={closeScreenshotModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              {screenshotModal.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FFCC00]" />
                </div>
              ) : screenshotModal.screenshots.length === 0 ? (
                <div className="text-center py-12">
                  <Image className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
                  <p className="text-neutral-500">No screenshots available</p>
                  <p className="text-sm text-neutral-600 mt-1">
                    Screenshots are captured when devices complete watching
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {screenshotModal.screenshots.map((screenshot) => (
                    <div
                      key={screenshot.id}
                      className="bg-black/30 rounded-lg overflow-hidden border border-white/10"
                    >
                      <img
                        src={screenshot.imageUrl}
                        alt={`Screenshot from ${screenshot.deviceName}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2">
                        <p className="text-sm text-white truncate">
                          {screenshot.deviceName}
                        </p>
                        <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(screenshot.capturedAt).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
