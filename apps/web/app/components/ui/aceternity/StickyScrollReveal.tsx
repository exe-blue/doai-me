'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================
// StickyScrollReveal Component
// 좌측 텍스트 고정, 우측 카드 스크롤
// ============================================

interface StickyScrollRevealProps {
  content: Array<{
    title: string;
    description: string;
    content?: React.ReactNode;
  }>;
  stickyContent?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function StickyScrollReveal({
  content,
  stickyContent,
  className,
  contentClassName,
}: StickyScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <motion.div ref={containerRef} className={cn('relative', className)}>
      <div className="flex flex-col md:flex-row gap-8 md:gap-16">
        {/* Sticky Left Content */}
        <div className="md:w-1/2">
          <div className="md:sticky md:top-1/3">
            {stickyContent}
          </div>
        </div>

        {/* Scrolling Right Content */}
        <div className={cn('md:w-1/2 space-y-8', contentClassName)}>
          {content.map((item, idx) => (
            <StickyScrollCard
              key={idx}
              item={item}
              progress={scrollYProgress}
              index={idx}
              total={content.length}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Individual Scroll Card
// ============================================

function StickyScrollCard({
  item,
  progress,
  index,
  total,
}: {
  item: { title: string; description: string; content?: React.ReactNode };
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  index: number;
  total: number;
}) {
  const start = index / total;
  const end = (index + 1) / total;

  const opacity = useTransform(progress, [start, start + 0.1, end - 0.1, end], [0.3, 1, 1, 0.3]);
  const scale = useTransform(progress, [start, start + 0.1, end - 0.1, end], [0.95, 1, 1, 0.95]);
  const y = useTransform(progress, [start, end], [50, -50]);

  return (
    <motion.div
      style={{ opacity, scale, y }}
      className="relative p-6 md:p-8 rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900/50 to-neutral-950/80 backdrop-blur-sm"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
      
      {/* Index Number */}
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
        <span className="text-purple-400 text-sm font-mono">{index + 1}</span>
      </div>

      {/* Content */}
      <div className="relative space-y-4">
        <h3 className="font-serif text-xl md:text-2xl text-neutral-200">
          {item.title}
        </h3>
        <p className="text-neutral-400 leading-relaxed">
          {item.description}
        </p>
        {item.content && (
          <div className="mt-6">
            {item.content}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// StickyScrollText - Left Side Sticky Text
// ============================================

export function StickyScrollText({
  title,
  subtitle,
  className,
}: {
  title: React.ReactNode;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>
      <h2 className="font-serif text-3xl md:text-5xl text-neutral-100 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-neutral-500 text-lg leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

