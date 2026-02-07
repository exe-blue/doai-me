// apps/web/app/channel/actions.ts
// Channel 페이지 서버 액션 - 채널 관리, 영상 동기화, AI 활동

'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';

// Supabase 클라이언트 생성
async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component에서 호출 시 무시
          }
        },
      },
    }
  );
}

// 인증 및 권한 체크
async function checkChannelAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { authorized: false, error: 'Not authenticated', user: null };
  }

  // 회원 등급 확인
  const { data: membership } = await supabase
    .from('user_memberships')
    .select('tier')
    .eq('user_id', user.id)
    .single();

  // admin 확인
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single();

  // member 또는 admin만 접근 가능
  const isMember = membership?.tier === 'member';
  const isAdmin = adminUser?.role === 'admin';

  if (!isMember && !isAdmin) {
    return { authorized: false, error: 'Insufficient permissions', user };
  }

  return { authorized: true, error: null, user, isAdmin };
}

// ============================================================
// 채널 영상 목록 조회
// ============================================================

interface ChannelVideo {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
  viewCount?: number;
  isRequired: boolean;
  watchedCount: number;
  status: 'pending' | 'queued' | 'completed';
}

interface GetChannelVideosOptions {
  channelId?: string;
  isRequired?: boolean;
  limit?: number;
}

