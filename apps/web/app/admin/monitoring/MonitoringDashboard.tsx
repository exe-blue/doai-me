'use client';

import { useState, useEffect, useCallback } from 'react';
import { DeviceGridV2, DeviceGridV2Skeleton, type DeviceData } from '../components/monitoring/DeviceGridV2';
import { DeviceDetailPopup } from '../components/monitoring/DeviceDetailPopup';
import { SummaryPanel, SummaryPanelSkeleton, RunnerStatusBarV2, type SystemStats } from '../components/monitoring/SummaryPanel';

// ============================================
// Types
// ============================================

interface RunnerData {
  runner_id: string;
  hostname: string;
  ip_address: string;
  status: 'online' | 'offline';
  total_devices: number;
  connected_count: number;
  busy_count: number;
  error_count: number;
  umbra_count: number;
  faulty_count: number;
  seconds_since_heartbeat: number | null;
}

interface MonitoringData {
  devices: DeviceData[];
  runners: RunnerData[];
  stats: SystemStats;
  timestamp: string;
}

// ============================================
// MonitoringDashboard Component
// ============================================

export function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [selectedRunner, setSelectedRunner] = useState<string | null>(null);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/monitoring');
      if (!res.ok) throw new Error('Failed to fetch');
      
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드 + 폴링 (30초)
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Runner 선택 시 필터링
  const filteredDevices = selectedRunner && data
    ? data.devices.filter(d => d.runner_id === selectedRunner)
    : data?.devices || [];

  // Device Action Handler
  const handleDeviceAction = async (action: string, device: DeviceData) => {
    switch (action) {
      case 'restart':
        // TODO: Implement restart
        console.log('Restart device:', device.device_id);
        break;
      case 'backup':
        // TODO: Implement backup
        console.log('Backup device:', device.device_id);
        break;
      case 'mark_faulty':
        // TODO: Implement mark faulty
        console.log('Mark faulty:', device.device_id);
        break;
      case 'history':
        // TODO: Show history modal
        console.log('Show history:', device.device_id);
        break;
      case 'replace':
        // TODO: Open replacement wizard
        console.log('Replace device:', device.device_id);
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl text-neutral-200 font-mono tracking-wider">
            MONITORING
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            600대 기기 실시간 상태 모니터링
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timestamp */}
          {data?.timestamp && (
            <span className="text-neutral-600 text-xs">
              Updated {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}

          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-sm transition-colors disabled:opacity-50"
          >
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-red-950 border border-red-900 rounded-lg text-red-400 text-sm">
          Error: {error}
        </div>
      )}

      {/* Runner Status Bar */}
      {loading && !data ? (
        <div className="h-24 bg-neutral-900 border border-neutral-800 rounded-lg animate-pulse" />
      ) : data && (
        <RunnerStatusBarV2
          runners={data.runners}
          onRunnerClick={(runner) => {
            setSelectedRunner(prev => 
              prev === runner.runner_id ? null : runner.runner_id
            );
          }}
        />
      )}

      {/* Filter Indicator */}
      {selectedRunner && data && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-950/30 border border-blue-900/30 rounded-lg">
          <span className="text-blue-400 text-sm">
            Filtering by: {data.runners.find(r => r.runner_id === selectedRunner)?.hostname || selectedRunner}
          </span>
          <button
            onClick={() => setSelectedRunner(null)}
            className="text-blue-500 hover:text-blue-300 text-sm"
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* Summary Panel */}
      {loading && !data ? (
        <SummaryPanelSkeleton />
      ) : data && (
        <SummaryPanel stats={data.stats} />
      )}

      {/* Device Grid */}
      {loading && !data ? (
        <DeviceGridV2Skeleton />
      ) : (
        <DeviceGridV2
          devices={filteredDevices}
          onDeviceClick={setSelectedDevice}
        />
      )}

      {/* Device Detail Popup */}
      <DeviceDetailPopup
        device={selectedDevice}
        onClose={() => setSelectedDevice(null)}
        onAction={handleDeviceAction}
      />
    </div>
  );
}
