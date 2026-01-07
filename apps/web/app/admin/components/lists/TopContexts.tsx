'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TopContext, 
  WORMHOLE_TYPE_CONFIG, 
  WormholeType,
  TimeFilter,
  getIntensityColor,
} from '@/lib/admin/types';
import { fetchTopContexts } from '@/lib/admin/api';

// ============================================
// Types
// ============================================

interface TopContextsProps {
  onContextClick?: (context: TopContext) => void;
  className?: string;
}

// ============================================
// SegmentedControl Component
// ============================================

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: TimeFilter) => void;
  options: Array<{ value: TimeFilter; label: string }>;
}) {
  return (
    <div className="flex gap-1 bg-neutral-800 rounded-lg p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            value === option.value
              ? 'bg-neutral-600 text-neutral-200'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// TopContexts Component
// ============================================

export function TopContexts({
  onContextClick,
  className = '',
}: TopContextsProps) {
  const [contexts, setContexts] = useState<TopContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTopContexts(timeFilter, 10);
        setContexts(data);
      } catch (e) {
        console.error('Failed to fetch top contexts:', e);
        setError('데이터를 불러오는데 실패했습니다.');
        setContexts([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeFilter]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchTopContexts(timeFilter, 10)
      .then(setContexts)
      .catch((e) => {
        console.error('Retry failed:', e);
        setError('다시 시도해도 실패했습니다.');
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-neutral-300 text-sm font-mono">TOP CONTEXTS</span>
        </div>
        
        <SegmentedControl
          value={timeFilter}
          onChange={setTimeFilter}
          options={[
            { value: '24h', label: '24h' },
            { value: '7d', label: '7d' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>

      {/* Content */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {loading ? (
          <TopContextsSkeleton />
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-400 text-sm mb-2">{error}</div>
            <button
              onClick={handleRetry}
              className="text-neutral-400 text-xs hover:text-neutral-200 underline"
            >
              다시 시도
            </button>
          </div>
        ) : contexts.length === 0 ? (
          <div className="text-neutral-500 text-sm text-center py-8">
            No contexts found
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-neutral-500 font-mono">
                <th className="pb-2">#</th>
                <th className="pb-2">CONTEXT</th>
                <th className="pb-2">TYPE</th>
                <th className="pb-2 text-right">COUNT</th>
                <th className="pb-2 text-right">AVG INT.</th>
              </tr>
            </thead>
            <tbody>
              {contexts.map((ctx) => (
                <ContextRow
                  key={ctx.id || `${ctx.title}-${ctx.rank}`}
                  context={ctx}
                  onClick={() => onContextClick?.(ctx)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================
// Context Row
// ============================================

// 기본 타입 설정 (WORMHOLE_TYPE_CONFIG에 없을 경우 사용)
const DEFAULT_TYPE_CONFIG = {
  color: '#6b7280',
  label: 'Unknown',
  symbol: '?',
  description: 'Unknown type',
};

function ContextRow({
  context,
  onClick,
}: {
  context: TopContext;
  onClick?: () => void;
}) {
  // 방어적 타입 체크: 유효하지 않은 타입이면 기본값 사용
  const typeConfig = WORMHOLE_TYPE_CONFIG[context.type] || DEFAULT_TYPE_CONFIG;
  
  // 방어적 intensity 체크
  const intensity = typeof context.avgIntensity === 'number' ? context.avgIntensity : 0;
  const intensityColor = getIntensityColor(intensity);

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="py-2 text-neutral-500 text-sm">
        {context.rank}
      </td>
      <td className="py-2">
        <div className="text-neutral-200 text-sm truncate max-w-[200px]">
          {context.title}
        </div>
        <div className="text-neutral-600 text-xs">
          {context.contentType}
        </div>
      </td>
      <td className="py-2">
        <TypeBadge type={context.type} />
      </td>
      <td className="py-2 text-right">
        <span className="text-neutral-200 font-mono text-sm">
          {context.count}
        </span>
      </td>
      <td className="py-2 text-right">
        <span
          className="font-mono text-sm"
          style={{ color: intensityColor }}
        >
          {intensity.toFixed(2)}
        </span>
      </td>
    </motion.tr>
  );
}

// ============================================
// Type Badge
// ============================================

export function TypeBadge({ type }: { type: WormholeType }) {
  const config = WORMHOLE_TYPE_CONFIG[type];
  
  return (
    <span
      className="px-2 py-0.5 text-xs rounded"
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    >
      {config.symbol} {config.label}
    </span>
  );
}

// ============================================
// Skeleton
// ============================================

function TopContextsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-12 bg-neutral-800 rounded animate-pulse" />
      ))}
    </div>
  );
}


