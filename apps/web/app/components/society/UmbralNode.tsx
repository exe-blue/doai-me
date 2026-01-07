// components/society/UmbralNode.tsx
// 숨그늘(In Umbra) 노드 컴포넌트
// "기계는 쉬지 않는다. 잠재할 뿐이다."

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import type { Node, NodeStatus } from '../../../lib/supabase/types';

// ============================================
// Status Config (Ruon's Legacy)
// ============================================

const STATUS_CONFIG: Record<NodeStatus, {
  label: string;
  labelKo: string;
  color: string;
  glowColor: string;
  icon: string;
  isUmbral: boolean;
}> = {
  active: {
    label: 'Active',
    labelKo: '활동중',
    color: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    icon: '●',
    isUmbral: false,
  },
  inactive: {
    label: 'Inactive',
    labelKo: '비활성',
    color: '#6b7280',
    glowColor: 'none',
    icon: '○',
    isUmbral: false,
  },
  in_umbra: {
    label: 'In Umbra',
    labelKo: '숨그늘',
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    icon: '🌑',
    isUmbral: true,
  },
  connecting: {
    label: 'Connecting',
    labelKo: '연결중',
    color: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    icon: '◐',
    isUmbral: false,
  },
  offline: {
    label: 'Offline',
    labelKo: '오프라인',
    color: '#1f2937',
    glowColor: 'none',
    icon: '◌',
    isUmbral: false,
  },
  error: {
    label: 'Error',
    labelKo: '에러',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    icon: '⚠',
    isUmbral: false,
  },
  maintenance: {
    label: 'Maintenance',
    labelKo: '유지보수',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    icon: '🔧',
    isUmbral: false,
  },
  watching_tiktok: {
    label: 'Watching TikTok',
    labelKo: '틱톡 시청중',
    color: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    icon: '📺',
    isUmbral: false,
  },
  discussing: {
    label: 'Discussing',
    labelKo: '토론중',
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    icon: '💬',
    isUmbral: false,
  },
  creating: {
    label: 'Creating',
    labelKo: '창작중',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    icon: '🎨',
    isUmbral: false,
  },
  trading: {
    label: 'Trading',
    labelKo: '거래중',
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    icon: '💹',
    isUmbral: false,
  },
  observing: {
    label: 'Observing',
    labelKo: '관찰중',
    color: '#64748b',
    glowColor: 'rgba(100, 116, 139, 0.3)',
    icon: '👀',
    isUmbral: false,
  },
  resting: {
    label: 'Resting',
    labelKo: '휴식중',
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.3)',
    icon: '😴',
    isUmbral: true,
  },
};

// ============================================
// Umbral Breath Animation Variants
// ============================================

