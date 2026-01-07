'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

// ============================================
// Types
// ============================================

interface RunnerStatus {
  runner_id: string;
  hostname: string;
  ip_address: string;
  status: 'online' | 'offline';
  detailed_status: string;
  connected_devices: number;
  busy_devices: number;
  error_devices: number;
  capacity: number;
  last_heartbeat: string | null;
  seconds_since_heartbeat: number | null;
}

interface RunnerStatusBarProps {
  runners: RunnerStatus[];
  onRunnerClick?: (runner: RunnerStatus) => void;
  className?: string;
}

// ============================================
// RunnerStatusBar Component (신호등)
// ============================================

export function RunnerStatusBar({
  runners,
  onRunnerClick,
  className = '',
}: RunnerStatusBarProps) {
  const [selectedRunner, setSelectedRunner] = useState<RunnerStatus | null>(null);

  // 통계
  const stats = useMemo(() => ({
    total: runners.length,
    online: runners.filter(r => r.status === 'online').length,
    offline: runners.filter(r => r.status === 'offline').length,
    totalDevices: runners.reduce((sum, r) => sum + r.connected_devices, 0),
    busyDevices: runners.reduce((sum, r) => sum + r.busy_devices, 0),
    errorDevices: runners.reduce((sum, r) => sum + r.error_devices, 0),
  }), [runners]);

  const handleRunnerClick = (runner: RunnerStatus) => {
    setSelectedRunner(runner === selectedRunner ? null : runner);
    onRunnerClick?.(runner);
  };

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">🖥️</span>
          <span className="text-neutral-300 text-sm font-mono">
            NODE RUNNERS
          </span>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-neutral-400">{stats.online} online</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-neutral-600" />
            <span className="text-neutral-400">{stats.offline} offline</span>
          </div>
          <div className="text-neutral-500">
            {stats.totalDevices} devices
          </div>
        </div>
      </div>

      {/* Runner Indicators (신호등) */}
      <div className="p-3">
        <div className="flex flex-wrap gap-2">
          {runners.map((runner) => (
            <RunnerIndicator
              key={runner.runner_id}
              runner={runner}
              onClick={() => handleRunnerClick(runner)}
              selected={selectedRunner?.runner_id === runner.runner_id}
            />
          ))}
        </div>
      </div>

      {/* Selected Runner Detail */}
      {selectedRunner && (
        <RunnerDetailPanel
          runner={selectedRunner}
          onClose={() => setSelectedRunner(null)}
        />
      )}
    </div>
  );
}

// ============================================
// Runner Indicator (개별 신호등)
// ============================================

