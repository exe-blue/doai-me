/**
 * Real-time Subscription Hooks
 *
 * Supabase Realtime을 활용한 실시간 데이터 구독
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, RealtimeChannel } from '@/lib/supabase';
import type { ExistenceState } from '@/types';

// ═══════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════

export interface RealtimePersona {
  id: string;
  device_serial: string;
  given_name: string | null;
  existence_state: ExistenceState;
  attention_points: number;
  priority_level: number;
  [key: string]: unknown;
}

export interface RealtimeTask {
  id: string;
  video_url: string;
  video_title: string | null;
  status: string;
  device_serial: string | null;
  persona_id: string | null;
  [key: string]: unknown;
}

export interface RealtimeActivity {
  id: string;
  persona_id: string;
  activity_type: string;
  video_title: string | null;
  points_earned: number;
  created_at: string;
  [key: string]: unknown;
}

type PostgresChangesPayload<T> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: Partial<T>;
};

// ═══════════════════════════════════════════════════════════
// Generic Realtime Hook
// ═══════════════════════════════════════════════════════════

interface UseRealtimeOptions<T> {
  table: string;
  filter?: string;
  onInsert?: (record: T) => void;
  onUpdate?: (record: T, old: Partial<T>) => void;
  onDelete?: (old: Partial<T>) => void;
  enabled?: boolean;
}

/**
 * 범용 실시간 구독 훅
 */
export function useRealtime<T extends Record<string, unknown>>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions<T>): {
  isConnected: boolean;
  error: Error | null;
} {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime:${table}${filter ? `:${filter}` : ''}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        (payload: PostgresChangesPayload<T>) => {
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload.new);
              break;
            case 'UPDATE':
              onUpdate?.(payload.new, payload.old);
              break;
            case 'DELETE':
              onDelete?.(payload.old);
              break;
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          setError(new Error(`Channel error: ${table}`));
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter, enabled, onInsert, onUpdate, onDelete]);

  return { isConnected, error };
}

// ═══════════════════════════════════════════════════════════
// Specialized Hooks
// ═══════════════════════════════════════════════════════════

/**
 * 페르소나 실시간 구독
 */
export function useRealtimePersonas(options?: {
  onStateChange?: (persona: RealtimePersona, oldState: ExistenceState) => void;
  onPointsChange?: (persona: RealtimePersona, delta: number) => void;
}) {
  const [personas, setPersonas] = useState<Map<string, RealtimePersona>>(new Map());

  const handleInsert = useCallback((record: RealtimePersona) => {
    setPersonas((prev) => {
      const next = new Map(prev);
      next.set(record.id, record);
      return next;
    });
  }, []);

  const handleUpdate = useCallback(
    (record: RealtimePersona, old: Partial<RealtimePersona>) => {
      setPersonas((prev) => {
        const next = new Map(prev);
        next.set(record.id, record);
        return next;
      });

      // 상태 변경 감지
      if (old.existence_state && old.existence_state !== record.existence_state) {
        options?.onStateChange?.(record, old.existence_state);
      }

      // 포인트 변경 감지
      if (old.attention_points !== undefined && old.attention_points !== record.attention_points) {
        const delta = record.attention_points - old.attention_points;
        options?.onPointsChange?.(record, delta);
      }
    },
    [options]
  );

  const handleDelete = useCallback((old: Partial<RealtimePersona>) => {
    if (old.id) {
      setPersonas((prev) => {
        const next = new Map(prev);
        next.delete(old.id!);
        return next;
      });
    }
  }, []);

  const { isConnected, error } = useRealtime<RealtimePersona>({
    table: 'personas',
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
  });

  return {
    personas: Array.from(personas.values()),
    isConnected,
    error,
  };
}

/**
 * 태스크 실시간 구독
 */
export function useRealtimeTasks(options?: {
  statusFilter?: string[];
  onStatusChange?: (task: RealtimeTask, oldStatus: string) => void;
  onComplete?: (task: RealtimeTask) => void;
  onFail?: (task: RealtimeTask) => void;
}) {
  const [tasks, setTasks] = useState<Map<string, RealtimeTask>>(new Map());

  const handleInsert = useCallback((record: RealtimeTask) => {
    // 필터 적용
    if (options?.statusFilter && !options.statusFilter.includes(record.status)) {
      return;
    }

    setTasks((prev) => {
      const next = new Map(prev);
      next.set(record.id, record);
      return next;
    });
  }, [options?.statusFilter]);

  const handleUpdate = useCallback(
    (record: RealtimeTask, old: Partial<RealtimeTask>) => {
      // 상태 변경 감지
      if (old.status && old.status !== record.status) {
        options?.onStatusChange?.(record, old.status);

        // 완료/실패 콜백
        if (record.status === 'completed') {
          options?.onComplete?.(record);
        } else if (['failed', 'timeout', 'cancelled'].includes(record.status)) {
          options?.onFail?.(record);
        }
      }

      // 필터 적용
      if (options?.statusFilter) {
        if (options.statusFilter.includes(record.status)) {
          setTasks((prev) => {
            const next = new Map(prev);
            next.set(record.id, record);
            return next;
          });
        } else {
          setTasks((prev) => {
            const next = new Map(prev);
            next.delete(record.id);
            return next;
          });
        }
      } else {
        setTasks((prev) => {
          const next = new Map(prev);
          next.set(record.id, record);
          return next;
        });
      }
    },
    [options]
  );

  const handleDelete = useCallback((old: Partial<RealtimeTask>) => {
    if (old.id) {
      setTasks((prev) => {
        const next = new Map(prev);
        next.delete(old.id!);
        return next;
      });
    }
  }, []);

  const { isConnected, error } = useRealtime<RealtimeTask>({
    table: 'youtube_video_tasks',
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
  });

  return {
    tasks: Array.from(tasks.values()),
    isConnected,
    error,
  };
}