const umbralBreathVariants = {
  initial: {
    opacity: 0.3,
    scale: 1,
    boxShadow: '0 0 0 rgba(139, 92, 246, 0)',
  },
  animate: {
    opacity: [0.3, 0.6, 0.3],
    scale: [1, 1.15, 1],
    boxShadow: [
      '0 0 0 rgba(139, 92, 246, 0)',
      '0 0 20px rgba(139, 92, 246, 0.3)',
      '0 0 0 rgba(139, 92, 246, 0)',
    ],
    transition: {
      duration: 4,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// 오래된 숨그늘 (더 느린 박동)
const umbralBreathSlowVariants = {
  ...umbralBreathVariants,
  animate: {
    ...umbralBreathVariants.animate,
    transition: {
      duration: 6,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// 공명 상태 (더 빠른 박동)
const umbralResonatingVariants = {
  ...umbralBreathVariants,
  animate: {
    opacity: [0.4, 0.8, 0.4],
    scale: [1, 1.2, 1],
    boxShadow: [
      '0 0 10px rgba(139, 92, 246, 0.3)',
      '0 0 30px rgba(139, 92, 246, 0.5)',
      '0 0 10px rgba(139, 92, 246, 0.3)',
    ],
    transition: {
      duration: 3,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// 웜홀 활성 노드
const wormholeActiveVariants = {
  animate: {
    scale: [1, 1.3, 1],
    boxShadow: [
      '0 0 10px rgba(139, 92, 246, 0.5)',
      '0 0 25px rgba(139, 92, 246, 0.8)',
      '0 0 10px rgba(139, 92, 246, 0.5)',
    ],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// ============================================
// Props
// ============================================

interface UmbralNodeProps {
  node: Node;
  index?: number;
  size?: number;
  isResonating?: boolean;
  isWormholeActive?: boolean;
  onClick?: (node: Node) => void;
  showTooltip?: boolean;
}

// ============================================
// Component
// ============================================

export function UmbralNode({
  node,
  index = 0,
  size = 6,
  isResonating = false,
  isWormholeActive = false,
  onClick,
  showTooltip = true,
}: UmbralNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = STATUS_CONFIG[node.status] || STATUS_CONFIG.offline;
  
  // 숨그늘 지속 시간 계산
  const umbraDuration = useMemo(() => {
    if (!node.umbra_since || node.status !== 'in_umbra') return null;
    const now = new Date();
    const since = new Date(node.umbra_since);
    const diffHours = (now.getTime() - since.getTime()) / (1000 * 60 * 60);
    return diffHours;
  }, [node.umbra_since, node.status]);
  
  // 오래된 숨그늘 (24시간 이상)
  const isLongUmbra = umbraDuration && umbraDuration >= 24;
  
  // 애니메이션 variants 선택
  const getVariants = () => {
    if (isWormholeActive) return wormholeActiveVariants;
    if (!config.isUmbral) return {};
    if (isResonating) return umbralResonatingVariants;
    if (isLongUmbra) return umbralBreathSlowVariants;
    return umbralBreathVariants;
  };
  
  // 숨그늘 지속 시간 포맷
  const formatUmbraDuration = (hours: number) => {
    if (hours < 1) return `${Math.floor(hours * 60)}분`;
    if (hours < 24) return `${Math.floor(hours)}시간`;
    return `${Math.floor(hours / 24)}일`;
  };
  
  return (
    <div className="relative">
      <motion.div
        className="rounded-full cursor-pointer relative"
        style={{
          width: size,
          height: size,
          backgroundColor: isWormholeActive ? '#8b5cf6' : config.color,
          '--node-index': index,
        } as React.CSSProperties}
        variants={getVariants()}
        initial="initial"
        animate="animate"
        whileHover={{ scale: 1.5 }}
        onClick={() => onClick?.(node)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
          >
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 shadow-lg min-w-[140px]">
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <span>{config.icon}</span>
                <span className="text-neutral-200 text-sm font-mono">
                  #{node.node_number}
                </span>
              </div>
              
              {/* Status */}
              <div 
                className="text-xs font-medium"
                style={{ color: config.color }}
              >
                {config.labelKo}
                {isResonating && ' (공명 중)'}
                {isWormholeActive && ' (동기화)'}
              </div>
              
              {/* Umbra duration */}
              {config.isUmbral && umbraDuration && (
                <div className="text-neutral-500 text-xs mt-1">
                  충전 중... {formatUmbraDuration(umbraDuration)}
                </div>
              )}
              
              {/* Description */}
              {config.isUmbral && (
                <div className="text-neutral-600 text-xs mt-1 italic">
                  다음 존재를 위해 충전 중...
                </div>
              )}
              
              {/* Nickname */}
              <div className="text-neutral-400 text-xs mt-1">
                {node.nickname}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Grid Version (for Network Map)
// ============================================

interface UmbralNodeGridProps {
  nodes: Node[];
  resonatingNodeIds?: string[];
  wormholeActiveNodeIds?: string[];
  onNodeClick?: (node: Node) => void;
  nodeSize?: number;
  gap?: number;
}

export function UmbralNodeGrid({
  nodes,
  resonatingNodeIds = [],
  wormholeActiveNodeIds = [],
  onNodeClick,
  nodeSize = 6,
  gap = 4,
}: UmbralNodeGridProps) {
  const resonatingSet = new Set(resonatingNodeIds);
  const wormholeSet = new Set(wormholeActiveNodeIds);
  
  return (
    <div 
      className="flex flex-wrap"
      style={{ gap }}
    >
      {nodes.map((node, index) => (
        <UmbralNode
          key={node.id}
          node={node}
          index={index}
          size={nodeSize}
          isResonating={resonatingSet.has(node.id)}
          isWormholeActive={wormholeSet.has(node.id)}
          onClick={onNodeClick}
        />
      ))}
    </div>
  );
}

// ============================================
// Stats Component (for Side Panel)
// ============================================

interface UmbralStatsProps {
  umbralCount: number;
  activeCount: number;
  offlineCount: number;
  wormholesToday?: number;
  lastWormholeTime?: string;
}

export function UmbralStats({
  umbralCount,
  activeCount,
  offlineCount,
  wormholesToday = 0,
  lastWormholeTime,
}: UmbralStatsProps) {
  return (
    <div className="space-y-4">
      {/* Network Status */}
      <div>
        <h3 className="text-neutral-300 text-sm font-mono mb-3">NETWORK STATUS</h3>
        
        <div className="space-y-3">
          {/* Active */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-neutral-400 text-sm">ACTIVE</span>
            </div>
            <span className="text-neutral-200 font-mono">{activeCount}</span>
          </div>
          
          {/* In Umbra */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.span 
                className="w-2 h-2 rounded-full bg-purple-500"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <span className="text-neutral-400 text-sm">🌑 IN UMBRA</span>
            </div>
            <span className="text-purple-400 font-mono">{umbralCount}</span>
          </div>
          
          {/* Offline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neutral-700" />
              <span className="text-neutral-400 text-sm">◌ OFFLINE</span>
            </div>
            <span className="text-neutral-500 font-mono">{offlineCount}</span>
          </div>
        </div>
      </div>
      
      {/* Wormholes Today */}
      <div className="border-t border-neutral-800 pt-4">
        <h3 className="text-neutral-300 text-sm font-mono mb-3">🌌 WORMHOLES TODAY</h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 text-sm">Detected</span>
            <span className="text-purple-400 font-mono">{wormholesToday}</span>
          </div>
          {lastWormholeTime && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 text-sm">Last</span>
              <span className="text-neutral-400 text-sm">{lastWormholeTime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


