'use client';

import React, { useRef, useEffect, useCallback } from 'react';

// ============================================
// Types
// ============================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface ParticleNetworkProps {
  /** 다크모드 여부 */
  isDark?: boolean;
  /** 파티클 색상 (CSS 색상값) */
  particleColor?: string;
  /** 연결선 색상 (CSS 색상값) */
  lineColor?: string;
  /** 파티클 밀도 (낮을수록 많음, 기본: 15000) */
  density?: number;
  /** 연결 최대 거리 (px) */
  connectionDistance?: number;
  /** 최대 연결선 수 */
  maxConnections?: number;
  /** z-index 설정 */
  zIndex?: number;
}

// ============================================
// 연결된 점들의 파티클 네트워크 애니메이션
// ============================================

export default function ParticleNetwork({
  isDark = true,
  particleColor,
  lineColor,
  density = 15000,
  connectionDistance = 120,
  maxConnections = 3,
  zIndex = -1,
}: ParticleNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  // 파티클 초기화
  const initParticles = useCallback((width: number, height: number) => {
    const count = Math.floor((width * height) / density);
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.3,
      });
    }

    particlesRef.current = particles;
  }, [density]);

  // 렌더링 루프
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = sizeRef.current;
    const particles = particlesRef.current;
    
    // 배경 클리어
    ctx.clearRect(0, 0, width, height);

    // 색상 설정
    const pColor = particleColor || (isDark ? '#ffffff' : '#000000');
    const lColor = lineColor || (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)');

    // 파티클 업데이트 및 그리기
    particles.forEach((p, i) => {
      // 위치 업데이트
      p.x += p.vx;
      p.y += p.vy;

      // 경계 래핑
      if (p.x < 0) p.x = width;
      else if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      else if (p.y > height) p.y = 0;

      // 파티클 그리기
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = pColor;
      ctx.globalAlpha = p.alpha * (isDark ? 0.6 : 0.3);
      ctx.fill();

      // 연결선 그리기 (성능 최적화: 제한된 연결)
      let connections = 0;
      for (let j = i + 1; j < particles.length && connections < maxConnections; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectionDistance) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = lColor;
          ctx.globalAlpha = (1 - dist / connectionDistance) * (isDark ? 0.4 : 0.2);
          ctx.lineWidth = 0.5;
          ctx.stroke();
          connections++;
        }
      }
    });

    ctx.globalAlpha = 1;
  }, [isDark, particleColor, lineColor, connectionDistance, maxConnections]);

  // 애니메이션 루프
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (ctx) {
      draw(ctx);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [draw]);

  // 리사이즈 핸들러
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    canvas.width = width;
    canvas.height = height;
    sizeRef.current = { width, height };
    
    initParticles(width, height);
  }, [initParticles]);

  // 초기화 및 클린업
  useEffect(() => {
    handleResize();
    
    window.addEventListener('resize', handleResize);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [handleResize, animate]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex }}
      aria-hidden="true"
    />
  );
}

