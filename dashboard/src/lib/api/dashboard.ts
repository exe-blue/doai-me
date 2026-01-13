/**
 * Dashboard API Functions
 *
 * 대시보드 통계 및 요약 데이터
 */

import { supabase } from '../supabase';
import type { ExistenceState } from '@/types';

// ═══════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════

export interface DashboardStats {
  personas: {
    total: number;
    active: number;
    waiting: number;
    fading: number;
    void: number;
    atRiskCount: number; // fading + void
  };
  tasks: {
    todayTotal: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    successRate: number; // 0-100
  };
  watchTargets: {
    activeChannels: number;
    activePlaylists: number;
    totalVideosFound: number;
  };
  activity: {
    totalWatchTime: number; // 초
    totalLikes: number;
    totalComments: number;
    averageWatchDuration: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'task_completed' | 'task_failed' | 'persona_state_change' | 'video_found';
  title: string;
  description: string;
  personaId?: string;
  personaName?: string;
  timestamp: string;
}

export interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  localNode: 'healthy' | 'degraded' | 'down';
  lastHeartbeat: string | null;
  activeDevices: number;
  queuedTasks: number;
}

export interface TrendData {
  date: string;
  tasksCompleted: number;
  tasksTotal: number;
  pointsEarned: number;
}

// ═══════════════════════════════════════════════════════════
// Dashboard Statistics
// ═══════════════════════════════════════════════════════════

/**
 * 대시보드 메인 통계
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // 병렬로 여러 쿼리 실행
  const [
    personaStats,
    taskStats,
    watchTargetStats,
    activityStats,
  ] = await Promise.all([
    getPersonaStats(),
    getTodayTaskStats(),
    getWatchTargetStats(),
    getTodayActivityStats(),
  ]);

  return {
    personas: personaStats,
    tasks: taskStats,
    watchTargets: watchTargetStats,
    activity: activityStats,
  };
}

/**
 * 페르소나 상태별 통계
 */
async function getPersonaStats(): Promise<DashboardStats['personas']> {
  const { data, error } = await supabase
    .from('personas')
    .select('existence_state');

  if (error) throw error;

  const counts = {
    total: 0,
    active: 0,
    waiting: 0,
    fading: 0,
    void: 0,
    atRiskCount: 0,
  };

  (data ?? []).forEach((p) => {
    counts.total++;
    const state = p.existence_state as ExistenceState;

    switch (state) {
      case 'active':
        counts.active++;
        break;
      case 'waiting':
        counts.waiting++;
        break;
      case 'fading':
        counts.fading++;
        counts.atRiskCount++;
        break;
      case 'void':
        counts.void++;
        counts.atRiskCount++;
        break;
    }
  });

  return counts;
}

/**
 * 오늘 태스크 통계
 */
async function getTodayTaskStats(): Promise<DashboardStats['tasks']> {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;

  const { data, error } = await supabase
    .from('youtube_video_tasks')
    .select('status')
    .gte('created_at', startOfDay);

  if (error) throw error;

  const stats = {
    todayTotal: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    successRate: 0,
  };

  (data ?? []).forEach((task) => {
    stats.todayTotal++;
    switch (task.status) {
      case 'pending':
      case 'assigned':
        stats.pending++;
        break;
      case 'running':
        stats.running++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'failed':
      case 'timeout':
      case 'cancelled':
        stats.failed++;
        break;
    }
  });

  // 성공률 계산 (완료된 태스크 기준)
  const finishedCount = stats.completed + stats.failed;
  stats.successRate = finishedCount > 0
    ? Math.round((stats.completed / finishedCount) * 100)
    : 0;

  return stats;
}

/**
 * 감시 대상 통계
 */
async function getWatchTargetStats(): Promise<DashboardStats['watchTargets']> {
  const { data, error } = await supabase
    .from('watch_targets')
    .select('target_type, videos_found')
    .eq('is_active', true);

  if (error) throw error;

  const stats = {
    activeChannels: 0,
    activePlaylists: 0,
    totalVideosFound: 0,
  };

  (data ?? []).forEach((target) => {
    if (target.target_type === 'channel') {
      stats.activeChannels++;
    } else {
      stats.activePlaylists++;
    }
    stats.totalVideosFound += target.videos_found || 0;
  });

  return stats;
}

/**
 * 오늘 활동 통계
 * persona_activity_logs 테이블 사용
 */
async function getTodayActivityStats(): Promise<DashboardStats['activity']> {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;

  const { data, error } = await supabase
    .from('persona_activity_logs')
    .select('activity_type, points_earned, metadata')
    .gte('created_at', startOfDay);

  if (error) throw error;

  const stats = {
    totalWatchTime: 0,
    totalLikes: 0,
    totalComments: 0,
    averageWatchDuration: 0,
  };

  let watchCount = 0;

  (data ?? []).forEach((activity) => {
    const metadata = activity.metadata as { watch_duration?: number; liked?: boolean; commented?: boolean } | null;

    switch (activity.activity_type) {
      case 'video_watch':
        stats.totalWatchTime += metadata?.watch_duration || 0;
        watchCount++;
        if (metadata?.liked) stats.totalLikes++;
        if (metadata?.commented) stats.totalComments++;
        break;
      case 'like':
        stats.totalLikes++;
        break;
      case 'comment':
        stats.totalComments++;
        break;
    }
  });

  stats.averageWatchDuration = watchCount > 0
    ? Math.round(stats.totalWatchTime / watchCount)
    : 0;

  return stats;
}

