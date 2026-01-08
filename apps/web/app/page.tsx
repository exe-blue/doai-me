// apps/web/app/page.tsx
// DoAi.Me 메인 랜딩 페이지 - 21st.dev 스타일 리디자인

'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Header } from './components/layout/Header';
import { Hero } from './components/landing/Hero';
import { Manifesto } from './components/landing/Manifesto';
import { Enter } from './components/landing/Enter';

// ParticleNetwork 동적 임포트 (SSR 비활성화)
const ParticleNetwork = dynamic(() => import('./components/ParticleNetwork'), {
  ssr: false,
});

export default function HomePage() {
  const [isDark, setIsDark] = useState(true);

  // 초기 테마 설정
  useEffect(() => {
    // 시스템 설정 확인 또는 기본값 다크모드
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, []);

  // 테마 토글
  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const newIsDark = !prev;
      if (newIsDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('theme', 'light');
      }
      return newIsDark;
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      {/* 파티클 배경 */}
      <ParticleNetwork isDark={isDark} zIndex={0} />

      {/* CRT Scanlines (다크 모드에서만) */}
      <div className="scanlines" />

      {/* 헤더 */}
      <Header 
        isDark={isDark} 
        onToggleTheme={toggleTheme} 
      />

      {/* 메인 콘텐츠 */}
      <main className="relative z-20">
        {/* Hero 섹션 */}
        <Hero />

        {/* Manifesto 섹션 */}
        <Manifesto />

        {/* Enter CTA 섹션 */}
        <Enter />
      </main>
    </div>
  );
}
