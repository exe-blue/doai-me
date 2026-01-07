// lib/supabase/types.ts
// Supabase 테이블 타입 정의 및 Zod 스키마 기반 런타임 검증

import { z } from 'zod';

// ============================================
// Node Schemas
// ============================================

export const NodeStatusSchema = z.enum(['active', 'inactive', 'in_umbra', 'connecting']);
export const NodeStatusV2Schema = z.enum(['ACTIVE', 'INACTIVE', 'UMBRAL', 'ERROR']);

export const NodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  status: NodeStatusSchema,
  status_v2: NodeStatusV2Schema.optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
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
  active: z.number().int().nonnegative(),
  inactive: z.number().int().nonnegative(),
  umbral: z.number().int().nonnegative(),
  error: z.number().int().nonnegative(),
});

export type NodesStatusSummary = z.infer<typeof NodesStatusSummarySchema>;
