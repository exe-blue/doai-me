"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentTasks } from '@/components/dashboard/RecentTasks';
import { PersonaStateChart } from '@/components/dashboard/PersonaStateChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { Loader2, RefreshCw } from 'lucide-react';

interface DashboardStats {
  totalPersonas: number;
  activePersonas: number;
  waitingPersonas: number;
  fadingPersonas: number;
  voidPersonas: number;
  pendingTasks: number;
  runningTasks: number;
  completedToday: number;
  totalAttentionPoints: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // 페르소나 통계
      const { data: personas, error: personaError } = await supabase
        .from('personas')
        .select('existence_state, attention_points');

      if (personaError) throw personaError;

      // 태스크 통계
      const { data: tasks, error: taskError } = await supabase
        .from('youtube_video_tasks')
        .select('status, created_at');

      // 태스크 테이블이 없어도 계속 진행
      const taskList = taskError ? [] : (tasks || []);
      const today = new Date().toISOString().split('T')[0];

      setStats({
        totalPersonas: personas?.length || 0,
        activePersonas: personas?.filter(p => p.existence_state === 'active').length || 0,
        waitingPersonas: personas?.filter(p => p.existence_state === 'waiting').length || 0,
        fadingPersonas: personas?.filter(p => p.existence_state === 'fading').length || 0,
        voidPersonas: personas?.filter(p => p.existence_state === 'void').length || 0,
        pendingTasks: taskList.filter(t => t.status === 'pending').length,
        runningTasks: taskList.filter(t => t.status === 'running').length,
        completedToday: taskList.filter(t =>
          t.status === 'completed' && t.created_at?.startsWith(today)
        ).length,
        totalAttentionPoints: personas?.reduce((sum, p) => sum + (p.attention_points || 0), 0) || 0,
      });
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // 30초마다 갱신
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin theme-primary" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-lg">
        <p className="text-[var(--color-error)]">오류: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl theme-text font-medium">관측 대시보드</h1>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 theme-elevated rounded text-sm theme-text-dim hover:theme-text"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="전체 페르소나"
          value={stats?.totalPersonas || 0}
          subtitle={`활성: ${stats?.activePersonas || 0}`}
          color="primary"
        />
        <StatsCard
          title="대기 중 태스크"
          value={stats?.pendingTasks || 0}
          subtitle={`실행 중: ${stats?.runningTasks || 0}`}
          color="warning"
        />
        <StatsCard
          title="오늘 완료"
          value={stats?.completedToday || 0}
          subtitle="태스크"
          color="success"
        />
        <StatsCard
          title="총 Attention Points"
          value={stats?.totalAttentionPoints || 0}
          subtitle="전체 보유량"
          color="info"
        />
      </div>

      {/* Charts & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PersonaStateChart
          active={stats?.activePersonas || 0}
          waiting={stats?.waitingPersonas || 0}
          fading={stats?.fadingPersonas || 0}
          void_count={stats?.voidPersonas || 0}
        />
        <RecentTasks />
      </div>

      {/* Activity Feed */}
      <ActivityFeed />
    </div>
  );
}
