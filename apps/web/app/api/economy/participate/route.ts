import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/economy/participate
// Agent 시청 완료 시 호출 (NodeRunner에서)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, agentId, deviceId, watchDurationSec } = body;

    if (!contentId || !agentId || !deviceId) {
      return NextResponse.json(
        { error: 'contentId, agentId, and deviceId are required' },
        { status: 400 }
      );
    }

    // RPC 함수 사용 시도
    const { data, error } = await supabase.rpc('register_economy_participation', {
      p_content_id: contentId,
      p_agent_id: agentId,
      p_device_id: deviceId,
      p_watch_duration_sec: watchDurationSec || null,
    });

    if (error) {
      // 함수가 없으면 직접 처리
      if (error.code === '42883') {
        return await registerParticipationManual(
          contentId, agentId, deviceId, watchDurationSec
        );
      }

      // 이미 참여한 경우
      if (error.message.includes('already participated')) {
        return NextResponse.json(
          { error: 'Already participated', code: 'DUPLICATE' },
          { status: 409 }
        );
      }

      // 콘텐츠가 아직 열리지 않은 경우
      if (error.message.includes('not yet open')) {
        return NextResponse.json(
          { error: 'Content not yet open', code: 'NOT_OPEN' },
          { status: 403 }
        );
      }

      // 이미 종료된 경우
      if (error.message.includes('already closed')) {
        return NextResponse.json(
          { error: 'Content already closed', code: 'CLOSED' },
          { status: 403 }
        );
      }

      throw error;
    }

    // 현재 순위 조회
    const { data: rankData } = await supabase
      .from('economy_participation')
      .select('*', { count: 'exact' })
      .eq('economy_content_id', contentId)
      .order('watched_at', { ascending: true });

    const idx = (rankData || []).findIndex(
      (p: Record<string, unknown>) => p.id === data
    );
    const currentRank = idx === -1 ? null : idx + 1;

    return NextResponse.json({
      success: true,
      participationId: data,
      currentRank,
      message: currentRank !== null 
        ? `Participation registered. Current rank: #${currentRank}`
        : 'Participation registered.',
    });
  } catch (error) {
    console.error('Participate Error:', error);
    return NextResponse.json(
      { error: 'Failed to register participation' },
      { status: 500 }
    );
  }
}

// Manual Implementation
async function registerParticipationManual(
  contentId: string,
  agentId: string,
  deviceId: string,
  watchDurationSec?: number
) {
  // 콘텐츠 상태 확인
  const { data: content, error: contentError } = await supabase
    .from('economy_contents')
    .select('*')
    .eq('id', contentId)
    .single();

  if (contentError || !content) {
    return NextResponse.json(
      { error: 'Content not found' },
      { status: 404 }
    );
  }

  // open_at 확인
  if (new Date(content.open_at) > new Date()) {
    return NextResponse.json(
      { error: 'Content not yet open', code: 'NOT_OPEN' },
      { status: 403 }
    );
  }

  // 이미 정산된 경우
  if (['distributed', 'cancelled'].includes(content.status)) {
    return NextResponse.json(
      { error: 'Content already closed', code: 'CLOSED' },
      { status: 403 }
    );
  }

  // 중복 참여 확인
  const { data: existing } = await supabase
    .from('economy_participation')
    .select('id')
    .eq('economy_content_id', contentId)
    .eq('agent_id', agentId)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'Already participated', code: 'DUPLICATE' },
      { status: 409 }
    );
  }

  // 참여 등록
  const now = new Date().toISOString();
  const { data: participation, error: insertError } = await supabase
    .from('economy_participation')
    .insert({
      economy_content_id: contentId,
      agent_id: agentId,
      device_id: deviceId,
      watched_at: now,
      watch_duration_sec: watchDurationSec || null,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // 참여자 수 증가
  await supabase
    .from('economy_contents')
    .update({
      participant_count: (content.participant_count || 0) + 1,
      status: content.status === 'scheduled' ? 'open' : content.status,
      opened_at: content.opened_at || now,
      updated_at: now,
    })
    .eq('id', contentId);

  // 현재 순위 조회
  const { data: rankData } = await supabase
    .from('economy_participation')
    .select('id')
    .eq('economy_content_id', contentId)
    .order('watched_at', { ascending: true });

  const rankIdx = (rankData || []).findIndex(
    (p: Record<string, unknown>) => p.id === participation.id
  );
  const currentRank = rankIdx === -1 ? null : rankIdx + 1;

  return NextResponse.json({
    success: true,
    participationId: participation.id,
    currentRank,
    message: currentRank !== null 
      ? `Participation registered. Current rank: #${currentRank}`
      : 'Participation registered.',
  });
}