export async function getChannelVideos(options: GetChannelVideosOptions = {}): Promise<{
  success: boolean;
  data?: {
    required: ChannelVideo[];
    free: ChannelVideo[];
  };
  error?: string;
}> {
  const auth = await checkChannelAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    // 채널 영상 조회 쿼리 구성
    let query = supabase
      .from('channel_videos')
      .select(`
        id,
        youtube_video_id,
        title,
        thumbnail_url,
        channel_id,
        channel_title,
        published_at,
        duration,
        view_count,
        is_required,
        watched_count,
        status
      `)
      .order('published_at', { ascending: false });

    if (options.channelId) {
      query = query.eq('channel_id', options.channelId);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data: videos, error } = await query;

    if (error) {
      console.error('Failed to fetch channel videos:', error);
      return { success: false, error: 'Failed to fetch videos' };
    }

    // 필수/자유 영상 분류
    const required: ChannelVideo[] = [];
    const free: ChannelVideo[] = [];

    for (const video of videos || []) {
      const formattedVideo: ChannelVideo = {
        id: video.id,
        videoId: video.youtube_video_id,
        title: video.title,
        thumbnail: video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`,
        channelId: video.channel_id,
        channelTitle: video.channel_title,
        publishedAt: video.published_at,
        duration: video.duration,
        viewCount: video.view_count,
        isRequired: video.is_required || false,
        watchedCount: video.watched_count || 0,
        status: video.status || 'pending',
      };

      if (formattedVideo.isRequired) {
        required.push(formattedVideo);
      } else {
        free.push(formattedVideo);
      }
    }

    return { success: true, data: { required, free } };
  } catch (err) {
    console.error('Get channel videos error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================
// 영상 필수 지정/해제
// ============================================================

export async function setVideoRequired(
  videoId: string,
  isRequired: boolean
): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await checkChannelAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('channel_videos')
      .update({ is_required: isRequired })
      .eq('id', videoId);

    if (error) {
      console.error('Failed to update video:', error);
      return { success: false, error: 'Failed to update video' };
    }

    revalidatePath('/channel');
    return { success: true };
  } catch (err) {
    console.error('Set video required error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================
// 채널 새 영상 동기화
// ============================================================

export async function syncChannelVideos(channelId?: string): Promise<{
  success: boolean;
  data?: { newVideos: number };
  error?: string;
}> {
  const auth = await checkChannelAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    // 구독 채널 조회
    let channelsQuery = supabase
      .from('subscribed_channels')
      .select('channel_id, uploads_playlist_id, channel_title')
      .eq('auto_register', true);

    if (channelId) {
      channelsQuery = channelsQuery.eq('channel_id', channelId);
    }

    const { data: channels, error: channelsError } = await channelsQuery;

    if (channelsError) {
      console.error('Failed to fetch channels:', channelsError);
      return { success: false, error: 'Failed to fetch channels' };
    }

    let totalNewVideos = 0;
    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3100';

    // 각 채널별로 새 영상 확인
    for (const channel of channels || []) {
      try {
        // Gateway API를 통해 YouTube 채널 영상 조회
        const response = await fetch(
          `${gatewayUrl}/api/youtube/channel/videos?channelId=${channel.channel_id}&limit=10`,
          { cache: 'no-store' }
        );

        if (!response.ok) continue;

        const data = await response.json();
        const videos = data.videos || [];

        // 기존 영상 ID 조회
        const { data: existingVideos } = await supabase
          .from('channel_videos')
          .select('youtube_video_id')
          .eq('channel_id', channel.channel_id);

        const existingIds = new Set((existingVideos || []).map((v) => v.youtube_video_id));

        // 새 영상 추가
        const newVideos = videos.filter((v: { videoId: string }) => !existingIds.has(v.videoId));

        if (newVideos.length > 0) {
          const videosToInsert = newVideos.map((v: {
            videoId: string;
            title: string;
            thumbnail: string;
            publishedAt: string;
            duration?: string;
            viewCount?: number;
          }) => ({
            youtube_video_id: v.videoId,
            title: v.title,
            thumbnail_url: v.thumbnail,
            channel_id: channel.channel_id,
            channel_title: channel.channel_title,
            published_at: v.publishedAt,
            duration: v.duration,
            view_count: v.viewCount,
            is_required: false,
            status: 'pending',
          }));

          const { error: insertError } = await supabase
            .from('channel_videos')
            .insert(videosToInsert);

          if (!insertError) {
            totalNewVideos += newVideos.length;

            // 자동 등록된 영상을 video_queue에 추가
            const queueItems = newVideos.map((v: { videoId: string; title: string; thumbnail: string; duration?: string }) => ({
              youtube_video_id: v.videoId,
              title: v.title,
              thumbnail_url: v.thumbnail,
              channel_title: channel.channel_title,
              duration: v.duration,
              source: 'channel',
              status: 'ready',
              target_device_percent: 1.0,
              search_method: 'title',
            }));

            await supabase.from('video_queue').insert(queueItems);
          }
        }
      } catch (err) {
        console.error(`Failed to sync channel ${channel.channel_id}:`, err);
      }
    }

    revalidatePath('/channel');
    return { success: true, data: { newVideos: totalNewVideos } };
  } catch (err) {
    console.error('Sync channel videos error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================
// 채널 통계 조회
// ============================================================

interface ChannelStats {
  totalChannels: number;
  totalVideos: number;
  requiredVideos: number;
  completedVideos: number;
  totalWatched: number;
  todayWatched: number;
}

export async function getChannelStats(): Promise<{
  success: boolean;
  data?: ChannelStats;
  error?: string;
}> {
  const auth = await checkChannelAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    // 채널 수
    const { count: totalChannels } = await supabase
      .from('subscribed_channels')
      .select('*', { count: 'exact', head: true });

    // 영상 통계
    const { data: videos } = await supabase
      .from('channel_videos')
      .select('is_required, status, watched_count');

    const totalVideos = videos?.length || 0;
    const requiredVideos = videos?.filter((v) => v.is_required).length || 0;
    const completedVideos = videos?.filter((v) => v.status === 'completed').length || 0;
    const totalWatched = videos?.reduce((sum, v) => sum + (v.watched_count || 0), 0) || 0;

    // 오늘 시청 수 (execution_logs에서)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayWatched } = await supabase
      .from('execution_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'success')
      .gte('created_at', today.toISOString());

    return {
      success: true,
      data: {
        totalChannels: totalChannels || 0,
        totalVideos,
        requiredVideos,
        completedVideos,
        totalWatched,
        todayWatched: todayWatched || 0,
      },
    };
  } catch (err) {
    console.error('Get channel stats error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================
// AI 실시간 활동 조회
// ============================================================

interface PersonaActivity {
  deviceId: string;
  deviceName: string;
  personaType: string;
  status: 'idle' | 'searching' | 'ad_skip' | 'watching' | 'liking' | 'commenting' | 'completed';
  currentVideo?: {
    title: string;
    thumbnail: string;
    channelTitle: string;
  };
  watchTime?: number;
  progress?: number;
  message?: string;
  updatedAt: string;
}

export async function getRealtimeActivity(): Promise<{
  success: boolean;
  data?: PersonaActivity[];
  error?: string;
}> {
  const auth = await checkChannelAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    // 최근 활동 로그 조회 (5분 이내)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: logs, error } = await supabase
      .from('execution_logs')
      .select(`
        id,
        device_id,
        action_type,
        status,
        watch_time,
        progress,
        message,
        created_at,
        devices (
          name,
          device_name,
          persona_type
        ),
        video_queue (
          title,
          thumbnail_url,
          channel_title
        )
      `)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch activity:', error);
      return { success: false, error: 'Failed to fetch activity' };
    }

    // 디바이스별 최신 활동만 추출
    const activityMap = new Map<string, PersonaActivity>();

    for (const log of logs || []) {
      if (activityMap.has(log.device_id)) continue;

      // action_type을 status로 매핑
      let activityStatus: PersonaActivity['status'] = 'idle';
      switch (log.action_type) {
        case 'search':
          activityStatus = 'searching';
          break;
        case 'ad_skip':
          activityStatus = 'ad_skip';
          break;
        case 'watch':
        case 'watching':
          activityStatus = 'watching';
          break;
        case 'like':
          activityStatus = 'liking';
          break;
        case 'comment':
          activityStatus = 'commenting';
          break;
        default:
          activityStatus = log.status === 'success' ? 'completed' : 'idle';
      }

      const deviceData = log.devices as { name?: string; device_name?: string; persona_type?: string } | null;
      const videoData = log.video_queue as { title?: string; thumbnail_url?: string; channel_title?: string } | null;

      activityMap.set(log.device_id, {
        deviceId: log.device_id,
        deviceName: deviceData?.device_name || deviceData?.name || `Device ${log.device_id.slice(0, 8)}`,
        personaType: deviceData?.persona_type || 'default',
        status: activityStatus,
        currentVideo: videoData ? {
          title: videoData.title || 'Unknown',
          thumbnail: videoData.thumbnail_url || '',
          channelTitle: videoData.channel_title || 'Unknown',
        } : undefined,
        watchTime: log.watch_time,
        progress: log.progress,
        message: log.message,
        updatedAt: log.created_at,
      });
    }

    return { success: true, data: Array.from(activityMap.values()) };
  } catch (err) {
    console.error('Get realtime activity error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================
// AI 활동 통계 조회
// ============================================================

interface ActivityStats {
  avgWatchTime: number;
  completionRate: number;
  adSkipRate: number;
  interactionRate: number;
  activeDevices: number;
  totalActions: number;
}

export async function getActivityStats(): Promise<{
  success: boolean;
  data?: ActivityStats;
  error?: string;
}> {
  const auth = await checkChannelAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    // 오늘의 로그 조회
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: logs } = await supabase
      .from('execution_logs')
      .select('device_id, action_type, status, watch_time')
      .gte('created_at', today.toISOString());

    if (!logs || logs.length === 0) {
      return {
        success: true,
        data: {
          avgWatchTime: 0,
          completionRate: 0,
          adSkipRate: 0,
          interactionRate: 0,
          activeDevices: 0,
          totalActions: 0,
        },
      };
    }

    // 통계 계산
    const deviceSet = new Set(logs.map((l) => l.device_id));
    const watchLogs = logs.filter((l) => l.action_type === 'watch' || l.action_type === 'watching');
    const completedLogs = logs.filter((l) => l.status === 'success');
    const adSkipLogs = logs.filter((l) => l.action_type === 'ad_skip');
    const interactionLogs = logs.filter((l) => l.action_type === 'like' || l.action_type === 'comment');

    const avgWatchTime = watchLogs.length > 0
      ? watchLogs.reduce((sum, l) => sum + (l.watch_time || 0), 0) / watchLogs.length
      : 0;

    const completionRate = logs.length > 0
      ? (completedLogs.length / logs.length) * 100
      : 0;

    const adSkipRate = watchLogs.length > 0
      ? (adSkipLogs.length / watchLogs.length) * 100
      : 0;

    const interactionRate = completedLogs.length > 0
      ? (interactionLogs.length / completedLogs.length) * 100
      : 0;

    return {
      success: true,
      data: {
        avgWatchTime: Math.round(avgWatchTime),
        completionRate: Math.round(completionRate),
        adSkipRate: Math.round(adSkipRate),
        interactionRate: Math.round(interactionRate),
        activeDevices: deviceSet.size,
        totalActions: logs.length,
      },
    };
  } catch (err) {
    console.error('Get activity stats error:', err);
    return { success: false, error: 'Internal server error' };
  }
}
