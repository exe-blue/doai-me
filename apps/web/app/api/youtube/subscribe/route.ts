/**
 * YouTube Channel Subscription API
 * 
 * Supabase를 사용한 채널 구독 관리
 * 
 * GET /api/youtube/subscribe - 구독 목록 조회
 * POST /api/youtube/subscribe - 채널 구독
 * PUT /api/youtube/subscribe - 구독 설정 수정
 * DELETE /api/youtube/subscribe?channelId=xxx - 채널 구독 해제
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 (서비스 역할)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase 사용 여부
const useSupabase = supabaseUrl && supabaseServiceKey;

// 폴백: 메모리 저장소 (Supabase 미설정 시)
interface Subscription {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_handle?: string;
  thumbnail_url?: string;
  uploads_playlist_id?: string;
  subscriber_count?: number;
  video_count?: number;
  auto_register: boolean;
  target_views_default: number;
  priority: number;
  last_video_id?: string;
  last_checked_at?: string;
  subscribed_at: string;
  is_active: boolean;
}

const memorySubscriptions: Map<string, Subscription> = new Map();

// Supabase 클라이언트 생성
function getSupabaseClient() {
  if (!useSupabase) return null;
  return createClient(supabaseUrl!, supabaseServiceKey!);
}

// ============================================
// GET - 구독 목록 조회
// ============================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  try {
    if (useSupabase) {
      const supabase = getSupabaseClient()!;
      
      let query = supabase
        .from('youtube_subscriptions')
        .select('*')
        .order('priority', { ascending: false })
        .order('subscribed_at', { ascending: false });
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({
          success: false,
          error: 'DB 조회 오류',
          details: error.message,
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0,
        storage: 'supabase',
      });
    } else {
      // 메모리 폴백
      const subscriptions = Array.from(memorySubscriptions.values())
        .filter(sub => !activeOnly || sub.is_active)
        .sort((a, b) => b.priority - a.priority);
      
      return NextResponse.json({
        success: true,
        data: subscriptions,
        count: subscriptions.length,
        storage: 'memory',
        warning: 'Supabase 미설정 - 서버 재시작 시 데이터 손실',
      });
    }
  } catch (error) {
    console.error('Subscribe GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ============================================
// POST - 채널 구독
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      channelId,
      channelTitle,
      channelHandle,
      thumbnail,
      uploadsPlaylistId,
      subscriberCount,
      videoCount,
      autoRegister = true,
      targetViewsDefault = 50,
      priority = 0,
    } = body;

    if (!channelId) {
      return NextResponse.json({
        success: false,
        error: 'channelId가 필요합니다',
      }, { status: 400 });
    }

    if (useSupabase) {
      const supabase = getSupabaseClient()!;
      
      const { data, error } = await supabase
        .from('youtube_subscriptions')
        .upsert({
          channel_id: channelId,
          channel_title: channelTitle || 'Unknown Channel',
          channel_handle: channelHandle,
          thumbnail_url: thumbnail,
          uploads_playlist_id: uploadsPlaylistId,
          subscriber_count: subscriberCount,
          video_count: videoCount,
          auto_register: autoRegister,
          target_views_default: targetViewsDefault,
          priority,
          is_active: true,
        }, {
          onConflict: 'channel_id',
        })
        .select()
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
        return NextResponse.json({
          success: false,
          error: 'DB 저장 오류',
          details: error.message,
        }, { status: 500 });
      }
      
      console.log(`[YouTube] Channel subscribed (Supabase): ${channelTitle}`);
      
      return NextResponse.json({
        success: true,
        message: '채널 구독이 완료되었습니다',
        data,
        storage: 'supabase',
      });
    } else {
      // 메모리 폴백
      const subscription: Subscription = {
        id: `mem_${Date.now()}`,
        channel_id: channelId,
        channel_title: channelTitle || 'Unknown Channel',
        channel_handle: channelHandle,
        thumbnail_url: thumbnail,
        uploads_playlist_id: uploadsPlaylistId,
        subscriber_count: subscriberCount,
        video_count: videoCount,
        auto_register: autoRegister,
        target_views_default: targetViewsDefault,
        priority,
        subscribed_at: new Date().toISOString(),
        is_active: true,
      };
      
      memorySubscriptions.set(channelId, subscription);
      
      console.log(`[YouTube] Channel subscribed (Memory): ${channelTitle}`);
      
      return NextResponse.json({
        success: true,
        message: '채널 구독이 완료되었습니다',
        data: subscription,
        storage: 'memory',
        warning: 'Supabase 미설정 - 서버 재시작 시 데이터 손실',
      });
    }
  } catch (error) {
    console.error('Subscribe POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ============================================
// PUT - 구독 설정 수정
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, ...updates } = body;

    if (!channelId) {
      return NextResponse.json({
        success: false,
        error: 'channelId가 필요합니다',
      }, { status: 400 });
    }

    // 필드명 매핑 (camelCase -> snake_case)
    const fieldMapping: Record<string, string> = {
      autoRegister: 'auto_register',
      targetViewsDefault: 'target_views_default',
      isActive: 'is_active',
    };

    const dbUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = fieldMapping[key] || key;
      dbUpdates[dbKey] = value;
    }

    if (useSupabase) {
      const supabase = getSupabaseClient()!;
      
      const { data, error } = await supabase
        .from('youtube_subscriptions')
        .update(dbUpdates)
        .eq('channel_id', channelId)
        .select()
        .single();
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: 'DB 수정 오류',
          details: error.message,
        }, { status: 500 });
      }
      
      if (!data) {
        return NextResponse.json({
          success: false,
          error: '구독 중인 채널이 아닙니다',
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: '구독 설정이 수정되었습니다',
        data,
      });
    } else {
      // 메모리 폴백
      const subscription = memorySubscriptions.get(channelId);
      
      if (!subscription) {
        return NextResponse.json({
          success: false,
          error: '구독 중인 채널이 아닙니다',
        }, { status: 404 });
      }
      
      Object.assign(subscription, updates);
      memorySubscriptions.set(channelId, subscription);
      
      return NextResponse.json({
        success: true,
        message: '구독 설정이 수정되었습니다',
        data: subscription,
        storage: 'memory',
      });
    }
  } catch (error) {
    console.error('Subscribe PUT error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ============================================
// DELETE - 채널 구독 해제
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');
    const permanent = searchParams.get('permanent') === 'true';

    if (!channelId) {
      return NextResponse.json({
        success: false,
        error: 'channelId가 필요합니다',
      }, { status: 400 });
    }

    if (useSupabase) {
      const supabase = getSupabaseClient()!;
      
      if (permanent) {
        // 완전 삭제
        const { error } = await supabase
          .from('youtube_subscriptions')
          .delete()
          .eq('channel_id', channelId);
        
        if (error) {
          return NextResponse.json({
            success: false,
            error: 'DB 삭제 오류',
            details: error.message,
          }, { status: 500 });
        }
      } else {
        // 소프트 삭제 (비활성화)
        const { error } = await supabase
          .from('youtube_subscriptions')
          .update({ is_active: false })
          .eq('channel_id', channelId);
        
        if (error) {
          return NextResponse.json({
            success: false,
            error: 'DB 수정 오류',
            details: error.message,
          }, { status: 500 });
        }
      }
      
      console.log(`[YouTube] Channel unsubscribed: ${channelId}`);
      
      return NextResponse.json({
        success: true,
        message: permanent ? '채널 구독이 완전히 삭제되었습니다' : '채널 구독이 해제되었습니다',
      });
    } else {
      // 메모리 폴백
      if (!memorySubscriptions.has(channelId)) {
        return NextResponse.json({
          success: false,
          error: '구독 중인 채널이 아닙니다',
        }, { status: 404 });
      }
      
      if (permanent) {
        memorySubscriptions.delete(channelId);
      } else {
        const subscription = memorySubscriptions.get(channelId)!;
        subscription.is_active = false;
      }
      
      return NextResponse.json({
        success: true,
        message: '채널 구독이 해제되었습니다',
        storage: 'memory',
      });
    }
  } catch (error) {
    console.error('Subscribe DELETE error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
