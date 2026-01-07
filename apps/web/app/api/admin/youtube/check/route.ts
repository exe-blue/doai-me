/**
 * YouTube Channel Check API
 * 
 * 수동으로 YouTube 채널 체크 트리거
 * POST /api/admin/youtube/check
 * 
 * @author Axon (Tech Lead)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Supabase Admin Client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// YouTube API Key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Admin 인증 확인 헬퍼
 */
async function checkAdminAuth(): Promise<{ authorized: boolean; userId?: string }> {
  const cookieStore = await cookies();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey || !supabaseUrl) {
    return { authorized: false };
  }
  
  const userSupabase = createClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });

  const { data: { user } } = await userSupabase.auth.getUser();
  if (!user) return { authorized: false };

  const { data: adminUser } = await supabaseAdmin
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return {
    authorized: !!adminUser,
    userId: user.id,
  };
}

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
  error?: { message: string };
}

/**
 * YouTube API에서 채널 영상 가져오기
 */
async function fetchChannelVideos(
  channelId: string,
  publishedAfter?: string
): Promise<YouTubeVideoItem[]> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY not configured');
  }

  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    type: 'video',
    order: 'date',
    maxResults: '10',
    key: YOUTUBE_API_KEY,
  });

  if (publishedAfter) {
    params.append('publishedAfter', publishedAfter);
  }

  const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
  
  const response = await fetch(url);
  const data: YouTubeSearchResponse = await response.json();

  if (data.error) {
    throw new Error(`YouTube API Error: ${data.error.message}`);
  }

  return data.items || [];
}

/**
 * POST: 채널 체크 실행
 */
export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { channel_id: filterChannelId } = body;

    // 체크할 채널 조회
    let query = supabaseAdmin
      .from('channels')
      .select('*')
      .eq('is_active', true);

    if (filterChannelId) {
      query = query.eq('id', filterChannelId);
    }

    const { data: channels, error: channelsError } = await query;

    if (channelsError) {
      return NextResponse.json(
        { error: `채널 조회 실패: ${channelsError.message}` },
        { status: 500 }
      );
    }

    if (!channels || channels.length === 0) {
      return NextResponse.json({
        success: true,
        message: '체크할 활성 채널이 없습니다',
        checked: 0,
        newVideos: 0,
      });
    }

    // 결과
    const results = {
      checked: 0,
      newVideos: 0,
      errors: [] as string[],
      details: [] as { channel: string; videos: number; new: number }[],
    };

    // 각 채널 체크
    for (const channel of channels) {
      try {
        // publishedAfter 계산 (마지막 체크 시간 또는 24시간 전)
        const publishedAfter = channel.last_checked_at
          ? new Date(channel.last_checked_at).toISOString()
          : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // YouTube API 호출
        const videos = await fetchChannelVideos(
          channel.channel_id,
          publishedAfter
        );

        // 새 영상 등록
        let newCount = 0;
        for (const video of videos) {
          const { error: insertError } = await supabaseAdmin
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
              ignoreDuplicates: true,
            });

          if (!insertError) {
            newCount++;
          }
        }

        results.newVideos += newCount;
        results.checked++;
        results.details.push({
          channel: channel.channel_name,
          videos: videos.length,
          new: newCount,
        });

        // 채널 last_checked_at 업데이트
        await supabaseAdmin
          .from('channels')
          .update({
            last_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', channel.id);

        // 체크 로그 기록
        await supabaseAdmin.from('channel_check_logs').insert({
          channel_id: channel.id,
          videos_found: videos.length,
          new_videos: newCount,
          api_quota_used: 1,
          success: true,
        });

      } catch (err) {
        const errorMsg = `${channel.channel_name}: ${err instanceof Error ? err.message : String(err)}`;
        results.errors.push(errorMsg);

        // 에러 로그 기록
        await supabaseAdmin.from('channel_check_logs').insert({
          channel_id: channel.id,
          videos_found: 0,
          new_videos: 0,
          api_quota_used: 1,
          success: false,
          error_message: errorMsg,
        });
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (err) {
    console.error('[YouTube Check] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET: 체크 상태 조회
 */
export async function GET() {
  try {
    // 인증 확인
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // 최근 체크 로그 조회
    const { data: logs, error } = await supabaseAdmin
      .from('channel_check_logs')
      .select('*, channels(channel_name)')
      .order('checked_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { error: `로그 조회 실패: ${error.message}` },
        { status: 500 }
      );
    }

    // 활성 채널 수
    const { count: activeChannels } = await supabaseAdmin
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 대기 중인 영상 수
    const { count: pendingVideos } = await supabaseAdmin
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'queued']);

    return NextResponse.json({
      activeChannels: activeChannels || 0,
      pendingVideos: pendingVideos || 0,
      recentLogs: logs || [],
      youtubeApiConfigured: !!YOUTUBE_API_KEY,
    });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

