// lib/supabase/types.ts
// Supabase 테이블 타입 정의 및 Zod 스키마 기반 런타임 검증

import { z } from 'zod';

// ============================================
// Node Schemas
// ============================================

export const NodeStatusSchema = z.enum([
  'active', 'inactive', 'in_umbra', 'connecting', 'offline', 'error', 'maintenance',
  // Society Dashboard 추가 상태
  'watching_tiktok', 'discussing', 'creating', 'trading', 'observing', 'resting'
]);
export const NodeStatusV2Schema = z.enum(['ACTIVE', 'INACTIVE', 'UMBRAL', 'ERROR']);

export const NodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  nickname: z.string().optional(),
  status: NodeStatusSchema,
  status_v2: NodeStatusV2Schema.optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  last_seen_at: z.string().datetime().optional(),
  node_number: z.number().optional(),
  ip_address: z.string().optional(),
  trait: z.string().optional(),
  current_activity: z.string().optional(),
  umbra_since: z.string().datetime().optional(),
  wallet_balance: z.number().optional(),
  mood: z.string().optional(),
});

export type NodeStatus = z.infer<typeof NodeStatusSchema>;
export type NodeStatusV2 = z.infer<typeof NodeStatusV2Schema>;
export type Node = z.infer<typeof NodeSchema>;

// ============================================
// Wormhole Event Schemas
// ============================================

export const WormholeTypeSchema = z.enum(['α', 'β', 'γ']);

export const WormholeTriggerContextSchema = z.object({
  key: z.string().optional(),
  category: z.string().optional(),
  trigger: z.string().optional(),
  trigger_type: z.string().optional(),
  emotion: z.string().optional(),
  node_numbers: z.array(z.number()).optional(),
  all_node_ids: z.array(z.string()).optional(),
  time_diff_ms: z.number().optional(),
}).nullable();

export const WormholeEventSchema = z.object({
  id: z.string().uuid(),
  wormhole_type: WormholeTypeSchema,
  resonance_score: z.number().min(0).max(1),
  detected_at: z.string(),
  is_false_positive: z.boolean(),
  trigger_context: WormholeTriggerContextSchema,
  agent_a_id: z.string().uuid(),
  agent_b_id: z.string().uuid(),
});

export type WormholeType = z.infer<typeof WormholeTypeSchema>;
export type WormholeTriggerContext = z.infer<typeof WormholeTriggerContextSchema>;
export type WormholeEvent = z.infer<typeof WormholeEventSchema>;

// ============================================
// Validation Utilities (순수 함수)
// ============================================

/**
 * WormholeEvent 파싱 결과 타입
 */
export type ParseResult<T> = 
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

/**
 * 안전한 WormholeEvent 파싱
 * @param value - 검증할 unknown 값
 * @returns ParseResult<WormholeEvent>
 */
export const parseWormholeEvent = (value: unknown): ParseResult<WormholeEvent> => {
  const result = WormholeEventSchema.safeParse(value);
  return result.success 
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
};

/**
 * 안전한 Node 파싱
 * @param value - 검증할 unknown 값
 * @returns ParseResult<Node>
 */
export const parseNode = (value: unknown): ParseResult<Node> => {
  const result = NodeSchema.safeParse(value);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
};

/**
 * Type guard (Zod 기반)
 * - 기존 코드 호환성 유지
 */
export const isWormholeEvent = (value: unknown): value is WormholeEvent => {
  return WormholeEventSchema.safeParse(value).success;
};

export const isNode = (value: unknown): value is Node => {
  return NodeSchema.safeParse(value).success;
};

// ============================================
// Aggregate Types
// ============================================

export const NodesStatusSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  total_nodes: z.number().int().nonnegative().optional(),
  active: z.number().int().nonnegative(),
  active_count: z.number().int().nonnegative().optional(),
  inactive: z.number().int().nonnegative(),
  offline_count: z.number().int().nonnegative().optional(),
  umbral: z.number().int().nonnegative(),
  in_umbra_count: z.number().int().nonnegative().optional(),
  umbra_long: z.number().int().nonnegative().optional(),
  error: z.number().int().nonnegative(),
  error_count: z.number().int().nonnegative().optional(),
  maintenance_count: z.number().int().nonnegative().optional(),
});

export type NodesStatusSummary = z.infer<typeof NodesStatusSummarySchema>;

// ============================================
// Wormhole Aggregate Types
// ============================================

export interface WormholeStats {
  total: number;
  alpha: number;
  beta: number;
  gamma: number;
  avgScore: number;
  avg_score_24h?: number;
  last24h: number;
  last_24h?: number;
  last_7d?: number;
  last_detected_at?: string;
}

export interface WormholeTopContext {
  trigger: string;
  context_key: string;
  trigger_type?: string;
  count: number;
  event_count?: number;
  avgScore: number;
  avg_score?: number;
}

export interface WormholeTypeStats {
  type: WormholeType;
  wormhole_type?: 'α' | 'β' | 'γ';
  count: number;
  percentage: number;
  avg_score?: number;
}

export interface WormholeScoreHistogram {
  range: string;
  bucket?: string;
  score_range?: string;
  count: number;
}

// ============================================
// Society Dashboard Types (re-export)
// ============================================

export interface ActivityFeedItem {
  id: string;
  type: 'node_status_change' | 'wormhole_detected' | 'system_event' | 'earn' | 'reward' | 'spend';
  message?: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
  // 경제 활동 피드용 필드
  node_number?: number;
  description?: string;
  amount?: number;
  trait?: string;
  status?: string;
  created_at?: string;
}

export interface SocialEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  affected_nodes: number;
  economic_impact: number;
  mood_shift: number;
}

export interface SocietyStatus {
  totalNodes: number;
  total_nodes?: number;
  activeNodes: number;
  online_nodes?: number;
  inactiveNodes: number;
  umbralNodes: number;
  umbral_nodes?: number;
  wormholeCount: number;
  wormhole_count_24h?: number;
  lastUpdate: Date;
  avg_mood?: number;
}
