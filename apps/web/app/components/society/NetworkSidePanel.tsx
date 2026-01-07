// components/society/NetworkSidePanel.tsx
// Network Stats Side Panel - 숨그늘 + 웜홀 포함

'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { NodesStatusSummary, WormholeStats } from '@/lib/supabase/types';
import { VerticalTicker, createTickerMessage, type TickerMessageType } from './LiveTicker';

// ============================================
// Props
// ============================================

interface NetworkSidePanelProps {
  className?: string;
}

// ============================================
// Component
// ============================================

export function NetworkSidePanel({ className = '' }: NetworkSidePanelProps) {
  const [nodeStats, setNodeStats] = useState<NodesStatusSummary | null>(null);
  const [wormholeStats, setWormholeStats] = useState<WormholeStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      const [nodeRes, wormholeRes] = await Promise.all([
        supabase.from('nodes_status_summary').select('*').single(),
        supabase.from('wormhole_stats').select('*').single(),
      ]);
      
      if (nodeRes.data) setNodeStats(nodeRes.data);
      if (wormholeRes.data) setWormholeStats(wormholeRes.data);
      setLoading(false);
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return (
      <div className={`bg-neutral-950 border border-neutral-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-neutral-800 rounded w-1/2" />
          <div className="h-20 bg-neutral-800 rounded" />
          <div className="h-4 bg-neutral-800 rounded w-1/2" />
          <div className="h-16 bg-neutral-800 rounded" />
        </div>
      </div>
    );
  }
  
  const lastWormholeRelative = wormholeStats?.last_detected_at
    ? getRelativeTime(new Date(wormholeStats.last_detected_at))
    : 'Never';
  
  return (
    <div className={`bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-6 ${className}`}>
      {/* Network Status */}
      <section>
        <h3 className="text-neutral-300 text-sm font-mono mb-4 tracking-wider">
          NETWORK STATUS
        </h3>
        <div className="h-px bg-gradient-to-r from-neutral-700 to-transparent mb-4" />
        
        <div className="space-y-3">
          {/* Active */}
          <StatusRow
            color="#22c55e"
            icon="●"
            label="ACTIVE"
            count={nodeStats?.active_count || 0}
            total={nodeStats?.total_nodes || 0}
          />
          
          {/* In Umbra */}
          <StatusRow
            color="#8b5cf6"
            icon="🌑"
            label="IN UMBRA"
            count={nodeStats?.in_umbra_count || 0}
            total={nodeStats?.total_nodes || 0}
            isPulsing
            subText={nodeStats?.umbra_long ? `(${nodeStats.umbra_long} long)` : undefined}
          />
          
          {/* Offline */}
          <StatusRow
            color="#374151"
            icon="◌"
            label="OFFLINE"
            count={nodeStats?.offline_count || 0}
            total={nodeStats?.total_nodes || 0}
          />
          
          {/* Error (if any) */}
          {(nodeStats?.error_count || 0) > 0 && (
            <StatusRow
              color="#ef4444"
              icon="⚠"
              label="ERROR"
              count={nodeStats?.error_count || 0}
              total={nodeStats?.total_nodes || 0}
              isAlert
            />
          )}
        </div>
      </section>
      
      {/* Wormholes Today */}
      <section>
        <h3 className="text-neutral-300 text-sm font-mono mb-4 tracking-wider flex items-center gap-2">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          >
            🌌
          </motion.span>
          WORMHOLES TODAY
        </h3>
        <div className="h-px bg-gradient-to-r from-purple-700/50 to-transparent mb-4" />
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-neutral-500 text-sm">Detected</span>
            <span className="text-purple-400 font-mono text-lg">
              {wormholeStats?.last_24h || 0}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-neutral-500 text-sm">Strong</span>
            <span className="text-purple-300 font-mono">
              {/* TODO: strong count from wormhole_type_stats */}
              -
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-neutral-500 text-sm">Last</span>
            <span className="text-neutral-400 text-sm">{lastWormholeRelative}</span>
          </div>
          
          {wormholeStats?.avg_score_24h && (
            <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
              <span className="text-neutral-500 text-sm">Avg Score</span>
              <span className="text-purple-400 font-mono">
                {(wormholeStats.avg_score_24h * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </section>
      
      {/* Quick Stats */}
      <section>
        <h3 className="text-neutral-300 text-sm font-mono mb-4 tracking-wider">
          QUICK STATS
        </h3>
        <div className="h-px bg-gradient-to-r from-neutral-700 to-transparent mb-4" />
        
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total"
            value={nodeStats?.total_nodes || 0}
            icon="🖥️"
          />
          <StatCard
            label="7d Wormholes"
            value={wormholeStats?.last_7d || 0}
            icon="🌌"
            color="#8b5cf6"
          />
        </div>
      </section>
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

interface StatusRowProps {
  color: string;
  icon: string;
  label: string;
  count: number;
  total: number;
  isPulsing?: boolean;
  isAlert?: boolean;
  subText?: string;
}

function StatusRow({
  color,
  icon,
  label,
  count,
  total,
  isPulsing,
  isAlert,
  subText,
}: StatusRowProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPulsing ? (
            <motion.span
              className="text-sm"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {icon}
            </motion.span>
          ) : isAlert ? (
            <motion.span
              className="text-sm"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              {icon}
            </motion.span>
          ) : (
            <span className="text-sm">{icon}</span>
          )}
          <span className="text-neutral-400 text-sm">{label}</span>
        </div>
        <span className="font-mono" style={{ color }}>{count}</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      {/* Sub text */}
      {subText && (
        <div className="text-neutral-600 text-xs">{subText}</div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color?: string;
}

function StatCard({ label, value, icon, color = '#a1a1aa' }: StatCardProps) {
  return (
    <div className="bg-neutral-900 rounded-lg p-3 text-center">
      <div className="text-lg mb-1">{icon}</div>
      <div className="font-mono text-lg" style={{ color }}>{value}</div>
      <div className="text-neutral-500 text-xs">{label}</div>
    </div>
  );
}

// ============================================
// Utilities
// ============================================

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}