// ═══════════════════════════════════════════════════════════
// Recent Activity
// ═══════════════════════════════════════════════════════════

/**
 * 최근 활동 목록
 */
export async function getRecentActivities(limit = 20): Promise<RecentActivity[]> {
  const { data, error } = await supabase
    .from('persona_activity_logs')
    .select(`
      id,
      activity_type,
      persona_id,
      target_title,
      points_earned,
      created_at,
      personas:persona_id (given_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((activity) => ({
    id: activity.id,
    type: mapActivityType(activity.activity_type),
    title: getActivityTitle(activity.activity_type, activity.target_title),
    description: `+${activity.points_earned || 0} 포인트`,
    personaId: activity.persona_id,
    personaName: (activity.personas as { given_name: string | null }[] | null)?.[0]?.given_name || undefined,
    timestamp: activity.created_at,
  }));
}

function mapActivityType(type: string): RecentActivity['type'] {
  switch (type) {
    case 'watch':
    case 'like':
    case 'comment':
      return 'task_completed';
    default:
      return 'task_completed';
  }
}

function getActivityTitle(type: string, videoTitle?: string): string {
  const title = videoTitle || '영상';
  switch (type) {
    case 'watch':
      return `${title} 시청 완료`;
    case 'like':
      return `${title} 좋아요`;
    case 'comment':
      return `${title} 댓글 작성`;
    default:
      return `활동 완료`;
  }
}

// ═══════════════════════════════════════════════════════════
// System Health
// ═══════════════════════════════════════════════════════════

/**
 * 시스템 상태 조회
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const health: SystemHealth = {
    database: 'healthy',
    localNode: 'down',
    lastHeartbeat: null,
    activeDevices: 0,
    queuedTasks: 0,
  };

  try {
    // 데이터베이스 상태 체크
    const { error: dbError } = await supabase
      .from('personas')
      .select('id')
      .limit(1);

    if (dbError) {
      health.database = 'degraded';
    }

    // 디바이스 상태 체크
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('last_heartbeat_at')
      .gte('last_heartbeat_at', fiveMinutesAgo.toISOString());

    if (!devicesError && devices) {
      health.activeDevices = devices.length;

      if (devices.length > 0) {
        health.localNode = 'healthy';
        // 가장 최근 하트비트
        const sorted = devices.sort((a, b) =>
          new Date(b.last_heartbeat_at).getTime() - new Date(a.last_heartbeat_at).getTime()
        );
        health.lastHeartbeat = sorted[0].last_heartbeat_at;
      }
    }

    // 대기 중인 태스크 수
    const { count, error: tasksError } = await supabase
      .from('youtube_video_tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'assigned']);

    if (!tasksError && count !== null) {
      health.queuedTasks = count;
    }

  } catch {
    health.database = 'down';
  }

  return health;
}

// ═══════════════════════════════════════════════════════════
// Trend Data
// ═══════════════════════════════════════════════════════════

/**
 * 일별 트렌드 데이터 (최근 N일)
 */
export async function getTrendData(days = 7): Promise<TrendData[]> {
  const results: TrendData[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;

    // 태스크 통계
    const { data: tasks } = await supabase
      .from('youtube_video_tasks')
      .select('status')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    // 포인트 합계
    const { data: activities } = await supabase
      .from('persona_activity_logs')
      .select('points_earned')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    const tasksCompleted = (tasks ?? []).filter(t => t.status === 'completed').length;
    const pointsEarned = (activities ?? []).reduce((sum, a) => sum + (a.points_earned || 0), 0);

    results.push({
      date: dateStr,
      tasksCompleted,
      tasksTotal: tasks?.length ?? 0,
      pointsEarned,
    });
  }

  return results;
}

/**
 * 실시간 대시보드 통계 (캐시용 - 빠른 응답)
 */
export async function getQuickStats(): Promise<{
  activePersonas: number;
  pendingTasks: number;
  todayCompleted: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;

  const [personasResult, pendingResult, completedResult] = await Promise.all([
    supabase
      .from('personas')
      .select('*', { count: 'exact', head: true })
      .eq('existence_state', 'active'),
    supabase
      .from('youtube_video_tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'assigned']),
    supabase
      .from('youtube_video_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', startOfDay),
  ]);

  return {
    activePersonas: personasResult.count ?? 0,
    pendingTasks: pendingResult.count ?? 0,
    todayCompleted: completedResult.count ?? 0,
  };
}
