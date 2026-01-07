'use client';

import { motion } from 'framer-motion';
import { TypeDistributionData, WORMHOLE_TYPE_CONFIG, WormholeType } from '@/lib/admin/types';

// ============================================
// Constants
// ============================================

// 웜홀 타입 상수 (공유용)
export const WORMHOLE_TYPES: WormholeType[] = ['alpha', 'beta', 'gamma'];

// ============================================
// Types
// ============================================

interface TypeDistributionProps {
  data: TypeDistributionData;
  onTypeClick?: (type: WormholeType) => void;
  className?: string;
}

// ============================================
// TypeDistribution Component (Donut Chart)
// ============================================

export function TypeDistribution({
  data,
  onTypeClick,
  className = '',
}: TypeDistributionProps) {
  // SVG donut chart calculations
  const radius = 80;
  const strokeWidth = 30;
  const circumference = 2 * Math.PI * radius;
  
  let cumulativeOffset = 0;
  const segments = WORMHOLE_TYPES.map((type) => {
    const percentage = data[type].percentage;
    const dashLength = (percentage / 100) * circumference;
    const offset = cumulativeOffset;
    cumulativeOffset += dashLength;
    
    return {
      type,
      config: WORMHOLE_TYPE_CONFIG[type],
      dashLength,
      offset,
      count: data[type].count,
      percentage,
    };
  });

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🍩</span>
        <span className="text-neutral-300 text-sm font-mono">TYPE DISTRIBUTION</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {/* Background Circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#1a2030"
              strokeWidth={strokeWidth}
            />
            
            {/* Segments */}
            {segments.map((seg, i) => (
              <motion.circle
                key={seg.type}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={seg.config.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.dashLength} ${circumference}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${seg.dashLength} ${circumference}` }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                style={{ transformOrigin: '100px 100px', transform: 'rotate(-90deg)' }}
                onClick={() => onTypeClick?.(seg.type)}
              />
            ))}
          </svg>
          
          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-mono font-bold text-neutral-100">
              {data.total}
            </span>
            <span className="text-neutral-500 text-xs">TOTAL</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {segments.map((seg) => (
            <motion.div
              key={seg.type}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-2 rounded hover:bg-neutral-800/50 cursor-pointer transition-colors"
              onClick={() => onTypeClick?.(seg.type)}
            >
              <div className="flex items-center gap-2">
                {/* Color Dot */}
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: seg.config.color }}
                />
                
                {/* Label */}
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-neutral-200 text-sm font-medium">
                      {seg.config.symbol}
                    </span>
                    <span className="text-neutral-400 text-sm">
                      {seg.config.label}
                    </span>
                  </div>
                  <span className="text-neutral-600 text-xs">
                    {seg.config.description}
                  </span>
                </div>
              </div>
              
              {/* Values */}
              <div className="text-right">
                <div className="text-neutral-200 font-mono text-sm">
                  {seg.count}
                </div>
                <div className="text-neutral-500 text-xs">
                  {seg.percentage.toFixed(1)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Compact Version (for smaller spaces)
// ============================================

export function TypeDistributionCompact({
  data,
  className = '',
}: {
  data: TypeDistributionData;
  className?: string;
}) {
  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🍩</span>
        <span className="text-neutral-300 text-sm font-mono">TYPE DIST</span>
      </div>

      {/* Horizontal Bar */}
      <div className="h-4 bg-neutral-800 rounded-full overflow-hidden flex">
        {WORMHOLE_TYPES.map((type) => (
          <motion.div
            key={type}
            initial={{ width: 0 }}
            animate={{ width: `${data[type].percentage}%` }}
            transition={{ duration: 0.5 }}
            style={{ backgroundColor: WORMHOLE_TYPE_CONFIG[type].color }}
            className="h-full"
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-between mt-3">
        {WORMHOLE_TYPES.map((type) => (
          <div key={type} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: WORMHOLE_TYPE_CONFIG[type].color }}
            />
            <span className="text-neutral-400 text-xs">
              {WORMHOLE_TYPE_CONFIG[type].symbol}
            </span>
            <span className="text-neutral-200 text-xs font-mono">
              {data[type].count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

export function TypeDistributionSkeleton() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="h-4 w-40 bg-neutral-800 rounded animate-pulse mb-4" />
      <div className="flex items-center gap-6">
        <div className="w-[200px] h-[200px] bg-neutral-800 rounded-full animate-pulse" />
        <div className="flex-1 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-neutral-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}


