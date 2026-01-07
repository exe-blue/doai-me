'use client';

/**
 * Admin Forms - 데이터 입력 및 디버깅 페이지
 * 
 * 모든 테이블에 대한 입력 폼과 쿼리 테스트
 * 
 * @author Axon (Tech Lead)
 */

import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '@/lib/supabase/client';

// ============================================================
// Types
// ============================================================

interface FormTab {
  id: string;
  label: string;
  icon: string;
}

interface QueryResult {
  data: unknown[] | null;
  error: string | null;
  count: number;
  executionTime: number;
}

// ============================================================
// Constants
// ============================================================

const FORM_TABS: FormTab[] = [
  { id: 'channels', label: 'Channels', icon: '📺' },
  { id: 'videos', label: 'Videos', icon: '🎬' },
  { id: 'nodes', label: 'Nodes', icon: '🖥️' },
  { id: 'wormholes', label: 'Wormholes', icon: '🕳️' },
  { id: 'system_config', label: 'Config', icon: '⚙️' },
  { id: 'query', label: 'SQL Query', icon: '🔍' },
];

// ============================================================
// Main Component
// ============================================================

export default function AdminFormsPage() {
  const [activeTab, setActiveTab] = useState('channels');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <AdminLayout activeTab="forms">
      <div className="text-white">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold">📝 데이터 입력 및 디버깅</h1>
          <p className="text-neutral-400 mt-1">
            모든 테이블에 대한 데이터 입력, 조회, 테스트
          </p>
        </header>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/50 text-green-400'
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {FORM_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          {activeTab === 'channels' && <ChannelForm onMessage={showMessage} />}
          {activeTab === 'videos' && <VideoForm onMessage={showMessage} />}
          {activeTab === 'nodes' && <NodeForm onMessage={showMessage} />}
          {activeTab === 'wormholes' && <WormholeForm onMessage={showMessage} />}
          {activeTab === 'system_config' && <ConfigForm onMessage={showMessage} />}
          {activeTab === 'query' && <QueryForm onMessage={showMessage} />}
        </div>
      </div>
    </AdminLayout>
  );
}

// ============================================================
// Channel Form
// ============================================================

