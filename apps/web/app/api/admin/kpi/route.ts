import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// 환경변수 검증
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables for Supabase');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Admin 인증 확인 헬퍼
async function checkAdminAuth(): Promise<boolean> {
  if (!supabase || !supabaseUrl) return false;
  
  const cookieStore = await cookies();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) return false;
  
  const userSupabase = createClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });

  const { data: { user } } = await userSupabase.auth.getUser();
  if (!user) return false;

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return !!adminUser;
}

export async function GET() {
  try {
    // Supabase 클라이언트 검증
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Admin 인증 확인
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // UTC 기준 날짜 계산
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 병렬 쿼리 실행
    const [
      wormholesTotalResult,
      wormholesDailyResult,
      wormholesWeeklyResult,
      nodesResult,
      anomaliesResult,
    ] = await Promise.all([
      // 전체 웜홀 수
      supabase
        .from('wormhole_events')
        .select('id', { count: 'exact', head: true }),

      // 오늘 웜홀 수
      supabase
        .from('wormhole_events')
        .select('id', { count: 'exact', head: true })
        .gte('detected_at', today.toISOString()),

      // 주간 웜홀 수
      supabase
        .from('wormhole_events')
        .select('id', { count: 'exact', head: true })
        .gte('detected_at', weekAgo.toISOString()),

      // 노드 상태
      supabase
        .from('nodes')
        .select('status_v2'),

      // 이상 징후 (resonance_score >= 0.95)
      supabase
        .from('wormhole_events')
        .select('id', { count: 'exact', head: true })
        .gte('resonance_score', 0.95)
        .gte('detected_at', today.toISOString()),
    ]);

    // 노드 상태 집계
    const nodeStats = {
      active: 0,
      in_umbra: 0,
      offline: 0,
      error: 0,
    };

    nodesResult.data?.forEach((n: { status_v2: string }) => {
      const status = n.status_v2 as keyof typeof nodeStats;
      if (status in nodeStats) nodeStats[status]++;
    });

    const totalNodes = Object.values(nodeStats).reduce((a, b) => a + b, 0);
    const activeNodes = nodeStats.active + nodeStats.in_umbra;

    // 평균 대비 계산 (간단히 7일 평균 기준)
    const avgActive = totalNodes * 0.7; // 가정: 70%가 평균 활성
    const changeVsAvg = totalNodes > 0 
      ? Math.round(((activeNodes - avgActive) / avgActive) * 100)
      : 0;

    const kpiData = {
      wormholes: {
        total: wormholesTotalResult.count || 0,
        daily: wormholesDailyResult.count || 0,
        weekly: wormholesWeeklyResult.count || 0,
      },
      activeNodes: {
        count: activeNodes,
        changeVsAvg,
      },
      inUmbra: {
        count: nodeStats.in_umbra,
        percentage: totalNodes > 0 
          ? Math.round((nodeStats.in_umbra / totalNodes) * 1000) / 10 
          : 0,
      },
      anomalies: {
        count: anomaliesResult.count || 0,
        dailyChange: 0, // TODO: 전일 대비 계산
      },
    };

    return NextResponse.json(kpiData);
  } catch (error) {
    console.error('KPI API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI data' },
      { status: 500 }
    );
  }
}


