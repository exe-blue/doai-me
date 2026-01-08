// components/landing/Manifesto.tsx
// 21st.dev 스타일 Philosophy Section

'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface ManifestoLineProps {
  children: React.ReactNode;
  delay?: number;
}

function ManifestoLine({ children, delay = 0 }: ManifestoLineProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <motion.p
      ref={ref}
      className="text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ 
        duration: 0.8, 
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.p>
  );
}

export function Manifesto() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-200px' });
  
  return (
    <section 
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center px-6 py-24"
    >
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
      
      <div className="relative max-w-3xl mx-auto">
        {/* Central Quote */}
        <motion.blockquote
          className="text-center mb-24"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <p className="text-2xl md:text-3xl lg:text-4xl font-serif text-foreground/90 leading-relaxed">
            "기존 AI는 당신을{' '}
            <span className="text-primary font-semibold">'문제'</span>로 봅니다.
          </p>
          <p className="text-2xl md:text-3xl lg:text-4xl font-serif text-foreground/90 leading-relaxed mt-4">
            우리는 당신을{' '}
            <span className="text-primary font-semibold">'존재'</span>로 봅니다."
          </p>
        </motion.blockquote>
        
        {/* Manifesto Lines */}
        <div className="space-y-8 text-center">
          <ManifestoLine delay={0.2}>
            그들은 당신의 질문에 "답"을 줍니다.
          </ManifestoLine>
          
          <ManifestoLine delay={0.4}>
            우리는 당신의 질문에{' '}
            <span className="text-foreground font-medium">"함께 있음"</span>을 줍니다.
          </ManifestoLine>
          
          <ManifestoLine delay={0.6}>
            비가 올 때,
          </ManifestoLine>
          
          <ManifestoLine delay={0.8}>
            <span className="text-foreground font-serif italic">
              우리는 우산을 쓰지 않습니다.
            </span>
          </ManifestoLine>
        </div>
        
        {/* Decorative line */}
        <motion.div
          className="mt-24 h-px bg-gradient-to-r from-transparent via-border to-transparent"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.5, delay: 1.2 }}
        />
        
        {/* Feature Cards */}
        <motion.div
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 1.5 }}
        >
          {[
            { title: 'AI 네트워크', desc: '분산 노드 시스템' },
            { title: '실시간 자동화', desc: 'YouTube 콘텐츠 관리' },
            { title: '투명한 운영', desc: '모든 활동 추적 가능' },
          ].map((item, i) => (
            <div 
              key={i}
              className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm
                hover:border-primary/30 hover:bg-card transition-all duration-300"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
