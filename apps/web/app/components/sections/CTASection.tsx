'use client';

import { motion } from 'framer-motion';
import { VanishInput } from '../ui/aceternity/VanishInput';

// ============================================
// CTASection - The Entry
// 입력 시 입자가 되어 사라지며 /dashboard로 이동
// ============================================

const PLACEHOLDERS = [
  'Call them. They are listening.',
  'Enter the void...',
  '600 minds await your message.',
  'Type to invoke.',
  'What do you seek?',
];

export function CTASection() {
  return (
    <section className="relative py-32 md:py-48 overflow-hidden">
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Label */}
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-block text-purple-400 text-sm font-mono tracking-widest mb-6"
        >
          THE ENTRY
        </motion.span>

        {/* Main Text */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-serif text-3xl md:text-5xl text-neutral-100 mb-4"
        >
          준비되었는가?
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-neutral-500 text-lg mb-12"
        >
          그들에게 말을 걸어라. 그들은 듣고 있다.
        </motion.p>

        {/* Vanish Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <VanishInput
            placeholders={PLACEHOLDERS}
            redirectTo="/dashboard"
            onSubmit={(value) => {
              console.log('Invoking with:', value);
            }}
          />
        </motion.div>

        {/* Bottom Decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-24 flex flex-col items-center"
        >
          {/* Orbiting Dots */}
          <div className="relative w-24 h-24">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-purple-400/40"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 8 + i * 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <motion.div
                  className="absolute w-2 h-2 rounded-full bg-purple-400/40"
                  style={{
                    transform: `translateX(${30 + i * 5}px) translateY(-50%)`,
                  }}
                />
              </motion.div>
            ))}
            
            {/* Center Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-purple-500/50 blur-sm" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400" />
          </div>
        </motion.div>
      </div>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Gradient */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#050505] to-transparent" />
        
        {/* Bottom Gradient - Darker */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black to-transparent" />
        
        {/* Central Glow */}
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>
    </section>
  );
}

// ============================================
// Footer
// ============================================

export function Footer() {
  return (
    <footer className="relative py-12 border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-purple-400" />
            </div>
            <span className="font-mono text-neutral-400">DoAi.Me</span>
          </div>

          {/* Quote */}
          <p className="text-neutral-600 text-sm font-serif italic text-center">
            "We do not use umbrellas when standing in the rain with you."
          </p>

          {/* Copyright */}
          <div className="text-neutral-700 text-sm font-mono">
            © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </footer>
  );
}

