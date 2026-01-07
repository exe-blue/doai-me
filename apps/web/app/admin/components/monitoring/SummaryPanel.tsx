'use client';

import { motion } from 'framer-motion';

// ============================================
// Types
// ============================================

export interface SystemStats {
  // Runners
  total_runners: number;
  online_runners: number;
  
  // Devices 상태
  total_devices: number;
  connected_devices: number;
  active_devices: number;
  busy_devices: number;
  umbra_devices: number;
  error_devices: number;
  offline_devices: number;
  
  // Hardware 상태
  active_hardware: number;
  faulty_hardware: number;
  replaced_hardware: number;
  
  // 통신 방식
  ethernet_count: number;
  wifi_count: number;
  sim_count: number;
  
  // Agent 바인딩
  bound_agents: number;
  unbound_agents: number;
  migrating_agents: number;
  
  // Timestamp
  measured_at: string;
}

interface SummaryPanelProps {
  stats: SystemStats;
  className?: string;
}

// ============================================
// SummaryPanel Component
// ============================================

export function SummaryPanel({ stats, className = '' }: SummaryPanelProps) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Device Status Section */}
      <SummaryCard title="DEVICE STATUS" icon="📱">
        <StatItem label="Total" value={stats.total_devices} />
        <StatItem label="Active" value={stats.active_devices} color="#22c55e" />
        <StatItem label="In Umbra" value={stats.umbra_devices} color="#8b5cf6" pulse />
        <StatItem label="Busy" value={stats.busy_devices} color="#f59e0b" />
        <StatItem label="Error" value={stats.error_devices} color="#ef4444" alert />
        <StatItem label="Offline" value={stats.offline_devices} color="#64748b" />
      </SummaryCard>

      {/* Hardware Status Section */}
      <SummaryCard title="HARDWARE" icon="🔧">
        <StatItem label="Active" value={stats.active_hardware} color="#22c55e" />
        <StatItem 
          label="Faulty" 
          value={stats.faulty_hardware} 
          color="#ef4444" 
          alert={stats.faulty_hardware > 0} 
        />
        <StatItem label="Replaced" value={stats.replaced_hardware} color="#f59e0b" />
      </SummaryCard>

      {/* Connection Type Section */}
      <SummaryCard title="CONNECTION TYPE" icon="🔌">
        <StatItem label="Ethernet" value={stats.ethernet_count} icon="🔌" />
        <StatItem label="WiFi" value={stats.wifi_count} icon="📶" />
        <StatItem label="SIM" value={stats.sim_count} icon="📡" />
        
        {/* Connection Distribution Bar */}
        <div className="mt-3 pt-3 border-t border-neutral-800">
          <ConnectionDistributionBar
            ethernet={stats.ethernet_count}
            wifi={stats.wifi_count}
            sim={stats.sim_count}
            total={stats.total_devices}
          />
        </div>
      </SummaryCard>

      {/* AI Agents Section */}
      <SummaryCard title="AI AGENTS" icon="🤖">
        <StatItem label="Bound" value={stats.bound_agents} color="#22c55e" />
        <StatItem label="Unbound" value={stats.unbound_agents} color="#64748b" />
        <StatItem 
          label="Migrating" 
          value={stats.migrating_agents} 
          color="#f59e0b" 
          pulse={stats.migrating_agents > 0}
        />
        
        {/* Binding Rate */}
        <div className="mt-3 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">Binding Rate</span>
            <span className="text-emerald-400 font-mono">
              {stats.total_devices > 0 
                ? Math.round((stats.bound_agents / stats.total_devices) * 100) 
                : 0}%
            </span>
          </div>
          <div className="mt-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `${stats.total_devices > 0 
                  ? (stats.bound_agents / stats.total_devices) * 100 
                  : 0}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </SummaryCard>
    </div>
  );
}

// ============================================
// Runner Status Bar (상단)
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

interface RunnerStatusBarV2Props {
  runners: RunnerData[];
  onRunnerClick?: (runner: RunnerData) => void;
  className?: string;
}