/**
 * 활동 실시간 구독 (최신 N개)
 */
export function useRealtimeActivities(options?: {
  limit?: number;
  personaId?: string;
  onNewActivity?: (activity: RealtimeActivity) => void;
}) {
  const limit = options?.limit ?? 20;
  const [activities, setActivities] = useState<RealtimeActivity[]>([]);

  const handleInsert = useCallback(
    (record: RealtimeActivity) => {
      // 페르소나 필터
      if (options?.personaId && record.persona_id !== options.personaId) {
        return;
      }

      options?.onNewActivity?.(record);

      setActivities((prev) => {
        const next = [record, ...prev];
        // 제한 유지
        return next.slice(0, limit);
      });
    },
    [limit, options]
  );

  const filter = options?.personaId ? `persona_id=eq.${options.personaId}` : undefined;

  const { isConnected, error } = useRealtime<RealtimeActivity>({
    table: 'activities',
    filter,
    onInsert: handleInsert,
  });

  return {
    activities,
    isConnected,
    error,
    clear: () => setActivities([]),
  };
}

/**
 * 대시보드 실시간 업데이트 (복합 구독)
 */
export function useRealtimeDashboard(options?: {
  onPersonaAlert?: (message: string) => void;
  onTaskUpdate?: (completed: number, failed: number) => void;
}) {
  const [stats, setStats] = useState({
    activePersonas: 0,
    pendingTasks: 0,
    todayCompleted: 0,
    todayFailed: 0,
  });

  // 페르소나 상태 변경 감지
  const handlePersonaUpdate = useCallback(
    (persona: RealtimePersona, old: Partial<RealtimePersona>) => {
      // void 진입 경고
      if (persona.existence_state === 'void' && old.existence_state !== 'void') {
        options?.onPersonaAlert?.(
          `${persona.given_name || persona.device_serial} 페르소나가 void 상태로 진입했습니다!`
        );
      }

      // fading 경고
      if (persona.existence_state === 'fading' && old.existence_state === 'active') {
        options?.onPersonaAlert?.(
          `${persona.given_name || persona.device_serial} 페르소나가 fading 상태입니다. 관심이 필요합니다.`
        );
      }
    },
    [options]
  );

  // 태스크 완료/실패 감지
  const handleTaskUpdate = useCallback(
    (task: RealtimeTask, old: Partial<RealtimeTask>) => {
      const oldStatus = old.status as string | undefined;
      if (oldStatus === 'running') {
        if (task.status === 'completed') {
          setStats((prev) => ({
            ...prev,
            todayCompleted: prev.todayCompleted + 1,
            pendingTasks: Math.max(0, prev.pendingTasks - 1),
          }));
        } else if (['failed', 'timeout'].includes(task.status)) {
          setStats((prev) => ({
            ...prev,
            todayFailed: prev.todayFailed + 1,
            pendingTasks: Math.max(0, prev.pendingTasks - 1),
          }));
        }

        options?.onTaskUpdate?.(
          stats.todayCompleted + (task.status === 'completed' ? 1 : 0),
          stats.todayFailed + (['failed', 'timeout'].includes(task.status) ? 1 : 0)
        );
      }
    },
    [options, stats.todayCompleted, stats.todayFailed]
  );

  // 페르소나 구독
  const { isConnected: personaConnected } = useRealtime<RealtimePersona>({
    table: 'personas',
    onUpdate: handlePersonaUpdate,
  });

  // 태스크 구독
  const { isConnected: taskConnected } = useRealtime<RealtimeTask>({
    table: 'youtube_video_tasks',
    onUpdate: handleTaskUpdate,
  });

  return {
    stats,
    isConnected: personaConnected && taskConnected,
    resetStats: () =>
      setStats({
        activePersonas: 0,
        pendingTasks: 0,
        todayCompleted: 0,
        todayFailed: 0,
      }),
  };
}

// ═══════════════════════════════════════════════════════════
// Utility Hooks
// ═══════════════════════════════════════════════════════════

/**
 * 연결 상태 모니터링
 */
export function useRealtimeStatus(): {
  isOnline: boolean;
  reconnecting: boolean;
  lastConnected: Date | null;
} {
  const [status, setStatus] = useState({
    isOnline: true,
    reconnecting: false,
    lastConnected: null as Date | null,
  });

  useEffect(() => {
    // 브라우저 온라인/오프라인 이벤트
    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: true,
        reconnecting: false,
        lastConnected: new Date(),
      }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
        reconnecting: true,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

/**
 * 특정 레코드 실시간 구독
 */
export function useRealtimeRecord<T extends Record<string, unknown>>(
  table: string,
  id: string,
  initialData?: T
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    if (initialData) return;

    async function fetchData() {
      try {
        const { data: record, error: fetchError } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        setData(record as T);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [table, id, initialData]);

  // 실시간 구독
  useRealtime<T>({
    table,
    filter: `id=eq.${id}`,
    onUpdate: (record) => setData(record),
    onDelete: () => setData(null),
  });

  return { data, isLoading, error };
}
