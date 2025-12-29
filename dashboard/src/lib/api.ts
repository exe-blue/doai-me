import { supabase } from './supabase';
import type { 
  Activity, 
  Channel, 
  BattleLogEntry, 
  Device, 
  Notification, 
  DashboardStats,
  RemixIdea,
  TrendingShorts
} from '@/types';
import type { DORequest } from '@/types/do-request';

// API 헬퍼 함수들 - Supabase를 통해 데이터를 가져옴
export const api = {
  // 활동 관련
  async getActivities(): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data ?? [];
  },

  // 채널 관련
  async getChannels(): Promise<Channel[]> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('level', { ascending: false });
    
    if (error) throw error;
    return data ?? [];
  },

  // 배틀 로그 관련
  async getBattleLog(limit = 50): Promise<BattleLogEntry[]> {
    const { data, error } = await supabase
      .from('battle_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data ?? [];
  },

  // 디바이스 관련
  async getDevices(): Promise<Device[]> {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) throw error;
    return data ?? [];
  },

  async getDeviceById(id: number): Promise<Device | null> {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // 알림 관련
  async getNotifications(unreadOnly = false): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    if (error) throw error;
  },

  // 대시보드 통계
  async getStats(): Promise<DashboardStats | null> {
    const { data, error } = await supabase
      .from('dashboard_stats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // 트렌딩 관련
  async getTrending(limit = 20): Promise<{ remixIdeas: RemixIdea[]; trendingShorts: TrendingShorts[] }> {
    const [remixRes, trendsRes] = await Promise.all([
      supabase.from('remix_ideas').select('*').order('created_at', { ascending: false }).limit(limit),
      supabase.from('trending_shorts').select('*').order('viral_score', { ascending: false }).limit(limit),
    ]);

    if (remixRes.error) throw remixRes.error;
    if (trendsRes.error) throw trendsRes.error;

    return {
      remixIdeas: remixRes.data ?? [],
      trendingShorts: trendsRes.data ?? [],
    };
  },

  async getIdeas(status?: string): Promise<RemixIdea[]> {
    let query = supabase
      .from('remix_ideas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async updateIdeaStatus(ideaId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('remix_ideas')
      .update({ status })
      .eq('id', ideaId);
    
    if (error) throw error;
  },

  // DO 요청 관련
  async getDORequests(params?: { status?: string; limit?: number }): Promise<DORequest[]> {
    let query = supabase
      .from('do_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async createDORequest(request: Partial<DORequest>): Promise<DORequest> {
    const { data, error } = await supabase
      .from('do_requests')
      .insert(request)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateDORequest(id: string, updates: Partial<DORequest>): Promise<void> {
    const { error } = await supabase
      .from('do_requests')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
  },
};

