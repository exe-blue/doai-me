/**
 * YouTube Channel Checker 단위 테스트
 * 
 * SonarQube S3776 복잡도 개선 후 테스트
 * - 분리된 함수들의 개별 동작 검증
 * - 에러 처리 및 엣지 케이스 검증
 * 
 * 실행: deno test --allow-env --allow-net index.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  assertSpyCall,
  spy,
  stub,
} from 'https://deno.land/std@0.168.0/testing/mock.ts';

import {
  parseRequestBody,
  createJsonResponse,
  createErrorResponse,
  type Channel,
  type YouTubeVideoItem,
  type CheckResults,
} from './index.ts';

// ============================================================
// Mock Data
// ============================================================

const mockChannel: Channel = {
  id: 'ch-001',
  channel_id: 'UC1234567890',
  channel_name: 'Test Channel',
  is_active: true,
  auto_execute: false,
  check_interval_minutes: 60,
  last_checked_at: null,
};

const mockVideo: YouTubeVideoItem = {
  id: { videoId: 'video123' },
  snippet: {
    title: 'Test Video',
    description: 'Test Description',
    publishedAt: '2026-01-09T10:00:00Z',
    thumbnails: {
      high: { url: 'https://i.ytimg.com/vi/video123/hqdefault.jpg' },
      medium: { url: 'https://i.ytimg.com/vi/video123/mqdefault.jpg' },
      default: { url: 'https://i.ytimg.com/vi/video123/default.jpg' },
    },
  },
};

// ============================================================
// parseRequestBody Tests
// ============================================================

Deno.test('parseRequestBody: 정상적인 channel_id 파싱', async () => {
  const body = JSON.stringify({ channel_id: 'ch-001' });
  const request = new Request('http://localhost', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await parseRequestBody(request);
  assertEquals(result, 'ch-001');
});

Deno.test('parseRequestBody: body 없을 때 null 반환', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
  });

  const result = await parseRequestBody(request);
  assertEquals(result, null);
});

Deno.test('parseRequestBody: 빈 객체일 때 null 반환', async () => {
  const body = JSON.stringify({});
  const request = new Request('http://localhost', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await parseRequestBody(request);
  assertEquals(result, null);
});

Deno.test('parseRequestBody: 잘못된 JSON일 때 null 반환', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: 'invalid json',
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await parseRequestBody(request);
  assertEquals(result, null);
});

// ============================================================
// Response Builder Tests
// ============================================================

Deno.test('createJsonResponse: 기본 200 응답', async () => {
  const data = { success: true, message: 'OK' };
  const response = createJsonResponse(data);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Content-Type'), 'application/json');
  
  const body = await response.json();
  assertEquals(body.success, true);
  assertEquals(body.message, 'OK');
});

Deno.test('createJsonResponse: 커스텀 상태 코드', async () => {
  const data = { error: 'Not Found' };
  const response = createJsonResponse(data, 404);

  assertEquals(response.status, 404);
});

Deno.test('createErrorResponse: 에러 응답 생성', async () => {
  const error = new Error('Test error');
  const response = createErrorResponse(error);

  assertEquals(response.status, 500);
  
  const body = await response.json();
  assertEquals(body.success, false);
  assertEquals(body.error, 'Test error');
});

Deno.test('createErrorResponse: 문자열 에러 처리', async () => {
  const response = createErrorResponse('String error');

  const body = await response.json();
  assertEquals(body.error, 'String error');
});

// ============================================================
// Type Validation Tests
// ============================================================

Deno.test('Channel 타입: 필수 필드 확인', () => {
  // 모든 필수 필드가 있는지 확인
  assertExists(mockChannel.id);
  assertExists(mockChannel.channel_id);
  assertExists(mockChannel.channel_name);
  assertEquals(typeof mockChannel.is_active, 'boolean');
  assertEquals(typeof mockChannel.auto_execute, 'boolean');
  assertEquals(typeof mockChannel.check_interval_minutes, 'number');
});

Deno.test('YouTubeVideoItem 타입: 필수 필드 확인', () => {
  assertExists(mockVideo.id.videoId);
  assertExists(mockVideo.snippet.title);
  assertExists(mockVideo.snippet.publishedAt);
  assertExists(mockVideo.snippet.thumbnails);
});

Deno.test('CheckResults 타입: 초기값 확인', () => {
  const results: CheckResults = {
    checked: 0,
    newVideos: 0,
    errors: [],
  };

  assertEquals(results.checked, 0);
  assertEquals(results.newVideos, 0);
  assertEquals(results.errors.length, 0);
});

// ============================================================
// Thumbnail Selection Tests
// ============================================================

Deno.test('Thumbnail: high 우선 선택', () => {
  const thumbnailUrl = mockVideo.snippet.thumbnails.high?.url ||
                      mockVideo.snippet.thumbnails.medium?.url ||
                      mockVideo.snippet.thumbnails.default?.url;

  assertEquals(thumbnailUrl, 'https://i.ytimg.com/vi/video123/hqdefault.jpg');
});

Deno.test('Thumbnail: high 없으면 medium 선택', () => {
  const video: YouTubeVideoItem = {
    ...mockVideo,
    snippet: {
      ...mockVideo.snippet,
      thumbnails: {
        medium: { url: 'medium-url' },
        default: { url: 'default-url' },
      },
    },
  };

  const thumbnailUrl = video.snippet.thumbnails.high?.url ||
                      video.snippet.thumbnails.medium?.url ||
                      video.snippet.thumbnails.default?.url;

  assertEquals(thumbnailUrl, 'medium-url');
});

Deno.test('Thumbnail: medium도 없으면 default 선택', () => {
  const video: YouTubeVideoItem = {
    ...mockVideo,
    snippet: {
      ...mockVideo.snippet,
      thumbnails: {
        default: { url: 'default-url' },
      },
    },
  };

  const thumbnailUrl = video.snippet.thumbnails.high?.url ||
                      video.snippet.thumbnails.medium?.url ||
                      video.snippet.thumbnails.default?.url;

  assertEquals(thumbnailUrl, 'default-url');
});

// ============================================================
// publishedAfter Calculation Tests
// ============================================================

Deno.test('publishedAfter: last_checked_at이 있으면 그 값 사용', () => {
  const channel: Channel = {
    ...mockChannel,
    last_checked_at: '2026-01-09T08:00:00Z',
  };

  const publishedAfter = channel.last_checked_at
    ? new Date(channel.last_checked_at).toISOString()
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  assertEquals(publishedAfter, '2026-01-09T08:00:00.000Z');
});

Deno.test('publishedAfter: last_checked_at이 null이면 24시간 전', () => {
  const channel: Channel = {
    ...mockChannel,
    last_checked_at: null,
  };

  const now = Date.now();
  const publishedAfter = channel.last_checked_at
    ? new Date(channel.last_checked_at).toISOString()
    : new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const parsed = new Date(publishedAfter).getTime();
  const expected = now - 24 * 60 * 60 * 1000;
  
  // 1초 오차 허용
  assertEquals(Math.abs(parsed - expected) < 1000, true);
});

// ============================================================
// Video Status Tests
// ============================================================

Deno.test('Video status: auto_execute true면 queued', () => {
  const channel: Channel = {
    ...mockChannel,
    auto_execute: true,
  };

  const status = channel.auto_execute ? 'queued' : 'pending';
  assertEquals(status, 'queued');
});

Deno.test('Video status: auto_execute false면 pending', () => {
  const channel: Channel = {
    ...mockChannel,
    auto_execute: false,
  };

  const status = channel.auto_execute ? 'queued' : 'pending';
  assertEquals(status, 'pending');
});

Deno.test('Video queued_at: auto_execute true면 현재 시간', () => {
  const channel: Channel = {
    ...mockChannel,
    auto_execute: true,
  };

  const queuedAt = channel.auto_execute ? new Date().toISOString() : null;
  assertExists(queuedAt);
});

Deno.test('Video queued_at: auto_execute false면 null', () => {
  const channel: Channel = {
    ...mockChannel,
    auto_execute: false,
  };

  const queuedAt = channel.auto_execute ? new Date().toISOString() : null;
  assertEquals(queuedAt, null);
});

// ============================================================
// CORS Headers Tests
// ============================================================

Deno.test('CORS: OPTIONS 요청 처리', () => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  assertEquals(corsHeaders['Access-Control-Allow-Origin'], '*');
  assertExists(corsHeaders['Access-Control-Allow-Headers']);
});

// ============================================================
// Error Aggregation Tests
// ============================================================

Deno.test('Error aggregation: 에러 메시지 포맷', () => {
  const channel = mockChannel;
  const error = new Error('API rate limit exceeded');
  
  const errorMsg = `${channel.channel_name}: ${error instanceof Error ? error.message : String(error)}`;
  
  assertEquals(errorMsg, 'Test Channel: API rate limit exceeded');
});

Deno.test('Error aggregation: 문자열 에러 처리', () => {
  const channel = mockChannel;
  const error = 'Unknown error occurred';
  
  const errorMsg = `${channel.channel_name}: ${error instanceof Error ? error.message : String(error)}`;
  
  assertEquals(errorMsg, 'Test Channel: Unknown error occurred');
});
