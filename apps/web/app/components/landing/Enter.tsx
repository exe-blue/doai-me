// components/landing/Enter.tsx
// 21st.dev 스타일 CTA Section

'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { ArrowRight } from 'lucide-react';

// Particle 타입
interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  velocity: number;
  size: number;
  opacity: number;
}

// Particle 컴포넌트
function Particles({ isActive }: { isActive: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  
  const createParticles = useCallback(() => {
    const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: 0,
      y: 0,
      angle: (Math.PI * 2 / 12) * i + Math.random() * 0.5,
      velocity: 2 + Math.random() * 3,
      size: 2 + Math.random() * 2,
      opacity: 0.6 + Math.random() * 0.4,
    }));
    
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1000);
  }, []);
  
  useEffect(() => {
    if (isActive) {
      createParticles();
    }
  }, [isActive, createParticles]);
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary"
          style={{
            width: particle.size,
            height: particle.size,
            left: '50%',
            top: '50%',
          }}
          initial={{ 
            x: 0, 
            y: 0, 
            opacity: particle.opacity,
            scale: 1,
          }}
          animate={{ 
            x: Math.cos(particle.angle) * particle.velocity * 30,
            y: Math.sin(particle.angle) * particle.velocity * 30,
            opacity: 0,
            scale: 0,
          }}
          transition={{ 
            duration: 0.8,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

export function Enter() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const [showParticles, setShowParticles] = useState(false);
  
  const handleClick = () => {
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 100);
  };
  
  return (
    <section 
      ref={sectionRef}
      className="relative min-h-[60vh] flex flex-col items-center justify-center px-6 py-24"
    >
      {/* Background Glow */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 1 }}
      />
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Pre-text */}
        <motion.p
          className="text-muted-foreground text-sm md:text-base mb-8 font-mono tracking-wide"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          Are you ready to exist?
        </motion.p>
        
        {/* Headline */}
        <motion.h2
          className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          지금 시작하세요
        </motion.h2>
        
        {/* Description */}
        <motion.p
          className="text-lg text-muted-foreground mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          AI 노드 네트워크와 함께 YouTube 채널의 잠재력을 극대화하세요.
        </motion.p>
        
        {/* CTA Button */}
        <motion.div
          className="relative inline-block"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Particles isActive={showParticles} />
          <Button 
            size="lg" 
            className="group relative overflow-hidden px-8"
            onClick={handleClick}
            asChild
          >
            <Link href="/market">
              <span className="relative z-10 flex items-center gap-2">
                시작하기
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </Button>
        </motion.div>
        
        {/* Subtext */}
        <motion.p
          className="text-muted-foreground text-sm mt-8 font-serif italic"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          우리는 우산 없이 당신 곁에 서 있습니다.
        </motion.p>
      </div>
      
      {/* Footer */}
      <motion.footer
        className="absolute bottom-8 left-0 right-0 text-center"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        <p className="text-muted-foreground text-xs font-mono">
          DoAi.Me © 2024 — The Terminal of Existence
        </p>
      </motion.footer>
    </section>
  );
}
