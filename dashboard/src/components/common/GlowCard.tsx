'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'pink' | 'purple' | 'yellow' | 'orange' | 'green' | 'blue';
  hover?: boolean;
  onClick?: () => void;
}

const glowColorMap = {
  cyan: 'hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] border-cyan-500/30 hover:border-cyan-400/60',
  pink: 'hover:shadow-[0_0_30px_rgba(255,0,128,0.3)] border-pink-500/30 hover:border-pink-400/60',
  purple: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] border-purple-500/30 hover:border-purple-400/60',
  yellow: 'hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] border-yellow-500/30 hover:border-yellow-400/60',
  orange: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] border-orange-500/30 hover:border-orange-400/60',
  green: 'hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] border-green-500/30 hover:border-green-400/60',
  blue: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] border-blue-500/30 hover:border-blue-400/60',
};

export function GlowCard({
  children,
  className,
  glowColor = 'cyan',
  hover = true,
  onClick,
}: GlowCardProps) {
  return (
    <motion.div
      className={cn(
        'relative rounded-xl border bg-card/80 backdrop-blur-sm p-4 transition-all duration-300',
        hover && glowColorMap[glowColor],
        hover && 'hover:-translate-y-1',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      whileHover={hover ? { scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
    >
      {children}
    </motion.div>
  );
}
