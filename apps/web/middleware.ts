// apps/web/middleware.ts
// Server-side admin 보호 미들웨어

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  // /admin/* 경로만 체크
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // /admin/login과 /admin/unauthorized는 보호하지 않음
    if (
      request.nextUrl.pathname === '/admin/login' ||
      request.nextUrl.pathname === '/admin/unauthorized'
    ) {
      return res;
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
      return res;
    } catch (error) {
      // 에러 발생 시 로그인 페이지로 리다이렉트
      console.error('[Middleware] Admin check error:', error);
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};