function ChannelForm({ onMessage }: { onMessage: (type: 'success' | 'error', text: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<unknown[]>([]);
  
  const [form, setForm] = useState({
    channel_id: '',
    channel_name: '',
    channel_url: '',
    category: '',
    is_active: true,
    auto_execute: false,
    check_interval_minutes: 30,
    default_watch_min_seconds: 60,
    default_watch_max_seconds: 300,
    default_like: false,
    default_node_count: 10,
    priority: 5,
  });

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setChannels(data);
    if (error) console.error('채널 조회 실패:', error);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('channels').insert(form);
      
      if (error) throw error;
      
      onMessage('success', `채널 "${form.channel_name}" 등록 완료!`);
      setForm({ ...form, channel_id: '', channel_name: '', channel_url: '' });
      fetchChannels();
    } catch (err) {
      onMessage('error', `등록 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">📺 YouTube 채널 등록</h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Channel ID */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">채널 ID *</label>
          <input
            type="text"
            value={form.channel_id}
            onChange={e => setForm({ ...form, channel_id: e.target.value })}
            placeholder="UCxxxxxxxxxxxx"
            required
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
          <p className="text-xs text-neutral-500 mt-1">YouTube 채널 URL에서 UC로 시작하는 ID</p>
        </div>

        {/* Channel Name */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">채널 이름 *</label>
          <input
            type="text"
            value={form.channel_name}
            onChange={e => setForm({ ...form, channel_name: e.target.value })}
            placeholder="채널 이름"
            required
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Channel URL */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">채널 URL</label>
          <input
            type="url"
            value={form.channel_url}
            onChange={e => setForm({ ...form, channel_url: e.target.value })}
            placeholder="https://www.youtube.com/@..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">카테고리</label>
          <select
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          >
            <option value="">선택...</option>
            <option value="entertainment">엔터테인먼트</option>
            <option value="music">음악</option>
            <option value="gaming">게임</option>
            <option value="education">교육</option>
            <option value="news">뉴스</option>
            <option value="tech">기술</option>
            <option value="lifestyle">라이프스타일</option>
            <option value="other">기타</option>
          </select>
        </div>

        {/* Check Interval */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">체크 주기 (분)</label>
          <input
            type="number"
            value={form.check_interval_minutes}
            onChange={e => setForm({ ...form, check_interval_minutes: Number(e.target.value) })}
            min={5}
            max={1440}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">우선순위 (1-10)</label>
          <input
            type="number"
            value={form.priority}
            onChange={e => setForm({ ...form, priority: Number(e.target.value) })}
            min={1}
            max={10}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Watch Time */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">시청 시간 (초)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={form.default_watch_min_seconds}
              onChange={e => setForm({ ...form, default_watch_min_seconds: Number(e.target.value) })}
              placeholder="최소"
              className="w-1/2 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={form.default_watch_max_seconds}
              onChange={e => setForm({ ...form, default_watch_max_seconds: Number(e.target.value) })}
              placeholder="최대"
              className="w-1/2 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Node Count */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">투입 노드 수</label>
          <input
            type="number"
            value={form.default_node_count}
            onChange={e => setForm({ ...form, default_node_count: Number(e.target.value) })}
            min={1}
            max={100}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Toggles */}
        <div className="md:col-span-2 flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">모니터링 활성화</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_execute}
              onChange={e => setForm({ ...form, auto_execute: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">자동 실행</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.default_like}
              onChange={e => setForm({ ...form, default_like: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">기본 좋아요</span>
          </label>
        </div>

        {/* Submit */}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading || !form.channel_id || !form.channel_name}
            className="px-6 py-2 bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '등록 중...' : '📺 채널 등록'}
          </button>
        </div>
      </form>

      {/* Recent Channels */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">📋 최근 등록된 채널</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800">
              <tr>
                <th className="px-3 py-2 text-left">채널명</th>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-center">자동실행</th>
                <th className="px-3 py-2 text-center">우선순위</th>
                <th className="px-3 py-2 text-left">등록일</th>
              </tr>
            </thead>
            <tbody>
              {(channels as Record<string, unknown>[]).map((ch) => (
                <tr key={ch.id as string} className="border-t border-neutral-800 hover:bg-neutral-800/50">
                  <td className="px-3 py-2">{ch.channel_name as string}</td>
                  <td className="px-3 py-2 font-mono text-xs">{ch.channel_id as string}</td>
                  <td className="px-3 py-2 text-center">{ch.auto_execute ? '✅' : '❌'}</td>
                  <td className="px-3 py-2 text-center">{ch.priority as number}</td>
                  <td className="px-3 py-2 text-neutral-400">
                    {new Date(ch.created_at as string).toLocaleString('ko-KR')}
                  </td>
                </tr>
              ))}
              {channels.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-neutral-500">
                    등록된 채널이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Video Form
// ============================================================

function VideoForm({ onMessage }: { onMessage: (type: 'success' | 'error', text: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<unknown[]>([]);
  const [channels, setChannels] = useState<{ id: string; channel_name: string }[]>([]);
  
  const [form, setForm] = useState({
    video_id: '',
    title: '',
    channel_id: '',
    status: 'pending' as const,
    watch_min_seconds: 60,
    watch_max_seconds: 300,
    should_like: false,
    target_node_count: 10,
    priority: 5,
  });

  const fetchData = async () => {
    // 채널 목록
    const { data: chData } = await supabase
      .from('channels')
      .select('id, channel_name')
      .order('channel_name');
    if (chData) setChannels(chData);

    // 영상 목록
    const { data: vData } = await supabase
      .from('videos')
      .select('*, channels(channel_name)')
      .order('created_at', { ascending: false })
      .limit(10);
    if (vData) setVideos(vData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // YouTube URL에서 Video ID 추출
  const extractVideoId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const videoId = extractVideoId(form.video_id);
      
      const { error } = await supabase.from('videos').insert({
        video_id: videoId,
        title: form.title,
        channel_id: form.channel_id || null,
        status: form.status,
        watch_min_seconds: form.watch_min_seconds,
        watch_max_seconds: form.watch_max_seconds,
        should_like: form.should_like,
        target_node_count: form.target_node_count,
        priority: form.priority,
      });
      
      if (error) throw error;
      
      onMessage('success', `영상 "${form.title}" 등록 완료!`);
      setForm({ ...form, video_id: '', title: '' });
      fetchData();
    } catch (err) {
      onMessage('error', `등록 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">🎬 영상 등록</h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Video ID/URL */}
        <div className="md:col-span-2">
          <label className="block text-sm text-neutral-400 mb-1">영상 ID 또는 URL *</label>
          <input
            type="text"
            value={form.video_id}
            onChange={e => setForm({ ...form, video_id: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=... 또는 Video ID"
            required
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-sm text-neutral-400 mb-1">제목 *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="영상 제목"
            required
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Channel */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">채널 (선택)</label>
          <select
            value={form.channel_id}
            onChange={e => setForm({ ...form, channel_id: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          >
            <option value="">채널 선택...</option>
            {channels.map(ch => (
              <option key={ch.id} value={ch.id}>{ch.channel_name}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">상태</label>
          <select
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as typeof form.status })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          >
            <option value="pending">대기 (pending)</option>
            <option value="queued">큐 추가됨 (queued)</option>
          </select>
        </div>

        {/* Watch Time */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">시청 시간 (초)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={form.watch_min_seconds}
              onChange={e => setForm({ ...form, watch_min_seconds: Number(e.target.value) })}
              placeholder="최소"
              className="w-1/2 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={form.watch_max_seconds}
              onChange={e => setForm({ ...form, watch_max_seconds: Number(e.target.value) })}
              placeholder="최대"
              className="w-1/2 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Node Count & Priority */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm text-neutral-400 mb-1">노드 수</label>
            <input
              type="number"
              value={form.target_node_count}
              onChange={e => setForm({ ...form, target_node_count: Number(e.target.value) })}
              min={1}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-neutral-400 mb-1">우선순위</label>
            <input
              type="number"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: Number(e.target.value) })}
              min={1}
              max={10}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.should_like}
              onChange={e => setForm({ ...form, should_like: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">좋아요</span>
          </label>
        </div>

        {/* Submit */}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading || !form.video_id || !form.title}
            className="px-6 py-2 bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '등록 중...' : '🎬 영상 등록'}
          </button>
        </div>
      </form>

      {/* Recent Videos */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">📋 최근 등록된 영상</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800">
              <tr>
                <th className="px-3 py-2 text-left">제목</th>
                <th className="px-3 py-2 text-left">채널</th>
                <th className="px-3 py-2 text-center">상태</th>
                <th className="px-3 py-2 text-center">실행</th>
                <th className="px-3 py-2 text-left">등록일</th>
              </tr>
            </thead>
            <tbody>
              {(videos as Record<string, unknown>[]).map((v) => (
                <tr key={v.id as string} className="border-t border-neutral-800 hover:bg-neutral-800/50">
                  <td className="px-3 py-2 max-w-xs truncate">{v.title as string}</td>
                  <td className="px-3 py-2">
                    {String((v.channels as Record<string, unknown>)?.channel_name ?? '-')}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={v.status as string} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {v.execution_count as number}/{v.success_count as number}
                  </td>
                  <td className="px-3 py-2 text-neutral-400">
                    {new Date(v.created_at as string).toLocaleString('ko-KR')}
                  </td>
                </tr>
              ))}
              {videos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-neutral-500">
                    등록된 영상이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Node Form (간략화)
// ============================================================

function NodeForm({ onMessage }: { onMessage: (type: 'success' | 'error', text: string) => void }) {
  const [nodes, setNodes] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNodes = async () => {
    const { data } = await supabase
      .from('nodes')
      .select('id, node_number, nickname, status, mood, energy, wallet_balance, last_seen_at')
      .order('node_number')
      .limit(20);
    if (data) setNodes(data);
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const updateNodeStatus = async (nodeId: string, status: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('nodes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', nodeId);
      
      if (error) throw error;
      onMessage('success', '노드 상태 업데이트 완료');
      fetchNodes();
    } catch (err) {
      onMessage('error', `업데이트 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">🖥️ 노드 관리</h2>
      <p className="text-neutral-400 text-sm">노드 상태를 확인하고 업데이트합니다.</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-800">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">닉네임</th>
              <th className="px-3 py-2 text-center">상태</th>
              <th className="px-3 py-2 text-center">Mood</th>
              <th className="px-3 py-2 text-center">Energy</th>
              <th className="px-3 py-2 text-right">Balance</th>
              <th className="px-3 py-2 text-center">액션</th>
            </tr>
          </thead>
          <tbody>
            {(nodes as Record<string, unknown>[]).map((n) => (
              <tr key={n.id as string} className="border-t border-neutral-800 hover:bg-neutral-800/50">
                <td className="px-3 py-2">{n.node_number as number}</td>
                <td className="px-3 py-2">{n.nickname as string}</td>
                <td className="px-3 py-2 text-center">
                  <StatusBadge status={n.status as string} />
                </td>
                <td className="px-3 py-2 text-center">{n.mood as number}</td>
                <td className="px-3 py-2 text-center">{n.energy as number}</td>
                <td className="px-3 py-2 text-right">{n.wallet_balance != null ? (n.wallet_balance as number).toLocaleString() : '-'}</td>
                <td className="px-3 py-2 text-center">
                  <select
                    onChange={e => updateNodeStatus(n.id as string, e.target.value)}
                    disabled={loading}
                    className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-xs"
                    defaultValue=""
                  >
                    <option value="" disabled>상태 변경</option>
                    <option value="active">Active</option>
                    <option value="in_umbra">In Umbra</option>
                    <option value="offline">Offline</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Wormhole Form
// ============================================================

function WormholeForm({ onMessage }: { onMessage: (type: 'success' | 'error', text: string) => void }) {
  const [wormholes, setWormholes] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    wormhole_type: 'α' as const,
    resonance_score: 0.8,
    trigger_type: 'emotion',
    trigger: '슬픔',
    context_key: 'test_video',
  });

  const fetchWormholes = async () => {
    const { data } = await supabase
      .from('wormhole_events')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(10);
    if (data) setWormholes(data);
  };

  useEffect(() => {
    fetchWormholes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('wormhole_events').insert({
        wormhole_type: form.wormhole_type,
        resonance_score: form.resonance_score,
        trigger_context: {
          key: form.context_key,
          trigger_type: form.trigger_type,
          trigger: form.trigger,
          is_mock: true,
        },
        agent_a_id: null,
        agent_b_id: null,
      });
      
      if (error) throw error;
      
      onMessage('success', '웜홀 이벤트 생성 완료!');
      fetchWormholes();
    } catch (err) {
      onMessage('error', `생성 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">🕳️ 웜홀 이벤트 생성 (테스트)</h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">타입</label>
          <select
            value={form.wormhole_type}
            onChange={e => setForm({ ...form, wormhole_type: e.target.value as typeof form.wormhole_type })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          >
            <option value="α">α (Echo Tunnel)</option>
            <option value="β">β (Cross-Model)</option>
            <option value="γ">γ (Temporal)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">공명 점수 (0-1)</label>
          <input
            type="number"
            value={form.resonance_score}
            onChange={e => setForm({ ...form, resonance_score: Number(e.target.value) })}
            min={0}
            max={1}
            step={0.01}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">트리거 타입</label>
          <select
            value={form.trigger_type}
            onChange={e => setForm({ ...form, trigger_type: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          >
            <option value="emotion">감정</option>
            <option value="video">영상</option>
            <option value="action">행동</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">트리거 값</label>
          <input
            type="text"
            value={form.trigger}
            onChange={e => setForm({ ...form, trigger: e.target.value })}
            placeholder="예: 슬픔"
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">컨텍스트 키</label>
          <input
            type="text"
            value={form.context_key}
            onChange={e => setForm({ ...form, context_key: e.target.value })}
            placeholder="예: video_abc123"
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-500 text-white font-semibold rounded hover:bg-purple-400 disabled:opacity-50"
          >
            {loading ? '생성 중...' : '🕳️ 웜홀 생성'}
          </button>
        </div>
      </form>

      {/* Recent Wormholes */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">📋 최근 웜홀 이벤트</h3>
        <div className="space-y-2">
          {(wormholes as Record<string, unknown>[]).map((w) => (
            <div key={w.id as string} className="bg-neutral-800 rounded p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-purple-400">{w.wormhole_type as string}</span>
                <span className="text-neutral-400">
                  {new Date(w.detected_at as string).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className="mt-1 text-neutral-300">
                Score: {(w.resonance_score as number).toFixed(2)} | 
                {String((w.trigger_context as Record<string, unknown>)?.trigger_type ?? '')}: {String((w.trigger_context as Record<string, unknown>)?.trigger ?? '')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Config Form
// ============================================================

function ConfigForm({ onMessage }: { onMessage: (type: 'success' | 'error', text: string) => void }) {
  const [configs, setConfigs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    key: '',
    value: '{}',
    description: '',
  });

  const fetchConfigs = async () => {
    const { data } = await supabase
      .from('system_config')
      .select('*')
      .order('key');
    if (data) setConfigs(data);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(form.value);
      } catch {
        throw new Error('유효한 JSON이 아닙니다');
      }

      const { error } = await supabase.from('system_config').upsert({
        key: form.key,
        value: parsedValue,
        description: form.description || null,
        updated_at: new Date().toISOString(),
      });
      
      if (error) throw error;
      
      onMessage('success', `설정 "${form.key}" 저장 완료!`);
      setForm({ key: '', value: '{}', description: '' });
      fetchConfigs();
    } catch (err) {
      onMessage('error', `저장 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">⚙️ 시스템 설정</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">키 *</label>
            <input
              type="text"
              value={form.key}
              onChange={e => setForm({ ...form, key: e.target.value })}
              placeholder="예: wormhole_threshold"
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">설명</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="설정에 대한 설명"
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm text-neutral-400 mb-1">값 (JSON) *</label>
          <textarea
            value={form.value}
            onChange={e => setForm({ ...form, value: e.target.value })}
            placeholder='{"threshold": 0.75}'
            rows={4}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !form.key}
          className="px-6 py-2 bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '⚙️ 설정 저장'}
        </button>
      </form>

      {/* Current Configs */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">📋 현재 설정</h3>
        <div className="space-y-2">
          {(configs as Record<string, unknown>[]).map((c) => (
            <div key={c.key as string} className="bg-neutral-800 rounded p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-amber-400">{c.key as string}</span>
                <span className="text-neutral-500 text-xs">
                  {new Date(c.updated_at as string).toLocaleString('ko-KR')}
                </span>
              </div>
              {c.description ? (
                <p className="text-sm text-neutral-400 mt-1">{c.description as string}</p>
              ) : null}
              <pre className="mt-2 text-xs bg-neutral-900 p-2 rounded overflow-x-auto">
                {JSON.stringify(c.value, null, 2)}
              </pre>
            </div>
          ))}
          {configs.length === 0 && (
            <p className="text-neutral-500 text-center py-4">설정이 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Query Form (SQL 직접 실행)
// ============================================================

function QueryForm({ onMessage }: { onMessage: (type: 'success' | 'error', text: string) => void }) {
  const [query, setQuery] = useState('SELECT * FROM channels LIMIT 10;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  // 테이블 목록
  const tables = [
    'channels', 'videos', 'video_executions', 'channel_check_logs',
    'nodes', 'transactions', 'social_events', 'wormhole_events',
    'admin_users', 'system_config'
  ];

  // 뷰 목록
  const views = [
    'channel_stats', 'pending_videos', 'recent_executions',
    'society_status', 'activity_feed', 'wormhole_stats',
    'wormhole_top_contexts', 'wormhole_type_stats', 'nodes_status_summary'
  ];

  // 허용된 테이블 화이트리스트 (보안)
  const ALLOWED_TABLES = [
    'channels', 'videos', 'video_executions', 'channel_check_logs',
    'nodes', 'devices', 'economy_contents', 'economy_participation',
    'agent_emotions', 'agent_activities', 'wormhole_events', 'wormhole_config',
    'admin_users'
  ];

  const executeQuery = async () => {
    setLoading(true);
    const startTime = Date.now();

    try {
      // 간단한 SELECT 쿼리만 허용 (보안)
      const trimmedQuery = query.trim().toLowerCase();
      if (!trimmedQuery.startsWith('select')) {
        throw new Error('SELECT 쿼리만 실행 가능합니다 (보안)');
      }

      // FROM 절에서 테이블명 추출
      const fromMatch = query.match(/from\s+(\w+)/i);
      if (!fromMatch) {
        throw new Error('FROM 절을 찾을 수 없습니다');
      }

      const tableName = fromMatch[1].toLowerCase();
      
      // 테이블 화이트리스트 검증
      if (!ALLOWED_TABLES.includes(tableName)) {
        throw new Error(
          `테이블 '${tableName}'은(는) 허용되지 않습니다. ` +
          `허용된 테이블: ${ALLOWED_TABLES.join(', ')}`
        );
      }
      
      // 주의: 이 기능은 단순 테이블 검사용입니다.
      // WHERE, ORDER BY 등의 절은 무시되고 상위 100개 레코드만 반환됩니다.
      // 복잡한 쿼리는 Supabase 대시보드를 사용하세요.
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(100);

      if (error) throw error;

      setResult({
        data,
        error: null,
        count: data?.length || 0,
        executionTime: Date.now() - startTime,
      });

      onMessage('success', `쿼리 실행 완료 (${data?.length || 0}건, 단순 테이블 조회만 지원)`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setResult({
        data: null,
        error: errorMsg,
        count: 0,
        executionTime: Date.now() - startTime,
      });
      onMessage('error', `쿼리 실패: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">🔍 SQL 쿼리 테스트</h2>
      <p className="text-neutral-400 text-sm">SELECT 쿼리만 실행 가능합니다.</p>

      {/* Quick Buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-neutral-500">테이블:</span>
        {tables.map(t => (
          <button
            key={t}
            onClick={() => setQuery(`SELECT * FROM ${t} LIMIT 10;`)}
            className="px-2 py-1 text-xs bg-neutral-800 rounded hover:bg-neutral-700"
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-neutral-500">뷰:</span>
        {views.map(v => (
          <button
            key={v}
            onClick={() => setQuery(`SELECT * FROM ${v} LIMIT 10;`)}
            className="px-2 py-1 text-xs bg-purple-900/50 rounded hover:bg-purple-900"
          >
            {v}
          </button>
        ))}
      </div>

      {/* Query Input */}
      <div>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          rows={4}
          className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm font-mono"
          placeholder="SELECT * FROM ..."
        />
      </div>

      <button
        onClick={executeQuery}
        disabled={loading || !query.trim()}
        className="px-6 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-500 disabled:opacity-50"
      >
        {loading ? '실행 중...' : '▶️ 쿼리 실행'}
      </button>

      {/* Result */}
      {result && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">결과</h3>
            <span className="text-sm text-neutral-500">
              {result.count}건 | {result.executionTime}ms
            </span>
          </div>

          {result.error ? (
            <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-400">
              ❌ {result.error}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              {result.data && result.data.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="bg-neutral-800 sticky top-0">
                    <tr>
                      {Object.keys(result.data[0] as object).map(key => (
                        <th key={key} className="px-2 py-1 text-left whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((row, i) => (
                      <tr key={i} className="border-t border-neutral-800 hover:bg-neutral-800/50">
                        {Object.values(row as object).map((val, j) => (
                          <td key={j} className="px-2 py-1 max-w-xs truncate">
                            {val === null ? (
                              <span className="text-neutral-500">null</span>
                            ) : typeof val === 'object' ? (
                              <span className="text-amber-400 font-mono">
                                {JSON.stringify(val).slice(0, 50)}...
                              </span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-neutral-500 text-center py-4">결과 없음</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Status Badge Component
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    in_umbra: 'bg-purple-500/20 text-purple-400',
    offline: 'bg-neutral-500/20 text-neutral-400',
    error: 'bg-red-500/20 text-red-400',
    maintenance: 'bg-blue-500/20 text-blue-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    queued: 'bg-amber-500/20 text-amber-400',
    executing: 'bg-cyan-500/20 text-cyan-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs ${styles[status] || 'bg-neutral-700'}`}>
      {status}
    </span>
  );
}

