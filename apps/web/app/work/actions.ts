// apps/web/app/work/actions.ts
// Work 페이지 서버 액션 - 영상 등록, 대기열, 이력 관리

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
async function checkWorkAuth() {
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
// 영상 정보 조회 (YouTube URL 파싱)
// ============================================================

interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
}

export async function fetchVideoInfo(url: string): Promise<{
  success: boolean;
  data?: VideoInfo;
  error?: string;
}> {
  const auth = await checkWorkAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  // YouTube URL에서 video ID 추출
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  let videoId: string | null = null;
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      videoId = match[1];
      break;
    }
  }

  if (!videoId) {
    return { success: false, error: 'Invalid YouTube URL' };
  }

  try {
    // Gateway API를 통해 YouTube 영상 정보 조회
    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3001';
    const response = await fetch(
      `${gatewayUrl}/api/youtube/parse?url=${encodeURIComponent(url)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      // Gateway 연결 실패 시 기본 정보 반환
      return {
        success: true,
        data: {
          videoId,
          title: `Video - ${videoId}`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          duration: 'Unknown',
          channelTitle: 'Unknown Channel',
        },
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        videoId: data.videoId || videoId,
        title: data.title || `Video - ${videoId}`,
        thumbnail: data.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        duration: data.duration || 'Unknown',
        channelTitle: data.channelTitle || 'Unknown Channel',
      },
    };
  } catch {
    // 네트워크 오류 시 기본 정보 반환
    return {
      success: true,
      data: {
        videoId,
        title: `Video - ${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        duration: 'Unknown',
        channelTitle: 'Unknown Channel',
      },
    };
  }
}

// ============================================================
// 영상 등록
// ============================================================

interface RegisterVideoInput {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle?: string;
  duration?: string;
}

