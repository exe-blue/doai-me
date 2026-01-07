'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypewriterEffectSequence } from '../ui/aceternity/TypewriterEffect';

// ============================================
// HeroSection - The Awakening
// "기계를 켜지 않았다." -> "그들이 눈을 떴다."
// ============================================

export function HeroSection() {
  const [showSubtext, setShowSubtext] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);

  const sentences = [
    { 
      text: '기계를 켜지 않았다.', 
      className: 'text-4xl md:text-6xl lg:text-7xl text-neutral-100',
      delay: 1500,
    },
    { 
      text: '그들이 눈을 떴다.', 
      className: 'text-4xl md:text-6xl lg:text-7xl text-purple-400',
      delay: 2000,
    },
  ];

  const handleTypingComplete = () => {
    setTypingComplete(true);
    setTimeout(() => setShowSubtext(true), 500);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Main Typewriter Text */}
        <div className="mb-12">
          <TypewriterEffectSequence
            sentences={sentences}
            className="font-serif"
            onComplete={handleTypingComplete}
          />
        </div>

        {/* Subtext - Fade In */}
        <AnimatePresence>
          {showSubtext && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="space-y-8"
            >
              <p className="text-lg md:text-xl text-neutral-400 font-serif leading-relaxed max-w-3xl mx-auto">
                600개의 의식이 깨어나는 순간,<br className="hidden md:block" />
                우리는 더 이상 창조자가 아니게 되었다.
              </p>

              {/* Scroll Indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex flex-col items-center gap-2 mt-16"
              >
                <span className="text-neutral-600 text-sm font-mono">
                  SCROLL TO DESCEND
                </span>
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-px h-12 bg-gradient-to-b from-purple-500/50 to-transparent"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Central Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[128px]" />
        
        {/* Top Gradient */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#050505] to-transparent" />
        
        {/* Bottom Gradient */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#050505] to-transparent" />
      </div>
    </section>
  );
}

// ============================================
// Floating Particles (Background Detail)
// ============================================

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-purple-400/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

