"use client";

import { useState, useEffect } from 'react';
import { supabase, auth } from '@/lib/supabase';
import { Plus, Trash2, Power, Loader2 } from 'lucide-react';

interface WatchTarget {
  id: string;
  target_type: string;
  target_id: string;
  target_name: string;
  target_url: string | null;
  is_active: boolean;
  last_checked: string | null;
  videos_found: number;
}

export default function ChannelsPage() {
  const [targets, setTargets] = useState<WatchTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // 생성 폼
  const [targetType, setTargetType] = useState<'channel' | 'playlist'>('channel');
  const [targetUrl, setTargetUrl] = useState('');
  const [targetName, setTargetName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTargets = async () => {
    const { data, error } = await supabase
      .from('watch_targets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setTargets(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const extractTargetId = (url: string, type: 'channel' | 'playlist'): string | null => {
    if (type === 'channel') {
      const match = url.match(/@([^\/\?]+)|channel\/(UC[a-zA-Z0-9_-]+)/);
      return match ? (match[1] || match[2]) : null;
    } else {
      const match = url.match(/list=([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const user = await auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다');

      const targetId = extractTargetId(targetUrl, targetType);
      if (!targetId) throw new Error('유효한 URL이 아닙니다');

      const { error: insertError } = await supabase
        .from('watch_targets')
        .insert({
          target_type: targetType,
          target_id: targetId,
          target_name: targetName || targetId,
          target_url: targetUrl,
          is_active: true,
          created_by: user.id,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('이미 등록된 채널/재생목록입니다');
        }
        throw insertError;
      }

      setShowCreate(false);
      setTargetUrl('');
      setTargetName('');
      fetchTargets();
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase
      .from('watch_targets')
      .update({ is_active: !current })
      .eq('id', id);
    fetchTargets();
  };

  const deleteTarget = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('watch_targets').delete().eq('id', id);
    fetchTargets();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl theme-text font-medium">채널 관리</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-background)] rounded-lg"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">채널 추가</span>
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="theme-surface border theme-border rounded-lg p-6">
          <h2 className="text-lg theme-text font-medium mb-4">새 모니터링 대상</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetType('channel')}
                className={`px-4 py-2 rounded text-sm ${
                  targetType === 'channel'
                    ? 'bg-[var(--color-primary)] text-[var(--color-background)]'
                    : 'theme-elevated theme-text-dim'
                }`}
              >
                채널
              </button>
              <button
                type="button"
                onClick={() => setTargetType('playlist')}
                className={`px-4 py-2 rounded text-sm ${
                  targetType === 'playlist'
                    ? 'bg-[var(--color-primary)] text-[var(--color-background)]'
                    : 'theme-elevated theme-text-dim'
                }`}
              >
                재생목록
              </button>
            </div>

            <div>
              <label className="block text-sm theme-text-dim mb-2">
                {targetType === 'channel' ? '채널 URL' : '재생목록 URL'}
              </label>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full px-4 py-2 theme-elevated theme-text border theme-border rounded focus:outline-none focus:border-[var(--color-primary)]"
                placeholder={targetType === 'channel'
                  ? 'https://youtube.com/@channelname'
                  : 'https://youtube.com/playlist?list=PL...'}
                required
              />
            </div>

            <div>
              <label className="block text-sm theme-text-dim mb-2">이름 (선택)</label>
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full px-4 py-2 theme-elevated theme-text border theme-border rounded"
                placeholder="표시 이름"
              />
            </div>

            {error && (
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-2 bg-[var(--color-primary)] text-[var(--color-background)] rounded font-medium"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '추가'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 theme-elevated theme-text-dim rounded"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Target List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin theme-primary" />
        </div>
      ) : targets.length === 0 ? (
        <div className="text-center py-12 theme-text-muted">
          등록된 채널이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {targets.map((target) => (
            <div
              key={target.id}
              className={`theme-surface border theme-border rounded-lg p-4 flex items-center justify-between ${
                !target.is_active ? 'opacity-50' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    target.target_type === 'channel'
                      ? 'bg-[var(--color-info)]/20 text-[var(--color-info)]'
                      : 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                  }`}>
                    {target.target_type === 'channel' ? '채널' : '재생목록'}
                  </span>
                  <span className="theme-text">{target.target_name}</span>
                </div>
                <p className="text-xs theme-text-muted mt-1">
                  발견: {target.videos_found || 0}개 |
                  마지막 확인: {target.last_checked
                    ? new Date(target.last_checked).toLocaleString('ko-KR')
                    : '없음'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(target.id, target.is_active)}
                  className={`p-2 rounded ${
                    target.is_active
                      ? 'text-[var(--color-success)]'
                      : 'theme-text-muted'
                  }`}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteTarget(target.id)}
                  className="p-2 rounded text-[var(--color-error)]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