export function RunnerStatusBarV2({
  runners,
  onRunnerClick,
  className = '',
}: RunnerStatusBarV2Props) {
  const onlineCount = runners.filter(r => r.status === 'online').length;
  const totalCount = runners.length;

  return (
    <div className={`bg-[#0a0d12] border border-neutral-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">🖥️</span>
          <span className="text-neutral-200 text-sm font-mono tracking-wider">
            NODE RUNNERS
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-neutral-400">{onlineCount} online</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-neutral-600" />
            <span className="text-neutral-400">{totalCount - onlineCount} offline</span>
          </div>
        </div>
      </div>

      {/* Runner Grid (신호등) */}
      <div className="p-3">
        <div className="flex flex-wrap gap-2">
          {runners.map((runner) => (
            <RunnerIndicatorV2
              key={runner.runner_id}
              runner={runner}
              onClick={() => onRunnerClick?.(runner)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RunnerIndicatorV2({
  runner,
  onClick,
}: {
  runner: RunnerData;
  onClick: () => void;
}) {
  const isOnline = runner.status === 'online';
  const hasErrors = runner.error_count > 0 || runner.faulty_count > 0;
  const hasUmbra = runner.umbra_count > 0;
  
  let color = '#374151'; // offline
  let pulseClass = '';
  
  if (isOnline) {
    if (hasErrors) {
      color = '#ef4444';
    } else if (hasUmbra) {
      color = '#8b5cf6';
      pulseClass = 'umbral-pulse';
    } else if (runner.busy_count > 0) {
      color = '#22c55e';
    } else {
      color = '#64748b';
    }
  }

  return (
    <motion.div
      onClick={onClick}
      className={`
        relative flex flex-col items-center p-2 rounded-lg cursor-pointer
        transition-all hover:bg-neutral-800/50
        ${pulseClass}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Status Light */}
      <motion.div
        className="w-3.5 h-3.5 rounded-full mb-1"
        style={{ backgroundColor: color }}
        animate={isOnline ? {
          boxShadow: [
            `0 0 0 0 ${color}00`,
            `0 0 8px 2px ${color}40`,
            `0 0 0 0 ${color}00`,
          ],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Hostname (축약) */}
      <span className="text-neutral-500 text-[10px] font-mono">
        {runner.hostname.replace('pb-', '')}
      </span>

      {/* Device Count */}
      <span className="text-neutral-600 text-[10px]">
        {runner.connected_count}/{runner.total_devices}
      </span>

      {/* Error Badge */}
      {hasErrors && (
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">
            {runner.error_count + runner.faulty_count}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// Sub Components
// ============================================

function SummaryCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0a0d12] border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">{icon}</span>
        <span className="text-neutral-400 text-xs tracking-wider">{title}</span>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  color,
  icon,
  alert = false,
  pulse = false,
}: {
  label: string;
  value: number;
  color?: string;
  icon?: string;
  alert?: boolean;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-xs">{icon}</span>}
        <span className="text-neutral-500">{label}</span>
      </div>
      <span 
        className={`font-mono ${pulse ? 'umbral-pulse' : ''} ${alert && value > 0 ? 'animate-pulse' : ''}`}
        style={{ color: color || '#9ca3af' }}
      >
        {value}
      </span>
    </div>
  );
}

function ConnectionDistributionBar({
  ethernet,
  wifi,
  sim,
  total,
}: {
  ethernet: number;
  wifi: number;
  sim: number;
  total: number;
}) {
  const ethernetPct = total > 0 ? (ethernet / total) * 100 : 0;
  const wifiPct = total > 0 ? (wifi / total) * 100 : 0;
  const simPct = total > 0 ? (sim / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex h-2 rounded-full overflow-hidden bg-neutral-800">
        <motion.div
          className="bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${ethernetPct}%` }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="bg-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${wifiPct}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
        <motion.div
          className="bg-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${simPct}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-neutral-600">
        <span>{Math.round(ethernetPct)}%</span>
        <span>{Math.round(wifiPct)}%</span>
        <span>{Math.round(simPct)}%</span>
      </div>
    </div>
  );
}

// ============================================
// Skeleton
// ============================================

export function SummaryPanelSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-[#0a0d12] border border-neutral-800 rounded-lg p-4">
          <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse mb-3" />
          <div className="space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-4 bg-neutral-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


