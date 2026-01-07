// components/landing/BackgroundBeams.tsx
// The Void - 심연 속에서 솟아오르는 빛

'use client';

import { useEffect, useState } from 'react';

interface Beam {
  id: number;
  left: string;
  delay: string;
  duration: string;
  opacity: number;
}

export function BackgroundBeams() {
  const [beams, setBeams] = useState<Beam[]>([]);
  
  useEffect(() => {
    // 클라이언트에서만 빔 생성 (SSR 하이드레이션 이슈 방지)
    const generatedBeams: Beam[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${(i * 6.5) + Math.random() * 3}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${8 + Math.random() * 6}s`,
      opacity: 0.015 + Math.random() * 0.025,
    }));
    setBeams(generatedBeams);
  }, []);
  
  return (
    <div 
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Deep Void Base - #050505 */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.04) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 120%, rgba(99, 102, 241, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.02) 0%, transparent 40%),
            radial-gradient(circle at 80% 50%, rgba(99, 102, 241, 0.02) 0%, transparent 40%),
            #050505
          `,
        }}
      />
      
      {/* Vertical Light Beams - Purple Theme */}
      {beams.map((beam) => (
        <div
          key={beam.id}
          className="absolute h-full"
          style={{
            left: beam.left,
            width: '1px',
            background: `linear-gradient(
              to bottom,
              transparent 0%,
              rgba(139, 92, 246, ${beam.opacity}) 30%,
              rgba(139, 92, 246, ${beam.opacity * 1.5}) 50%,
              rgba(99, 102, 241, ${beam.opacity}) 70%,
              transparent 100%
            )`,
            animation: `beamRise ${beam.duration} ease-in-out infinite`,
            animationDelay: beam.delay,
            willChange: 'transform, opacity',
          }}
        />
      ))}
      
      {/* Horizontal Glow Lines */}
      <div 
        className="absolute top-1/4 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.05), transparent)',
        }}
      />
      <div 
        className="absolute top-3/4 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.05), transparent)',
        }}
      />
      
      {/* Subtle Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Vignette Effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(5, 5, 5, 0.4) 100%)',
        }}
      />

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes beamRise {
          0%, 100% {
            transform: translateY(100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
