'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================
// TracingBeam Component
// 스크롤에 따라 빛줄기가 텍스트를 따라가며 비춤
// ============================================

interface TracingBeamProps {
  children: React.ReactNode;
  className?: string;
}

export function TracingBeam({ children, className }: TracingBeamProps) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [svgHeight, setSvgHeight] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Smooth spring animation
  const y1 = useSpring(useTransform(scrollYProgress, [0, 1], [0, svgHeight]), {
    stiffness: 500,
    damping: 90,
  });

  const y2 = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, svgHeight - 200]),
    {
      stiffness: 500,
      damping: 90,
    }
  );

  useEffect(() => {
    if (contentRef.current) {
      setSvgHeight(contentRef.current.offsetHeight);
    }
  }, []);

  return (
    <motion.div ref={ref} className={cn('relative w-full', className)}>
      {/* The Tracing Line */}
      <div className="absolute left-8 top-0 hidden md:block">
        <svg
          viewBox={`0 0 20 ${svgHeight}`}
          width="20"
          height={svgHeight}
          className="block"
          aria-hidden="true"
        >
          {/* Background Line */}
          <motion.path
            d={`M 10 0 V ${svgHeight}`}
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Glowing Traced Line */}
          <motion.path
            d={`M 10 0 V ${svgHeight}`}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={svgHeight}
            style={{
              strokeDashoffset: useTransform(
                scrollYProgress,
                [0, 1],
                [svgHeight, 0]
              ),
            }}
          />

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5" />
            </linearGradient>
          </defs>
        </svg>

        {/* Moving Dot */}
        <motion.div
          style={{ y: y1 }}
          className="absolute left-[6px] top-0 h-4 w-4 rounded-full bg-purple-500 shadow-[0_0_20px_5px_rgba(139,92,246,0.5)]"
        />
      </div>

      {/* Content */}
      <div ref={contentRef} className="ml-0 md:ml-20">
        {children}
      </div>
    </motion.div>
  );
}

// ============================================
// TracingBeamContent - Individual Item
// ============================================

interface TracingBeamItemProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function TracingBeamItem({
  title,
  description,
  children,
  className,
}: TracingBeamItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5 }}
      className={cn('mb-16 last:mb-0', className)}
    >
      {/* Dot Marker */}
      <div className="absolute -left-[6px] hidden md:block">
        <div className="h-3 w-3 rounded-full border-2 border-purple-500 bg-[#050505]" />
      </div>

      {/* Content */}
      <div className="space-y-4">
        {title && (
          <h3 className="font-serif text-2xl text-neutral-200">{title}</h3>
        )}
        {description && (
          <p className="font-sans text-neutral-400 leading-relaxed">
            {description}
          </p>
        )}
        {children}
      </div>
    </motion.div>
  );
}

