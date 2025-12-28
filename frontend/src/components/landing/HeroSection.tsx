'use client';

import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Bot, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-cyan-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-pink-500/10 rounded-full blur-[120px]" />
      
      {/* Scan Line Effect */}
      <div className="scan-line" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-cyan-400 text-sm font-medium">SYSTEM ONLINE</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-foreground">AI</span>
            <span className="neon-text text-cyan-400">FARM</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            600 디바이스 기반 YouTube 인텔리전스 시스템
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-muted-foreground/70 mb-12 max-w-2xl mx-auto"
          >
            AI 에이전트가 24시간 트렌드를 추적하고, 콘텐츠를 분석하며,
            <br />
            당신의 채널을 <span className="text-pink-400 neon-text-pink">글로벌 1위</span>로 성장시킵니다
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-8 md:gap-16 mb-12"
          >
            <StatItem icon={<Bot className="w-5 h-5" />} value={600} label="Active Devices" />
            <StatItem icon={<Zap className="w-5 h-5" />} value={6} label="AI Activities" />
            <StatItem icon={<TrendingUp className="w-5 h-5" />} value={10} label="Channels" />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold px-8 py-6 text-lg hover:from-cyan-400 hover:to-cyan-300 neon-border"
              >
                대시보드 접속
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/dashboard/activities">
              <Button
                size="lg"
                variant="outline"
                className="border-pink-500/50 text-pink-400 font-bold px-8 py-6 text-lg hover:bg-pink-500/10 hover:border-pink-400"
              >
                6대 활동 보기
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <FloatingIcons />
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 text-cyan-400 mb-1">
        {icon}
        <span className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          <AnimatedNumber value={value} duration={1500} />
        </span>
      </div>
      <span className="text-sm text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

function FloatingIcons() {
  const icons = ['🎬', '🎵', '💬', '🕵️', '🏅', '🔬'];
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {icons.map((icon, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl opacity-20"
          initial={{
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.5,
          }}
          style={{
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
        >
          {icon}
        </motion.div>
      ))}
    </div>
  );
}