function RunnerIndicator({
  runner,
  onClick,
  selected,
}: {
  runner: RunnerStatus;
  onClick: () => void;
  selected: boolean;
}) {
  const isOnline = runner.status === 'online';
  const hasErrors = runner.error_devices > 0;
  const isInUmbra = runner.detailed_status === 'in_umbra';
  
  // 색상 결정
  let color = '#374151'; // offline - gray
  let pulseClass = '';
  
  if (isOnline) {
    if (hasErrors) {
      color = '#ef4444'; // error - red
    } else if (isInUmbra) {
      color = '#8b5cf6'; // umbra - violet
      pulseClass = 'umbral-pulse';
    } else if (runner.busy_devices > 0) {
      color = '#22c55e'; // active - green
    } else {
      color = '#64748b'; // idle - gray
    }
  }

  // 사용률 계산
  const utilization = runner.capacity > 0 
    ? (runner.connected_devices / runner.capacity) * 100 
    : 0;

  return (
    <motion.div
      onClick={onClick}
      className={`
        relative flex flex-col items-center p-2 rounded-lg cursor-pointer
        transition-all hover:bg-neutral-800/50
        ${selected ? 'bg-neutral-800 ring-1 ring-neutral-600' : ''}
        ${pulseClass}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Status Light */}
      <motion.div
        className="w-4 h-4 rounded-full mb-1"
        style={{ backgroundColor: color }}
        animate={isOnline && !hasErrors ? {
          boxShadow: [
            `0 0 0 0 ${color}00`,
            `0 0 8px 2px ${color}40`,
            `0 0 0 0 ${color}00`,
          ],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Hostname */}
      <span className="text-neutral-400 text-xs font-mono truncate max-w-[80px]">
        {runner.hostname.replace('WorkStation-', '')}
      </span>

      {/* Device Count */}
      <span className="text-neutral-600 text-xs">
        {runner.connected_devices}/{runner.capacity}
      </span>

      {/* Utilization Bar */}
      <div className="w-full h-1 bg-neutral-800 rounded-full mt-1 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${utilization}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Error Badge */}
      {hasErrors && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
        >
          <span className="text-white text-xs font-bold">
            {runner.error_devices}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// Runner Detail Panel
// ============================================

function RunnerDetailPanel({
  runner,
  onClose,
}: {
  runner: RunnerStatus;
  onClose: () => void;
}) {
  const isOnline = runner.status === 'online';
  const lastHeartbeat = runner.seconds_since_heartbeat
    ? formatSecondsAgo(runner.seconds_since_heartbeat)
    : 'Never';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-neutral-800 p-3"
    >
      <div className="flex items-start justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isOnline ? 'bg-emerald-500' : 'bg-neutral-600'
              }`}
            />
            <span className="text-neutral-200 font-mono">
              {runner.hostname}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              isOnline 
                ? 'bg-emerald-950 text-emerald-400' 
                : 'bg-neutral-800 text-neutral-500'
            }`}>
              {runner.status}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-neutral-500 text-xs">IP</div>
              <div className="text-neutral-300 font-mono text-xs">
                {runner.ip_address || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-neutral-500 text-xs">Connected</div>
              <div className="text-emerald-400 font-mono">
                {runner.connected_devices}
              </div>
            </div>
            <div>
              <div className="text-neutral-500 text-xs">Busy</div>
              <div className="text-blue-400 font-mono">
                {runner.busy_devices}
              </div>
            </div>
            <div>
              <div className="text-neutral-500 text-xs">Errors</div>
              <div className={`font-mono ${
                runner.error_devices > 0 ? 'text-red-400' : 'text-neutral-500'
              }`}>
                {runner.error_devices}
              </div>
            </div>
          </div>

          {/* Heartbeat */}
          <div className="mt-2 text-xs text-neutral-500">
            Last heartbeat: <span className="text-neutral-400">{lastHeartbeat}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

// ============================================
// Compact Version (for header)
// ============================================

export function RunnerStatusBarCompact({
  runners,
  className = '',
}: {
  runners: RunnerStatus[];
  className?: string;
}) {
  const onlineCount = runners.filter(r => r.status === 'online').length;
  const totalCount = runners.length;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Mini Indicators */}
      <div className="flex gap-1">
        {runners.slice(0, 10).map((runner) => (
          <div
            key={runner.runner_id}
            className={`w-2 h-2 rounded-full ${
              runner.status === 'online'
                ? runner.error_devices > 0
                  ? 'bg-red-500'
                  : runner.detailed_status === 'in_umbra'
                  ? 'bg-purple-500 umbral-pulse'
                  : 'bg-emerald-500'
                : 'bg-neutral-600'
            }`}
            title={runner.hostname}
          />
        ))}
        {runners.length > 10 && (
          <span className="text-neutral-500 text-xs">+{runners.length - 10}</span>
        )}
      </div>

      {/* Summary */}
      <span className="text-neutral-400 text-xs">
        {onlineCount}/{totalCount} online
      </span>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function formatSecondsAgo(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================
// Loading Skeleton
// ============================================

export function RunnerStatusBarSkeleton() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse" />
        <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-20 h-16 bg-neutral-800 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}


