import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/economy/{contentId}
// 콘텐츠 상세 + 랭킹
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;

    // 콘텐츠 정보
    const { data: content, error: contentError } = await supabase
      .from('economy_contents')
      .select('*')
      .eq('id', contentId)
      .single();

    if (contentError) throw contentError;
    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // 랭킹 정보
    const { data: rankings, error: rankingsError } = await supabase
      .from('economy_participation')
      .select(`
        *,
        ai_agents(google_email, display_name),
        devices_v2(device_serial)
      `)
      .eq('economy_content_id', contentId)
      .order('watched_at', { ascending: true });

    if (rankingsError) throw rankingsError;

    // Blind 모드 적용
    const isOpen = new Date(content.open_at) <= new Date();
    const blindContent = {
      ...content,
      is_open: isOpen,
      video_url: isOpen ? content.video_url : null,
      video_id: isOpen ? content.video_id : null,
    };

    return NextResponse.json({
      content: blindContent,
      rankings: rankings || [],
    });
  } catch (error) {
    console.error('Economy Detail Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

// POST /api/admin/economy/{contentId}
// Actions: distribute (정산), cancel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'distribute':
        return await distributeRewards(contentId);
      
      case 'cancel':
        return await cancelContent(contentId);
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Economy Action Error:', error);
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}

// ============================================
// THE 50.01% ALGORITHM (Server-side backup)
// ============================================

async function distributeRewards(contentId: string) {
  // RPC 함수 사용 시도
  const { data, error } = await supabase.rpc('calculate_economy_rewards', {
    p_content_id: contentId,
  });

  if (error) {
    // 함수가 없으면 직접 계산
    if (error.code === '42883') {
      return await distributeRewardsManual(contentId);
    }
    throw error;
  }

  return NextResponse.json({
    success: true,
    message: 'Rewards distributed',
    rankings: data,
  });
}

// THE 50.01% ALGORITHM - Manual Implementation
async function distributeRewardsManual(contentId: string) {
  // 콘텐츠 조회
  const { data: content, error: contentError } = await supabase
    .from('economy_contents')
    .select('*')
    .eq('id', contentId)
    .single();

  if (contentError) throw contentError;
  if (!content) throw new Error('Content not found');

  if (content.status === 'distributed') {
    return NextResponse.json(
      { error: 'Already distributed' },
      { status: 400 }
    );
  }

  const parsedTotalPool = parseFloat(content.total_pool);
  
  // NaN 검증 - 유효하지 않은 값이면 에러 발생 (배분 불가)
  if (!Number.isFinite(parsedTotalPool)) {
    throw new Error(
      `Invalid total_pool value for content ${contentId}: ${content.total_pool}. ` +
      `Cannot proceed with distribution.`
    );
  }
  const totalPool = parsedTotalPool;
  
  let remaining = totalPool;

  // 상태를 calculating으로 변경
  await supabase
    .from('economy_contents')
    .update({ status: 'calculating', updated_at: new Date().toISOString() })
    .eq('id', contentId);

  // 참여자 조회 (watched_at 순서!)
  const { data: participations, error: partError } = await supabase
    .from('economy_participation')
    .select('*')
    .eq('economy_content_id', contentId)
    .eq('status', 'pending')
    .order('watched_at', { ascending: true });

  if (partError) throw partError;

  const rankings: Array<{
    agent_id: string;
    rank: number;
    reward_pct: number;
    reward_amount: number;
  }> = [];

  let totalDistributed = 0;

  // THE 50.01% ALGORITHM
  for (let i = 0; i < (participations || []).length; i++) {
    const p = participations![i];
    const rank = i + 1;

    // THE FORMULA: reward = round(remaining / 2 + 0.01, 2)
    let reward = Math.round((remaining / 2 + 0.01) * 100) / 100;

    // 남은 금액보다 크면 남은 금액 전부
    if (reward > remaining) {
      reward = remaining;
    }

    // 0 이하면 0
    if (reward <= 0) {
      reward = 0;
    }

    const rewardPct = totalPool > 0 
      ? Math.round((reward / totalPool) * 10000) / 100 
      : 0;

    // 참여 기록 업데이트
    await supabase
      .from('economy_participation')
      .update({
        rank,
        reward_pct: rewardPct,
        reward_amount: reward,
        status: 'ranked',
      })
      .eq('id', p.id);

    rankings.push({
      agent_id: p.agent_id,
      rank,
      reward_pct: rewardPct,
      reward_amount: reward,
    });

    remaining -= reward;
    totalDistributed += reward;

    // 남은 금액이 0 이하면 종료
    if (remaining <= 0) {
      break;
    }
  }

  // 콘텐츠 정산 완료
  await supabase
    .from('economy_contents')
    .update({
      status: 'distributed',
      distributed_amount: totalDistributed,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', contentId);

  return NextResponse.json({
    success: true,
    message: 'Rewards distributed (manual)',
    rankings,
  });
}

async function cancelContent(contentId: string) {
  const { error } = await supabase
    .from('economy_contents')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', contentId);

  if (error) throw error;

  return NextResponse.json({ success: true, message: 'Content cancelled' });
}


