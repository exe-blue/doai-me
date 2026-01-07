'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WormholeEvent,
  WORMHOLE_TYPE_CONFIG,
  WORMHOLE_LEVEL_CONFIG,
  WormholeLevel,
  formatNumber,
} from '@/lib/admin/types';
import { fetchRecentWormholes, connectToLiveUpdates } from '@/lib/admin/api';

// ============================================
// Types
// ============================================

interface RecentWormholesProps {
  limit?: number;
  enableLive?: boolean;
  className?: string;
}

// ============================================
// RecentWormholes Component
// ============================================

export function RecentWormholes({
  limit = 20,
  enableLive = true,
  className = '',
}: RecentWormholesProps) {
  const [events, setEvents] = useState<WormholeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchRecentWormholes(limit);
        setEvents(data);
      } catch (e) {
        console.error('Failed to fetch wormholes:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [limit]);

  // WebSocket 연결
  useEffect(() => {
    if (!enableLive) return;

    wsRef.current = connectToLiveUpdates(
      (event) => {
        setEvents((prev) => [event, ...prev.slice(0, limit - 1)]);
      },
      () => setIsLive(false)
    );

    if (wsRef.current) {
      wsRef.current.onopen = () => setIsLive(true);
      wsRef.current.onclose = () => setIsLive(false);
    }

    return () => {
      wsRef.current?.close();
    };
  }, [enableLive, limit]);

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌀</span>
          <span className="text-neutral-300 text-sm font-mono">RECENT WORMHOLES</span>
        </div>
        
        {/* Live Indicator */}
        {enableLive && (
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-emerald-500 live-indicator' : 'bg-neutral-600'
              }`}
            />
            <span className={`text-xs ${isLive ? 'text-emerald-400' : 'text-neutral-500'}`}>
              {isLive ? 'Live' : 'Offline'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {loading ? (
          <WormholesSkeleton />
        ) : events.length === 0 ? (
          <div className="text-neutral-500 text-sm text-center py-8">
            No wormhole events
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {events.map((event) => (
                <WormholeRow key={event.id} event={event} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ============================================
// Wormhole Row
// ============================================

function WormholeRow({ event }: { event: WormholeEvent }) {
  const typeConfig = WORMHOLE_TYPE_CONFIG[event.type];
  const levelConfig = WORMHOLE_LEVEL_CONFIG[event.level];
  
  const timestamp = new Date(event.timestamp);
  const timeAgo = formatTimeAgo(timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="slide-in rounded-lg p-3 hover:bg-neutral-800/50 transition-colors"
      style={{
        backgroundColor: `${levelConfig.color}08`,
        borderLeft: `3px solid ${levelConfig.color}`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Type & Context */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Type Badge */}
            <span
              className="px-1.5 py-0.5 text-xs rounded"
              style={{
                backgroundColor: `${typeConfig.color}20`,
                color: typeConfig.color,
              }}
            >
              {typeConfig.symbol}
            </span>
            
            {/* Level Badge */}
            <span
              className="px-1.5 py-0.5 text-xs rounded"
              style={{
                backgroundColor: `${levelConfig.color}20`,
                color: levelConfig.color,
              }}
            >
              {levelConfig.label}
            </span>
            
            {/* Intensity */}
            <span className="text-neutral-400 text-xs font-mono">
              {event.intensity.toFixed(2)}
            </span>
          </div>
          
          {/* Context */}
          <div className="text-neutral-200 text-sm truncate">
            {event.context}
          </div>
          
          {/* Nodes */}
          <div className="text-neutral-500 text-xs mt-1">
            {event.nodes.join(' ↔ ')}
          </div>
        </div>

        {/* Right: Time */}
        <div className="text-neutral-500 text-xs whitespace-nowrap">
          {timeAgo}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Level Indicator
// ============================================

export function LevelIndicator({ level }: { level: WormholeLevel }) {
  const config = WORMHOLE_LEVEL_CONFIG[level];
  
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      <span style={{ color: config.color }} className="text-xs">
        {config.label}
      </span>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================
// Skeleton
// ============================================

function WormholesSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-20 bg-neutral-800 rounded animate-pulse" />
      ))}
    </div>
  );
}


