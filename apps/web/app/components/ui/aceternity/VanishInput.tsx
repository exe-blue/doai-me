'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// ============================================
// PlaceholdersAndVanishInput Component
// 입력 시 입자가 되어 사라지며 페이지 이동
// ============================================

interface VanishInputProps {
  placeholders: string[];
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  redirectTo?: string;
  className?: string;
}

export function VanishInput({
  placeholders,
  onChange,
  onSubmit,
  redirectTo = '/dashboard',
  className,
}: VanishInputProps) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cycle placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  const handleSubmit = useCallback(() => {
    if (!value.trim() || isAnimating) return;

    setIsAnimating(true);

    // 입자 생성
    const newParticles: Array<{ id: number; x: number; y: number }> = [];
    const chars = value.split('');
    chars.forEach((char, i) => {
      for (let j = 0; j < 5; j++) {
        newParticles.push({
          id: i * 5 + j,
          x: (i / chars.length) * 100 + Math.random() * 10 - 5,
          y: 50 + Math.random() * 20 - 10,
        });
      }
    });
    setParticles(newParticles);

    // 콜백
    onSubmit?.(value);

    // 페이지 이동
    setTimeout(() => {
      router.push(redirectTo);
    }, 1500);
  }, [value, isAnimating, onSubmit, router, redirectTo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-lg', className)}>
      {/* Input Container */}
      <div className="relative">
        <motion.div
          className={cn(
            'relative overflow-hidden rounded-2xl',
            'border border-neutral-800',
            'bg-gradient-to-r from-neutral-900/80 to-neutral-950/80',
            'backdrop-blur-xl',
            isAnimating && 'pointer-events-none'
          )}
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
          
          {/* Input */}
          <div className="relative flex items-center px-6 py-4">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                onChange?.(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                'flex-1 bg-transparent outline-none',
                'text-neutral-200 placeholder:text-neutral-600',
                'font-mono text-lg',
                isAnimating && 'opacity-0'
              )}
              placeholder=""
            />

            {/* Submit Button */}
            <motion.button
              onClick={handleSubmit}
              disabled={!value.trim() || isAnimating}
              className={cn(
                'ml-4 px-4 py-2 rounded-xl',
                'bg-purple-500/20 hover:bg-purple-500/30',
                'text-purple-400 text-sm font-mono',
                'transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Enter
            </motion.button>
          </div>

          {/* Animated Placeholder */}
          {!value && !isAnimating && (
            <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-neutral-500 font-mono text-lg"
                >
                  {placeholders[placeholderIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Vanishing Particles */}
        <AnimatePresence>
          {isAnimating && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
            >
              {particles.map((particle) => (
                <motion.div
                  key={particle.id}
                  className="absolute w-1.5 h-1.5 rounded-full bg-purple-400"
                  style={{
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                  }}
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{
                    opacity: 0,
                    scale: 0,
                    x: (Math.random() - 0.5) * 200,
                    y: (Math.random() - 0.5) * 200 - 100,
                  }}
                  transition={{
                    duration: 1 + Math.random() * 0.5,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hint Text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-neutral-600 text-sm mt-4 font-mono"
      >
        Press Enter to invoke
      </motion.p>
    </div>
  );
}

