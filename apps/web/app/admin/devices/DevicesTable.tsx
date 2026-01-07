'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { retryDevice } from '../actions';

// ============================================
// Types
// ============================================

interface Device {
  device_id: string;
  node_id: string;
  laixi_id: string;
  slot_number: number;
  model: string;
  status: string;
  current_app: string;
  last_seen: string;
  last_error_code: string;
  last_error_message: string;
  consecutive_errors: number;
  battery_level: number;
  nodes?: {
    node_id: string;
    name: string;
    status_v2: string;
  };
}

// ============================================
// Devices Table
// ============================================

export function DevicesTable({ devices }: { devices: Device[] }) {
  if (devices.length === 0) {
    return (
      <div className="p-8 text-center text-neutral-500">
        디바이스가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500 font-mono">
            <th className="px-4 py-3">DEVICE</th>
            <th className="px-4 py-3">NODE</th>
            <th className="px-4 py-3">STATUS</th>
            <th className="px-4 py-3">CURRENT APP</th>
            <th className="px-4 py-3">LAST SEEN</th>
            <th className="px-4 py-3">ERROR</th>
            <th className="px-4 py-3">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <DeviceRow key={device.device_id} device={device} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// Device Row
// ============================================

function DeviceRow({ device }: { device: Device }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleRetry = () => {
    startTransition(async () => {
      try {
        await retryDevice(device.device_id);
        setMessage('✓ 재시도 요청됨');
        setTimeout(() => setMessage(null), 3000);
      } catch (e) {
        setMessage('✗ 실패');
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const timeSinceLastSeen = device.last_seen
    ? formatTimeSince(new Date(device.last_seen))
    : 'N/A';

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
    >
      {/* Device */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-neutral-300 font-mono text-sm">
            {device.device_id}
          </span>
          <span className="text-neutral-600 text-xs">
            #{device.slot_number}
          </span>
        </div>
        <div className="text-neutral-500 text-xs mt-0.5">
          {device.model}
        </div>
      </td>

      {/* Node */}
      <td className="px-4 py-3">
        <div className="text-neutral-400 text-sm">
          {device.nodes?.name || device.node_id}
        </div>
        <NodeStatusBadge status={device.nodes?.status_v2} />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <DeviceStatusBadge status={device.status} />
      </td>

      {/* Current App */}
      <td className="px-4 py-3">
        <span className="text-neutral-400 text-sm truncate max-w-[150px] block">
          {device.current_app || '-'}
        </span>
      </td>

      {/* Last Seen */}
      <td className="px-4 py-3">
        <span className="text-neutral-500 text-sm">
          {timeSinceLastSeen}
        </span>
      </td>

      {/* Error */}
      <td className="px-4 py-3">
        {device.last_error_code ? (
          <div className="group relative">
            <span className="text-red-400 text-xs font-mono cursor-help">
              {device.last_error_code}
              {device.consecutive_errors > 1 && (
                <span className="ml-1 text-red-600">×{device.consecutive_errors}</span>
              )}
            </span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
              <div className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-300 max-w-[200px]">
                {device.last_error_message || 'No details'}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-neutral-600">-</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {device.status === 'error' || device.status === 'missing' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRetry}
              disabled={isPending}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                isPending
                  ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                  : 'bg-amber-900/50 text-amber-400 hover:bg-amber-900'
              }`}
            >
              {isPending ? '...' : '재시도'}
            </button>
            {message && (
              <span className={`text-xs ${message.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                {message}
              </span>
            )}
          </div>
        ) : (
          <span className="text-neutral-600 text-xs">-</span>
        )}
      </td>
    </motion.tr>
  );
}

// ============================================
// Status Badges
// ============================================

function DeviceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    online: 'bg-emerald-950 text-emerald-400 border-emerald-900/50',
    busy: 'bg-blue-950 text-blue-400 border-blue-900/50',
    offline: 'bg-neutral-900 text-neutral-500 border-neutral-800',
    error: 'bg-red-950 text-red-400 border-red-900/50',
    missing: 'bg-amber-950 text-amber-400 border-amber-900/50',
  };

  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${styles[status] || styles.offline}`}>
      {status}
    </span>
  );
}

function NodeStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  
  if (status === 'in_umbra') {
    return (
      <motion.span
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="text-purple-500 text-xs"
      >
        숨그늘
      </motion.span>
    );
  }

  const colors: Record<string, string> = {
    active: 'text-emerald-500',
    offline: 'text-neutral-600',
    error: 'text-red-500',
  };

  return (
    <span className={`text-xs ${colors[status] || colors.offline}`}>
      {status}
    </span>
  );
}

// ============================================
// Helpers
// ============================================

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}초 전`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  return `${Math.floor(seconds / 86400)}일 전`;
}


