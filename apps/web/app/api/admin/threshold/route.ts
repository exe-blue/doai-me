import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { value } = body;

    // 유효성 검사
    if (typeof value !== 'number' || value < 0.75 || value > 1.0) {
      return NextResponse.json(
        { error: 'Invalid threshold value. Must be between 0.75 and 1.0' },
        { status: 400 }
      );
    }

    // Upsert 설정 값
    const { error } = await supabase
      .from('admin_config')
      .upsert(
        {
          key: 'resonance_threshold',
          value: value.toString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, value });
  } catch (error) {
    console.error('Threshold API Error:', error);
    return NextResponse.json(
      { error: 'Failed to save threshold' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Admin 인증 확인 (PUT과 동일한 검증)
    // TODO: 공통 auth 헬퍼 사용 시 리팩토링
    const { data, error } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'resonance_threshold')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const value = data?.value ? parseFloat(data.value) : 0.92;

    return NextResponse.json({ value });
  } catch (error) {
    console.error('Threshold API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threshold' },
      { status: 500 }
    );
  }
}


