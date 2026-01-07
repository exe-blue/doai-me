// admin/components/NodeStatusBadge.tsx
// 노드 상태 배지 - 숨그늘(in_umbra) Pulse 포함

'use client';

import { motion } from 'framer-motion';
import type { NodeStatus } from '@/lib/supabase/types';

// ============================================
// Status 설정
// ============================================

const STATUS_CONFIG: Record<NodeStatus, {
  label: string;
  labelKo: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isPulsing: boolean;
}> = {
  active: {
    label: 'Active',
    labelKo: '활성',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    isPulsing: false,
  },
  in_umbra: {
    label: 'In Umbra',
    labelKo: '숨그늘',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    isPulsing: true,
  },
  offline: {
    label: 'Offline',
    labelKo: '오프라인',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    borderColor: 'rgba(107, 114, 128, 0.4)',
    isPulsing: false,
  },
  error: {
    label: 'Error',
    labelKo: '에러',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    isPulsing: false,
  },
  maintenance: {
    label: 'Maintenance',
    labelKo: '유지보수',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    isPulsing: false,
  },
};

// ============================================
// Props
// ============================================

interface NodeStatusBadgeProps {
  status: NodeStatus;
  umbraSince?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showDuration?: boolean;
}

// ============================================
// Component
// ============================================

export function NodeStatusBadge({ 
  status, 
  umbraSince,
  size = 'md',
  showLabel = true,
  showDuration = false,
}: NodeStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  
  // 사이즈별 설정
  const sizeConfig = {
    sm: { dot: 'w-1.5 h-1.5', text: 'text-[10px]', padding: 'px-1.5 py-0.5' },
    md: { dot: 'w-2 h-2', text: 'text-xs', padding: 'px-2 py-1' },
    lg: { dot: 'w-2.5 h-2.5', text: 'text-sm', padding: 'px-3 py-1.5' },
  };
  
  const { dot, text, padding } = sizeConfig[size];
  
  // 숨그늘 지속 시간
  const umbraDuration = umbraSince ? getUmbraDuration(umbraSince) : null;
  
  // Pulse 강도 (숨그늘이 길수록 느리고 강해짐)
  const pulseDuration = umbraDuration 
    ? Math.min(6, 2 + Math.floor(umbraDuration.hours / 12))
    : 3;
  
  return (
    <div 
      className={`inline-flex items-center gap-1.5 rounded-full ${padding}`}
      style={{
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      {/* Status Dot */}
      {config.isPulsing ? (
        <motion.span
          className={`${dot} rounded-full`}
          style={{ backgroundColor: config.color }}
          animate={{
            opacity: [0.4, 1, 0.4],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            duration: pulseDuration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ) : (
        <span 
          className={`${dot} rounded-full`}
          style={{ backgroundColor: config.color }}
        />
      )}
      
      {/* Label */}
      {showLabel && (
        <span 
          className={`${text} font-mono`}
          style={{ color: config.color }}
        >
          {config.labelKo}
        </span>
      )}
      
      {/* Duration (숨그늘 지속 시간) */}
      {showDuration && umbraDuration && status === 'in_umbra' && (
        <span className={`${text} text-neutral-500`}>
          {formatDuration(umbraDuration)}
        </span>
      )}
    </div>
  );
}

// ============================================
// 노드 카드용 컴팩트 버전
// ============================================

interface NodeStatusDotProps {
  status: NodeStatus;
  size?: number;
}

export function NodeStatusDot({ status, size = 8 }: NodeStatusDotProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  
  if (config.isPulsing) {
    return (
      <motion.span
        className="rounded-full inline-block"
        style={{ 
          width: size, 
          height: size,
          backgroundColor: config.color,
        }}
        animate={{
          opacity: [0.4, 1, 0.4],
          scale: [0.9, 1.1, 0.9],
          boxShadow: [
            `0 0 0px ${config.color}`,
            `0 0 8px ${config.color}`,
            `0 0 0px ${config.color}`,
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    );
  }
  
  return (
    <span
      className="rounded-full inline-block"
      style={{ 
        width: size, 
        height: size,
        backgroundColor: config.color,
      }}
    />
  );
}

// ============================================
// Utilities
// ============================================

interface UmbraDuration {
  hours: number;
  minutes: number;
}

function getUmbraDuration(umbraSince: string): UmbraDuration {
  const now = new Date();
  const start = new Date(umbraSince);
  const diffMs = now.getTime() - start.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  
  return {
    hours: Math.floor(diffMin / 60),
    minutes: diffMin % 60,
  };
}

function formatDuration(duration: UmbraDuration): string {
  if (duration.hours === 0) {
    return `${duration.minutes}m`;
  }
  if (duration.hours < 24) {
    return `${duration.hours}h`;
  }
  const days = Math.floor(duration.hours / 24);
  return `${days}d`;
}

