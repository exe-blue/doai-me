import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 환경 변수가 없을 때 placeholder 클라이언트 생성 방지
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // 빌드 시 또는 환경 변수 미설정 시 dummy 클라이언트 (런타임에서 실제로 사용하면 에러)
  supabase = createClient(
    'https://placeholder.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
  );
  console.warn('[Supabase] 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
}

export { supabase };

// 타입 안전한 테이블 이름
export const TABLES = {
  ACTIVITIES: 'activities',
  CHANNELS: 'channels',
  BATTLE_LOG: 'battle_log',
  DEVICES: 'devices',
  NOTIFICATIONS: 'notifications',
  DO_REQUESTS: 'do_requests',
  PERSONAS: 'personas',
  DASHBOARD_STATS: 'dashboard_stats',
  TRENDING_SHORTS: 'trending_shorts',
  REMIX_IDEAS: 'remix_ideas',
  CHALLENGES: 'challenges',
  PLAYLIST_THEMES: 'playlist_themes',
} as const;

