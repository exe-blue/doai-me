'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types (Aria Spec)
// ============================================

type EffectiveStatus = 'active' | 'busy' | 'umbra' | 'error' | 'faulty' | 'offline';
type ConnectionType = 'ethernet' | 'wifi' | 'sim';
type BindingStatus = 'bound' | 'unbound' | 'migrating';
type HardwareStatus = 'active' | 'faulty' | 'replaced' | 'retired';

export interface DeviceData {
  device_id: string;
  device_serial: string;
  model_name: string;
  manufacturer_serial: string | null;
  slot_number: number;
  connection_type: ConnectionType;
  sim_carrier: string | null;
  device_ip_address: string | null;
  connection_status: 'connected' | 'disconnected';
  work_status: string;
  hardware_status: HardwareStatus;
  effective_status: EffectiveStatus;
  device_index: number;
  
  // Runner 정보
  runner_id: string;
  runner_hostname: string;
  runner_ip: string;
  runner_status: 'online' | 'offline';
  
  // Agent 정보
  agent_id: string | null;
  google_email: string | null;
  agent_name: string | null;
  binding_status: BindingStatus | null;
  
  // 명령/에러
  last_command: string | null;
  last_command_at: string | null;
  last_error_log: string | null;
  last_backup_at: string | null;
}

interface DeviceGridV2Props {
  devices: DeviceData[];
  onDeviceClick?: (device: DeviceData) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  className?: string;
}

// ============================================
// Constants
// ============================================

const CONNECTION_ICONS: Record<ConnectionType, string> = {
  ethernet: '🔌',
  wifi: '📶',
  sim: '📡',
};

const STATUS_CONFIG: Record<EffectiveStatus, {
  color: string;
  bgColor: string;
  label: string;
}> = {
  active: { color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.8)', label: 'Active' },
  busy: { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.8)', label: 'Busy' },
  umbra: { color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.8)', label: 'In Umbra' },
  error: { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.8)', label: 'Error' },
  faulty: { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.5)', label: 'Faulty' },
  offline: { color: '#374151', bgColor: 'rgba(55, 65, 81, 0.3)', label: 'Offline' },
};

// ============================================
// DeviceGridV2 Component
// ============================================

