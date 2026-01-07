'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ResonanceHistogramBin,
  getIntensityColor,
} from '@/lib/admin/types';

// ============================================
// Types
// ============================================

interface ResonanceHistogramProps {
  bins: ResonanceHistogramBin[];
  currentThreshold: number;
  onThresholdChange?: (value: number) => void;
  onThresholdSave?: (value: number) => Promise<void>;
  className?: string;
}

// ============================================
// ResonanceHistogram Component
// ============================================

export function ResonanceHistogram({
  bins,
  currentThreshold,
  onThresholdChange,
  onThresholdSave,
  className = '',
}: ResonanceHistogramProps) {
  const [threshold, setThreshold] = useState(currentThreshold);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // currentThreshold prop이 변경되면 로컬 state 동기화
  useEffect(() => {
    setThreshold(currentThreshold);
  }, [currentThreshold]);

  // 최대 카운트 계산 (차트 스케일링용)
  const maxCount = useMemo(() => 
    Math.max(...bins.map(b => b.count), 1),
    [bins]
  );

  // 통계 계산
  const stats = useMemo(() => {
    const total = bins.reduce((sum, b) => sum + b.count, 0);
    const aboveThreshold = bins
      .filter(b => b.range[0] >= threshold)
      .reduce((sum, b) => sum + b.count, 0);
    const belowThreshold = total - aboveThreshold;
    
    return { total, aboveThreshold, belowThreshold };
  }, [bins, threshold]);

  // 임계값 드래그 핸들러
  const handleThresholdDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    
    // 0.75 ~ 1.0 범위로 매핑
    const newValue = 0.75 + (percentage * 0.25);
    const clamped = Math.max(0.75, Math.min(1.0, newValue));
    const rounded = Math.round(clamped * 100) / 100;
    
    setThreshold(rounded);
    onThresholdChange?.(rounded);
  }, [isDragging, onThresholdChange]);

  // 드래그 종료 시 저장
  const handleDragEnd = useCallback(async () => {
    setIsDragging(false);
    
    if (onThresholdSave && threshold !== currentThreshold) {
      setIsSaving(true);
      try {
        await onThresholdSave(threshold);
      } finally {
        setIsSaving(false);
      }
    }
  }, [threshold, currentThreshold, onThresholdSave]);

  // 임계값의 X 위치 (%)
  const thresholdPosition = ((threshold - 0.75) / 0.25) * 100;

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="text-neutral-300 text-sm font-mono">RESONANCE DISTRIBUTION</span>
        </div>
        
        {/* Threshold Value */}
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 text-xs">Threshold:</span>
          <span className={`text-sm font-mono ${isSaving ? 'text-amber-400' : 'text-purple-400'}`}>
            {threshold.toFixed(2)}
          </span>
          {isSaving && <span className="text-amber-400 text-xs">Saving...</span>}
        </div>
      </div>

      {/* Chart Area */}
      <div
        className="relative h-48 cursor-ew-resize select-none"
        onMouseDown={() => setIsDragging(true)}
        onMouseMove={handleThresholdDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 25, 50, 75, 100].map((pct) => (
            <div 
              key={pct} 
              className="border-t border-neutral-800/50"
              style={{ position: 'absolute', top: `${100 - pct}%`, width: '100%' }}
            />
          ))}
        </div>

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-1 px-1">
          {bins.map((bin, i) => {
            const height = (bin.count / maxCount) * 100;
            const midpoint = (bin.range[0] + bin.range[1]) / 2;
            const isAboveThreshold = bin.range[0] >= threshold;
            const color = getIntensityColor(midpoint);
            
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
                className="flex-1 rounded-t-sm relative group"
                style={{
                  backgroundColor: isAboveThreshold ? color : 'rgba(100, 116, 139, 0.3)',
                  minWidth: '8px',
                }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 whitespace-nowrap">
                    {bin.range[0].toFixed(2)} - {bin.range[1].toFixed(2)}: {bin.count}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Threshold Line (Draggable) */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-purple-500 z-20"
          style={{ left: `${thresholdPosition}%` }}
          animate={{
            boxShadow: isDragging 
              ? '0 0 10px 2px rgba(139, 92, 246, 0.5)' 
              : '0 0 5px 1px rgba(139, 92, 246, 0.3)',
          }}
        >
          {/* Drag Handle */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-8 bg-purple-600 rounded cursor-ew-resize flex items-center justify-center ${
              isDragging ? 'scale-110' : ''
            }`}
          >
            <div className="w-0.5 h-4 bg-purple-300 rounded" />
          </div>
          
          {/* Value Label */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1">
            <div className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded font-mono">
              {threshold.toFixed(2)}
            </div>
          </div>
        </motion.div>
      </div>

      {/* X-Axis Labels */}
      <div className="flex justify-between mt-2 text-xs text-neutral-500 font-mono">
        <span>0.75</span>
        <span>0.85</span>
        <span>0.95</span>
        <span>1.00</span>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-purple-500" />
            <span className="text-neutral-500 text-xs">Above:</span>
            <span className="text-neutral-200 text-xs font-mono">
              {stats.aboveThreshold}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-neutral-600" />
            <span className="text-neutral-500 text-xs">Below:</span>
            <span className="text-neutral-200 text-xs font-mono">
              {stats.belowThreshold}
            </span>
          </div>
        </div>
        <div className="text-neutral-500 text-xs">
          Total: <span className="text-neutral-200 font-mono">{stats.total}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

export function ResonanceHistogramSkeleton() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-48 bg-neutral-800 rounded animate-pulse" />
        <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" />
      </div>
      <div className="h-48 bg-neutral-800 rounded animate-pulse" />
      <div className="flex justify-between mt-4 pt-4 border-t border-neutral-800">
        <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse" />
        <div className="h-4 w-20 bg-neutral-800 rounded animate-pulse" />
      </div>
    </div>
  );
}


