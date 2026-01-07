'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { DeviceData } from './DeviceGridV2';

// ============================================
// Types
// ============================================

interface DeviceDetailPopupProps {
  device: DeviceData | null;
  onClose: () => void;
  onAction?: (action: DeviceAction, device: DeviceData) => void;
}

type DeviceAction = 'restart' | 'backup' | 'mark_faulty' | 'history' | 'replace';

// ============================================
// DeviceDetailPopup Component
// ============================================

export function DeviceDetailPopup({
  device,
  onClose,
  onAction,
}: DeviceDetailPopupProps) {
  const handleAction = (action: DeviceAction) => {
    if (device) {
      onAction?.(action, device);
    }
  };

  const displayIndex = device ? String(device.device_index).padStart(3, '0') : '000';

  return (
    <AnimatePresence>
      {device && (
        <motion.div
          key="device-detail-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="device-detail-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg bg-[#0a0d12] border border-neutral-700 rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">📱</span>
              <span className="text-neutral-200 font-mono">
                DEVICE #{displayIndex}
              </span>
              <StatusBadge status={device.effective_status} />
            </div>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Section 1: Identification */}
            <Section title="IDENTIFICATION">
              <InfoRow label="Device ID" value={`#${displayIndex}`} />
              <InfoRow label="ADB Serial" value={device.device_serial} mono />
              <InfoRow label="Model" value={`${device.model_name}`} />
              <InfoRow 
                label="IMEI" 
                value={device.manufacturer_serial || 'N/A'} 
                mono 
              />
            </Section>

            {/* Section 2: Location & Connection */}
            <Section title="LOCATION & CONNECTION">
              <InfoRow 
                label="PhoneBoard" 
                value={`${device.runner_hostname} (${device.runner_ip})`} 
              />
              <InfoRow 
                label="Slot" 
                value={`#${device.slot_number} / 20`} 
              />
              <InfoRow 
                label="Connection" 
                value={
                  <span className="flex items-center gap-1">
                    {device.connection_type === 'ethernet' && '🔌'}
                    {device.connection_type === 'wifi' && '📶'}
                    {device.connection_type === 'sim' && '📡'}
                    <span className="capitalize">{device.connection_type}</span>
                    {device.sim_carrier && (
                      <span className="text-neutral-500">({device.sim_carrier})</span>
                    )}
                  </span>
                } 
              />
              {device.device_ip_address && (
                <InfoRow label="Device IP" value={device.device_ip_address} mono />
              )}
            </Section>

            {/* Section 3: Status */}
            <Section title="STATUS">
              <InfoRow 
                label="Connection" 
                value={
                  <StatusIndicator 
                    status={device.connection_status === 'connected' ? 'connected' : 'disconnected'}
                    label={device.connection_status === 'connected' ? 'Connected' : 'Disconnected'}
                  />
                } 
              />
              <InfoRow 
                label="Work Status" 
                value={
                  <StatusIndicator 
                    status={device.work_status as 'idle' | 'busy' | 'error' | 'in_umbra'}
                    label={device.work_status === 'in_umbra' ? 'In Umbra' : device.work_status}
                  />
                } 
              />
              <InfoRow 
                label="Hardware" 
                value={
                  <StatusIndicator 
                    status={device.hardware_status}
                    label={device.hardware_status}
                  />
                } 
              />
            </Section>

            {/* Section 4: AI Agent Binding */}
            <Section title="AI AGENT BINDING">
              {device.agent_id ? (
                <>
                  <InfoRow 
                    label="Status" 
                    value={
                      <StatusIndicator 
                        status="bound"
                        label={device.binding_status || 'Bound'}
                      />
                    } 
                  />
                  <InfoRow label="Google" value={device.google_email || 'N/A'} />
                  <InfoRow label="Agent Name" value={device.agent_name || 'N/A'} />
                </>
              ) : (
                <div className="text-neutral-500 text-sm py-2">
                  No agent bound to this device
                </div>
              )}
            </Section>

            {/* Section 5: Backup & Recovery */}
            <Section title="BACKUP & RECOVERY">
              <InfoRow 
                label="Last Backup" 
                value={device.last_backup_at 
                  ? formatTimeAgo(device.last_backup_at) 
                  : 'Never'
                } 
              />
              <InfoRow 
                label="Snapshot" 
                value={device.last_backup_at ? '✓ Available' : '✕ Not available'} 
              />
            </Section>

            {/* Section 6: Last Command */}
            {device.last_command && (
              <Section title="LAST COMMAND">
                <div className="flex items-center justify-between">
                  <code className="text-xs text-neutral-300 bg-neutral-800 px-2 py-1 rounded font-mono">
                    {device.last_command}
                  </code>
                  {device.last_command_at && (
                    <span className="text-neutral-500 text-xs">
                      {formatTimeAgo(device.last_command_at)}
                    </span>
                  )}
                </div>
              </Section>
            )}

            {/* Section 7: Last Error (if any) */}
            {device.last_error_log && (
              <Section title="LAST ERROR" variant="error">
                <code className="text-xs text-red-400 bg-red-950/30 px-2 py-1 rounded font-mono block">
                  {device.last_error_log}
                </code>
              </Section>
            )}
          </div>

          {/* Actions Footer */}
          <div className="flex flex-wrap gap-2 p-4 border-t border-neutral-800 bg-neutral-900/50">
            <ActionButton
              icon="🔄"
              label="Restart"
              onClick={() => handleAction('restart')}
            />
            <ActionButton
              icon="📦"
              label="Backup Now"
              onClick={() => handleAction('backup')}
            />
            <ActionButton
              icon="🔧"
              label="Mark Faulty"
              onClick={() => handleAction('mark_faulty')}
              variant="danger"
              disabled={device.hardware_status === 'faulty'}
            />
            <ActionButton
              icon="📋"
              label="History"
              onClick={() => handleAction('history')}
            />
            {device.hardware_status === 'faulty' && (
              <ActionButton
                icon="🔀"
                label="Replace Device"
                onClick={() => handleAction('replace')}
                variant="warning"
              />
            )}
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Sub Components
// ============================================

function Section({ 
  title, 
  children,
  variant = 'default',
}: { 
  title: string; 
  children: React.ReactNode;
  variant?: 'default' | 'error';
}) {
  return (
    <div className={`p-3 rounded border ${
      variant === 'error' 
        ? 'border-red-900/50 bg-red-950/10' 
        : 'border-neutral-800 bg-neutral-900/30'
    }`}>
      <div className="text-xs text-neutral-500 mb-2 tracking-wider">
        {title}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  mono = false,
}: { 
  label: string; 
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={`text-neutral-200 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    active: { bg: 'bg-emerald-950', text: 'text-emerald-400' },
    busy: { bg: 'bg-amber-950', text: 'text-amber-400' },
    umbra: { bg: 'bg-purple-950', text: 'text-purple-400' },
    error: { bg: 'bg-red-950', text: 'text-red-400' },
    faulty: { bg: 'bg-red-950', text: 'text-red-400' },
    offline: { bg: 'bg-neutral-800', text: 'text-neutral-500' },
  };
  
  const c = config[status] || config.offline;
  
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${c.bg} ${c.text}`}>
      {status === 'umbra' ? 'In Umbra' : status}
    </span>
  );
}

function StatusIndicator({ 
  status, 
  label,
}: { 
  status: string; 
  label: string;
}) {
  const colorMap: Record<string, string> = {
    connected: 'text-emerald-400',
    disconnected: 'text-neutral-500',
    idle: 'text-emerald-400',
    busy: 'text-amber-400',
    error: 'text-red-400',
    in_umbra: 'text-purple-400',
    active: 'text-emerald-400',
    faulty: 'text-red-400',
    replaced: 'text-amber-400',
    retired: 'text-neutral-500',
    bound: 'text-emerald-400',
    unbound: 'text-neutral-500',
    migrating: 'text-amber-400',
  };
  
  const dotColor: Record<string, string> = {
    connected: 'bg-emerald-500',
    disconnected: 'bg-neutral-600',
    idle: 'bg-emerald-500',
    busy: 'bg-amber-500',
    error: 'bg-red-500',
    in_umbra: 'bg-purple-500',
    active: 'bg-emerald-500',
    faulty: 'bg-red-500',
    replaced: 'bg-amber-500',
    retired: 'bg-neutral-600',
    bound: 'bg-emerald-500',
    unbound: 'bg-neutral-600',
    migrating: 'bg-amber-500',
  };
  
  return (
    <span className={`flex items-center gap-1.5 ${colorMap[status] || 'text-neutral-400'}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor[status] || 'bg-neutral-600'}`} />
      <span className="capitalize">{label}</span>
    </span>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'warning';
  disabled?: boolean;
}) {
  const baseStyle = 'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors';
  const variantStyles = {
    default: 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300',
    danger: 'bg-red-950 hover:bg-red-900 text-red-400',
    warning: 'bg-amber-950 hover:bg-amber-900 text-amber-400',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================
// Helpers
// ============================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}


