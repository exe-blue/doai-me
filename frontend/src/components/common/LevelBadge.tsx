'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
};

const getTierColor = (level: number) => {
  if (level >= 81) return 'from-yellow-400 via-yellow-300 to-amber-500'; // Champion
  if (level >= 61) return 'from-purple-500 via-pink-400 to-purple-600'; // Global Contender
  if (level >= 41) return 'from-cyan-400 via-blue-400 to-cyan-500'; // Top Performer
  if (level >= 26) return 'from-green-400 via-emerald-400 to-green-500'; // Established
  if (level >= 11) return 'from-blue-400 via-indigo-400 to-blue-500'; // Rising Star
  return 'from-gray-400 via-gray-300 to-gray-500'; // Rookie
};

const getTierName = (level: number) => {
  if (level >= 81) return 'Champion';
  if (level >= 61) return 'Contender';
  if (level >= 41) return 'Top';
  if (level >= 26) return 'Established';
  if (level >= 11) return 'Rising';
  return 'Rookie';
};

export function LevelBadge({ level, size = 'md', showGlow = true }: LevelBadgeProps) {
  const tierColor = getTierColor(level);

  return (
    <motion.div
      className={cn(
        'relative flex items-center justify-center rounded-xl font-bold',
        `bg-gradient-to-br ${tierColor}`,
        sizeMap[size],
        showGlow && 'shadow-lg'
      )}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      style={{
        boxShadow: showGlow ? `0 0 20px rgba(255, 255, 255, 0.3)` : undefined,
        fontFamily: 'var(--font-display)',
      }}
    >
      <span className="text-black drop-shadow-sm">{level}</span>
      {/* Shine effect */}
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
      </div>
    </motion.div>
  );
}

export function LevelBadgeWithLabel({ level, size = 'md' }: LevelBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <LevelBadge level={level} size={size} />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {getTierName(level)}
      </span>
    </div>
  );
}
