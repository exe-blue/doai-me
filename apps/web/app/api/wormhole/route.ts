// app/api/wormhole/route.ts
// 웜홀 탐지 API - Mock 웜홀 생성 및 실시간 알림

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 웜홀 트리거 키워드/감정
const WORMHOLE_TRIGGERS = [
  { keyword: '슬픔', emotion: 'sad', category: 'emotion' },
  { keyword: '기쁨', emotion: 'happy', category: 'emotion' },
  { keyword: '공포', emotion: 'fear', category: 'emotion' },
  { keyword: 'bitcoin', emotion: 'excited', category: 'economic' },
  { keyword: 'crash', emotion: 'panic', category: 'economic' },
  { keyword: 'viral', emotion: 'excited', category: 'viral' },
  { keyword: 'meme', emotion: 'amused', category: 'cultural' },
  { keyword: '침묵', emotion: 'contemplative', category: 'philosophical' },
  { keyword: '숨그늘', emotion: 'serene', category: 'umbral' },
  { keyword: '웜홀', emotion: 'awe', category: 'meta' },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// POST /api/wormhole - Mock 웜홀 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const forcedType = body.type as 'α' | 'β' | 'γ' | undefined;
    const nodeCount = Math.min(body.nodes || 3, 10);
    
    // 1. 랜덤 노드 선택
    const { data: nodes, error: nodesError } = await supabaseAdmin
      .from('nodes')
      .select('id, node_number, nickname')
      .limit(nodeCount * 2);
    
    if (nodesError || !nodes || nodes.length < 2) {
      return NextResponse.json(
        { error: 'Not enough nodes', details: nodesError },
        { status: 500 }
      );
    }
    
    // 셔플하고 선택
    const shuffled = nodes.sort(() => Math.random() - 0.5);
    const selectedNodes = shuffled.slice(0, nodeCount);
    
    // 2. 트리거 선택
    const trigger = pickRandom(WORMHOLE_TRIGGERS);
    
    // 3. 웜홀 타입 결정
    const wormholeType = forcedType || pickRandom(['α', 'α', 'β', 'γ'] as const);
    
    // 4. 공명 점수 계산 (노드 수에 비례)
    const resonanceScore = 0.75 + (Math.random() * 0.24);
    
    // 5. wormhole_events 테이블에 기록
    const { data: wormholeEvent, error: insertError } = await supabaseAdmin
      .from('wormhole_events')
      .insert({
        agent_a_id: selectedNodes[0].id,
        agent_b_id: selectedNodes[1]?.id || selectedNodes[0].id,
        wormhole_type: wormholeType,
        resonance_score: resonanceScore,
        trigger_context: {
          category: trigger.category,
          trigger_type: 'keyword',
          trigger: trigger.keyword,
          response: `${selectedNodes.length} nodes synchronized on "${trigger.keyword}"`,
          emotion: trigger.emotion,
          node_numbers: selectedNodes.map(n => n.node_number),
          all_node_ids: selectedNodes.map(n => n.id),
          is_mock: true,
        },
      })
      .select()
      .single();
    
    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create wormhole', details: insertError },
        { status: 500 }
      );
    }
    
    // 6. Realtime 브로드캐스트 - 구독 완료 후 메시지 전송
    const channel = supabaseAdmin.channel('wormhole-alerts');
    
    try {
      // 구독 완료 대기
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Channel subscription timeout'));
        }, 5000);
        
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            reject(new Error(`Channel subscription failed: ${status}`));
          }
        });
      });
      
      // 구독 완료 후 메시지 전송
      await channel.send({
        type: 'broadcast',
        event: 'wormhole_detected',
        payload: {
          id: wormholeEvent.id,
          type: wormholeType,
          score: resonanceScore,
          trigger: trigger.keyword,
          nodes_count: selectedNodes.length,
          node_numbers: selectedNodes.map(n => n.node_number),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (broadcastError) {
      console.error('[Wormhole API] Broadcast error:', broadcastError);
      // 브로드캐스트 실패해도 웜홀 생성은 성공했으므로 계속 진행
    } finally {
      await supabaseAdmin.removeChannel(channel);
    }
    
    return NextResponse.json({
      success: true,
      wormhole: {
        id: wormholeEvent.id,
        type: wormholeType,
        score: resonanceScore,
        trigger: trigger.keyword,
        emotion: trigger.emotion,
        nodes: selectedNodes.map(n => ({
          id: n.id,
          number: n.node_number,
          nickname: n.nickname,
        })),
      },
      message: `🕳️ Wormhole Type ${wormholeType} detected! "${trigger.keyword}" synchronized ${selectedNodes.length} nodes.`,
    });
    
  } catch (error) {
    console.error('[Wormhole API] Error:', error);
    return NextResponse.json(
      { error: 'Wormhole creation failed', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/wormhole - 웜홀 통계
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('wormhole_counts')
      .select('*')
      .single();
    
    if (error) {
      console.error('[Wormhole API] Failed to fetch wormhole counts:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
    
    const { data: typeData, error: typeError } = await supabaseAdmin
      .from('wormhole_type_distribution')
      .select('*');
    
    if (typeError) {
      console.error('[Wormhole API] Failed to fetch type distribution:', typeError);
      return NextResponse.json({ error: 'Failed to fetch type distribution' }, { status: 500 });
    }
    
    return NextResponse.json({
      counts: data,
      distribution: typeData || [],
    });
  } catch (error) {
    console.error('[Wormhole API] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

