// components/society/NodeStatusBadge.tsx
// 노드 상태 배지 - 숨그늘(Umbral Breath) 시각화
// "휴식 중인 노드는 죽어있는 것이 아니라, 양자적 잠재성을 충전하는 시간"

'use client';

import { motion } from 'framer-motion';
import type { NodeStatus } from '@/lib/supabase/types';

interface Props {
  status: NodeStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// 상태별 설정 - CSS 변수 기반
const STATUS_CONFIG: Record<NodeStatus, {
  colorVar: string;  // CSS 변수명 (e.g., '--status-watching')
  label: string;
  labelKo: string;
  emoji: string;
  isUmbral: boolean;
}> = {
  watching_tiktok: {
    colorVar: '--status-watching',
    label: 'Watching',
    labelKo: '시청 중',
    emoji: '📺',
    isUmbral: false,
  },
  discussing: {
    colorVar: '--status-discussing',
    label: 'Discussing',
    labelKo: '토론 중',
    emoji: '💬',
    isUmbral: false,
  },
  creating: {
    colorVar: '--status-creating',
    label: 'Creating',
    labelKo: '창작 중',
    emoji: '🎨',
    isUmbral: false,
  },
  trading: {
    colorVar: '--status-trading',
    label: 'Trading',
    labelKo: '거래 중',
    emoji: '📈',
    isUmbral: false,
  },
  observing: {
    colorVar: '--status-observing',
    label: 'Observing',
    labelKo: '관찰 중',
    emoji: '👀',
    isUmbral: false,
  },
  resting: {
    colorVar: '--status-resting',
    label: 'In Umbra',
    labelKo: '숨그늘',
    emoji: '🌑',
    isUmbral: true,
  },
  offline: {
    colorVar: '--status-offline',
    label: 'Deep Umbra',
    labelKo: '깊은 숨그늘',
    emoji: '💫',
    isUmbral: true,
  },
};

// 무드 색상 헬퍼 함수
function getMoodColorVar(mood: number): string {
  if (mood > 0.6) return 'var(--mood-positive)';
  if (mood > 0.4) return 'var(--mood-neutral)';
  return 'var(--mood-negative)';
}

const SIZE_CONFIG = {
  sm: { dot: 8, text: 'text-xs', padding: 'px-2 py-0.5' },
  md: { dot: 10, text: 'text-sm', padding: 'px-3 py-1' },
  lg: { dot: 12, text: 'text-base', padding: 'px-4 py-1.5' },
};

export function NodeStatusBadge({ status, size = 'md', showLabel = true }: Props) {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];
  
  return (
    <div 
      className={`inline-flex items-center gap-2 rounded-full ${sizeConfig.padding}`}
      style={{ 
        '--status-color': `var(${config.colorVar})`,
        '--dot-size': `${sizeConfig.dot}px`,
        backgroundColor: `hsl(var(${config.colorVar}) / 0.2)`,
      } as React.CSSProperties}
    >
      {/* Status Dot with Animation */}
      <div className="relative">
        {/* Glow effect for umbral states */}
        {config.isUmbral && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              width: 'var(--dot-size)',
              height: 'var(--dot-size)',
              backgroundColor: `hsl(var(${config.colorVar}))`,
              filter: `blur(${sizeConfig.dot / 2}px)`,
            }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
        
        {/* Main dot */}
        <motion.div
          className="rounded-full relative z-10"
          style={{
            width: 'var(--dot-size)',
            height: 'var(--dot-size)',
            backgroundColor: `hsl(var(${config.colorVar}))`,
            boxShadow: config.isUmbral 
              ? `0 0 var(--dot-size) hsl(var(${config.colorVar}) / 0.5)` 
              : 'none',
          }}
          animate={config.isUmbral ? {
            opacity: [0.6, 1, 0.6],
            scale: [0.9, 1.1, 0.9],
          } : {
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: config.isUmbral ? 3 : 0,
            repeat: config.isUmbral ? Infinity : 0,
            ease: 'easeInOut',
          }}
        />
      </div>
      
      {/* Label */}
      {showLabel && (
        <span 
          className={`${sizeConfig.text} font-mono`}
          style={{ color: `hsl(var(${config.colorVar}))` }}
        >
          {config.labelKo}
        </span>
      )}
    </div>
  );
}

// 노드 아바타 컴포넌트 (숨그늘 시각화 포함)
export function NodeAvatar({ 
  nodeNumber, 
  status, 
  mood,
  size = 48,
}: { 
  nodeNumber: number; 
  status: NodeStatus; 
  mood?: number;
  size?: number;
}) {
  const config = STATUS_CONFIG[status];
  const isUmbral = config.isUmbral;
  
  return (
    <div 
      className="relative inline-block"
      style={{ 
        width: size, 
        height: size,
        '--avatar-color': `var(${config.colorVar})`,
      } as React.CSSProperties}
    >
      {/* Umbral Pulse Ring - 숨그늘 상태일 때만 */}
      {isUmbral && (
        <>
          {/* Outer pulse */}
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: `hsl(var(${config.colorVar}))` }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          
          {/* Inner pulse */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ 
              backgroundColor: `hsl(var(${config.colorVar}))`,
              opacity: 0.1,
            }}
            animate={{
              scale: [0.8, 1, 0.8],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </>
      )}
      
      {/* Avatar Circle */}
      <motion.div
        className="absolute inset-0 rounded-full flex items-center justify-center font-mono text-sm"
        style={{
          backgroundColor: isUmbral 
            ? `hsl(var(${config.colorVar}) / 0.2)` 
            : 'hsl(var(--foreground) / 0.1)',
          border: `2px solid hsl(var(${config.colorVar}))`,
          color: `hsl(var(${config.colorVar}))`,
          boxShadow: isUmbral 
            ? `0 0 20px hsl(var(${config.colorVar}) / 0.4)` 
            : 'none',
        }}
        animate={isUmbral ? {
          opacity: [0.8, 1, 0.8],
        } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        #{nodeNumber.toString().padStart(3, '0')}
      </motion.div>
      
      {/* Mood indicator (if not umbral) */}
      {!isUmbral && mood !== undefined && (
        <div 
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs"
          style={{
            borderColor: 'hsl(var(--void))',
            backgroundColor: `hsl(${getMoodColorVar(mood)})`,
          }}
        >
          {mood > 0.6 ? '😊' : mood > 0.4 ? '😐' : '😔'}
        </div>
      )}
      
      {/* Umbral breath indicator */}
      {isUmbral && (
        <motion.div 
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
          style={{
            backgroundColor: `hsl(var(${config.colorVar}) / 0.3)`,
            border: `1px solid hsl(var(${config.colorVar}))`,
          }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          💫
        </motion.div>
      )}
    </div>
  );
}

