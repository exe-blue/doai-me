// lib/supabase/realtime.ts
// Supabase Realtime Hooks - Society Dashboard용

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './client';
import type { Node, WormholeEvent, NodesStatusSummary } from './types';

// ============================================
// Types (SocietyDashboard 호환)
// ============================================

export interface SocietyStatus {
  totalNodes: number;
  activeNodes: number;
  inactiveNodes: number;
  umbralNodes: number;
  wormholeCount: number;
  lastUpdate: Date;
}

export interface ActivityFeedItem {
  id: string;
  type: 'node_status_change' | 'wormhole_detected' | 'system_event' | 'earn' | 'reward' | 'spend';
  message?: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
  // 경제 활동 피드용 필드
  node_number?: number;
  description?: string;
  amount?: number;
  trait?: string;
  status?: string;
  created_at?: string;
}

export interface SocialEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  affected_nodes: number;
  economic_impact: number;
  mood_shift: number;
}

// ============================================
// Hook: useSocietyStatus
// ============================================

export function useSocietyStatus() {
  const [status, setStatus] = useState<SocietyStatus>({
    totalNodes: 0,
    activeNodes: 0,
    inactiveNodes: 0,
    umbralNodes: 0,
    wormholeCount: 0,
    lastUpdate: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      // 노드 상태 요약 조회
      const { data: nodes, error: nodesError } = await supabase
        .from('nodes')
        .select('status');

      if (nodesError) throw nodesError;

      // 웜홀 이벤트 수 조회
      const { count: wormholeCount, error: wormholeError } = await supabase
        .from('wormhole_events')
        .select('*', { count: 'exact', head: true });

      if (wormholeError) throw wormholeError;

      const statusCounts = (nodes || []).reduce(
        (acc, node) => {
          acc.total++;
          if (node.status === 'active') acc.active++;
          else if (node.status === 'inactive') acc.inactive++;
          else if (node.status === 'in_umbra') acc.umbral++;
          return acc;
        },
        { total: 0, active: 0, inactive: 0, umbral: 0 }
      );

      setStatus({
        totalNodes: statusCounts.total,
        activeNodes: statusCounts.active,
        inactiveNodes: statusCounts.inactive,
        umbralNodes: statusCounts.umbral,
        wormholeCount: wormholeCount || 0,
        lastUpdate: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // 실시간 구독 (노드 변경)
    const subscription = supabase
      .channel('society-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nodes' }, () => {
        fetchStatus();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wormhole_events' }, () => {
        fetchStatus();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}

// ============================================
// Hook: useActivityFeed
// ============================================

export function useActivityFeed(limit = 20) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // 최근 웜홀 이벤트를 활동 피드로 변환
        const { data: wormholes } = await supabase
          .from('wormhole_events')
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(limit);

        const feedItems: ActivityFeedItem[] = (wormholes || []).map((w) => ({
          id: w.id,
          type: 'wormhole_detected' as const,
          message: `웜홀 ${w.wormhole_type} 탐지 (Score: ${(w.resonance_score * 100).toFixed(1)}%)`,
          timestamp: new Date(w.detected_at),
          metadata: { wormholeType: w.wormhole_type, score: w.resonance_score },
        }));

        setActivities(feedItems);
      } catch (err) {
        console.error('Failed to fetch activity feed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // 실시간 구독
    const subscription = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wormhole_events' }, (payload) => {
        const newEvent = payload.new as WormholeEvent;
        setActivities((prev) => [
          {
            id: newEvent.id,
            type: 'wormhole_detected',
            message: `웜홀 ${newEvent.wormhole_type} 탐지`,
            timestamp: new Date(newEvent.detected_at),
            metadata: { wormholeType: newEvent.wormhole_type, score: newEvent.resonance_score },
          },
          ...prev.slice(0, limit - 1),
        ]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [limit]);

  return { activities, loading };
}

// ============================================
// Hook: useActiveEvents
// ============================================

export function useActiveEvents() {
  const [events, setEvents] = useState<SocialEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // 최근 24시간 내 웜홀 이벤트
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: wormholes } = await supabase
          .from('wormhole_events')
          .select('*')
          .gte('detected_at', yesterday.toISOString())
          .order('detected_at', { ascending: false })
          .limit(10);

        const socialEvents: SocialEvent[] = (wormholes || []).map((w) => ({
          id: w.id,
          type: `wormhole_${w.wormhole_type}`,
          title: `웜홀 ${w.wormhole_type}`,
          description: w.trigger_context?.trigger || '알 수 없는 트리거',
          timestamp: new Date(w.detected_at),
        }));

        setEvents(socialEvents);
      } catch (err) {
        console.error('Failed to fetch active events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    // 실시간 구독
    const subscription = supabase
      .channel('active-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wormhole_events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { events, loading };
}


