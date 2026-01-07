'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================
// Sparkles Component
// 600개의 입자가 유기적으로 연결되는 네트워크
// ============================================

interface SparklesProps {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  particleColor?: string;
  particleSpeed?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  opacity: number;
}

export function Sparkles({
  id = 'sparkles',
  className,
  background = 'transparent',
  minSize = 1,
  maxSize = 3,
  particleDensity = 100,
  particleColor = '#8b5cf6',
  particleSpeed = 0.5,
}: SparklesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Initialize particles
  const initParticles = useCallback(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < particleDensity; i++) {
      particles.push({
        id: i,
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        size: Math.random() * (maxSize - minSize) + minSize,
        vx: (Math.random() - 0.5) * particleSpeed,
        vy: (Math.random() - 0.5) * particleSpeed,
        opacity: Math.random() * 0.5 + 0.5,
      });
    }
    particlesRef.current = particles;
  }, [dimensions, particleDensity, minSize, maxSize, particleSpeed]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    const particles = particlesRef.current;
    const connectionDistance = 150;

    // Update and draw particles
    particles.forEach((particle, i) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Bounce off walls
      if (particle.x < 0 || particle.x > dimensions.width) {
        particle.vx *= -1;
      }
      if (particle.y < 0 || particle.y > dimensions.height) {
        particle.vy *= -1;
      }

      // Draw particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particleColor;
      ctx.globalAlpha = particle.opacity;
      ctx.fill();

      // Draw connections
      for (let j = i + 1; j < particles.length; j++) {
        const other = particles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < connectionDistance) {
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(other.x, other.y);
          ctx.strokeStyle = particleColor;
          ctx.globalAlpha = (1 - distance / connectionDistance) * 0.3;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Mouse interaction
      const mdx = particle.x - mouseRef.current.x;
      const mdy = particle.y - mouseRef.current.y;
      const mouseDistance = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mouseDistance < 200 && mouseDistance > 0) {
        const force = (200 - mouseDistance) / 200;
        particle.vx += (mdx / mouseDistance) * force * 0.02;
        particle.vy += (mdy / mouseDistance) * force * 0.02;
      }

      // Limit velocity
      const maxVel = 2;
      particle.vx = Math.max(-maxVel, Math.min(maxVel, particle.vx));
      particle.vy = Math.max(-maxVel, Math.min(maxVel, particle.vy));
    });

    ctx.globalAlpha = 1;
    animationRef.current = requestAnimationFrame(animate);
  }, [dimensions, particleColor]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current?.parentElement) {
        const { clientWidth, clientHeight } = canvasRef.current.parentElement;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize particles when dimensions change
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      initParticles();
    }
  }, [dimensions, initParticles]);

  // Start animation
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      animate();
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [dimensions, animate]);

  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className={cn('relative h-full w-full', className)} style={{ background }}>
      <canvas
        ref={canvasRef}
        id={id}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
      />
    </div>
  );
}

// ============================================
// SparklesCore - Simpler Version (Falling Stars)
// ============================================

interface SparklesCoreProps {
  className?: string;
  particleCount?: number;
}

interface Sparkle {
  id: string;
  x: string;
  y: string;
  size: number;
  delay: number;
  duration: number;
}

export function SparklesCore({
  className,
  particleCount = 50,
}: SparklesCoreProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const newSparkles: Sparkle[] = [];
    for (let i = 0; i < particleCount; i++) {
      newSparkles.push({
        id: `sparkle-${i}`,
        x: `${Math.random() * 100}%`,
        y: `${Math.random() * 100}%`,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 2,
        duration: Math.random() * 2 + 2,
      });
    }
    setSparkles(newSparkles);
  }, [particleCount]);

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute rounded-full bg-purple-400"
          style={{
            left: sparkle.x,
            top: sparkle.y,
            width: sparkle.size,
            height: sparkle.size,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: sparkle.duration,
            delay: sparkle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

