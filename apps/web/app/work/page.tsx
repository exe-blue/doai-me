// apps/web/app/work/page.tsx
// Work 페이지 - 광고주용 YouTube 영상 등록 및 디바이스 제어
// 3단계 접근 방식: Input → Record → Display

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ListVideo, History, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { GuestNotice } from '@/components/GuestNotice';
import { WorkHeroSection } from './components/WorkHeroSection';
import { WorkStatsBar, DEFAULT_WORK_STATS } from './components/WorkStatsBar';
import { RegisterVideoForm } from './components/RegisterVideoForm';
import { VideoQueueList } from './components/VideoQueueList';
import { WorkHistoryPanel } from './components/WorkHistoryPanel';
import { getVideoQueue, getWorkHistory } from './actions';

type Tab = 'queue' | 'history';

export default function WorkPage() {
  const [activeTab, setActiveTab] = useState<Tab>('queue');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [stats, setStats] = useState(DEFAULT_WORK_STATS);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // 인증 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 간단한 인증 확인 - getVideoQueue를 호출해서 확인
        const result = await getVideoQueue();
        // 성공하면 인증됨, 에러가 'Unauthorized'면 미인증
        setIsAuthenticated(result.success || result.error !== 'Unauthorized');
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // 통계 로드
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const [queueResult, historyResult] = await Promise.all([
        getVideoQueue(),
        getWorkHistory({ limit: 100 }),
      ]);

      const queueItems = queueResult.data || [];
      const historyItems = historyResult.data?.items || [];

      // 통계 계산
      const pendingVideos = queueItems.filter(
        (item) => item.status === 'ready' || item.status === 'processing'
      ).length;
      const completedVideos = historyItems.filter(
        (item) => item.status === 'completed'
      ).length;
      const totalViews = historyItems.reduce(
        (sum, item) => sum + item.successCount,
        0
      );

      setStats({
        totalVideos: queueItems.length + historyItems.length,
        completedVideos,
        pendingVideos,
        totalViews,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    // 30초마다 통계 갱신
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* 전역 헤더 */}
      <Header />

      {/* 메인 콘텐츠 */}
      <main className="pt-24 pb-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* 히어로 섹션 */}
          <WorkHeroSection />

          {/* 통계 바 */}
          <WorkStatsBar stats={stats} isLoading={isLoadingStats} />

          {/* Input 섹션: 영상 등록 */}
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-[#FFCC00]" />
              영상 등록
              <span className="text-xs text-neutral-500 font-normal ml-2">
                (Input)
              </span>
            </h2>

            {/* 인증 상태에 따른 렌더링 */}
            {isAuthenticated === null ? (
              // 로딩 중
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-neutral-800 rounded" />
                  <div className="h-24 bg-neutral-800 rounded" />
                </div>
              </div>
            ) : isAuthenticated ? (
              // 인증된 사용자
              <RegisterVideoForm />
            ) : (
              // 비회원
              <GuestNotice action="영상 등록" />
            )}
          </section>

          {/* Record & Display 섹션: 대기열 + 이력 */}
          <section>
            {/* 탭 네비게이션 */}
            <div className="flex gap-2 mb-6 border-b border-white/10">
              <button
                onClick={() => setActiveTab('queue')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 font-mono text-sm uppercase tracking-wider',
                  'border-b-2 transition-colors',
                  activeTab === 'queue'
                    ? 'border-[#FFCC00] text-[#FFCC00]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                )}
              >
                <ListVideo className="w-4 h-4" />
                대기열 (Record)
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 font-mono text-sm uppercase tracking-wider',
                  'border-b-2 transition-colors',
                  activeTab === 'history'
                    ? 'border-[#FFCC00] text-[#FFCC00]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                )}
              >
                <History className="w-4 h-4" />
                시청 이력 (Display)
              </button>
            </div>

            {/* 탭 콘텐츠 */}
            {activeTab === 'queue' && <VideoQueueList />}
            {activeTab === 'history' && <WorkHistoryPanel />}
          </section>
        </div>
      </main>
    </div>
  );
}