export function DeviceGridV2({
  devices,
  onDeviceClick,
  viewMode = 'grid',
  onViewModeChange,
  className = '',
}: DeviceGridV2Props) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [filterStatus, setFilterStatus] = useState<EffectiveStatus | 'all'>('all');
  const [filterConnection, setFilterConnection] = useState<ConnectionType | 'all'>('all');
  const [filterBinding, setFilterBinding] = useState<'bound' | 'unbound' | 'all'>('all');

  // 필터링된 디바이스
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      if (filterStatus !== 'all' && d.effective_status !== filterStatus) return false;
      if (filterConnection !== 'all' && d.connection_type !== filterConnection) return false;
      if (filterBinding !== 'all') {
        const isBound = d.agent_id !== null;
        if (filterBinding === 'bound' && !isBound) return false;
        if (filterBinding === 'unbound' && isBound) return false;
      }
      return true;
    });
  }, [devices, filterStatus, filterConnection, filterBinding]);

  // 통계
  const stats = useMemo(() => ({
    total: devices.length,
    active: devices.filter(d => d.effective_status === 'active').length,
    busy: devices.filter(d => d.effective_status === 'busy').length,
    umbra: devices.filter(d => d.effective_status === 'umbra').length,
    error: devices.filter(d => d.effective_status === 'error').length,
    faulty: devices.filter(d => d.effective_status === 'faulty').length,
    offline: devices.filter(d => d.effective_status === 'offline').length,
    ethernet: devices.filter(d => d.connection_type === 'ethernet').length,
    wifi: devices.filter(d => d.connection_type === 'wifi').length,
    sim: devices.filter(d => d.connection_type === 'sim').length,
    bound: devices.filter(d => d.agent_id !== null).length,
  }), [devices]);

  const handleDeviceClick = useCallback((device: DeviceData) => {
    setSelectedDevice(device);
    onDeviceClick?.(device);
  }, [onDeviceClick]);

  return (
    <div className={`bg-[#0a0d12] border border-neutral-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="text-lg">📱</span>
          <span className="text-neutral-200 text-sm font-mono tracking-wider">
            DEVICES
          </span>
          <span className="text-neutral-500 text-xs">
            ({filteredDevices.length} / {stats.total})
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <FilterSelect
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as EffectiveStatus | 'all')}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: `■ Active (${stats.active})`, color: '#22c55e' },
              { value: 'umbra', label: `◉ Umbra (${stats.umbra})`, color: '#8b5cf6' },
              { value: 'busy', label: `● Busy (${stats.busy})`, color: '#f59e0b' },
              { value: 'error', label: `● Error (${stats.error})`, color: '#ef4444' },
              { value: 'faulty', label: `✕ Faulty (${stats.faulty})`, color: '#ef4444' },
              { value: 'offline', label: `○ Offline (${stats.offline})`, color: '#64748b' },
            ]}
          />

          {/* Connection Filter */}
          <FilterSelect
            value={filterConnection}
            onChange={(v) => setFilterConnection(v as ConnectionType | 'all')}
            options={[
              { value: 'all', label: 'All Connection' },
              { value: 'ethernet', label: `🔌 Ethernet (${stats.ethernet})` },
              { value: 'wifi', label: `📶 WiFi (${stats.wifi})` },
              { value: 'sim', label: `📡 SIM (${stats.sim})` },
            ]}
          />

          {/* Binding Filter */}
          <FilterSelect
            value={filterBinding}
            onChange={(v) => setFilterBinding(v as 'bound' | 'unbound' | 'all')}
            options={[
              { value: 'all', label: 'All Agents' },
              { value: 'bound', label: `● Bound (${stats.bound})` },
              { value: 'unbound', label: `○ Unbound (${stats.total - stats.bound})` },
            ]}
          />

          {/* View Toggle */}
          <div className="flex gap-1 ml-2 p-1 bg-neutral-900 rounded">
            <button 
              onClick={() => onViewModeChange?.('grid')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'grid' ? 'bg-neutral-700 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              Grid
            </button>
            <button 
              onClick={() => onViewModeChange?.('list')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'list' ? 'bg-neutral-700 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-4 max-h-[650px] overflow-y-auto">
        <div 
          className="grid gap-1"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
          }}
        >
          {filteredDevices.map((device) => (
            <DeviceCellV2
              key={device.device_id}
              device={device}
              onClick={() => handleDeviceClick(device)}
              selected={selectedDevice?.device_id === device.device_id}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 p-3 border-t border-neutral-800">
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>통신:</span>
          <span>🔌 Ethernet</span>
          <span>📶 WiFi</span>
          <span>📡 SIM</span>
        </div>
        <div className="w-px h-4 bg-neutral-700" />
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>상태:</span>
          <span className="text-emerald-500">■ Active</span>
          <span className="text-purple-500">◉ Umbra</span>
          <span className="text-amber-500">● Busy</span>
          <span className="text-red-500">● Error</span>
          <span className="text-neutral-600">○ Offline</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Device Cell V2 (Aria Spec)
// ============================================

function DeviceCellV2({
  device,
  onClick,
  selected,
}: {
  device: DeviceData;
  onClick: () => void;
  selected: boolean;
}) {
  const config = STATUS_CONFIG[device.effective_status] || STATUS_CONFIG.offline;
  const isUmbra = device.effective_status === 'umbra';
  const isFaulty = device.hardware_status === 'faulty';
  const hasBoundAgent = device.agent_id !== null;

  // 3자리 인덱스 (001~600)
  const displayIndex = String(device.device_index).padStart(3, '0');

  return (
    <motion.div
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-between
        w-12 h-14 p-1 rounded
        bg-[#0f1318] border border-[#1a2030]
        cursor-pointer transition-all
        ${selected ? 'ring-2 ring-blue-500 scale-110 z-10' : 'hover:scale-105 hover:border-blue-500/50'}
        ${isUmbra ? 'umbral-cell' : ''}
        ${isFaulty ? 'faulty-pulse' : ''}
      `}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Agent Binding Indicator */}
      <div
        className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
          hasBoundAgent ? 'bg-emerald-500' : 'bg-neutral-700'
        }`}
        title={hasBoundAgent ? 'Agent Bound' : 'No Agent'}
      />

      {/* Device ID (3자리) */}
      <span className="text-[10px] font-mono text-neutral-500">
        {displayIndex}
      </span>

      {/* Connection Icon */}
      <span className="text-xs">
        {CONNECTION_ICONS[device.connection_type]}
      </span>

      {/* Status Dot */}
      <div
        className={`w-3 h-3 rounded-sm ${isFaulty ? 'border-2 border-red-300' : ''}`}
        style={{ backgroundColor: config.bgColor }}
      />
    </motion.div>
  );
}

// ============================================
// Filter Select
// ============================================

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; color?: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-neutral-300 focus:outline-none focus:border-blue-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ============================================
// Skeleton
// ============================================

export function DeviceGridV2Skeleton() {
  return (
    <div className="bg-[#0a0d12] border border-neutral-800 rounded-lg p-4">
      <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse mb-4" />
      <div 
        className="grid gap-1"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))' }}
      >
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} className="w-12 h-14 bg-neutral-800 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}


