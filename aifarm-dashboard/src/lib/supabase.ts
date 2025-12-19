import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// 클라이언트 사이드용 Supabase 클라이언트
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버 사이드용 Supabase 클라이언트 (서비스 롤)
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 데이터베이스 테이블 타입 정의
export interface Device {
  id: string;
  serial_number: string;
  ip_address: string;
  board_id: number;
  status: 'online' | 'offline' | 'error' | 'temp_high' | 'wrong_mode';
  youtube_account: string | null;
  last_heartbeat: string;
  created_at: string;
  updated_at: string;
}

export interface WatchRequest {
  id: string;
  video_url: string;
  video_title: string;
  keywords: string[];
  target_views: number;
  completed_views: number;
  like_rate: number;
  comment_rate: number;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

export interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  subscribers: number;
  total_views: number;
  video_count: number;
  created_at: string;
  updated_at: string;
}

export interface TaskLog {
  id: string;
  task_type: string;
  status: 'success' | 'failed' | 'partial';
  device_count: number;
  success_count: number;
  error_message: string | null;
  duration_seconds: number;
  created_at: string;
}

export interface IdleActivity {
  id: string;
  activity_type: string;
  name: string;
  enabled: boolean;
  allocated_devices: number;
  success_rate: number;
  tasks_today: number;
  interval_minutes: number;
  created_at: string;
  updated_at: string;
}

// 편의 함수들
export async function getDevices(params?: {
  board_id?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase.from('devices').select('*');
  
  if (params?.board_id) {
    query = query.eq('board_id', params.board_id);
  }
  if (params?.status) {
    query = query.eq('status', params.status);
  }
  if (params?.limit) {
    query = query.limit(params.limit);
  }
  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  }
  
  return query.order('board_id', { ascending: true });
}

export async function getWatchRequests(status?: string) {
  let query = supabase.from('watch_requests').select('*');
  
  if (status) {
    query = query.eq('status', status);
  }
  
  return query.order('created_at', { ascending: false });
}

export async function createWatchRequest(data: Partial<WatchRequest>) {
  return supabase.from('watch_requests').insert(data).select().single();
}

export async function updateWatchRequest(id: string, data: Partial<WatchRequest>) {
  return supabase.from('watch_requests').update(data).eq('id', id).select().single();
}

export async function getChannels() {
  return supabase.from('youtube_channels').select('*').order('subscribers', { ascending: false });
}

export async function getTaskLogs(limit = 50) {
  return supabase.from('task_logs').select('*').order('created_at', { ascending: false }).limit(limit);
}

export async function getIdleActivities() {
  return supabase.from('idle_activities').select('*').order('name', { ascending: true });
}

export async function updateIdleActivity(id: string, data: Partial<IdleActivity>) {
  return supabase.from('idle_activities').update(data).eq('id', id).select().single();
}

// 통계 조회
export async function getDashboardStats() {
  const [devices, requests, channels, logs] = await Promise.all([
    supabase.from('devices').select('status', { count: 'exact' }),
    supabase.from('watch_requests').select('status', { count: 'exact' }),
    supabase.from('youtube_channels').select('*', { count: 'exact' }),
    supabase.from('task_logs').select('*').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);
  
  return {
    devices,
    requests,
    channels,
    logs,
  };
}
