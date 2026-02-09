// apps/web/middleware.ts
// Server-side admin 보호 미들웨어

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    // env 누락 시 admin 보호 스킵 (빌드/배포 안정화)
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  
  // /admin/* 경로만 체크
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // /admin/login과 /admin/unauthorized는 보호하지 않음
    if (
      request.nextUrl.pathname === '/admin/login' ||
      request.nextUrl.pathname === '/admin/unauthorized'
    ) {
      return response;
    }
    
    try {
      // 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        // 세션이 없으면 로그인 페이지로 리다이렉트
        const loginUrl = new URL('/admin/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
      
      // admin_users 테이블에서 관리자 확인
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id, role')
        .eq('user_id', session.user.id)
        .single();
      
      if (adminError || !adminUser) {
        // 관리자가 아니면 unauthorized 페이지로 리다이렉트
        const unauthorizedUrl = new URL('/admin/unauthorized', request.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
      
      // 관리자 확인됨 - 요청 진행
      return response;
    } catch (error) {
      // 에러 발생 시 로그인 페이지로 리다이렉트
      console.error('[Middleware] Admin check error:', error);
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};

