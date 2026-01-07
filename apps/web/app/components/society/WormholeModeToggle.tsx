// components/society/WormholeModeToggle.tsx
// Wormhole Mode 토글 컴포넌트

'use client';

import { motion } from 'framer-motion';

// ============================================
// Props
// ============================================

interface WormholeModeToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
  wormholeCount?: number;
}

// ============================================
// Component
// ============================================

export function WormholeModeToggle({
  isEnabled,
  onToggle,
  wormholeCount = 0,
}: WormholeModeToggleProps) {
  return (
    <motion.button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono
        transition-all duration-300
        ${isEnabled
          ? 'bg-purple-500/20 border border-purple-500 text-purple-300'
          : 'bg-neutral-900 border border-neutral-700 text-neutral-400 hover:border-neutral-600'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon */}
      <motion.span
        animate={isEnabled ? {
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        } : {}}
        transition={{
          rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
          scale: { duration: 2, repeat: Infinity },
        }}
      >
        {isEnabled ? '🌌' : '🌑'}
      </motion.span>
      
      {/* Label */}
      <span>
        Wormhole Mode: {isEnabled ? 'ON' : 'OFF'}
      </span>
      
      {/* Count badge */}
      {isEnabled && wormholeCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="px-1.5 py-0.5 bg-purple-500/30 rounded text-xs"
        >
          {wormholeCount}
        </motion.span>
      )}
    </motion.button>
  );
}

// ============================================
// Compact Version (for toolbar)
// ============================================

interface WormholeModeIconProps {
  isEnabled: boolean;
  onToggle: () => void;
  hasActiveWormhole?: boolean;
}

export function WormholeModeIcon({
  isEnabled,
  onToggle,
  hasActiveWormhole = false,
}: WormholeModeIconProps) {
  return (
    <motion.button
      onClick={onToggle}
      className={`
        relative w-8 h-8 rounded-lg flex items-center justify-center
        transition-all duration-300
        ${isEnabled
          ? 'bg-purple-500/20 text-purple-400'
          : 'bg-neutral-900 text-neutral-500 hover:text-neutral-400'
        }
      `}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      title={`Wormhole Mode: ${isEnabled ? 'ON' : 'OFF'}`}
    >
      <motion.span
        className="text-lg"
        animate={isEnabled ? { rotate: 360 } : {}}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        🌌
      </motion.span>
      
      {/* Active indicator */}
      {hasActiveWormhole && (
        <motion.span
          className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}


