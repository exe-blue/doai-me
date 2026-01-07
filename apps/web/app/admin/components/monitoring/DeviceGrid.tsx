'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';

// ============================================
// Types
// ============================================

type GridStatus = 'active' | 'umbra' | 'error' | 'idle' | 'offline';

interface DeviceCell {
  device_id: string;
  runner_id: string;
  device_serial: string;
  slot_number: number;
  model: string;
  grid_status: GridStatus;
  connection_status: string;
  work_status: string;
  last_seen: string | null;
  last_command: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  runner_name: string;
}

interface DeviceGridProps {
  devices: DeviceCell[];
  onDeviceClick?: (device: DeviceCell) => void;
  groupByRunner?: boolean;
  className?: string;
}

// ============================================
// Status Config
// ============================================

const STATUS_CONFIG: Record<GridStatus, {
  color: string;
  bgColor: string;
  label: string;
}> = {
  active: {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.8)',
    label: 'Active',
  },
  umbra: {
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.8)',
    label: 'In Umbra',
  },
  error: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.8)',
    label: 'Error/Offline',
  },
  idle: {
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.5)',
    label: 'Idle',
  },
  offline: {
    color: '#374151',
    bgColor: 'rgba(55, 65, 81, 0.3)',
    label: 'Offline',
  },
};

// ============================================
// DeviceGrid Component
// ============================================

export function DeviceGrid({
  devices,
  onDeviceClick,
  groupByRunner = true,
  className = '',
}: DeviceGridProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceCell | null>(null);
  const [filterStatus, setFilterStatus] = useState<GridStatus | 'all'>('all');

  // 상태별 필터링
  const filteredDevices = useMemo(() => {
    if (filterStatus === 'all') return devices;
    return devices.filter(d => d.grid_status === filterStatus);
  }, [devices, filterStatus]);

  // Runner별 그룹핑
  const groupedDevices = useMemo(() => {
    if (!groupByRunner) return { all: filteredDevices };
    
    return filteredDevices.reduce((acc, device) => {
      const key = device.runner_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(device);
      return acc;
    }, {} as Record<string, DeviceCell[]>);
  }, [filteredDevices, groupByRunner]);

  // 통계
  const stats = useMemo(() => ({
    total: devices.length,
    active: devices.filter(d => d.grid_status === 'active').length,
    umbra: devices.filter(d => d.grid_status === 'umbra').length,
    error: devices.filter(d => d.grid_status === 'error').length,
    idle: devices.filter(d => d.grid_status === 'idle').length,
    offline: devices.filter(d => d.grid_status === 'offline').length,
  }), [devices]);

  const handleDeviceClick = useCallback((device: DeviceCell) => {
    setSelectedDevice(device);
    onDeviceClick?.(device);
  }, [onDeviceClick]);

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">📱</span>
          <span className="text-neutral-300 text-sm font-mono">
            DEVICE GRID ({stats.total})
          </span>
        </div>

        {/* Status Filter */}
        <div className="flex gap-1">
          <FilterButton
            active={filterStatus === 'all'}
            onClick={() => setFilterStatus('all')}
            label="All"
            count={stats.total}
          />
          <FilterButton
            active={filterStatus === 'active'}
            onClick={() => setFilterStatus('active')}
            label="●"
            count={stats.active}
            color="#22c55e"
          />
          <FilterButton
            active={filterStatus === 'umbra'}
            onClick={() => setFilterStatus('umbra')}
            label="●"
            count={stats.umbra}
            color="#8b5cf6"
          />
          <FilterButton
            active={filterStatus === 'error'}
            onClick={() => setFilterStatus('error')}
            label="●"
            count={stats.error}
            color="#ef4444"
          />
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {Object.entries(groupedDevices).map(([runnerId, runnerDevices]) => (
          <div key={runnerId} className="mb-4 last:mb-0">
            {/* Runner Label */}
            {groupByRunner && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-neutral-500 text-xs font-mono">
                  {runnerDevices[0]?.runner_name || runnerId}
                </span>
                <span className="text-neutral-600 text-xs">
                  ({runnerDevices.length} devices)
                </span>
              </div>
            )}

            {/* Device Cells Grid */}
            <div 
              className="grid gap-1"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(12px, 1fr))',
              }}
            >
              {runnerDevices.map((device) => (
                <DeviceCell
                  key={device.device_id}
                  device={device}
                  onClick={() => handleDeviceClick(device)}
                  selected={selectedDevice?.device_id === device.device_id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Device Detail */}
      {selectedDevice && (
        <DeviceDetailPanel
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 p-3 border-t border-neutral-800">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <div key={status} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: config.bgColor }}
            />
            <span className="text-neutral-500 text-xs">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Device Cell Component
// ============================================

function DeviceCell({
  device,
  onClick,
  selected,
}: {
  device: DeviceCell;
  onClick: () => void;
  selected: boolean;
}) {
  const config = STATUS_CONFIG[device.grid_status] || STATUS_CONFIG.offline;
  const isUmbra = device.grid_status === 'umbra';

  return (
    <motion.div
      onClick={onClick}
      className={`
        w-3 h-3 rounded-sm cursor-pointer transition-all
        ${selected ? 'ring-2 ring-white scale-150 z-10' : 'hover:scale-125'}
        ${isUmbra ? 'umbral-pulse' : ''}
      `}
      style={{ backgroundColor: config.bgColor }}
      whileHover={{ scale: 1.3 }}
      whileTap={{ scale: 0.9 }}
      title={`${device.device_id} - ${config.label}`}
    />
  );
}

// ============================================
// Filter Button
// ============================================

function FilterButton({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
        active
          ? 'bg-neutral-700 text-neutral-200'
          : 'text-neutral-500 hover:text-neutral-300'
      }`}
    >
      {color && (
        <span style={{ color }}>{label}</span>
      )}
      {!color && label}
      <span className="text-neutral-400">{count}</span>
    </button>
  );
}

// ============================================
// Device Detail Panel
// ============================================

function DeviceDetailPanel({
  device,
  onClose,
}: {
  device: DeviceCell;
  onClose: () => void;
}) {
  const config = STATUS_CONFIG[device.grid_status] || STATUS_CONFIG.offline;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-neutral-800 p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-neutral-200 font-mono">
              {device.device_id}
            </span>
            <span className="text-neutral-500 text-xs">
              Slot #{device.slot_number}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div className="text-neutral-500">Runner:</div>
            <div className="text-neutral-300">{device.runner_name}</div>
            
            <div className="text-neutral-500">Model:</div>
            <div className="text-neutral-300">{device.model}</div>
            
            <div className="text-neutral-500">Status:</div>
            <div style={{ color: config.color }}>{config.label}</div>
            
            <div className="text-neutral-500">Work Status:</div>
            <div className="text-neutral-300">{device.work_status}</div>

            {device.last_command && (
              <>
                <div className="text-neutral-500">Last Command:</div>
                <div className="text-neutral-300 truncate max-w-[200px]">
                  {device.last_command}
                </div>
              </>
            )}

            {device.last_error_code && (
              <>
                <div className="text-neutral-500">Last Error:</div>
                <div className="text-red-400">{device.last_error_code}</div>
              </>
            )}
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
// Loading Skeleton
// ============================================

export function DeviceGridSkeleton() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="h-4 w-40 bg-neutral-800 rounded animate-pulse mb-4" />
      <div className="grid grid-cols-20 gap-1">
        {Array.from({ length: 200 }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 bg-neutral-800 rounded-sm animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}


