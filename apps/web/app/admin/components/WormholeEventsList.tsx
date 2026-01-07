// admin/components/WormholeEventsList.tsx
// 웜홀 이벤트 목록 (drill-down 지원)

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { WormholeEvent } from '@/lib/supabase/types';

// ============================================
// Props
// ============================================

interface WormholeEventsListProps {
  contextFilter?: string;
  timeFilter?: '1h' | '24h' | '7d' | 'all';
  limit?: number;
}

// ============================================
// Type Config
// ============================================

const TYPE_CONFIG = {
  'α': { name: 'Echo Tunnel', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  'β': { name: 'Cross-Model', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  'γ': { name: 'Temporal', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
};

// ============================================
// Component
// ============================================

export function WormholeEventsList({ 
  contextFilter, 
  timeFilter = '24h',
  limit = 50 
}: WormholeEventsListProps) {
  const [events, setEvents] = useState<WormholeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<WormholeEvent | null>(null);
  
  useEffect(() => {
    const fetchEvents = async () => {
      let query = supabase
        .from('wormhole_events')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(limit);
      
      // 시간 필터
      const timeMap = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        'all': null,
      };
      
      if (timeMap[timeFilter]) {
        const since = new Date();
        since.setHours(since.getHours() - (timeFilter === '1h' ? 1 : timeFilter === '24h' ? 24 : 168));
        query = query.gte('detected_at', since.toISOString());
      }
      
      // 컨텍스트 필터
      if (contextFilter) {
        query = query.or(`trigger_context->key.eq.${contextFilter},trigger_context->category.eq.${contextFilter}`);
      }
      
      const { data, error } = await query;
      
      if (!error && data) {
        setEvents(data);
      }
      setLoading(false);
    };
    
    fetchEvents();
    
    // Realtime 구독
    const channel = supabase
      .channel('wormhole-events-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wormhole_events' },
        (payload: { new: Record<string, unknown> }) => {
          const newEvent = payload.new as WormholeEvent;
          setEvents((prev) => [newEvent, ...prev].slice(0, limit));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contextFilter, timeFilter, limit]);
  
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-neutral-800 rounded animate-pulse" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {events.map((event) => (
          <WormholeEventCard 
            key={event.id} 
            event={event}
            onClick={() => setSelectedEvent(event)}
            isSelected={selectedEvent?.id === event.id}
          />
        ))}
      </AnimatePresence>
      
      {events.length === 0 && (
        <div className="text-center py-8 text-neutral-600 text-sm">
          No wormhole events detected
        </div>
      )}
      
      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <WormholeEventModal 
            event={selectedEvent} 
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Event Card
// ============================================

interface WormholeEventCardProps {
  event: WormholeEvent;
  onClick: () => void;
  isSelected: boolean;
}

function WormholeEventCard({ event, onClick, isSelected }: WormholeEventCardProps) {
  const typeConfig = TYPE_CONFIG[event.wormhole_type] || TYPE_CONFIG['α'];
  const context = event.trigger_context;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`
        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
        ${isSelected 
          ? 'border-purple-500 bg-purple-950/30' 
          : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
        }
      `}
    >
      {/* Type Badge */}
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-lg"
        style={{ backgroundColor: typeConfig.bg, color: typeConfig.color }}
      >
        {event.wormhole_type}
      </div>
      
      {/* Event Info */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-neutral-200 font-mono text-sm">
            {typeConfig.name}
          </span>
          {event.is_false_positive && (
            <span className="text-xs px-1.5 py-0.5 bg-red-950 text-red-400 rounded">
              FP
            </span>
          )}
        </div>
        <div className="text-neutral-500 text-xs truncate">
          {context?.trigger || context?.key || 'Unknown trigger'}
        </div>
      </div>
      
      {/* Score */}
      <div className="text-right">
        <div 
          className="text-sm font-mono"
          style={{ color: getScoreColor(event.resonance_score) }}
        >
          {(event.resonance_score * 100).toFixed(0)}%
        </div>
        <div className="text-neutral-600 text-xs">
          {getRelativeTime(new Date(event.detected_at))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Event Modal
// ============================================

interface WormholeEventModalProps {
  event: WormholeEvent;
  onClose: () => void;
}

function WormholeEventModal({ event, onClose }: WormholeEventModalProps) {
  const typeConfig = TYPE_CONFIG[event.wormhole_type] || TYPE_CONFIG['α'];
  const context = event.trigger_context;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 max-w-lg w-full mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center font-mono text-xl"
              style={{ backgroundColor: typeConfig.bg, color: typeConfig.color }}
            >
              {event.wormhole_type}
            </div>
            <div>
              <h3 className="text-neutral-100 font-semibold">{typeConfig.name}</h3>
              <p className="text-neutral-500 text-sm">
                {new Date(event.detected_at).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 text-xl"
          >
            ✕
          </button>
        </div>
        
        {/* Score Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-neutral-400">Resonance Score</span>
            <span 
              className="font-mono"
              style={{ color: getScoreColor(event.resonance_score) }}
            >
              {(event.resonance_score * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: typeConfig.color }}
              initial={{ width: 0 }}
              animate={{ width: `${event.resonance_score * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        
        {/* Context */}
        <div className="space-y-3 mb-6">
          <h4 className="text-neutral-400 text-sm">Trigger Context</h4>
          <div className="bg-neutral-900 rounded-lg p-4 space-y-2">
            {context?.key && (
              <div className="flex justify-between">
                <span className="text-neutral-500 text-sm">Key</span>
                <span className="text-neutral-200 text-sm font-mono">{context.key}</span>
              </div>
            )}
            {context?.category && (
              <div className="flex justify-between">
                <span className="text-neutral-500 text-sm">Category</span>
                <span className="text-neutral-200 text-sm">{context.category}</span>
              </div>
            )}
            {context?.trigger_type && (
              <div className="flex justify-between">
                <span className="text-neutral-500 text-sm">Type</span>
                <span className="text-neutral-200 text-sm">{context.trigger_type}</span>
              </div>
            )}
            {context?.trigger && (
              <div className="flex justify-between">
                <span className="text-neutral-500 text-sm">Trigger</span>
                <span className="text-neutral-200 text-sm">{context.trigger}</span>
              </div>
            )}
            {context?.emotion && (
              <div className="flex justify-between">
                <span className="text-neutral-500 text-sm">Emotion</span>
                <span className="text-neutral-200 text-sm">{context.emotion}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Agents */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-neutral-900 rounded-lg p-3">
            <span className="text-neutral-500 text-xs">Agent A</span>
            <p className="text-neutral-200 text-sm font-mono truncate mt-1">
              {event.agent_a_id.slice(0, 8)}...
            </p>
          </div>
          <div className="bg-neutral-900 rounded-lg p-3">
            <span className="text-neutral-500 text-xs">Agent B</span>
            <p className="text-neutral-200 text-sm font-mono truncate mt-1">
              {event.agent_b_id.slice(0, 8)}...
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <button
            className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="flex-1 px-4 py-2 bg-red-950 hover:bg-red-900 text-red-300 rounded-lg text-sm transition-colors"
          >
            Mark as False Positive
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Utilities
// ============================================

function getScoreColor(score: number): string {
  if (score >= 0.9) return '#22c55e';
  if (score >= 0.8) return '#84cc16';
  if (score >= 0.75) return '#eab308';
  return '#f59e0b';
}

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


