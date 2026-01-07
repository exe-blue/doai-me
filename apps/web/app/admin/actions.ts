'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Supabase Admin Client (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// Auth Check
// ============================================

export async function checkAdminAuth() {
  const cookieStore = cookies();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { authorized: false, role: null };
  
  const { data: adminUser } = await supabaseAdmin
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  return {
    authorized: !!adminUser,
    role: adminUser?.role || null,
    userId: user.id,
  };
}

// ============================================
// Dashboard Stats
// ============================================

export async function getDashboardStats() {
  const [nodesResult, devicesResult, activitiesResult, wormholesResult] = await Promise.all([
    // 노드 상태 집계
    supabaseAdmin
      .from('nodes')
      .select('status_v2'),
    
    // 디바이스 상태 집계
    supabaseAdmin
      .from('devices')
      .select('status'),
    
    // 최근 1시간 활동 수
    supabaseAdmin
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()),
    
    // 오늘 웜홀 수
    supabaseAdmin
      .from('wormhole_events')
      .select('id', { count: 'exact', head: true })
      .gte('detected_at', new Date().toISOString().split('T')[0]),
  ]);

  const nodeStats = {
    active: 0,
    in_umbra: 0,
    offline: 0,
    error: 0,
  };
  
  nodesResult.data?.forEach((n: { status_v2: string }) => {
    const status = n.status_v2 as keyof typeof nodeStats;
    if (status in nodeStats) nodeStats[status]++;
  });

  const deviceStats = {
    online: 0,
    busy: 0,
    offline: 0,
    error: 0,
  };
  
  devicesResult.data?.forEach((d: { status: string }) => {
    const status = d.status as keyof typeof deviceStats;
    if (status in deviceStats) deviceStats[status]++;
  });

  return {
    nodes: nodeStats,
    devices: deviceStats,
    activitiesLastHour: activitiesResult.count || 0,
    wormholesToday: wormholesResult.count || 0,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================
// Top Activity/Economy
// ============================================

export async function getTopAgentsToday() {
  const today = new Date().toISOString().split('T')[0];
  
  const [activityResult, economyResult] = await Promise.all([
    // Top Activity
    supabaseAdmin.rpc('get_top_activity_agents', { p_date: today, p_limit: 5 }),
    
    // Top Economy
    supabaseAdmin.rpc('get_top_economy_agents', { p_date: today, p_limit: 5 }),
  ]);

  return {
    topActivity: activityResult.data || [],
    topEconomy: economyResult.data || [],
  };
}

// ============================================
// Devices
// ============================================

export async function getDevicesList(nodeId?: string, status?: string) {
  let query = supabaseAdmin
    .from('devices')
    .select(`
      *,
      nodes(node_id, name, status_v2)
    `)
    .order('last_seen', { ascending: false })
    .limit(100);
  
  if (nodeId) query = query.eq('node_id', nodeId);
  if (status) query = query.eq('status', status);
  
  const { data, error } = await query;
  
  if (error) throw new Error(error.message);
  return data || [];
}

export async function retryDevice(deviceId: string) {
  // TODO: Gateway에 재시도 명령 전송
  // 현재는 상태만 리셋
  const { error } = await supabaseAdmin
    .from('devices')
    .update({
      status: 'online',
      consecutive_errors: 0,
      last_error_code: null,
      last_error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('device_id', deviceId);
  
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/devices');
  return { success: true };
}

// ============================================
// Media Channels
// ============================================

export async function getChannels() {
  const { data, error } = await supabaseAdmin
    .from('media_channels')
    .select('*')
    .order('priority', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createChannel(formData: FormData) {
  const rawChannelCode = formData.get('channel_code') as string | null;
  const rawTitle = formData.get('title') as string | null;
  const rawPriority = formData.get('priority') as string | null;

  // Validation: channel_code
  const channelCode = rawChannelCode?.trim();
  if (!channelCode || channelCode.length === 0) {
    throw new Error('channel_code is required and cannot be empty');
  }
  // 허용 문자: 영숫자, 하이픈, 언더스코어만
  if (!/^[a-zA-Z0-9_-]+$/.test(channelCode)) {
    throw new Error('channel_code can only contain alphanumeric characters, hyphens, and underscores');
  }

  // Validation: title
  const title = rawTitle?.trim();
  if (!title || title.length === 0) {
    throw new Error('title is required and cannot be empty');
  }

  // Validation: priority (1-10 범위로 클램핑)
  let priority = parseInt(rawPriority || '5', 10);
  if (isNaN(priority)) priority = 5;
  priority = Math.max(1, Math.min(10, priority));

  const { error } = await supabaseAdmin
    .from('media_channels')
    .insert({
      channel_code: channelCode,
      title,
      priority,
    });
  
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/content');
  return { success: true };
}

export async function getChannelVideos(channelId: string) {
  const { data, error } = await supabaseAdmin
    .from('media_videos')
    .select('*')
    .eq('channel_id', channelId)
    .order('published_at', { ascending: false })
    .limit(20);
  
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================
// Threat Contents
// ============================================

export async function getThreatContents() {
  const { data, error } = await supabaseAdmin
    .from('threat_contents')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createThreatContent(formData: FormData) {
  const auth = await checkAdminAuth();
  if (!auth.authorized || auth.role === 'viewer') {
    throw new Error('Unauthorized');
  }

  const rawTitle = formData.get('title') as string | null;
  const rawDescription = formData.get('description') as string | null;
  const rawThreatType = formData.get('threat_type') as string | null;
  const rawSeverity = formData.get('severity') as string | null;

  // Validation: title
  const title = rawTitle?.trim();
  if (!title || title.length === 0) {
    throw new Error('title is required and cannot be empty');
  }

  // Validation: description
  const description = rawDescription?.trim();
  if (!description || description.length === 0) {
    throw new Error('description is required and cannot be empty');
  }

  // Validation: threat_type
  const threatType = rawThreatType?.trim();
  if (!threatType || threatType.length === 0) {
    throw new Error('threat_type is required and cannot be empty');
  }

  // Validation: severity (1-10 범위 검증 및 정규화)
  let severity = parseInt(rawSeverity || '5', 10);
  if (isNaN(severity)) severity = 5;
  severity = Math.max(1, Math.min(10, severity));

  const { error } = await supabaseAdmin
    .from('threat_contents')
    .insert({
      title,
      description,
      threat_type: threatType,
      severity,
      created_by: auth.userId,
    });
  
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/content');
  return { success: true };
}

// ============================================
// Economy Contents
// ============================================

export async function getEconomyContents(status?: string) {
  let query = supabaseAdmin
    .from('economy_contents')
    .select('*')
    .order('open_at', { ascending: false });
  
  if (status) query = query.eq('status', status);
  
  const { data, error } = await query;
  
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createEconomyContent(formData: FormData) {
  const auth = await checkAdminAuth();
  if (!auth.authorized || auth.role === 'viewer') {
    throw new Error('Unauthorized');
  }

  const rawTitle = formData.get('title') as string | null;
  const openAt = formData.get('open_at') as string | null;
  const totalReward = parseFloat(formData.get('total_reward') as string) || 100;
  const rawMaxParticipants = formData.get('max_participants') as string | null;
  const maxParticipants = rawMaxParticipants ? parseInt(rawMaxParticipants, 10) : null;

  // Validation: title
  const title = rawTitle?.trim();
  if (!title || title.length === 0) {
    throw new Error('title is required and cannot be empty');
  }

  // Validation: open_at - 유효한 날짜인지 확인
  let openAtIso: string | null = null;
  if (openAt) {
    const parsedDate = new Date(openAt);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('open_at is not a valid date format');
    }
    openAtIso = parsedDate.toISOString();
  } else {
    throw new Error('open_at is required');
  }

  const { error } = await supabaseAdmin
    .from('economy_contents')
    .insert({
      title,
      open_at: openAtIso,
      total_reward: totalReward,
      max_participants: maxParticipants,
      created_by: auth.userId,
    });
  
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/content');
  return { success: true };
}

export async function getEconomyParticipation(contentId: string) {
  const { data, error } = await supabaseAdmin
    .from('economy_participation')
    .select('*')
    .eq('economy_content_id', contentId)
    .order('rank', { ascending: true });
  
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================
// Activity Logs
// ============================================

export async function getRecentActivities(limit: number = 50) {
  const { data, error } = await supabaseAdmin
    .from('activity_logs')
    .select(`
      *,
      devices(device_id, model),
      nodes(node_id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw new Error(error.message);
  return data || [];
}


