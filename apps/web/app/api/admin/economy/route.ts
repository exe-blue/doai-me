import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/economy
// 경제 콘텐츠 목록 (Blind 모드)
export async function GET() {
  try {
    // Blind 모드 함수 사용 시도
    const { data, error } = await supabase.rpc('get_economy_contents_blind');

    if (error) {
      // 함수가 없으면 직접 조회
      if (error.code === '42883') {
        const now = new Date().toISOString();
        const { data: contents, error: contentsError } = await supabase
          .from('economy_contents')
          .select('*')
          .neq('status', 'cancelled')
          .order('open_at', { ascending: false });

        if (contentsError) throw contentsError;

        // Blind 모드 적용
        const blindContents = (contents || []).map((c: Record<string, unknown>) => ({
          ...c,
          is_open: new Date(c.open_at as string) <= new Date(now),
          video_url: new Date(c.open_at as string) <= new Date(now) ? c.video_url : null,
          video_id: new Date(c.open_at as string) <= new Date(now) ? c.video_id : null,
        }));

        return NextResponse.json(blindContents);
      }
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Economy API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch economy contents' },
      { status: 500 }
    );
  }
}

// POST /api/admin/economy
// 경제 콘텐츠 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, openAt, videoUrl, totalPool } = body;

    if (!title || !openAt) {
      return NextResponse.json(
        { error: 'title and openAt are required' },
        { status: 400 }
      );
    }

    // RPC 함수 사용 시도
    const { data, error } = await supabase.rpc('create_economy_content', {
      p_title: title,
      p_open_at: openAt,
      p_video_url: videoUrl || null,
      p_description: description || null,
      p_total_pool: totalPool || 100.00,
      p_created_by: 'admin',
    });

    if (error) {
      // 함수가 없으면 직접 삽입
      if (error.code === '42883') {
        // YouTube Video ID 추출
        let videoId = null;
        if (videoUrl) {
          const match = videoUrl.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
          );
          if (match) videoId = match[1];
        }

        const { data: insertData, error: insertError } = await supabase
          .from('economy_contents')
          .insert({
            title,
            description: description || null,
            video_url: videoUrl || null,
            video_id: videoId,
            open_at: openAt,
            total_pool: totalPool || 100.00,
            created_by: 'admin',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, id: insertData.id });
      }
      throw error;
    }

    return NextResponse.json({ success: true, id: data });
  } catch (error) {
    console.error('Economy Create Error:', error);
    return NextResponse.json(
      { error: 'Failed to create economy content' },
      { status: 500 }
    );
  }
}


