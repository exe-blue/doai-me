"use client";

import { useState, useEffect } from 'react';
import { supabase, auth } from '@/lib/supabase';
import { Plus, Loader2, X, AlertCircle, CheckCircle } from 'lucide-react';

interface Task {
  id: string;
  video_url: string;
  video_id: string;
  status: string;
  priority: number;
  created_at: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // 생성 폼 상태
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [videoUrl, setVideoUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [priority, setPriority] = useState(5);
  const [duration, setDuration] = useState(60);
  const [shouldLike, setShouldLike] = useState(false);
  const [shouldComment, setShouldComment] = useState(false);
  const [commentTemplate, setCommentTemplate] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('youtube_video_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const extractVideoId = (url: string): string | null => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const user = await auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다');

      if (mode === 'single') {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) throw new Error('유효한 YouTube URL이 아닙니다');

        const { error: insertError } = await supabase
          .from('youtube_video_tasks')
          .insert({
            video_url: videoUrl,
            video_id: videoId,
            priority,
            target_duration: duration,
            should_like: shouldLike,
            should_comment: shouldComment,
            comment_template: shouldComment ? commentTemplate : null,
            status: 'pending',
            created_by: user.id,
          });

        if (insertError) throw insertError;
      } else {
        const urls = bulkUrls
          .split('\n')
          .map(u => u.trim())
          .filter(u => u.length > 0);

        if (urls.length === 0) throw new Error('URL을 입력해주세요');
        if (urls.length > 100) throw new Error('한 번에 100개까지만 가능합니다');

        const tasksToInsert = urls
          .map(url => ({
            video_url: url,
            video_id: extractVideoId(url),
            priority,
            target_duration: duration,
            should_like: shouldLike,
            should_comment: false,
            status: 'pending',
            created_by: user.id,
          }))
          .filter(t => t.video_id !== null);

        if (tasksToInsert.length === 0) throw new Error('유효한 URL이 없습니다');

        const { error: insertError } = await supabase
          .from('youtube_video_tasks')
          .insert(tasksToInsert);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => {
        setShowCreate(false);
        setSuccess(false);
        setVideoUrl('');
        setBulkUrls('');
        fetchTasks();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'var(--color-warning)';
      case 'running': return 'var(--color-info)';
      case 'completed': return 'var(--color-success)';
      case 'failed': return 'var(--color-error)';
      default: return 'var(--color-textMuted)';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl theme-text font-medium">태스크 관리</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-background)] rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">태스크 생성</span>
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="theme-surface border theme-border rounded-lg p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-[var(--color-success)] mx-auto mb-4" />
              <p className="theme-text">태스크가 생성되었습니다</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg theme-text font-medium">새 태스크 생성</h2>
                <button onClick={() => setShowCreate(false)} className="theme-text-muted hover:theme-text">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setMode('single')}
                  className={`px-4 py-2 rounded text-sm ${
                    mode === 'single'
                      ? 'bg-[var(--color-primary)] text-[var(--color-background)]'
                      : 'theme-elevated theme-text-dim'
                  }`}
                >
                  단일 입력
                </button>
                <button
                  onClick={() => setMode('bulk')}
                  className={`px-4 py-2 rounded text-sm ${
                    mode === 'bulk'
                      ? 'bg-[var(--color-primary)] text-[var(--color-background)]'
                      : 'theme-elevated theme-text-dim'
                  }`}
                >
                  일괄 입력
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {mode === 'single' ? (
                  <>
                    <div>
                      <label className="block text-sm theme-text-dim mb-2">YouTube URL</label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="w-full px-4 py-2 theme-elevated theme-text border theme-border rounded focus:outline-none focus:border-[var(--color-primary)]"
                        placeholder="https://youtube.com/watch?v=..."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm theme-text-dim mb-2">우선순위 (1-10)</label>
                        <input
                          type="number"
                          value={priority}
                          onChange={(e) => setPriority(Number(e.target.value))}
                          min={1}
                          max={10}
                          className="w-full px-4 py-2 theme-elevated theme-text border theme-border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm theme-text-dim mb-2">시청 시간 (초)</label>
                        <input
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          min={10}
                          max={600}
                          className="w-full px-4 py-2 theme-elevated theme-text border theme-border rounded"
                        />
                      </div>
                    </div>

                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shouldLike}
                          onChange={(e) => setShouldLike(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm theme-text-dim">좋아요</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shouldComment}
                          onChange={(e) => setShouldComment(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm theme-text-dim">댓글</span>
                      </label>
                    </div>

                    {shouldComment && (
                      <div>
                        <label className="block text-sm theme-text-dim mb-2">댓글 템플릿</label>
                        <textarea
                          value={commentTemplate}
                          onChange={(e) => setCommentTemplate(e.target.value)}
                          className="w-full px-4 py-2 theme-elevated theme-text border theme-border rounded min-h-[80px]"
                          placeholder="댓글 내용..."
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm theme-text-dim mb-2">
                        YouTube URL (한 줄에 하나씩, 최대 100개)
                      </label>
                      <textarea
                        value={bulkUrls}
                        onChange={(e) => setBulkUrls(e.target.value)}
                        className="w-full px-4 py-2 theme-elevated theme-text border theme-border rounded min-h-[200px] font-mono text-xs"
                        placeholder="https://youtube.com/watch?v=...
https://youtu.be/..."
                        required
                      />
                      <p className="mt-1 text-xs theme-text-muted">
                        {bulkUrls.split('\n').filter(u => u.trim()).length}개 URL
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm theme-text-dim mb-2">공통 우선순위</label>
                        <input
                          type="number"
                          value={priority}
                          onChange={(e) => setPriority(Number(e.target.value))}
                          min={1}
                          max={10}
                          className="w-full px-4 py-2 theme-elevated theme-text border theme-border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm theme-text-dim mb-2">공통 시청 시간 (초)</label>
                        <input
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          min={10}
                          max={600}
                          className="w-full px-4 py-2 theme-elevated theme-text border theme-border rounded"
                        />
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-[var(--color-error)]/10 rounded text-[var(--color-error)] text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-2 bg-[var(--color-primary)] text-[var(--color-background)] rounded font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    '태스크 생성'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin theme-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 theme-text-muted">
          등록된 태스크가 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="theme-surface border theme-border rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${getStatusColor(task.status)}20`,
                      color: getStatusColor(task.status)
                    }}
                  >
                    {task.status}
                  </span>
                  <span className="text-sm theme-text font-mono">{task.video_id}</span>
                </div>
                <p className="text-xs theme-text-muted mt-1 truncate max-w-md">
                  {task.video_url}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm theme-text-dim">우선순위: {task.priority}</p>
                <p className="text-xs theme-text-muted">
                  {new Date(task.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
