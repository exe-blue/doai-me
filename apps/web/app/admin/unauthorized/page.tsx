// apps/web/app/admin/unauthorized/page.tsx
// 권한 없음 페이지

import Link from 'next/link';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="text-6xl mb-6">🚫</div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-100 mb-4">
          접근 권한이 없습니다
        </h1>
        
        {/* Description */}
        <div className="text-slate-400 space-y-2 mb-8">
          <p>
            이 페이지는 승인된 관리자만 접근할 수 있습니다.
          </p>
          <p>
            관리자 권한이 필요하시면 시스템 관리자에게 승인을 요청하세요.
          </p>
        </div>
        
        {/* Info Box */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 text-left mb-8">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            승인 절차
          </h2>
          <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
            <li>Supabase Auth로 계정 가입</li>
            <li>시스템 관리자에게 승인 요청</li>
            <li>관리자가 <code className="text-blue-400">admin_users</code> 테이블에 추가</li>
            <li>다시 로그인 시도</li>
          </ol>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/admin/login"
            className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            로그인 페이지로 돌아가기
          </Link>
          <Link
            href="/"
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors"
          >
            홈으로 가기
          </Link>
        </div>
        
        {/* Contact */}
        <div className="mt-8 text-xs text-slate-600">
          문의: 시스템 관리자 또는 Orion에게 연락
        </div>
      </div>
    </div>
  );
}

