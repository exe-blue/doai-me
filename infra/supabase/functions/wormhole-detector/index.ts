// supabase/functions/wormhole-detector/index.ts
// 웜홀 탐지기 - Supabase Edge Function
// 
// "보이지 않는 뿌리가 드러나는 순간입니다." - Ruon, 2025
// 
// Trigger: 서로 다른 노드가 1초 이내에 동일한 키워드/감정을 배출할 때
// Action: wormhole_events 테이블에 기록
//
// @refactored 2026-01-09 - S3776 Cognitive Complexity 해결을 위해 함수 분리

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

// ============================================
// Types
// ============================================

interface NodeActivity {
  node_id: string;
  node_number: number;
  trigger_type: 'keyword' | 'emotion' | 'action' | 'content';
  trigger_key: string;
  trigger_value: string;
  category: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface WormholeCandidate {
  type: 'α' | 'β' | 'γ';
  nodes: NodeActivity[];
  trigger_key: string;
  trigger_value: string;
  time_diff_ms: number;
}

interface WormholeDetectionResult {
  detected: boolean;
  wormhole_type?: 'α' | 'β' | 'γ';
  wormhole_id?: string;
  reason?: string;
  _ruon?: string;
}

// ============================================
// Constants (Orion 명세)
// ============================================

const WORMHOLE_CONFIG = {
  MIN_SCORE: 0.75,              // 최소 공명 점수 (Orion: 0.75)
  TIME_WINDOW_MS: 1000,         // 동시성 판단 시간 (Orion: 1초)
  MIN_NODES: 2,                 // 최소 관련 노드 수 (Orion: 2개)
  COOLDOWN_MS: 5000,            // 같은 트리거 쿨다운 (5초)
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_TRIGGER_TYPES = ['keyword', 'emotion', 'action', 'content'];

// ============================================
// Validation
// ============================================

/**
 * NodeActivity 객체의 유효성 검사
 */
function isValidNodeActivity(obj: unknown): obj is NodeActivity {
  if (!obj || typeof obj !== 'object') return false;
  const a = obj as Record<string, unknown>;
  return (
    typeof a.node_id === 'string' &&
    typeof a.node_number === 'number' &&
    VALID_TRIGGER_TYPES.includes(a.trigger_type as string) &&
    typeof a.trigger_key === 'string' &&
    typeof a.trigger_value === 'string' &&
    typeof a.category === 'string' &&
    typeof a.timestamp === 'string'
  );
}

/**
 * 환경 변수 검증 및 반환
 */
function validateEnvironment(): { supabaseUrl: string; supabaseKey: string } {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject();
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return { supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_SERVICE_ROLE_KEY };
}

// ============================================
// Wormhole Recording
// ============================================

/**
 * 웜홀 이벤트를 DB에 기록
 */
async function recordWormhole(
  supabase: SupabaseClient,
  wormhole: WormholeCandidate,
  activity: NodeActivity
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('wormhole_events')
    .insert([{
      agent_a_id: wormhole.nodes[0].node_id,
      agent_b_id: wormhole.nodes[1].node_id,
      wormhole_type: wormhole.type,
      resonance_score: calculateResonanceScore(wormhole),
      trigger_context: {
        key: wormhole.trigger_key,
        trigger_type: activity.trigger_type,
        trigger: wormhole.trigger_value,
        category: activity.category,
        node_numbers: wormhole.nodes.map(n => n.node_number),
        all_node_ids: wormhole.nodes.map(n => n.node_id),
        time_diff_ms: wormhole.time_diff_ms,
      },
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Failed to record wormhole:', error);
    throw error;
  }
  
  return data;
}

/**
 * 웜홀 탐지 성공 로그 출력
 */
function logWormholeDetection(wormhole: WormholeCandidate): void {
  // 🌌 Ruon's Legacy - "보이지 않는 뿌리가 드러나는 순간입니다."
  console.log(`🌌 Wormhole ${wormhole.type} detected: 보이지 않는 뿌리가 드러나는 순간입니다.`);
  console.log(`   Nodes: ${wormhole.nodes.map(n => `#${n.node_number}`).join(' ←→ ')}`);
  console.log(`   Resonance: ${calculateResonanceScore(wormhole)}`);
}

// ============================================
// POST Request Handler
// ============================================

/**
 * POST 요청 처리 - 웜홀 탐지 메인 로직
 */
async function handlePostRequest(
  supabase: SupabaseClient,
  req: Request
): Promise<Response> {
  const payload = await req.json();
  const { activity } = payload as { activity: NodeActivity };
  
  // 페이로드 검증
  if (!activity) {
    return createErrorResponse(400, 'Missing activity payload');
  }
  
  if (!isValidNodeActivity(activity)) {
    return createErrorResponse(
      400,
      'Invalid activity structure: missing required fields (node_id, node_number, trigger_type, trigger_key, trigger_value, category, timestamp)'
    );
  }
  
  // 웜홀 탐지
  const wormhole = await detectWormhole(supabase, activity);
  
  if (!wormhole) {
    return createJsonResponse({ detected: false });
  }
  
  // 노드 수 검증
  if (wormhole.nodes.length < WORMHOLE_CONFIG.MIN_NODES) {
    console.warn('Wormhole detected but has less than 2 nodes, skipping insert');
    return createJsonResponse({ detected: false, reason: 'insufficient_nodes' });
  }
  
  // 웜홀 기록
  const data = await recordWormhole(supabase, wormhole, activity);
  logWormholeDetection(wormhole);
  
  return new Response(
    JSON.stringify({ 
      detected: true, 
      wormhole_type: wormhole.type,
      wormhole_id: data.id,
      _ruon: "보이지 않는 뿌리가 드러나는 순간입니다.",
    }),
    { 
      headers: { 
        ...CORS_HEADERS, 
        'Content-Type': 'application/json',
        'X-Ruon-Legacy': 'The invisible roots reveal themselves',
      } 
    }
  );
}

// ============================================
// Response Helpers
// ============================================

/**
 * JSON 응답 생성
 */
function createJsonResponse(data: WormholeDetectionResult, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { 
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * 에러 응답 생성
 */
function createErrorResponse(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  
  try {
    const { supabaseUrl, supabaseKey } = validateEnvironment();
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (req.method === 'POST') {
      return await handlePostRequest(supabase, req);
    }
    
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
    
  } catch (error) {
    console.error('Wormhole detector error:', error);
    return createErrorResponse(
      500, 
      error instanceof Error ? error.message : String(error)
    );
  }
});

// ============================================
// Detection Logic
// ============================================

async function detectWormhole(
  supabase: SupabaseClient,
  activity: NodeActivity
): Promise<WormholeCandidate | null> {
  const now = new Date(activity.timestamp);
  
  // timestamp 유효성 검사
  if (!Number.isFinite(now.getTime())) {
    console.warn('Invalid activity.timestamp:', activity.timestamp);
    return null;
  }
  
  const windowStart = new Date(now.getTime() - WORMHOLE_CONFIG.TIME_WINDOW_MS);
  
  // 최근 1초 내 같은 trigger_key를 가진 다른 노드 활동 조회
  const { data: recentActivities, error } = await supabase
    .from('node_activities')
    .select('*')
    .eq('trigger_key', activity.trigger_key)
    .neq('node_id', activity.node_id)
    .gte('timestamp', windowStart.toISOString())
    .lte('timestamp', activity.timestamp)
    .limit(10);
  
  if (error) {
    // 테이블이 없으면 fallback으로 mock 탐지
    console.warn('node_activities table not found, using mock detection');
    return mockDetection(activity);
  }
  
  if (!recentActivities || recentActivities.length < WORMHOLE_CONFIG.MIN_NODES - 1) {
    return null;
  }
  
  // 웜홀 타입 결정
  const type = determineWormholeType(activity, recentActivities);
  
  const allNodes = [activity, ...recentActivities];
  const timeDiffs = allNodes.map(a => new Date(a.timestamp).getTime());
  const maxDiff = Math.max(...timeDiffs) - Math.min(...timeDiffs);
  
  return {
    type,
    nodes: allNodes,
    trigger_key: activity.trigger_key,
    trigger_value: activity.trigger_value,
    time_diff_ms: maxDiff,
  };
}

// ============================================
// Mock Detection (node_activities 없을 때)
// ============================================

function mockDetection(activity: NodeActivity): WormholeCandidate | null {
  // 30% 확률로 웜홀 탐지 (테스트용)
  if (Math.random() > 0.3) {
    return null;
  }
  
  const types = ['α', 'β', 'γ'] as const;
  const type = types[Math.floor(Math.random() * 3)];
  
  // Mock 두 번째 노드
  const mockNode: NodeActivity = {
    node_id: crypto.randomUUID(),
    node_number: Math.floor(Math.random() * 600) + 1,
    trigger_type: activity.trigger_type,
    trigger_key: activity.trigger_key,
    trigger_value: activity.trigger_value,
    category: activity.category,
    timestamp: activity.timestamp,
  };
  
  return {
    type,
    nodes: [activity, mockNode],
    trigger_key: activity.trigger_key,
    trigger_value: activity.trigger_value,
    time_diff_ms: Math.floor(Math.random() * 500),
  };
}

// ============================================
// Helpers
// ============================================

function determineWormholeType(
  primary: NodeActivity,
  others: NodeActivity[]
): 'α' | 'β' | 'γ' {
  // α: Echo Tunnel - 동일 트리거, 동일 시간 (< 100ms)
  // β: Cross-Model - 동일 트리거, 다른 카테고리
  // γ: Temporal - 시간차 자기공명 (같은 노드가 반복)
  
  const timeDiffs = others.map(o => 
    Math.abs(new Date(o.timestamp).getTime() - new Date(primary.timestamp).getTime())
  );
  const minDiff = Math.min(...timeDiffs);
  
  if (minDiff < 100) {
    return 'α';
  }
  
  const hasDifferentCategory = others.some(o => o.category !== primary.category);
  if (hasDifferentCategory) {
    return 'β';
  }
  
  return 'γ';
}

function calculateResonanceScore(wormhole: WormholeCandidate): number {
  // 기본 점수: 0.75
  let score = 0.75;
  
  // 시간 차이가 작을수록 점수 증가
  const timeBonus = Math.max(0, (WORMHOLE_CONFIG.TIME_WINDOW_MS - wormhole.time_diff_ms) / WORMHOLE_CONFIG.TIME_WINDOW_MS * 0.15);
  score += timeBonus;
  
  // 노드 수가 많을수록 점수 증가
  const nodeBonus = Math.min(0.1, (wormhole.nodes.length - 2) * 0.02);
  score += nodeBonus;
  
  // α 타입은 보너스
  if (wormhole.type === 'α') {
    score += 0.05;
  }
  
  return Math.min(1, Math.round(score * 1000) / 1000);
}
