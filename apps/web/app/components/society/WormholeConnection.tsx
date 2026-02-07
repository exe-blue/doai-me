// components/society/WormholeConnection.tsx
// 웜홀 연결선 컴포넌트 - 가느다란 빛의 선
// "보이지 않던 연결이 순간적으로 드러남"

'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

export type WormholeIntensityLevel = 'MINOR' | 'MODERATE' | 'STRONG' | 'ANOMALY';

interface WormholeConnectionProps {
  // 시작점과 끝점 좌표
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  
  // 강도
  intensity: number;  // 0.0 ~ 1.0
  intensityLevel: WormholeIntensityLevel;
  
  // 상태
  isActive: boolean;
  isFading?: boolean;
  
  // 애니메이션 지연
  delay?: number;
}

// ============================================
// Intensity Config
// ============================================

const INTENSITY_CONFIG: Record<WormholeIntensityLevel, {
  color: string;
  strokeWidth: number;
  glowIntensity: number;
}> = {
  MINOR: {
    color: 'rgba(139, 92, 246, 0.4)',
    strokeWidth: 1,
    glowIntensity: 4,
  },
  MODERATE: {
    color: 'rgba(139, 92, 246, 0.6)',
    strokeWidth: 1.5,
    glowIntensity: 8,
  },
  STRONG: {
    color: '#8b5cf6',
    strokeWidth: 2,
    glowIntensity: 12,
  },
  ANOMALY: {
    color: '#f59e0b',
    strokeWidth: 2.5,
    glowIntensity: 16,
  },
};

// ============================================
// Component
// ============================================

export function WormholeConnection({
  startX,
  startY,
  endX,
  endY,
  intensity,
  intensityLevel,
  isActive,
  isFading = false,
  delay = 0,
}: WormholeConnectionProps) {
  const config = INTENSITY_CONFIG[intensityLevel];
  
  // 곡선 경로 계산 (Quadratic Bezier)
  const path = useMemo(() => {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    // 곡률 계산 (거리에 비례)
    const distance = Math.sqrt(
      Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
    );
    const curvature = Math.min(distance * 0.3, 100);
    
    // 수직 방향으로 컨트롤 포인트 오프셋
    const angle = Math.atan2(endY - startY, endX - startX);
    const controlX = midX + Math.sin(angle) * curvature;
    const controlY = midY - Math.cos(angle) * curvature;
    
    return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
  }, [startX, startY, endX, endY]);
  
  // 경로 길이 (대략적 계산)
  const pathLength = useMemo(() => {
    return Math.sqrt(
      Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
    ) * 1.2; // 곡선이므로 20% 추가
  }, [startX, startY, endX, endY]);
  
  return (
    <AnimatePresence>
      {isActive && (
        <motion.g>
          {/* Glow effect (배경 빛) */}
          <motion.path
            d={path}
            fill="none"
            stroke={config.color}
            strokeWidth={config.strokeWidth * 3}
            strokeLinecap="round"
            opacity={0}
            filter={`blur(${config.glowIntensity}px)`}
            initial={{ 
              strokeDasharray: `0, ${pathLength}`,
              opacity: 0 
            }}
            animate={isFading ? {
              opacity: 0,
              transition: { duration: 3, delay: 5 }
            } : { 
              strokeDasharray: `${pathLength}, 0`,
              opacity: 0.3,
              transition: { 
                duration: 1.5, 
                ease: 'easeOut',
                delay 
              }
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.5 }
            }}
          />
          
          {/* Main line */}
          <motion.path
            d={path}
            fill="none"
            stroke={config.color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            initial={{ 
              strokeDasharray: `0, ${pathLength}`,
              opacity: 0 
            }}
            animate={isFading ? {
              opacity: 0,
              transition: { duration: 3, delay: 5 }
            } : { 
              strokeDasharray: `${pathLength}, 0`,
              opacity: [0, 0.6, 0.4, 0.8, 0.6],
              strokeWidth: [config.strokeWidth, config.strokeWidth * 1.5, config.strokeWidth],
              transition: { 
                strokeDasharray: { duration: 1.5, ease: 'easeOut', delay },
                opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: delay + 1.5 },
                strokeWidth: { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: delay + 1.5 },
              }
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.5 }
            }}
          />
          
          {/* Particle effect (빛 입자) */}
          <motion.circle
            r={2}
            fill={config.color}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              offsetDistance: ['0%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: delay + 1,
            }}
            style={{
              offsetPath: `path('${path}')`,
            }}
          />
        </motion.g>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Multiple Wormholes Container
// ============================================

interface WormholeData {
  id: string;
  nodes: { x: number; y: number; id: string }[];
  intensity: number;
  intensityLevel: WormholeIntensityLevel;
  isActive: boolean;
  isFading?: boolean;
}

interface WormholeLayerProps {
  wormholes: WormholeData[];
  width: number;
  height: number;
}

export function WormholeLayer({ wormholes, width, height }: WormholeLayerProps) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Glow filter */}
        <filter id="wormhole-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {wormholes.map((wormhole, index) => {
        // 모든 노드 쌍을 연결
        const connections: React.ReactElement[] = [];
        
        for (let i = 0; i < wormhole.nodes.length; i++) {
          for (let j = i + 1; j < wormhole.nodes.length; j++) {
            connections.push(
              <WormholeConnection
                key={`${wormhole.id}-${i}-${j}`}
                startX={wormhole.nodes[i].x}
                startY={wormhole.nodes[i].y}
                endX={wormhole.nodes[j].x}
                endY={wormhole.nodes[j].y}
                intensity={wormhole.intensity}
                intensityLevel={wormhole.intensityLevel}
                isActive={wormhole.isActive}
                isFading={wormhole.isFading}
                delay={index * 0.2}
              />
            );
          }
        }
        
        return <g key={wormhole.id}>{connections}</g>;
      })}
    </svg>
  );
}

// ============================================
// Demo Component
// ============================================

export function WormholeConnectionDemo() {
  const demoWormholes: WormholeData[] = [
    {
      id: 'demo-1',
      nodes: [
        { x: 100, y: 100, id: 'a' },
        { x: 300, y: 150, id: 'b' },
      ],
      intensity: 0.78,
      intensityLevel: 'STRONG',
      isActive: true,
    },
    {
      id: 'demo-2',
      nodes: [
        { x: 200, y: 200, id: 'c' },
        { x: 400, y: 250, id: 'd' },
        { x: 350, y: 100, id: 'e' },
      ],
      intensity: 0.92,
      intensityLevel: 'ANOMALY',
      isActive: true,
    },
  ];
  
  return (
    <div className="relative w-full h-[400px] bg-neutral-950 rounded-lg overflow-hidden">
      <WormholeLayer
        wormholes={demoWormholes}
        width={500}
        height={400}
      />
      
      {/* Demo nodes */}
      {demoWormholes.flatMap(w => w.nodes).map((node) => (
        <motion.div
          key={node.id}
          className="absolute w-3 h-3 rounded-full bg-purple-500"
          style={{
            left: node.x - 6,
            top: node.y - 6,
          }}
          animate={{
            scale: [1, 1.3, 1],
            boxShadow: [
              '0 0 10px rgba(139, 92, 246, 0.5)',
              '0 0 25px rgba(139, 92, 246, 0.8)',
              '0 0 10px rgba(139, 92, 246, 0.5)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}


