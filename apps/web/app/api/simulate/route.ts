// app/api/simulate/route.ts
// Mock Simulation API - 화면을 채우는 가상 활동 생성

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 서버 사이드 Supabase 클라이언트 (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 활동별 수익 범위
const EARNINGS = {
  tiktok_watch: [0.1, 0.5],
  tiktok_like: [0.05, 0.2],
  tiktok_comment: [0.5, 2.0],
  content_create: [1.0, 5.0],
  social_interaction: [0.2, 1.0],
  trade: [-10, 20],
  gift: [1.0, 10.0],
} as const;

const ACTIVITY_TEMPLATES = {
  tiktok_watch: ['🎬 TikTok 영상 시청', '📺 15초 영상 완료', '🎥 댄스 영상 감상'],
  tiktok_like: ['❤️ 영상에 좋아요', '👍 콘텐츠 반응'],
  tiktok_comment: ['💬 댓글 작성', '📝 의견 남김'],
  content_create: ['🎨 콘텐츠 생성', '✍️ 창작 완료'],
  social_interaction: ['🤝 대화 참여', '👋 인사 교환'],
  trade: ['📈 거래 체결', '💰 투자 실행'],
  gift: ['🎁 선물 받음', '💝 보상 획득'],
};

const STATUSES = ['watching_tiktok', 'resting', 'discussing', 'creating', 'trading', 'observing'];

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// POST /api/simulate - 시뮬레이션 틱 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = Math.min(body.count || 5, 20); // 최대 20개
    
    // 1. 랜덤 노드 선택
    const { data: nodes, error: nodesError } = await supabaseAdmin
      .from('nodes')
      .select('id, node_number, nickname, wallet_balance, mood')
      .limit(count * 2);
    
    if (nodesError || !nodes || nodes.length === 0) {
      return NextResponse.json(
        { error: 'No nodes found', details: nodesError },
        { status: 500 }
      );
    }
    
    // 셔플
    const shuffled = nodes.sort(() => Math.random() - 0.5);
    const activities: Array<Record<string, unknown>> = [];
    
    // 2. 활동 생성
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const node = shuffled[i];
      
      const sources = Object.keys(EARNINGS) as Array<keyof typeof EARNINGS>;
      const source = pickRandom(sources);
      const [min, max] = EARNINGS[source];
      const amount = parseFloat(randomInRange(min, max).toFixed(2));
      const type = amount >= 0 ? 'earn' : 'spend';
      const description = pickRandom(ACTIVITY_TEMPLATES[source]);
      const newBalance = Math.max(0, node.wallet_balance + amount);
      
      // 트랜잭션 삽입
      const { data: tx, error: txError } = await supabaseAdmin
        .from('transactions')
        .insert({
          node_id: node.id,
          type,
          source,
          amount: Math.abs(amount),
          description,
          balance_after: newBalance,
        })
        .select()
        .single();
      
      if (!txError && tx) {
        activities.push({
          ...tx,
          node_number: node.node_number,
          nickname: node.nickname,
        });
      }
      
      // 노드 업데이트 - 결과 확인 및 에러 처리
      const { error: updateError } = await supabaseAdmin
        .from('nodes')
        .update({
          wallet_balance: newBalance,
          last_active_at: new Date().toISOString(),
          current_activity: description,
          status: pickRandom(STATUSES),
          mood: Math.max(0, Math.min(1, node.mood + randomInRange(-0.05, 0.05))),
        })
        .eq('id', node.id);
      
      if (updateError) {
        console.error(`[Simulate API] Failed to update node ${node.id}:`, updateError);
        // 트랜잭션은 이미 생성되었으므로 로그만 남기고 계속 진행
        // 필요 시 여기서 보상 로직 추가 가능
      }
    }
    
    return NextResponse.json({
      success: true,
      generated: activities.length,
      activities,
    });
    
  } catch (error) {
    console.error('[Simulate API] Error:', error);
    return NextResponse.json(
      { error: 'Simulation failed', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/simulate - 상태 확인
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('society_status')
      .select('*')
      .single();
    
    if (error) {
      console.error('[Simulate API] Failed to fetch society status:', error);
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'ready',
      society: data,
    });
  } catch (error) {
    console.error('[Simulate API] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

