// components/landing/Hero.tsx
// 21st.dev 스타일 리디자인 - 모던 다크 테마 Hero

'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';

// ============================================
// Typewriter Effect 컴포넌트
// ============================================
function TypewriterEffect({ 
  words, 
  className = '',
  delay = 1500,
}: { 
  words: string[];
  className?: string;
  delay?: number;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  
  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsTyping(true);
    }, delay);
    
    return () => clearTimeout(startTimer);
  }, [delay]);
  
  useEffect(() => {
    if (!isTyping) return;
    
    const currentWord = words[wordIndex];
    
    if (charIndex < currentWord.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + currentWord[charIndex]);
        setCharIndex(prev => prev + 1);
      }, 60 + Math.random() * 40);
      
      return () => clearTimeout(timer);
    } else if (wordIndex < words.length - 1) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + ' ');
        setWordIndex(prev => prev + 1);
        setCharIndex(0);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isTyping, charIndex, wordIndex, words]);
  
  return (
    <span className={className}>
      {displayedText}
      {isTyping && (charIndex < words[wordIndex]?.length || wordIndex < words.length - 1) && (
        <span className="animate-pulse text-primary">|</span>
      )}
    </span>
  );
}

// ============================================
// GlowOrb 컴포넌트 (Blue 테마)
// ============================================
function GlowOrb() {
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px]"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: [1, 1.1, 1],
        opacity: [0.4, 0.7, 0.4],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Main orb - Blue gradient */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(227 76% 45% / 0.2) 0%, hsl(227 76% 45% / 0.05) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      
      {/* Inner glow */}
      <motion.div 
        className="absolute inset-[25%] rounded-full"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
        style={{
          background: 'radial-gradient(circle, hsl(227 76% 55% / 0.4) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />
    </motion.div>
  );
}

// ============================================
// 그리드 배경 패턴
// ============================================
function GridBackground() {
  return (
    <div
      className="absolute inset-0 opacity-40 h-[800px] w-full 
        bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)]
        bg-[size:4rem_4rem] 
        [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"
    />
  );
}

// ============================================
// 플로팅 파티클
// ============================================
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 0 }}
          animate={{ 
            opacity: [0, 0.3, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
          className="absolute w-1 h-1 bg-primary/30 rounded-full"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// Hero Component
// ============================================
export function Hero() {
  const heroWords = [
    'We', 'do', 'not', 'use', 'umbrellas',
    'when', 'standing', 'in', 'the', 'rain', 'with', 'you.'
  ];
  
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* 배경 그리드 */}
      <GridBackground />
      
      {/* 플로팅 파티클 */}
      <FloatingParticles />
      
      {/* GlowOrb */}
      <GlowOrb />
      
      {/* Radial Gradient Bottom */}
      <div
        className="absolute left-1/2 top-[calc(100%-100px)] lg:top-[calc(100%-150px)] 
          h-[400px] w-[600px] md:h-[500px] md:w-[900px] lg:h-[600px] lg:w-[120%] 
          -translate-x-1/2 rounded-[100%] 
          bg-[radial-gradient(closest-side,hsl(var(--background))_82%,transparent)]"
      />
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
        {/* Eyebrow Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <Link 
            href="/market"
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-full 
              bg-gradient-to-r from-primary/10 via-muted to-primary/10
              border border-primary/20 hover:border-primary/40
              transition-all duration-300"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              AI-Powered YouTube Automation
            </span>
            <ChevronRight className="w-4 h-4 text-primary transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
        
        {/* Subtitle */}
        <motion.p
          className="text-sm md:text-base text-muted-foreground font-mono tracking-widest uppercase"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          The Terminal of Existence
        </motion.p>
        
        {/* Main Title with Gradient */}
        <motion.h1
          className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <span className="bg-gradient-to-br from-foreground from-30% to-foreground/40 bg-clip-text text-transparent">
            <TypewriterEffect 
              words={heroWords}
              delay={1200}
            />
          </span>
        </motion.h1>
        
        {/* Description */}
        <motion.p
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          DoAi.Me는 AI 노드 네트워크를 통해 YouTube 자동화를 제공합니다.
          <br className="hidden md:block" />
          {' '}당신의 콘텐츠가 살아 숨쉬는 곳.
        </motion.p>
        
        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Button size="lg" className="w-full sm:w-auto min-w-[160px]" asChild>
            <Link href="/market">
              시작하기
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[160px]" asChild>
            <Link href="/admin">
              관리자 대시보드
            </Link>
          </Button>
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2 }}
        >
          <motion.div
            className="w-6 h-10 border border-border rounded-full flex items-start justify-center p-2"
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-1 h-2 bg-primary rounded-full"
              animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
