"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, RefreshCw, User, Activity, Zap } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  existence_state: 'active' | 'waiting' | 'fading' | 'void';
  attention_points: number;
  last_activity_at: string | null;
  created_at: string;
}

const stateColors: Record<string, string> = {
  active: 'var(--color-success)',
  waiting: 'var(--color-warning)',
  fading: 'var(--color-info)',
  void: 'var(--color-textMuted)',
};

const stateLabels: Record<string, string> = {
  active: '활성',
  waiting: '대기',
  fading: '소멸 중',
  void: '무',
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('personas')
        .select('*')
        .order('attention_points', { ascending: false });

      if (fetchError) throw fetchError;
      setPersonas(data || []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const stateCounts = personas.reduce((acc, p) => {
    acc[p.existence_state] = (acc[p.existence_state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl theme-text font-medium">페르소나 관리</h1>
        <button
          onClick={fetchPersonas}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 theme-elevated rounded text-sm theme-text-dim hover:theme-text"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* 상태 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['active', 'waiting', 'fading', 'void'] as const).map((state) => (
          <div
            key={state}
            className="theme-surface border theme-border rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stateColors[state] }}
              />
              <span className="text-sm theme-text-dim">{stateLabels[state]}</span>
            </div>
            <p className="text-2xl theme-text font-medium">
              {stateCounts[state] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* 페르소나 목록 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin theme-primary" />
        </div>
      ) : error ? (
        <div className="p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-lg">
          <p className="text-[var(--color-error)]">오류: {error}</p>
        </div>
      ) : personas.length === 0 ? (
        <div className="text-center py-12 theme-text-muted">
          등록된 페르소나가 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map((persona) => (
            <div
              key={persona.id}
              className="theme-surface border theme-border rounded-lg p-4 hover:border-[var(--color-primary)]/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full theme-elevated flex items-center justify-center">
                    <User className="w-5 h-5 theme-text-dim" />
                  </div>
                  <div>
                    <h3 className="theme-text font-medium">{persona.name}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${stateColors[persona.existence_state]}20`,
                        color: stateColors[persona.existence_state],
                      }}
                    >
                      {stateLabels[persona.existence_state]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 theme-text-dim">
                    <Zap className="w-4 h-4" />
                    Attention Points
                  </span>
                  <span className="theme-text">{persona.attention_points}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 theme-text-dim">
                    <Activity className="w-4 h-4" />
                    마지막 활동
                  </span>
                  <span className="theme-text-muted text-xs">
                    {persona.last_activity_at
                      ? new Date(persona.last_activity_at).toLocaleString('ko-KR')
                      : '없음'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
