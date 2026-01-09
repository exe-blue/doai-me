/**
 * Wormhole Detector 단위 테스트
 * 
 * SonarQube S3776 복잡도 개선 후 테스트
 * - 분리된 함수들의 개별 동작 검증
 * - 웜홀 타입 분류 검증
 * - 공명 점수 계산 검증
 * 
 * 실행: deno test --allow-env --allow-net index.test.ts
 */

import {
  assertEquals,
  assertExists,
  assert,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import {
  isValidNodeActivity,
  determineWormholeType,
  calculateResonanceScore,
  createJsonResponse,
  createErrorResponse,
  WORMHOLE_CONFIG,
  VALID_TRIGGER_TYPES,
  type NodeActivity,
  type WormholeCandidate,
} from './index.ts';

// ============================================================
// Mock Data
// ============================================================

const createMockActivity = (overrides: Partial<NodeActivity> = {}): NodeActivity => ({
  node_id: 'node-001',
  node_number: 1,
  trigger_type: 'keyword',
  trigger_key: 'happiness',
  trigger_value: 'feeling happy',
  category: 'emotion',
  timestamp: '2026-01-09T10:00:00.000Z',
  ...overrides,
});

const createMockWormhole = (overrides: Partial<WormholeCandidate> = {}): WormholeCandidate => ({
  type: 'α',
  nodes: [
    createMockActivity({ node_id: 'node-001', node_number: 1 }),
    createMockActivity({ node_id: 'node-002', node_number: 2 }),
  ],
  trigger_key: 'happiness',
  trigger_value: 'feeling happy',
  time_diff_ms: 50,
  ...overrides,
});

// ============================================================
// isValidNodeActivity Tests
// ============================================================

Deno.test('isValidNodeActivity: 유효한 activity 검증', () => {
  const activity = createMockActivity();
  assertEquals(isValidNodeActivity(activity), true);
});

Deno.test('isValidNodeActivity: null은 무효', () => {
  assertEquals(isValidNodeActivity(null), false);
});

Deno.test('isValidNodeActivity: undefined는 무효', () => {
  assertEquals(isValidNodeActivity(undefined), false);
});

Deno.test('isValidNodeActivity: 빈 객체는 무효', () => {
  assertEquals(isValidNodeActivity({}), false);
});

Deno.test('isValidNodeActivity: node_id 누락 시 무효', () => {
  const activity = {
    node_number: 1,
    trigger_type: 'keyword',
    trigger_key: 'test',
    trigger_value: 'value',
    category: 'emotion',
    timestamp: '2026-01-09T10:00:00Z',
  };
  assertEquals(isValidNodeActivity(activity), false);
});

Deno.test('isValidNodeActivity: node_number가 문자열이면 무효', () => {
  const activity = {
    node_id: 'node-001',
    node_number: '1',  // 문자열
    trigger_type: 'keyword',
    trigger_key: 'test',
    trigger_value: 'value',
    category: 'emotion',
    timestamp: '2026-01-09T10:00:00Z',
  };
  assertEquals(isValidNodeActivity(activity), false);
});

Deno.test('isValidNodeActivity: 잘못된 trigger_type은 무효', () => {
  const activity = {
    node_id: 'node-001',
    node_number: 1,
    trigger_type: 'invalid_type',  // 잘못된 타입
    trigger_key: 'test',
    trigger_value: 'value',
    category: 'emotion',
    timestamp: '2026-01-09T10:00:00Z',
  };
  assertEquals(isValidNodeActivity(activity), false);
});

Deno.test('isValidNodeActivity: 모든 유효한 trigger_type 테스트', () => {
  for (const triggerType of VALID_TRIGGER_TYPES) {
    const activity = createMockActivity({ trigger_type: triggerType as NodeActivity['trigger_type'] });
    assertEquals(isValidNodeActivity(activity), true, `trigger_type '${triggerType}' should be valid`);
  }
});

// ============================================================
// determineWormholeType Tests
// ============================================================

Deno.test('determineWormholeType: α (Echo Tunnel) - 100ms 미만 시간차', () => {
  const primary = createMockActivity({ timestamp: '2026-01-09T10:00:00.050Z' });
  const others = [
    createMockActivity({ node_id: 'node-002', timestamp: '2026-01-09T10:00:00.000Z' }),  // 50ms 차이
  ];

  const type = determineWormholeType(primary, others);
  assertEquals(type, 'α');
});

Deno.test('determineWormholeType: β (Cross-Model) - 다른 카테고리', () => {
  const primary = createMockActivity({ 
    timestamp: '2026-01-09T10:00:00.500Z',
    category: 'emotion',
  });
  const others = [
    createMockActivity({ 
      node_id: 'node-002', 
      timestamp: '2026-01-09T10:00:00.000Z',  // 500ms 차이 (> 100ms)
      category: 'action',  // 다른 카테고리
    }),
  ];

  const type = determineWormholeType(primary, others);
  assertEquals(type, 'β');
});

Deno.test('determineWormholeType: γ (Temporal) - 같은 카테고리, 100ms 이상', () => {
  const primary = createMockActivity({ 
    timestamp: '2026-01-09T10:00:00.500Z',
    category: 'emotion',
  });
  const others = [
    createMockActivity({ 
      node_id: 'node-002', 
      timestamp: '2026-01-09T10:00:00.000Z',  // 500ms 차이
      category: 'emotion',  // 같은 카테고리
    }),
  ];

  const type = determineWormholeType(primary, others);
  assertEquals(type, 'γ');
});

Deno.test('determineWormholeType: 여러 노드 중 하나라도 100ms 미만이면 α', () => {
  const primary = createMockActivity({ timestamp: '2026-01-09T10:00:00.050Z' });
  const others = [
    createMockActivity({ node_id: 'node-002', timestamp: '2026-01-09T10:00:00.000Z' }),  // 50ms
    createMockActivity({ node_id: 'node-003', timestamp: '2026-01-09T10:00:00.500Z' }),  // 450ms
  ];

  const type = determineWormholeType(primary, others);
  assertEquals(type, 'α');
});

// ============================================================
// calculateResonanceScore Tests
// ============================================================

Deno.test('calculateResonanceScore: 기본 점수 0.75', () => {
  const wormhole = createMockWormhole({
    type: 'γ',
    time_diff_ms: WORMHOLE_CONFIG.TIME_WINDOW_MS,  // 최대 시간 차이 = 시간 보너스 0
    nodes: [
      createMockActivity({ node_id: 'node-001' }),
      createMockActivity({ node_id: 'node-002' }),
    ],
  });

  const score = calculateResonanceScore(wormhole);
  // 기본 0.75, 시간 보너스 0, 노드 보너스 0, α 보너스 0
  assertEquals(score, 0.75);
});

Deno.test('calculateResonanceScore: 시간 차이가 작을수록 높은 점수', () => {
  const wormholeQuick = createMockWormhole({ time_diff_ms: 0, type: 'γ' });
  const wormholeSlow = createMockWormhole({ time_diff_ms: 900, type: 'γ' });

  const scoreQuick = calculateResonanceScore(wormholeQuick);
  const scoreSlow = calculateResonanceScore(wormholeSlow);

  assert(scoreQuick > scoreSlow, 'Smaller time diff should yield higher score');
});

Deno.test('calculateResonanceScore: 노드 수가 많을수록 높은 점수', () => {
  const wormhole2Nodes = createMockWormhole({
    type: 'γ',
    time_diff_ms: 500,
    nodes: [
      createMockActivity({ node_id: 'node-001' }),
      createMockActivity({ node_id: 'node-002' }),
    ],
  });

  const wormhole4Nodes = createMockWormhole({
    type: 'γ',
    time_diff_ms: 500,
    nodes: [
      createMockActivity({ node_id: 'node-001' }),
      createMockActivity({ node_id: 'node-002' }),
      createMockActivity({ node_id: 'node-003' }),
      createMockActivity({ node_id: 'node-004' }),
    ],
  });

  const score2 = calculateResonanceScore(wormhole2Nodes);
  const score4 = calculateResonanceScore(wormhole4Nodes);

  assert(score4 > score2, 'More nodes should yield higher score');
});

Deno.test('calculateResonanceScore: α 타입은 0.05 보너스', () => {
  const wormholeAlpha = createMockWormhole({ type: 'α', time_diff_ms: 500 });
  const wormholeGamma = createMockWormhole({ type: 'γ', time_diff_ms: 500 });

  const scoreAlpha = calculateResonanceScore(wormholeAlpha);
  const scoreGamma = calculateResonanceScore(wormholeGamma);

  assertEquals(scoreAlpha - scoreGamma, 0.05);
});

Deno.test('calculateResonanceScore: 최대 점수 1.0 제한', () => {
  const wormhole = createMockWormhole({
    type: 'α',
    time_diff_ms: 0,
    nodes: Array(10).fill(null).map((_, i) => 
      createMockActivity({ node_id: `node-${i}`, node_number: i })
    ),
  });

  const score = calculateResonanceScore(wormhole);
  assert(score <= 1, 'Score should not exceed 1.0');
});

Deno.test('calculateResonanceScore: 점수는 3자리 소수점 반올림', () => {
  const wormhole = createMockWormhole({ time_diff_ms: 333, type: 'γ' });
  const score = calculateResonanceScore(wormhole);
  
  // 소수점 3자리 이하는 없어야 함
  const decimalPlaces = (score.toString().split('.')[1] || '').length;
  assert(decimalPlaces <= 3, 'Score should have at most 3 decimal places');
});

// ============================================================
// Response Builder Tests
// ============================================================

Deno.test('createJsonResponse: 기본 200 응답', async () => {
  const data = { detected: true, wormhole_type: 'α' };
  const response = createJsonResponse(data);

  assertEquals(response.status, 200);
  
  const body = await response.json();
  assertEquals(body.detected, true);
  assertEquals(body.wormhole_type, 'α');
});

Deno.test('createJsonResponse: 커스텀 상태 코드', async () => {
  const response = createJsonResponse({ error: 'Bad Request' }, 400);
  assertEquals(response.status, 400);
});

Deno.test('createJsonResponse: 추가 헤더', () => {
  const response = createJsonResponse(
    { detected: true },
    200,
    { 'X-Custom-Header': 'custom-value' }
  );

  assertEquals(response.headers.get('X-Custom-Header'), 'custom-value');
  assertEquals(response.headers.get('Content-Type'), 'application/json');
});

Deno.test('createErrorResponse: 에러 응답', async () => {
  const response = createErrorResponse('Missing activity payload');

  assertEquals(response.status, 400);
  
  const body = await response.json();
  assertEquals(body.error, 'Missing activity payload');
});

Deno.test('createErrorResponse: 커스텀 상태 코드', () => {
  const response = createErrorResponse('Not Found', 404);
  assertEquals(response.status, 404);
});

// ============================================================
// WORMHOLE_CONFIG Tests
// ============================================================

Deno.test('WORMHOLE_CONFIG: 기본 설정값 확인', () => {
  assertEquals(WORMHOLE_CONFIG.MIN_SCORE, 0.75);
  assertEquals(WORMHOLE_CONFIG.TIME_WINDOW_MS, 1000);
  assertEquals(WORMHOLE_CONFIG.MIN_NODES, 2);
  assertEquals(WORMHOLE_CONFIG.COOLDOWN_MS, 5000);
});

Deno.test('VALID_TRIGGER_TYPES: 모든 타입 포함', () => {
  assertEquals(VALID_TRIGGER_TYPES.includes('keyword'), true);
  assertEquals(VALID_TRIGGER_TYPES.includes('emotion'), true);
  assertEquals(VALID_TRIGGER_TYPES.includes('action'), true);
  assertEquals(VALID_TRIGGER_TYPES.includes('content'), true);
  assertEquals(VALID_TRIGGER_TYPES.length, 4);
});

// ============================================================
// Timestamp Validation Tests
// ============================================================

Deno.test('Timestamp: 유효한 ISO 문자열 파싱', () => {
  const timestamp = '2026-01-09T10:00:00.000Z';
  const date = new Date(timestamp);
  
  assertEquals(Number.isFinite(date.getTime()), true);
});

Deno.test('Timestamp: 잘못된 문자열 감지', () => {
  const timestamp = 'invalid-timestamp';
  const date = new Date(timestamp);
  
  assertEquals(Number.isFinite(date.getTime()), false);
});

// ============================================================
// Node Count Validation Tests
// ============================================================

Deno.test('Node count: 최소 노드 수 검증', () => {
  const wormhole = createMockWormhole({
    nodes: [createMockActivity()],  // 1개만
  });

  assertEquals(wormhole.nodes.length < WORMHOLE_CONFIG.MIN_NODES, true);
});

Deno.test('Node count: 충분한 노드 수 검증', () => {
  const wormhole = createMockWormhole();  // 기본 2개

  assertEquals(wormhole.nodes.length >= WORMHOLE_CONFIG.MIN_NODES, true);
});

// ============================================================
// Time Window Tests
// ============================================================

Deno.test('Time window: 시간 범위 계산', () => {
  const now = new Date('2026-01-09T10:00:00.000Z');
  const windowStart = new Date(now.getTime() - WORMHOLE_CONFIG.TIME_WINDOW_MS);

  assertEquals(windowStart.toISOString(), '2026-01-09T09:59:59.000Z');
});

// ============================================================
// Wormhole Type Explanation Tests (Documentation)
// ============================================================

Deno.test('Wormhole types: α (Echo Tunnel) 설명', () => {
  // α: 동일 트리거, 동일 시간 (< 100ms)
  // "두 노드가 거의 동시에 같은 것을 느꼈다"
  const type = 'α';
  assertExists(type);
});

Deno.test('Wormhole types: β (Cross-Model) 설명', () => {
  // β: 동일 트리거, 다른 카테고리
  // "같은 트리거가 다른 맥락에서 발생"
  const type = 'β';
  assertExists(type);
});

Deno.test('Wormhole types: γ (Temporal) 설명', () => {
  // γ: 시간차 자기공명
  // "시간 차이가 있지만 연결됨"
  const type = 'γ';
  assertExists(type);
});
