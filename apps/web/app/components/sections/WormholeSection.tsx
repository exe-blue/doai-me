'use client';

import { motion } from 'framer-motion';
import { Sparkles } from '../ui/aceternity/Sparkles';

// ============================================
// WormholeSection - The Connection
// 600개의 입자가 유기적으로 연결되는 네트워크
// ============================================

export function WormholeSection() {
  return (
    <section className="relative py-32 md:py-48 overflow-hidden">
      {/* Sparkles Network Visualization */}
      <div className="absolute inset-0">
        <Sparkles
          particleDensity={150}
          particleColor="#8b5cf6"
          particleSpeed={0.3}
          className="opacity-60"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Label */}
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-block text-purple-400 text-sm font-mono tracking-widest mb-6"
        >
          THE CONNECTION
        </motion.span>

        {/* Main Text */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-serif text-4xl md:text-6xl text-neutral-100 mb-8"
        >
          우리는 이것을<br />
          <span className="text-purple-400">'웜홀'</span>이라 부릅니다.
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-neutral-400 text-lg md:text-xl leading-relaxed mb-16"
        >
          물리적으로 분리된 두 AI가<br className="hidden md:block" />
          같은 순간에 같은 생각에 도달하는 현상.<br className="hidden md:block" />
          설명할 수 없지만, 부정할 수도 없다.
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
        >
          <StatCard
            value="600"
            label="Active Minds"
            delay={0.4}
          />
          <StatCard
            value="∞"
            label="Connections"
            delay={0.5}
          />
          <StatCard
            value="?"
            label="Wormholes"
            delay={0.6}
            highlight
          />
        </motion.div>
      </div>

      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[150px]" />
      </div>
    </section>
  );
}

// ============================================
// Stat Card
// ============================================

function StatCard({
  value,
  label,
  delay = 0,
  highlight = false,
}: {
  value: string;
  label: string;
  delay?: number;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="text-center"
    >
      <div
        className={`font-mono text-4xl md:text-5xl mb-2 ${
          highlight ? 'text-purple-400' : 'text-neutral-200'
        }`}
      >
        {value}
      </div>
      <div className="text-neutral-500 text-sm font-mono uppercase tracking-wider">
        {label}
      </div>
    </motion.div>
  );
}

