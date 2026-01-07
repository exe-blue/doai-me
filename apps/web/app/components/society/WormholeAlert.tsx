// components/society/WormholeAlert.tsx
// 웜홀 탐지 실시간 알림 컴포넌트
// "설명할 수 없는 집단 동기화가 감지되었습니다"

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

interface WormholeNotification {
  id: string;
  type: 'α' | 'β' | 'γ';
  score: number;
  trigger: string;
  nodes_count: number;
  node_numbers: number[];
  timestamp: string;
}

// 웜홀 타입 설명
const WORMHOLE_TYPE_INFO = {
  'α': {
    name: 'Echo Tunnel',
    nameKo: '에코 터널',
    description: '동일 모델 간 공명',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
  },
  'β': {
    name: 'Cross-Model Bridge',
    nameKo: '크로스모델 브릿지',
    description: '다른 모델 간 공명',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  'γ': {
    name: 'Temporal Wormhole',
    nameKo: '시간적 웜홀',
    description: '시간차 자기 공명',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
  },
};

// 단일 웜홀 알림 카드
function WormholeCard({ 
  notification, 
  onDismiss,
}: { 
  notification: WormholeNotification;
  onDismiss: () => void;
}) {
  const typeInfo = WORMHOLE_TYPE_INFO[notification.type];
  const scorePercent = (notification.score * 100).toFixed(0);
  
  return (
    <motion.div
      className="relative overflow-hidden rounded-lg border"
      style={{
        backgroundColor: typeInfo.bgColor,
        borderColor: typeInfo.color,
      }}
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at center, ${typeInfo.color} 0%, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Content */}
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.span 
              className="text-2xl"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              🕳️
            </motion.span>
            <div>
              <h4 
                className="font-mono text-sm font-bold"
                style={{ color: typeInfo.color }}
              >
                WORMHOLE DETECTED
              </h4>
              <p className="text-neutral-400 text-xs">
                Type {notification.type}: {typeInfo.nameKo}
              </p>
            </div>
          </div>
          
          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Details */}
        <div className="space-y-2 text-sm">
          {/* Trigger */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Trigger:</span>
            <span className="text-neutral-200 font-mono">"{notification.trigger}"</span>
          </div>
          
          {/* Nodes */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Nodes:</span>
            <div className="flex gap-1 flex-wrap">
              {notification.node_numbers.slice(0, 5).map((num) => (
                <span 
                  key={num}
                  className="px-2 py-0.5 bg-neutral-800 rounded text-xs font-mono"
                  style={{ color: typeInfo.color }}
                >
                  #{num.toString().padStart(3, '0')}
                </span>
              ))}
              {notification.node_numbers.length > 5 && (
                <span className="text-neutral-500 text-xs">
                  +{notification.node_numbers.length - 5} more
                </span>
              )}
            </div>
          </div>
          
          {/* Resonance Score */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Resonance:</span>
            <div className="flex-grow h-2 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: typeInfo.color }}
                initial={{ width: 0 }}
                animate={{ width: `${scorePercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <span 
              className="font-mono text-xs"
              style={{ color: typeInfo.color }}
            >
              {scorePercent}%
            </span>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-neutral-600 text-xs">
            {new Date(notification.timestamp).toLocaleTimeString('ko-KR')}
          </span>
          <span className="text-neutral-500 text-xs italic">
            "{typeInfo.description}"
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// 메인 웜홀 알림 컨테이너
export function WormholeAlertContainer() {
  const [notifications, setNotifications] = useState<WormholeNotification[]>([]);
  
  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  
  // 자동 dismiss (30초 후)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNotifications((prev) => 
        prev.filter((n) => now - new Date(n.timestamp).getTime() < 30000)
      );
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Realtime 구독
  useEffect(() => {
    const channel = supabase
      .channel('wormhole-alerts')
      .on('broadcast', { event: 'wormhole_detected' }, (payload: { payload: unknown }) => {
        const notification = payload.payload as WormholeNotification;
        setNotifications((prev) => [notification, ...prev].slice(0, 5));
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return (
    <div className="fixed top-4 right-4 z-50 w-96 space-y-3">
      <AnimatePresence>
        {notifications.map((notification) => (
          <WormholeCard
            key={notification.id}
            notification={notification}
            onDismiss={() => handleDismiss(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// 웜홀 이벤트 목록 (대시보드용)
export function WormholeEventsList({ limit = 10 }: { limit?: number }) {
  const [events, setEvents] = useState<Array<{
    id: string;
    wormhole_type: 'α' | 'β' | 'γ';
    resonance_score: number;
    trigger_context: {
      trigger?: string;
      node_numbers?: number[];
    };
    detected_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // limit을 ref로 유지하여 콜백에서 최신 값 사용
  const limitRef = useRef(limit);
  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);
  
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('wormhole_events')
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(limit);
        
        if (fetchError) {
          console.error('[WormholeEventsList] Fetch error:', fetchError);
          setError('Failed to load wormhole events');
        } else if (data) {
          setEvents(data);
        }
      } catch (err) {
        console.error('[WormholeEventsList] Unexpected error:', err);
        setError('Unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
    
    // Realtime 구독
    const channel = supabase
      .channel('wormhole-events-list')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wormhole_events',
        },
        (payload: { new: Record<string, unknown> }) => {
          // limitRef.current를 사용하여 최신 limit 값 적용
          setEvents((prev) => [payload.new as typeof events[0], ...prev].slice(0, limitRef.current));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);
  
  if (loading) {
    return <div className="text-neutral-500 text-center py-4">Loading...</div>;
  }
  
  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
        <p className="text-xs mt-1">새로고침을 시도해주세요</p>
      </div>
    );
  }
  
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600">
        <p>아직 웜홀이 탐지되지 않았습니다</p>
        <p className="text-xs mt-1">집단 동기화를 기다리는 중...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {events.map((event) => {
        const typeInfo = WORMHOLE_TYPE_INFO[event.wormhole_type];
        
        return (
          <motion.div
            key={event.id}
            className="p-3 rounded border border-neutral-800 hover:border-neutral-700 transition-colors"
            style={{ backgroundColor: typeInfo.bgColor }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🕳️</span>
                <span 
                  className="font-mono text-sm"
                  style={{ color: typeInfo.color }}
                >
                  Type {event.wormhole_type}
                </span>
                <span className="text-neutral-500 text-xs">
                  {event.trigger_context?.trigger}
                </span>
              </div>
              <span className="text-neutral-500 text-xs">
                {new Date(event.detected_at).toLocaleTimeString('ko-KR')}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-grow h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ 
                    backgroundColor: typeInfo.color,
                    width: `${event.resonance_score * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs text-neutral-400">
                {(event.resonance_score * 100).toFixed(0)}%
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

