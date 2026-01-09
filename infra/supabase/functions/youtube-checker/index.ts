/**
 * YouTube Channel Checker Edge Function
 * 
 * 채널의 새로운 영상을 확인하고 DB에 등록
 * Cron으로 주기적 실행 또는 수동 호출
 * 
 * @author Axon (Tech Lead)
 * @refactored 2026-01-09 - S3776 Cognitive Complexity 해결을 위해 함수 분리
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ============================================================
// Types
// ============================================================

interface YouTubeVideoItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeVideoItem[];
  pageInfo?: { totalResults: number };
  error?: { message: string };
}

interface Channel {
  id: string;
  channel_id: string;
  channel_name: string;
  is_active: boolean;
  auto_execute: boolean;
  check_interval_minutes: number;
  last_checked_at: string | null;
}

interface ProcessResult {
  checked: number;
  newVideos: number;
  errors: string[];
}

interface ChannelProcessResult {
  newCount: number;
  videosFound: number;
}

// ============================================================
// Constants
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// YouTube API
// ============================================================

async function fetchChannelVideos(
  channelId: string,
  apiKey: string,
  publishedAfter?: string
): Promise<YouTubeVideoItem[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    type: 'video',
    order: 'date',
    maxResults: '10',
    key: apiKey,
  });

  if (publishedAfter) {
    params.append('publishedAfter', publishedAfter);
  }

  const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
  
  console.log(`[YouTube] Fetching: ${channelId}`);
  
  const response = await fetch(url);
  const data: YouTubeSearchResponse = await response.json();

  if (data.error) {
    throw new Error(`YouTube API Error: ${data.error.message}`);
  }

  return data.items || [];
}

// ============================================================
// Request Parsing
// ============================================================

/**
 * 요청 본문에서 채널 ID 필터를 파싱
 */
async function parseChannelFilter(req: Request): Promise<string | null> {
  try {
    const body = await req.json();
    return body.channel_id || null;
  } catch {
    // body가 없으면 모든 활성 채널 체크
    return null;
  }
}

// ============================================================
// Channel Fetching
// ============================================================

/**
 * 활성 채널 목록 조회
 */
async function fetchActiveChannels(
  supabase: SupabaseClient,
  channelIdFilter: string | null
): Promise<Channel[]> {
  let query = supabase
    .from('channels')
    .select('*')
    .eq('is_active', true);

  if (channelIdFilter) {
    query = query.eq('id', channelIdFilter);
  }

  const { data: channels, error } = await query;

  if (error) {
    throw new Error(`Channels fetch error: ${error.message}`);
  }

  return (channels || []) as Channel[];
}

// ============================================================
// Video Processing
// ============================================================

/**
 * 비디오 목록을 DB에 삽입/업데이트
 */
async function insertVideos(
  supabase: SupabaseClient,
  videos: YouTubeVideoItem[],
  channel: Channel
): Promise<number> {
  let newCount = 0;

  for (const video of videos) {
    const { data: insertData, error: insertError } = await supabase
      .from('videos')
      .upsert({
        video_id: video.id.videoId,
        title: video.snippet.title,
        description: video.snippet.description?.slice(0, 1000),
        thumbnail_url: video.snippet.thumbnails.high?.url ||
                     video.snippet.thumbnails.medium?.url ||
                     video.snippet.thumbnails.default?.url,
        published_at: video.snippet.publishedAt,
        channel_id: channel.id,
        status: channel.auto_execute ? 'queued' : 'pending',
        queued_at: channel.auto_execute ? new Date().toISOString() : null,
        discovered_at: new Date().toISOString(),
      }, {
        onConflict: 'video_id',
        ignoreDuplicates: false,
      })
      .select();

    if (!insertError && insertData && insertData.length > 0) {
      newCount++;
    }
  }

  return newCount;
}

/**
 * 채널의 마지막 체크 시간 업데이트
 */
