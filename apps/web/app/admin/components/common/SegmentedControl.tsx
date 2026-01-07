'use client';

import { motion } from 'framer-motion';
import { useRef, useEffect } from 'react';

// ============================================
// Types
// ============================================

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  size?: 'sm' | 'md';
  className?: string;
}

// ============================================
// SegmentedControl Component
// ============================================

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'sm',
  className = '',
}: SegmentedControlProps<T>) {
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs min-h-[44px] min-w-[44px]',
    md: 'px-3 py-1.5 text-sm min-h-[44px] min-w-[44px]',
  };

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  
  // 각 옵션 버튼에 대한 refs 배열
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // options 길이에 맞게 refs 배열 초기화
  useEffect(() => {
    buttonRefs.current = buttonRefs.current.slice(0, options.length);
  }, [options.length]);

  return (
    <div 
      role="group" 
      aria-label="Segmented control"
      className={`relative flex gap-0.5 bg-neutral-800 rounded-lg p-0.5 ${className}`}
    >
      {/* Animated Background */}
      {selectedIndex >= 0 && (
        <motion.div
          layoutId="segment-bg"
          className="absolute bg-neutral-600 rounded"
          style={{
            width: `calc(${100 / options.length}% - 2px)`,
            height: 'calc(100% - 4px)',
            top: '2px',
          }}
          animate={{
            left: `calc(${(selectedIndex / options.length) * 100}% + 2px)`,
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        />
      )}

      {/* Options */}
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(el) => { buttonRefs.current[index] = el; }}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          className={`
            relative z-10 flex-1 rounded transition-colors touch-manipulation
            ${sizeStyles[size]}
            ${value === option.value ? 'text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'}
          `}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              const nextIndex = e.key === 'ArrowRight' 
                ? (index + 1) % options.length 
                : (index - 1 + options.length) % options.length;
              onChange(options[nextIndex].value);
              // 포커스를 새로 선택된 버튼으로 이동
              buttonRefs.current[nextIndex]?.focus();
            }
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// Time Filter Control (Pre-configured)
// ============================================

import { TimeFilter } from '@/lib/admin/types';

interface TimeFilterControlProps {
  value: TimeFilter;
  onChange: (value: TimeFilter) => void;
  options?: TimeFilter[];
  className?: string;
}

export function TimeFilterControl({
  value,
  onChange,
  options = ['1h', '24h', '7d', 'all'],
  className = '',
}: TimeFilterControlProps) {
  const labels: Record<TimeFilter, string> = {
    '1h': '1h',
    '24h': '24h',
    '7d': '7d',
    '30d': '30d',
    'all': 'All',
  };

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={options.map((opt) => ({ value: opt, label: labels[opt] }))}
      className={className}
    />
  );
}


