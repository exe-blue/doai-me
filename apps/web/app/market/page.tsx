'use client';

// ============================================
// DoAi.ME - Market (경제) 페이지 v4.0
// 
// 용어:
// - Node (노드) = PC (Bridge 실행 컴퓨터)
// - Device (디바이스) = 스마트폰 (Android 기기)
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { NodeProvider, useNodes } from '../contexts/NodeContext';
import { Header } from '../components/layout';
import { useYouTubeChannelPolling } from '../hooks/useYouTubeChannelPolling';

// 컴포넌트 임포트
import {
  NodeStatusBar,
  WatchedStatsBar,
  CurrentlyWatchingPanel,
  InjectionPanel,
  QueuePanel,
  LogsPanel,
  CompletedPanel,
  SubscribedChannelsPanel,
} from './components';

// 파티클 네트워크 동적 임포트
const ParticleNetwork = dynamic(() => import('../components/ParticleNetwork'), {
  ssr: false,
});

// ============================================
// Main Page Component
// ============================================

export default function MarketPage() {
  return (
    <NodeProvider wsEndpoint="ws://localhost:8080">
      <MarketContent />
    </NodeProvider>
  );
}

// ============================================
// Market Content
// ============================================

function MarketContent() {
  const [isDark, setIsDark] = useState(true);
  const { 
    state, 
    nodes, 
    devices, 
    addLog, 
    connect, 
    refreshDevices,
    sendCommand,
  } = useNodes();
  
  // YouTube 채널 폴링 (5분마다 신규 영상 체크)
  useYouTubeChannelPolling({
    pollInterval: 5 * 60 * 1000,
    enabled: true,
    autoRegister: true,
  });

  // 초기 테마 설정
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // 테마 토글
  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const newIsDark = !prev;
      if (newIsDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      return newIsDark;
    });
  }, []);

  // 재연결 핸들러
  const handleReconnect = useCallback(() => {
    addLog('info', 'Bridge 재연결 시도...');
    connect();
  }, [addLog, connect]);

  // 디바이스 새로고침 핸들러
  const handleRefreshDevices = useCallback(() => {
    addLog('info', '디바이스 새로고침...');
    refreshDevices();
  }, [addLog, refreshDevices]);

  // 디바이스 복구 핸들러
  const handleRecoverDevice = useCallback((deviceId: string) => {
    addLog('info', `디바이스 복구 시도: ${deviceId}`);
    sendCommand(deviceId, 'recover', {});
  }, [addLog, sendCommand]);

  // 첫 번째 노드 가져오기 (현재는 단일 노드)
  const primaryNode = nodes[0] || null;
  const laixiConnected = primaryNode?.laixiConnected || false;

  // 연결 상태
  const isConnected = state.connectionStatus === 'connected';
  const isConnecting = state.connectionStatus === 'connecting';

  const runningCount = state.queuedVideos.filter(v => v.status === 'running').length;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-[#050505] text-neutral-200' : 'bg-[#F5F5F5] text-neutral-800'} transition-colors duration-300 font-sans`}>
      {/* 파티클 네트워크 배경 */}
      <ParticleNetwork isDark={isDark} zIndex={0} />

      {/* CRT Scanlines */}
      {isDark && <div className="scanlines fixed inset-0 pointer-events-none z-10 opacity-60" />}

      {/* 헤더 */}
      <Header
        isDark={isDark}
        onToggleTheme={toggleTheme}
        isSimulationMode={false}
      />

      {/* 연결 상태 표시 */}
      {!isConnected && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-mono ${
          isConnecting 
            ? 'bg-yellow-500/90 text-black animate-pulse' 
            : 'bg-red-500/90 text-white'
        }`}>
          {isConnecting ? '🔄 Bridge 연결 중...' : '❌ Bridge 연결 안됨'}
          {!isConnecting && (
            <button 
              onClick={handleReconnect}
              className="ml-2 underline hover:no-underline"
            >
              재연결
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 relative w-full overflow-y-auto p-4 md:p-6 z-20 pt-20">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">

          {/* 1. 노드(PC) + 디바이스(스마트폰) 상태 */}
          <NodeStatusBar
            gatewayNode={primaryNode}
            devices={devices}
            connectionStatus={state.connectionStatus}
            laixiConnected={laixiConnected}
            isDark={isDark}
            onReconnect={handleReconnect}
            onRefreshDevices={handleRefreshDevices}
            onRecoverDevice={handleRecoverDevice}
          />

          {/* 2. 시청 통계 */}
          <WatchedStatsBar
            stats={state.stats}
            queuedCount={state.queuedVideos.length}
            runningCount={runningCount}
            isDark={isDark}
          />

          {/* 3. 현재 시청중 */}
          <CurrentlyWatchingPanel
            devices={devices}
            queuedVideos={state.queuedVideos}
            isDark={isDark}
          />

          {/* 4. 동영상/채널 등록 */}
          <InjectionPanel isDark={isDark} />

          {/* 5. 연동된 채널 목록 */}
          <SubscribedChannelsPanel isDark={isDark} />

          {/* 6. 대기열 + 7. 로그 */}
          <div className="grid grid-cols-12 gap-4">
            <QueuePanel
              queuedVideos={state.queuedVideos}
              isDark={isDark}
            />
            <LogsPanel
              logs={state.logs}
              isDark={isDark}
            />
          </div>

          {/* 8. 완료 목록 */}
          <CompletedPanel
            completedVideos={state.completedVideos}
            isDark={isDark}
          />

        </div>
      </main>
    </div>
  );
}
