'use client';

import { motion } from 'framer-motion';
import { KPIMetric } from '@/lib/admin/types';

// ============================================
// Constants (컴포넌트 외부로 이동하여 재생성 방지)
// ============================================

const accentColors = {
  green: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
  blue: 'border-l-blue-500',
  umbra: 'border-l-purple-500',
};

const valueColors = {
  green: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  umbra: 'text-purple-400',
};

const trendColors = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  neutral: 'text-neutral-500',
};

const trendIcons = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

const trendLabels = {
  up: 'increasing',
  down: 'decreasing',
  neutral: 'no change',
};

// ============================================
// Types
// ============================================

interface KPICardProps {
  icon: string;
  label: string;
  value: number | string;
  metrics?: KPIMetric[];
  accentColor: 'green' | 'amber' | 'red' | 'blue' | 'umbra';
  variant?: 'default' | 'umbral';
  className?: string;
}

// ============================================
// KPICard Component
// ============================================

export function KPICard({
  icon,
  label,
  value,
  metrics,
  accentColor,
  variant = 'default',
  className = '',
}: KPICardProps) {
  const isUmbral = variant === 'umbral';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-lg border-l-4 p-4
        ${accentColors[accentColor]}
        ${isUmbral 
          ? 'bg-purple-950/20 border border-purple-900/30' 
          : 'bg-neutral-900 border border-neutral-800'
        }
        ${isUmbral ? 'umbral-pulse' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">{icon}</span>
          <span className="text-neutral-400 text-sm font-mono uppercase">
            {label}
          </span>
        </div>
        
        {/* Umbral Dot Indicator */}
        {isUmbral && (
          <div className="umbral-dot" />
        )}
      </div>

      {/* Value */}
      <div className={`text-3xl font-mono font-bold mb-3 ${valueColors[accentColor]}`}>
        {formatValue(value)}
      </div>

      {/* Metrics */}
      {metrics && metrics.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-3 border-t border-neutral-800/50">
          {metrics.map((metric, i) => (
            <MetricItem key={i} metric={metric} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// MetricItem
// ============================================

function MetricItem({ metric }: { metric: KPIMetric }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-neutral-500 text-xs">{metric.label}:</span>
      <span className="text-neutral-200 text-xs font-mono">{metric.value}</span>
      {metric.trend && (
        <span 
          className={`text-xs ${trendColors[metric.trend]}`}
          aria-label={trendLabels[metric.trend]}
        >
          <span aria-hidden="true">{trendIcons[metric.trend]}</span>
          {metric.trendValue && ` ${metric.trendValue}`}
        </span>
      )}
    </div>
  );
}

// ============================================
// KPICardUmbral (In Umbra 특화)
// ============================================

interface KPICardUmbralProps {
  count: number;
  percentage: number;
  total?: number;
}

export function KPICardUmbral({ count, percentage, total }: KPICardUmbralProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="umbral-pulse relative overflow-hidden rounded-lg border border-purple-900/30 bg-purple-950/20 p-4"
    >
      {/* Glow Effect */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.3), transparent 70%)',
        }}
      />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-label="new moon">🌑</span>
            <span className="text-purple-300 text-sm font-mono uppercase">
              In Umbra
            </span>
          </div>
          <div className="umbral-dot" />
        </div>

        {/* Value */}
        <div className="text-3xl font-mono font-bold text-purple-300 mb-1">
          {count.toLocaleString()}
        </div>
        
        {/* Subtitle */}
        <div className="text-purple-500 text-sm font-mono">
          숨그늘
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-4 pt-3 mt-3 border-t border-purple-900/30">
          <div className="flex items-center gap-1">
            <span className="text-purple-600 text-xs">비율:</span>
            <span className="text-purple-300 text-xs font-mono">
              {percentage.toFixed(1)}%
            </span>
          </div>
          {total !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-purple-600 text-xs">전체:</span>
              <span className="text-purple-300 text-xs font-mono">
                {total.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// KPI Cards Grid
// ============================================

interface KPIGridProps {
  children: React.ReactNode;
  className?: string;
}

export function KPIGrid({ children, className = '' }: KPIGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function formatValue(value: number | string): string {
  if (typeof value === 'string') return value;
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}


