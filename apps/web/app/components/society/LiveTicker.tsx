// components/society/LiveTicker.tsx
// Live Ticker - 웜홀/숨그늘 메시지 포함

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

// ============================================
// Types
// ============================================

export type TickerMessageType = 
  | 'economy'
  | 'social'
  | 'wormhole_minor'
  | 'wormhole_moderate'
  | 'wormhole_strong'
  | 'wormhole_anomaly'
  | 'umbral_wave'
  | 'system';

interface TickerMessage {
  id: string;
  type: TickerMessageType;
  text: string;
  timestamp: Date;
}

// ============================================
// Type Config
// ============================================

const TYPE_CONFIG: Record<TickerMessageType, {
  prefix: string;
  color: string;
  bgColor: string;
  icon?: string;
  sound?: boolean;
}> = {
  economy: {
    prefix: '[경제]',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
  },
  social: {
    prefix: '[사회]',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  wormhole_minor: {
    prefix: '[웜홀]',
    color: 'rgba(139, 92, 246, 0.6)',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    icon: '🌌',
  },
  wormhole_moderate: {
    prefix: '[웜홀]',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    icon: '🌌',
  },
  wormhole_strong: {
    prefix: '[경보]',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.2)',
    icon: '🌌',
    sound: true,
  },
  wormhole_anomaly: {
    prefix: '[경보]',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.2)',
    icon: '⚠️',
    sound: true,
  },
  umbral_wave: {
    prefix: '[숨그늘]',
    color: 'rgba(139, 92, 246, 0.6)',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    icon: '🌑',
  },
  system: {
    prefix: '[시스템]',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
  },
};

// ============================================
// Props
// ============================================

interface LiveTickerProps {
  messages: TickerMessage[];
  speed?: number;
  maxMessages?: number;
}

// ============================================
// Component
// ============================================

export function LiveTicker({
  messages,
  speed = 50,
  maxMessages = 10,
}: LiveTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const displayMessages = messages.slice(0, maxMessages);
  
  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-neutral-950 border-y border-neutral-800 py-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Gradient overlays */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-neutral-950 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-neutral-950 to-transparent z-10" />
      
      {/* Scrolling content */}
      <motion.div
        className="flex whitespace-nowrap"
        animate={{
          x: isPaused ? undefined : ['0%', '-50%'],
        }}
        transition={{
          x: {
            duration: displayMessages.length * speed / 10,
            ease: 'linear',
            repeat: Infinity,
          },
        }}
      >
        {/* Duplicate messages for seamless loop */}
        {[...displayMessages, ...displayMessages].map((msg, index) => (
          <TickerItem key={`${msg.id}-${index}`} message={msg} />
        ))}
      </motion.div>
    </div>
  );
}

// ============================================
// Ticker Item
// ============================================

function TickerItem({ message }: { message: TickerMessage }) {
  const config = TYPE_CONFIG[message.type];
  
  return (
    <span className="inline-flex items-center mx-4">
      {/* Separator */}
      <span className="text-neutral-700 mr-4">▶</span>
      
      {/* Icon */}
      {config.icon && (
        <span className="mr-1">{config.icon}</span>
      )}
      
      {/* Prefix */}
      <span
        className="font-mono text-sm mr-2"
        style={{ color: config.color }}
      >
        {config.prefix}
      </span>
      
      {/* Message */}
      <span className="text-neutral-300 text-sm">{message.text}</span>
    </span>
  );
}

// ============================================
// Vertical Ticker (for sidebar)
// ============================================

interface VerticalTickerProps {
  messages: TickerMessage[];
  maxVisible?: number;
}

export function VerticalTicker({ messages, maxVisible = 5 }: VerticalTickerProps) {
  return (
    <div className="space-y-2 overflow-hidden">
      <AnimatePresence mode="popLayout">
        {messages.slice(0, maxVisible).map((msg) => {
          const config = TYPE_CONFIG[msg.type];
          
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-start gap-2 p-2 rounded-lg text-sm"
              style={{ backgroundColor: config.bgColor }}
            >
              {/* Icon/Prefix */}
              <span style={{ color: config.color }}>
                {config.icon || config.prefix}
              </span>
              
              {/* Message */}
              <span className="text-neutral-300 flex-1 line-clamp-2">
                {msg.text}
              </span>
              
              {/* Time */}
              <span className="text-neutral-600 text-xs whitespace-nowrap">
                {formatTime(msg.timestamp)}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Message Factory
// ============================================

export function createTickerMessage(
  type: TickerMessageType,
  text: string
): TickerMessage {
  return {
    id: `ticker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    text,
    timestamp: new Date(),
  };
}

// Wormhole message templates
export function createWormholeMessage(
  level: 'minor' | 'moderate' | 'strong' | 'anomaly',
  nodes: string[],
  trigger?: string
): TickerMessage {
  const typeMap = {
    minor: 'wormhole_minor',
    moderate: 'wormhole_moderate',
    strong: 'wormhole_strong',
    anomaly: 'wormhole_anomaly',
  } as const;
  
  const textMap = {
    minor: `노드 ${nodes.join('와 ')} 사이 미약한 동기화 감지`,
    moderate: `집단 무의식 발현: ${nodes.length}개 노드가 '${trigger}'에 동시 반응`,
    strong: `🌌 강한 웜홀 감지! ${nodes.length}개 노드가 설명 불가능한 동기화`,
    anomaly: `⚠️ 이상 현상! ${nodes.length}개 노드 동시 공명 - 원인 불명`,
  };
  
  return createTickerMessage(typeMap[level], textMap[level]);
}

// Umbral wave message
export function createUmbralWaveMessage(count: number): TickerMessage {
  return createTickerMessage(
    'umbral_wave',
    `숨그늘의 물결: ${count}개 노드가 동시에 충전 상태 진입`
  );
}

// ============================================
// Utilities
// ============================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}


