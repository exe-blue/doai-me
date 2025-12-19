/**
 * Supabase Client
 * 프론트엔드용 Supabase 클라이언트
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zlowwxgopeafmjeyrltl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable__tNQbp8pWUNKVlnUy8d6XQ_yBcVFDP6';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// 타입 정의
export type Database = {
  public: {
    Tables: {
      devices: {
        Row: {
          id: number;
          device_id: string;
          phoneboard_id: number;
          slot_number: number;
          status: string;
          current_activity: string | null;
          last_heartbeat: string | null;
          ip_address: string | null;
          battery_level: number | null;
          temperature: number | null;
          wifi_signal: number | null;
          model: string | null;
          android_version: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['devices']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['devices']['Insert']>;
      };
      activities: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          allocated_devices: number;
          active_devices: number;
          items_processed_today: number;
          success_rate: number;
          is_active: boolean;
          weight: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
      };
      channels: {
        Row: {
          id: string;
          youtube_channel_id: string | null;
          name: string;
          category: string | null;
          thumbnail_url: string | null;
          level: number;
          experience_points: number;
          experience_to_next_level: number;
          subscriber_count: number;
          total_views: number;
          composite_score: number;
          category_rank: number | null;
          global_rank: number | null;
          weekly_growth: number;
          stats: Record<string, number>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['channels']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['channels']['Insert']>;
      };
      trending_shorts: {
        Row: {
          id: string;
          youtube_video_id: string | null;
          title: string | null;
          channel_name: string | null;
          view_count: number;
          like_count: number | null;
          music_title: string | null;
          hashtags: string[] | null;
          viral_score: number;
          viral_factors: string[] | null;
          detected_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trending_shorts']['Row'], 'detected_at'>;
        Update: Partial<Database['public']['Tables']['trending_shorts']['Insert']>;
      };
      do_requests: {
        Row: {
          id: string;
          type: string;
          title: string;
          description: string | null;
          keyword: string;
          video_title: string | null;
          video_url: string | null;
          video_id: string | null;
          channel_name: string | null;
          agent_start: number;
          agent_end: number;
          batch_size: number;
          like_probability: number;
          comment_probability: number;
          subscribe_probability: number;
          watch_time_min: number;
          watch_time_max: number;
          watch_percent_min: number;
          watch_percent_max: number;
          ai_comment_enabled: boolean;
          ai_comment_style: string | null;
          scheduled_at: string | null;
          execute_immediately: boolean;
          status: string;
          priority: number;
          total_agents: number;
          completed_agents: number;
          failed_agents: number;
          memo: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['do_requests']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['do_requests']['Insert']>;
      };
      battle_logs: {
        Row: {
          id: string;
          event_type: string;
          our_channel_id: string | null;
          our_channel_name: string | null;
          competitor_channel_id: string | null;
          competitor_channel_name: string | null;
          description: string;
          impact_score: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['battle_logs']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['battle_logs']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          type: string;
          source_activity: string | null;
          title: string | null;
          message: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
    };
  };
};

// Supabase URL 확인용
export const getSupabaseUrl = () => supabaseUrl;