async function updateChannelTimestamp(
  supabase: SupabaseClient,
  channelId: string
): Promise<void> {
  const { error } = await supabase
    .from('channels')
    .update({
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', channelId);

  if (error) {
    console.error(`[YouTube] Failed to update channel ${channelId}: ${error.message}`);
  }
}

// ============================================================
// Logging
// ============================================================

/**
 * 채널 체크 결과 로그 기록 (성공)
 */
async function logChannelCheckSuccess(
  supabase: SupabaseClient,
  channelId: string,
  videosFound: number,
  newVideos: number
): Promise<void> {
  const { error } = await supabase.from('channel_check_logs').insert({
    channel_id: channelId,
    videos_found: videosFound,
    new_videos: newVideos,
    api_quota_used: 1,
    success: true,
  });

  if (error) {
    console.error(`[YouTube] Failed to log check for channel ${channelId}: ${error.message}`);
  }
}

/**
 * 채널 체크 결과 로그 기록 (실패)
 */
async function logChannelCheckError(
  supabase: SupabaseClient,
  channelId: string,
  errorMessage: string
): Promise<void> {
  await supabase.from('channel_check_logs').insert({
    channel_id: channelId,
    videos_found: 0,
    new_videos: 0,
    api_quota_used: 1,
    success: false,
    error_message: errorMessage,
  });
}

// ============================================================
// Channel Processing
// ============================================================

/**
 * 개별 채널 처리
 */
async function processChannel(
  supabase: SupabaseClient,
  channel: Channel,
  apiKey: string
): Promise<ChannelProcessResult> {
  // publishedAfter 계산 (마지막 체크 시간 또는 24시간 전)
  const publishedAfter = channel.last_checked_at
    ? new Date(channel.last_checked_at).toISOString()
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // YouTube에서 비디오 조회
  const videos = await fetchChannelVideos(
    channel.channel_id,
    apiKey,
    publishedAfter
  );

  console.log(`[YouTube] ${channel.channel_name}: ${videos.length} videos found`);

  // 비디오 삽입
  const newCount = await insertVideos(supabase, videos, channel);

  // 채널 타임스탬프 업데이트
  await updateChannelTimestamp(supabase, channel.id);

  // 성공 로그 기록
  await logChannelCheckSuccess(supabase, channel.id, videos.length, newCount);

  return { newCount, videosFound: videos.length };
}

/**
 * 모든 채널 처리
 */
async function processChannels(
  supabase: SupabaseClient,
  channels: Channel[],
  apiKey: string
): Promise<ProcessResult> {
  const results: ProcessResult = {
    checked: 0,
    newVideos: 0,
    errors: [],
  };

  for (const channel of channels) {
    try {
      const { newCount } = await processChannel(supabase, channel, apiKey);
      results.newVideos += newCount;
      results.checked++;
    } catch (err) {
      const errorMsg = `${channel.channel_name}: ${err instanceof Error ? err.message : String(err)}`;
      results.errors.push(errorMsg);
      console.error(`[YouTube] Error: ${errorMsg}`);

      // 에러 로그 기록
      await logChannelCheckError(supabase, channel.id, errorMsg);
    }
  }

  return results;
}

// ============================================================
// Main Handler
// ============================================================

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // 환경 변수 검증
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

    if (!youtubeApiKey) {
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    // Supabase 클라이언트 초기화
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 요청 파싱
    const channelIdFilter = await parseChannelFilter(req);

    // 채널 조회
    const channels = await fetchActiveChannels(supabase, channelIdFilter);

    if (channels.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active channels to check', checked: 0 }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[YouTube] Checking ${channels.length} channels`);

    // 채널 처리
    const results = await processChannels(supabase, channels, youtubeApiKey);

    // 결과 응답
    console.log(`[YouTube] Done: ${results.checked} checked, ${results.newVideos} new videos`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error('[YouTube] Fatal error:', err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});