export async function registerVideo(input: RegisterVideoInput): Promise<{
  success: boolean;
  data?: { id: string };
  error?: string;
}> {
  const auth = await checkWorkAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    // video_queue에 영상 등록
    const { data, error } = await supabase
      .from('video_queue')
      .insert({
        youtube_video_id: input.videoId,
        title: input.title,
        thumbnail_url: input.thumbnail,
        channel_title: input.channelTitle,
        duration: input.duration,
        source: 'direct', // 직접 등록
        status: 'ready',
        target_device_percent: 1.0, // 100% 디바이스
        search_method: 'title', // 제목으로 검색
        registered_by: auth.user?.id,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to register video:', error);
      return { success: false, error: 'Failed to register video' };
    }

    // Gateway에 디스패치 트리거 (비동기)
    triggerDispatch(data.id, {
      videoId: input.videoId,
      title: input.title,
      thumbnail: input.thumbnail,
      channelTitle: input.channelTitle,
      duration: input.duration,
    }).catch(console.error);

    revalidatePath('/work');
    return { success: true, data: { id: data.id } };
  } catch (err) {
    console.error('Register video error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

// 디바이스 디스패치 트리거 (Gateway API 호출)
async function triggerDispatch(
  queueItemId: string,
  videoInfo: { videoId: string; title: string; thumbnail?: string; channelTitle?: string; duration?: string }
) {
  const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3100';
  try {
    const response = await fetch(`${gatewayUrl}/api/v1/video/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: videoInfo.videoId,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        channelTitle: videoInfo.channelTitle,
        duration: videoInfo.duration,
        searchMethod: 'title',
        targetDevicePercent: 1.0,
      }),
    });

    if (!response.ok) {
      console.error('Gateway dispatch failed:', await response.text());
    } else {
      const result = await response.json();
      console.log('Gateway dispatch success:', result);
    }
  } catch (err) {
    console.error('Failed to trigger dispatch:', err);
  }
}

// ============================================================
// 대기열 조회
// ============================================================

interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  status: 'ready' | 'processing' | 'completed' | 'failed';
  targetDevices: number;
  completedDevices: number;
  createdAt: string;
  channelTitle?: string;
  source?: 'direct' | 'channel';
}

export async function getVideoQueue(): Promise<{
  success: boolean;
  data?: QueueItem[];
  error?: string;
}> {
  const auth = await checkWorkAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    // 대기 중 또는 처리 중인 영상 조회
    const { data: queueItems, error } = await supabase
      .from('video_queue')
      .select(`
        id,
        youtube_video_id,
        title,
        thumbnail_url,
        channel_title,
        source,
        status,
        target_device_percent,
        created_at
      `)
      .in('status', ['ready', 'processing'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch queue:', error);
      return { success: false, error: 'Failed to fetch queue' };
    }

    // 각 영상별 완료 디바이스 수 조회
    const queueWithProgress = await Promise.all(
      (queueItems || []).map(async (item) => {
        const { count: completedCount } = await supabase
          .from('execution_logs')
          .select('*', { count: 'exact', head: true })
          .eq('queue_item_id', item.id)
          .eq('status', 'success');

        // 전체 디바이스 수 추정 (target_device_percent 기반)
        const { count: totalDevices } = await supabase
          .from('devices')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'online');

        const targetDevices = Math.ceil(
          (totalDevices || 150) * (item.target_device_percent || 1.0)
        );

        return {
          id: item.id,
          videoId: item.youtube_video_id,
          title: item.title || `Video - ${item.youtube_video_id}`,
          thumbnail: item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_video_id}/mqdefault.jpg`,
          status: item.status as QueueItem['status'],
          targetDevices,
          completedDevices: completedCount || 0,
          createdAt: item.created_at,
          channelTitle: item.channel_title,
          source: item.source as 'direct' | 'channel' | undefined,
        };
      })
    );

    return { success: true, data: queueWithProgress };
  } catch (err) {
    console.error('Get queue error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================
// Work History 조회
// ============================================================

interface HistoryItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  status: 'completed' | 'partial' | 'failed';
  totalDevices: number;
  successCount: number;
  failCount: number;
  completedAt: string;
}

interface GetHistoryOptions {
  page?: number;
  limit?: number;
  statusFilter?: 'completed' | 'partial' | 'failed';
  sourceFilter?: 'direct' | 'channel';
}

export async function getWorkHistory(options: GetHistoryOptions = {}): Promise<{
  success: boolean;
  data?: {
    items: HistoryItem[];
    totalPages: number;
    currentPage: number;
  };
  error?: string;
}> {
  const auth = await checkWorkAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();
  const page = options.page || 1;
  const limit = options.limit || 10;
  const offset = (page - 1) * limit;

  try {
    // 기본 쿼리 구성
    let query = supabase
      .from('video_queue')
      .select(`
        id,
        youtube_video_id,
        title,
        thumbnail_url,
        channel_title,
        source,
        status,
        completed_at,
        created_at
      `, { count: 'exact' })
      .in('status', ['completed', 'failed']);

    // 소스 필터 적용
    if (options.sourceFilter) {
      query = query.eq('source', options.sourceFilter);
    }

    // 정렬 및 페이지네이션
    const { data: historyItems, error, count } = await query
      .order('completed_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch history:', error);
      return { success: false, error: 'Failed to fetch history' };
    }

    // 각 영상별 실행 통계 조회
    const historyWithStats = await Promise.all(
      (historyItems || []).map(async (item) => {
        const { data: logs } = await supabase
          .from('execution_logs')
          .select('status')
          .eq('queue_item_id', item.id);

        const successCount = logs?.filter((l) => l.status === 'success').length || 0;
        const failCount = logs?.filter((l) => l.status !== 'success').length || 0;
        const totalDevices = successCount + failCount;

        // 상태 결정
        let status: HistoryItem['status'] = 'completed';
        if (totalDevices === 0 || failCount === totalDevices) {
          status = 'failed';
        } else if (failCount > 0 && successCount < totalDevices * 0.9) {
          status = 'partial';
        }

        return {
          id: item.id,
          videoId: item.youtube_video_id,
          title: item.title || `Video - ${item.youtube_video_id}`,
          thumbnail: item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_video_id}/mqdefault.jpg`,
          status,
          totalDevices,
          successCount,
          failCount,
          completedAt: item.completed_at || item.created_at,
        };
      })
    );

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      success: true,
      data: {
        items: historyWithStats,
        totalPages,
        currentPage: page,
      },
    };
  } catch (err) {
    console.error('Get history error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================
// 영상 취소
// ============================================================

export async function cancelVideo(queueItemId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await checkWorkAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    // ready 상태인 영상만 취소 가능
    const { error } = await supabase
      .from('video_queue')
      .update({ status: 'cancelled' })
      .eq('id', queueItemId)
      .eq('status', 'ready');

    if (error) {
      console.error('Failed to cancel video:', error);
      return { success: false, error: 'Failed to cancel video' };
    }

    revalidatePath('/work');
    return { success: true };
  } catch (err) {
    console.error('Cancel video error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================
// 실시간 로그 조회
// ============================================================

interface DeviceLog {
  deviceId: string;
  deviceName: string;
  status: 'waiting' | 'searching' | 'ad_skip' | 'watching' | 'liking' | 'commenting' | 'completed' | 'failed';
  progress?: number;
  watchTime?: number;
  message?: string;
  updatedAt: string;
}

export async function getRealtimeLogs(queueItemId: string): Promise<{
  success: boolean;
  data?: DeviceLog[];
  error?: string;
}> {
  const auth = await checkWorkAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    // 최근 실행 로그 조회 (최근 20개)
    const { data: logs, error } = await supabase
      .from('execution_logs')
      .select(`
        id,
        device_id,
        status,
        action_type,
        watch_time,
        progress,
        message,
        created_at,
        devices (
          name,
          device_name
        )
      `)
      .eq('queue_item_id', queueItemId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch logs:', error);
      return { success: false, error: 'Failed to fetch logs' };
    }

    // 디바이스별 최신 로그만 추출
    const deviceMap = new Map<string, DeviceLog>();

    for (const log of logs || []) {
      if (deviceMap.has(log.device_id)) continue;

      // action_type을 DeviceLog status로 매핑
      let deviceStatus: DeviceLog['status'] = 'waiting';
      switch (log.action_type) {
        case 'search':
          deviceStatus = 'searching';
          break;
        case 'ad_skip':
          deviceStatus = 'ad_skip';
          break;
        case 'watch':
        case 'watching':
          deviceStatus = 'watching';
          break;
        case 'like':
          deviceStatus = 'liking';
          break;
        case 'comment':
          deviceStatus = 'commenting';
          break;
        default:
          deviceStatus = log.status === 'success' ? 'completed' : log.status === 'failed' ? 'failed' : 'waiting';
      }

      const deviceData = log.devices as { name?: string; device_name?: string } | null;
      deviceMap.set(log.device_id, {
        deviceId: log.device_id,
        deviceName: deviceData?.device_name || deviceData?.name || `Device ${log.device_id.slice(0, 8)}`,
        status: deviceStatus,
        progress: log.progress,
        watchTime: log.watch_time,
        message: log.message,
        updatedAt: log.created_at,
      });
    }

    return { success: true, data: Array.from(deviceMap.values()) };
  } catch (err) {
    console.error('Get realtime logs error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================
// 영상 재시도
// ============================================================

export async function retryVideo(queueItemId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await checkWorkAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    // failed 상태인 영상만 재시도 가능
    const { error } = await supabase
      .from('video_queue')
      .update({
        status: 'ready',
        completed_at: null,
        retry_count: supabase.rpc('increment_retry_count'),
      })
      .eq('id', queueItemId)
      .eq('status', 'failed');

    if (error) {
      console.error('Failed to retry video:', error);
      return { success: false, error: 'Failed to retry video' };
    }

    // 디스패치 트리거
    triggerDispatch(queueItemId).catch(console.error);

    revalidatePath('/work');
    return { success: true };
  } catch (err) {
    console.error('Retry video error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================
// 스크린샷 조회
// ============================================================

interface Screenshot {
  id: string;
  deviceName: string;
  imageUrl: string;
  capturedAt: string;
}

export async function getScreenshots(queueItemId: string): Promise<{
  success: boolean;
  data?: Screenshot[];
  error?: string;
}> {
  const auth = await checkWorkAuth();
  if (!auth.authorized) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();

  try {
    // 해당 영상의 스크린샷 조회
    const { data: screenshots, error } = await supabase
      .from('execution_screenshots')
      .select(`
        id,
        device_id,
        image_url,
        captured_at,
        devices (
          name,
          device_name
        )
      `)
      .eq('queue_item_id', queueItemId)
      .order('captured_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch screenshots:', error);
      return { success: false, error: 'Failed to fetch screenshots' };
    }

    const formattedScreenshots: Screenshot[] = (screenshots || []).map((s) => {
      const deviceData = s.devices as { name?: string; device_name?: string } | null;
      return {
        id: s.id,
        deviceName: deviceData?.device_name || deviceData?.name || `Device ${s.device_id.slice(0, 8)}`,
        imageUrl: s.image_url,
        capturedAt: s.captured_at,
      };
    });

    return { success: true, data: formattedScreenshots };
  } catch (err) {
    console.error('Get screenshots error:', err);
    return { success: false, error: 'Internal server error' };
  }
}
