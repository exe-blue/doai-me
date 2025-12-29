'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color: 'hp' | 'mp' | 'atk' | 'def' | 'spd' | 'int';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  animated?: boolean;
}

const colorMap = {
  hp: {
    bg: 'bg-red-500/20',
    fill: 'bg-gradient-to-r from-red-600 to-red-400',
    glow: 'shadow-red-500/50',
    text: 'text-red-400',
  },
  mp: {
    bg: 'bg-blue-500/20',
    fill: 'bg-gradient-to-r from-blue-600 to-blue-400',
    glow: 'shadow-blue-500/50',
    text: 'text-blue-400',
  },
  atk: {
    bg: 'bg-orange-500/20',
    fill: 'bg-gradient-to-r from-orange-600 to-orange-400',
    glow: 'shadow-orange-500/50',
    text: 'text-orange-400',
  },
  def: {
    bg: 'bg-green-500/20',
    fill: 'bg-gradient-to-r from-green-600 to-green-400',
    glow: 'shadow-green-500/50',
    text: 'text-green-400',
  },
  spd: {
    bg: 'bg-yellow-500/20',
    fill: 'bg-gradient-to-r from-yellow-600 to-yellow-400',
    glow: 'shadow-yellow-500/50',
    text: 'text-yellow-400',
  },
  int: {
    bg: 'bg-purple-500/20',
    fill: 'bg-gradient-to-r from-purple-600 to-purple-400',
    glow: 'shadow-purple-500/50',
    text: 'text-purple-400',
  },
};

const sizeMap = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function StatBar({
  label,
  value,
  maxValue = 100,
  color,
  size = 'md',
  showValue = true,
  animated = true,
}: StatBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const colors = colorMap[color];

  return (
    <div className="flex items-center gap-2">
      <span className={cn('text-xs font-bold uppercase tracking-wider w-8', colors.text)}>
        {label}
      </span>
      <div className={cn('flex-1 rounded-full overflow-hidden', colors.bg, sizeMap[size])}>
        <motion.div
          className={cn('h-full rounded-full', colors.fill, `shadow-lg ${colors.glow}`)}
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      {showValue && (
        <span className={cn('text-xs font-mono w-8 text-right', colors.text)}>{value}</span>
      )}
    </div>
  );
}
