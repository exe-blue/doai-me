// admin/components/WormholeWidgets.tsx
// /admin 웜홀 위젯 - 탐지량, 상위 컨텍스트, 타입 분포, Score Histogram

'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { 
  WormholeStats, 
  WormholeTopContext, 
  WormholeTypeStats,
  WormholeScoreHistogram,
} from '@/lib/supabase/types';

// ============================================
// Widget 1: 탐지량 (Volume)
// ============================================

export function WormholeVolumeWidget() {
  const [stats, setStats] = useState<WormholeStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from('wormhole_stats')
        .select('*')
        .single();
      
      if (!error && data) {
        setStats(data);
      }
      setLoading(false);
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // 10초 polling
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return <WidgetSkeleton title="DETECTION VOLUME" />;
  }
  
  const lastDetectedRelative = stats?.last_detected_at
    ? getRelativeTime(new Date(stats.last_detected_at))
    : 'Never';
  
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-amber-500">📊</span>
        <span className="font-mono text-sm text-neutral-300">DETECTION VOLUME</span>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {/* 24h */}
        <div className="text-center">
          <motion.div 
            className="text-3xl font-bold text-amber-400"
            key={stats?.last_24h}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
          >
            {stats?.last_24h || 0}
          </motion.div>
          <div className="text-xs text-neutral-500 mt-1">24h</div>
        </div>
        
        {/* 7d */}
        <div className="text-center">
          <motion.div 
            className="text-3xl font-bold text-blue-400"
            key={stats?.last_7d}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
          >
            {stats?.last_7d || 0}
          </motion.div>
          <div className="text-xs text-neutral-500 mt-1">7d</div>
        </div>
        
        {/* Total */}
        <div className="text-center">
          <motion.div className="text-3xl font-bold text-neutral-300">
            {stats?.total || 0}
          </motion.div>
          <div className="text-xs text-neutral-500 mt-1">Total</div>
        </div>
      </div>
      
      {/* Last Detected */}
      <div className="mt-4 pt-4 border-t border-neutral-800">
        <div className="flex justify-between items-center">
          <span className="text-neutral-500 text-xs">Last Detected</span>
          <span className="text-neutral-300 text-sm font-mono">
            {lastDetectedRelative}
          </span>
        </div>
        {stats?.avg_score_24h && (
          <div className="flex justify-between items-center mt-1">
            <span className="text-neutral-500 text-xs">Avg Score (24h)</span>
            <span className="text-amber-400 text-sm font-mono">
              {(stats.avg_score_24h * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Widget 2: 상위 컨텍스트 (Top Context)
// ============================================

interface TopContextWidgetProps {
  onContextClick?: (contextKey: string) => void;
}

export function WormholeTopContextWidget({ onContextClick }: TopContextWidgetProps) {
  const [contexts, setContexts] = useState<WormholeTopContext[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchContexts = async () => {
      const { data, error } = await supabase
        .from('wormhole_top_contexts')
        .select('*')
        .limit(10);
      
      if (!error && data) {
        setContexts(data);
      }
      setLoading(false);
    };
    
    fetchContexts();
    const interval = setInterval(fetchContexts, 30000); // 30초 polling
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return <WidgetSkeleton title="TOP CONTEXTS" />;
  }
  
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-purple-500">🔥</span>
        <span className="font-mono text-sm text-neutral-300">TOP CONTEXTS</span>
        <span className="text-xs text-neutral-600 ml-auto">7d</span>
      </div>
      
      {contexts.length === 0 ? (
        <div className="text-center py-6 text-neutral-600 text-sm">
          No contexts detected yet
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {contexts.map((ctx, index) => (
            <motion.div
              key={ctx.context_key}
              className="flex items-center gap-3 p-2 rounded hover:bg-neutral-900 cursor-pointer transition-colors"
              onClick={() => onContextClick?.(ctx.context_key)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Rank */}
              <span className="text-neutral-600 text-xs w-4">
                {index + 1}.
              </span>
              
              {/* Context Key */}
              <div className="flex-grow min-w-0">
                <div className="text-neutral-200 text-sm font-mono truncate">
                  {ctx.context_key}
                </div>
                <div className="text-neutral-600 text-xs">
                  {ctx.trigger_type || 'unknown'}
                </div>
              </div>
              
              {/* Count */}
              <div className="text-right">
                <div className="text-neutral-300 text-sm font-bold">
                  {ctx.event_count}
                </div>
                <div className="text-neutral-600 text-xs">
                  {(ctx.avg_score * 100).toFixed(0)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Widget 3: 타입 분포 (Type Distribution)
// ============================================

const TYPE_INFO = {
  'α': { name: 'Echo Tunnel', desc: '동일 모델', color: '#22c55e' },
  'β': { name: 'Cross-Model', desc: '교차 모델', color: '#3b82f6' },
  'γ': { name: 'Temporal', desc: '시간차 자기공명', color: '#8b5cf6' },
};

export function WormholeTypeDistributionWidget() {
  const [types, setTypes] = useState<WormholeTypeStats[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTypes = async () => {
      const { data, error } = await supabase
        .from('wormhole_type_stats')
        .select('*');
      
      if (!error && data) {
        setTypes(data);
      }
      setLoading(false);
    };
    
    fetchTypes();
    const interval = setInterval(fetchTypes, 30000);
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return <WidgetSkeleton title="TYPE DISTRIBUTION" />;
  }
  
  const total = types.reduce((sum, t) => sum + t.count, 0);
  
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-blue-500">🕳️</span>
        <span className="font-mono text-sm text-neutral-300">TYPE DISTRIBUTION</span>
        <span className="text-xs text-neutral-600 ml-auto">7d</span>
      </div>
      
      {/* Donut Chart Placeholder - Bar로 대체 */}
      <div className="space-y-3">
        {(['α', 'β', 'γ'] as const).map((typeKey) => {
          const typeData = types.find(t => t.wormhole_type === typeKey);
          const info = TYPE_INFO[typeKey];
          const percentage = typeData?.percentage || 0;
          
          return (
            <div key={typeKey} className="group">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span 
                    className="text-lg font-mono"
                    style={{ color: info.color }}
                  >
                    {typeKey}
                  </span>
                  <span className="text-neutral-400 text-xs">
                    {info.name}
                  </span>
                </div>
                <span className="text-neutral-300 text-sm font-mono">
                  {typeData?.count || 0}
                  <span className="text-neutral-600 ml-1">
                    ({percentage}%)
                  </span>
                </span>
              </div>
              
              {/* Bar */}
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: info.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              
              {/* Tooltip on hover */}
              <div className="text-xs text-neutral-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {info.desc} • Avg: {((typeData?.avg_score || 0) * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Total */}
      <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-between">
        <span className="text-neutral-500 text-xs">Total Events</span>
        <span className="text-neutral-300 text-sm font-mono">{total}</span>
      </div>
    </div>
  );
}

// ============================================
// Widget 4: Score Histogram (임계값 튜닝용)
// ============================================

export function WormholeScoreHistogramWidget() {
  const [histogram, setHistogram] = useState<WormholeScoreHistogram[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchHistogram = async () => {
      const { data, error } = await supabase
        .from('wormhole_score_histogram')
        .select('*')
        .order('bucket');
      
      if (!error && data) {
        setHistogram(data);
      }
      setLoading(false);
    };
    
    fetchHistogram();
    const interval = setInterval(fetchHistogram, 60000); // 1분
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return <WidgetSkeleton title="SCORE HISTOGRAM" small />;
  }
  
  const maxCount = Math.max(...histogram.map(h => h.count), 1);
  
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-emerald-500">📈</span>
        <span className="font-mono text-xs text-neutral-400">SCORE HISTOGRAM</span>
      </div>
      
      <div className="flex items-end gap-1 h-16">
        {histogram.map((bucket) => {
          const height = (bucket.count / maxCount) * 100;
          
          return (
            <div
              key={bucket.bucket}
              className="flex-1 group relative h-full"
            >
              <motion.div
                className="bg-emerald-500/80 rounded-t absolute bottom-0 left-0 right-0"
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                style={{ height: `${height}%` }}
                transition={{ duration: 0.5 }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-neutral-800 text-xs text-neutral-300 px-2 py-1 rounded whitespace-nowrap">
                  {bucket.score_range}: {bucket.count}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Labels */}
      <div className="flex justify-between mt-1 text-xs text-neutral-600">
        <span>0.75</span>
        <span>1.00</span>
      </div>
    </div>
  );
}

// ============================================
// Utilities
// ============================================

function WidgetSkeleton({ title, small = false }: { title: string; small?: boolean }) {
  return (
    <div className={`bg-neutral-950 border border-neutral-800 rounded-lg p-4 animate-pulse ${small ? 'h-32' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 bg-neutral-800 rounded" />
        <span className="font-mono text-sm text-neutral-600">{title}</span>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-neutral-800 rounded w-3/4" />
        <div className="h-4 bg-neutral-800 rounded w-1/2" />
      </div>
    </div>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

