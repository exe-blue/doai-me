// admin/components/NodesStatusPanel.tsx
// 노드 상태 요약 패널 (숨그늘 포함)

'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { NodesStatusSummary, Node } from '@/lib/supabase/types';
import { NodeStatusBadge, NodeStatusDot } from './NodeStatusBadge';

// ============================================
// 상태 요약 카드
// ============================================

export function NodesStatusSummaryWidget() {
  const [summary, setSummary] = useState<NodesStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSummary = async () => {
      const { data, error } = await supabase
        .from('nodes_status_summary')
        .select('*')
        .single();
      
      if (!error && data) {
        setSummary(data);
      }
      setLoading(false);
    };
    
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000); // 5초 polling
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return (
      <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-neutral-800 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-neutral-800 rounded" />
          ))}
        </div>
      </div>
    );
  }
  
  const statusItems = [
    { 
      key: 'active', 
      label: '활성', 
      count: summary?.active_count || 0, 
      color: '#22c55e',
      isPulsing: false,
    },
    { 
      key: 'in_umbra', 
      label: '숨그늘', 
      count: summary?.in_umbra_count || 0, 
      color: '#8b5cf6',
      isPulsing: true,
      subText: summary?.umbra_long ? `(${summary.umbra_long} long)` : undefined,
    },
    { 
      key: 'offline', 
      label: '오프라인', 
      count: summary?.offline_count || 0, 
      color: '#6b7280',
      isPulsing: false,
    },
    { 
      key: 'error', 
      label: '에러', 
      count: summary?.error_count || 0, 
      color: '#ef4444',
      isPulsing: false,
    },
    { 
      key: 'maintenance', 
      label: '유지보수', 
      count: summary?.maintenance_count || 0, 
      color: '#f59e0b',
      isPulsing: false,
    },
  ];
  
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500">🖥️</span>
          <span className="font-mono text-sm text-neutral-300">NODE STATUS</span>
        </div>
        <span className="text-neutral-500 text-xs">
          Total: {summary?.total_nodes || 0}
        </span>
      </div>
      
      <div className="grid grid-cols-5 gap-3">
        {statusItems.map((item) => (
          <div 
            key={item.key}
            className="bg-neutral-900 rounded-lg p-3 text-center"
          >
            {/* Count */}
            <motion.div
              className="text-2xl font-bold"
              style={{ color: item.color }}
              key={item.count}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {item.count}
            </motion.div>
            
            {/* Label with dot */}
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {item.isPulsing ? (
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              ) : (
                <span 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="text-xs text-neutral-400">{item.label}</span>
            </div>
            
            {/* Sub text (e.g., long umbra count) */}
            {item.subText && (
              <div className="text-[10px] text-neutral-600 mt-0.5">
                {item.subText}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// 노드 리스트 (숨그늘 강조)
// ============================================

interface NodesListProps {
  statusFilter?: string;
  limit?: number;
}

export function NodesList({ statusFilter, limit = 20 }: NodesListProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchNodes = async () => {
      let query = supabase
        .from('nodes')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);
      
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      
      if (!error && data) {
        setNodes(data);
      }
      setLoading(false);
    };
    
    fetchNodes();
    const interval = setInterval(fetchNodes, 10000);
    return () => clearInterval(interval);
  }, [statusFilter, limit]);
  
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-neutral-800 rounded animate-pulse" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <NodeCard key={node.id} node={node} />
      ))}
      
      {nodes.length === 0 && (
        <div className="text-center py-8 text-neutral-600 text-sm">
          No nodes found
        </div>
      )}
    </div>
  );
}

// ============================================
// 노드 카드
// ============================================

function NodeCard({ node }: { node: Node }) {
  const isUmbra = node.status === 'in_umbra';
  const isOffline = node.status === 'offline';
  const isError = node.status === 'error';
  const needsAttention = isOffline || isError; // 알람 대상
  
  // last_seen_at 상대 시간
  const lastSeenRelative = node.last_seen_at 
    ? getRelativeTime(new Date(node.last_seen_at))
    : 'never';
  
  return (
    <motion.div
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all
        ${isUmbra 
          ? 'bg-purple-950/20 border-purple-900/50' 
          : needsAttention
            ? 'bg-red-950/20 border-red-900/50'
            : 'bg-neutral-900 border-neutral-800'
        }
      `}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
    >
      {/* Status Dot */}
      <NodeStatusDot status={node.status} size={10} />
      
      {/* Node Info */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-neutral-200 font-mono text-sm">
            #{node.node_number}
          </span>
          <span className="text-neutral-400 text-sm truncate">
            {node.nickname}
          </span>
          {/* Offline/Error = 즉시 알람 대상 */}
          {needsAttention && (
            <span className="text-red-400 text-xs animate-pulse">⚠️</span>
          )}
        </div>
        <div className="text-neutral-600 text-xs">
          {node.trait} • {node.current_activity || 'idle'}
          <span className="ml-2 text-neutral-700">
            seen: {lastSeenRelative}
          </span>
        </div>
      </div>
      
      {/* Status Badge */}
      <NodeStatusBadge 
        status={node.status} 
        umbraSince={node.umbra_since}
        size="sm"
        showDuration={isUmbra}
      />
      
      {/* Wallet */}
      <div className="text-right">
        <div className="text-neutral-300 text-sm font-mono">
          ◈{(node.wallet_balance ?? 0).toLocaleString()}
        </div>
        <div className="text-neutral-600 text-xs">
          mood: {node.mood ?? '-'}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Utilities
// ============================================

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffSec < 60) return `${diffSec}s`;
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  return `${Math.floor(diffHour / 24)}d`;
}

