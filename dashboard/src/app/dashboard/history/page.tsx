"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, RefreshCw, Clock, CheckCircle, XCircle, PlayCircle } from 'lucide-react';

interface ActivityLog {
  id: string;
  persona_id: string;
  persona_name?: string;
  action_type: string;
  target_type: string;
  target_id: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

const actionLabels: Record<string, string> = {
  watch: '시청',
  like: '좋아요',
  comment: '댓글',
  subscribe: '구독',
  unsubscribe: '구독 취소',
};

const statusIcons: Record<string, typeof CheckCircle> = {
  pending: PlayCircle,
  completed: CheckCircle,
  failed: XCircle,
};

const statusColors: Record<string, string> = {
  pending: 'var(--color-warning)',
  completed: 'var(--color-success)',
  failed: 'var(--color-error)',
};

export default function HistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setLogs(data || []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl theme-text font-medium">활동 기록</h1>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 theme-elevated rounded text-sm theme-text-dim hover:theme-text"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {(['all', 'completed', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              filter === f
                ? 'bg-[var(--color-primary)] text-[var(--color-background)]'
                : 'theme-elevated theme-text-dim hover:theme-text'
            }`}
          >
            {f === 'all' ? '전체' : f === 'completed' ? '완료' : '실패'}
          </button>
        ))}
      </div>

      {/* 활동 목록 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin theme-primary" />
        </div>
      ) : error ? (
        <div className="p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-lg">
          <p className="text-[var(--color-error)]">오류: {error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 theme-text-muted">
          활동 기록이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const StatusIcon = statusIcons[log.status];
            return (
              <div
                key={log.id}
                className="theme-surface border theme-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${statusColors[log.status]}20` }}
                    >
                      <StatusIcon
                        className="w-4 h-4"
                        style={{ color: statusColors[log.status] }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="theme-text font-medium">
                          {actionLabels[log.action_type] || log.action_type}
                        </span>
                        <span className="text-xs theme-text-muted">
                          {log.target_type}: {log.target_id}
                        </span>
                      </div>
                      {log.error_message && (
                        <p className="text-sm text-[var(--color-error)] mt-1">
                          {log.error_message}
                        </p>
                      )}
                      {log.persona_name && (
                        <p className="text-xs theme-text-dim mt-1">
                          페르소나: {log.persona_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs theme-text-muted">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(log.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
