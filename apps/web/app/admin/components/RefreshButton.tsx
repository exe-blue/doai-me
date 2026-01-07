// apps/web/app/admin/components/RefreshButton.tsx
// 클라이언트 사이드 새로고침 버튼

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    // 시각적 피드백을 위해 잠시 대기
    setTimeout(() => setRefreshing(false), 1000);
  };
  
  return (
    <button 
      onClick={handleRefresh}
      disabled={refreshing}
      className="text-blue-400 hover:text-blue-300 disabled:text-blue-600 transition"
    >
      {refreshing ? '갱신 중...' : 'Refresh'}
    </button>
  );
}

