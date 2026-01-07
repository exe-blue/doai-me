/**
 * Supabase 마이그레이션 실행 스크립트
 * 
 * Usage: npx ts-node scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hycynmzdrngsozxdmyxi.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIwMDA5NSwiZXhwIjoyMDgyNzc2MDk1fQ.lBSSndc_VVL1pG3vN1MspnXATuGwgf-tPgksJ_Y7Fkw';

async function runMigration() {
  console.log('🚀 Supabase 마이그레이션 시작...');
  console.log(`URL: ${supabaseUrl}`);
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  // 테이블 존재 여부 확인
  const { data: existingTable, error: checkError } = await supabase
    .from('youtube_subscriptions')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ youtube_subscriptions 테이블이 이미 존재합니다.');
    return;
  }

  if (checkError.code !== 'PGRST116' && !checkError.message.includes('does not exist')) {
    console.log('기존 테이블 확인 결과:', checkError);
  }

  // SQL 마이그레이션 파일 읽기
  const migrationPath = path.join(__dirname, '../../supabase/migrations/20260107_youtube_subscriptions.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ 마이그레이션 파일을 찾을 수 없습니다:', migrationPath);
    
    // 대안: 직접 테이블 생성
    console.log('📝 직접 테이블 생성 시도...');
    
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS youtube_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          channel_id VARCHAR(255) NOT NULL UNIQUE,
          channel_title VARCHAR(500) NOT NULL,
          channel_handle VARCHAR(255),
          thumbnail_url TEXT,
          uploads_playlist_id VARCHAR(255),
          subscriber_count BIGINT DEFAULT 0,
          video_count INTEGER DEFAULT 0,
          auto_register BOOLEAN DEFAULT TRUE,
          target_views_default INTEGER DEFAULT 50,
          priority INTEGER DEFAULT 0,
          last_video_id VARCHAR(255),
          last_checked_at TIMESTAMPTZ,
          check_interval_minutes INTEGER DEFAULT 5,
          subscribed_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          is_active BOOLEAN DEFAULT TRUE,
          total_videos_registered INTEGER DEFAULT 0,
          total_views_generated BIGINT DEFAULT 0
        );
      `
    });

    if (createError) {
      console.error('RPC 방식 테이블 생성 실패:', createError);
      console.log('\n⚠️ Supabase 대시보드에서 직접 SQL을 실행해주세요:');
      console.log('https://supabase.com/dashboard/project/hycynmzdrngsozxdmyxi/sql/new');
    }
    return;
  }

  console.log('✅ 마이그레이션 완료');
}

runMigration().catch(console.error);

