// components/landing/pricing/PropagationSlider.tsx
// Interactive Node Field with Slider
// 600개 노드가 슬라이더에 반응하여 모여드는 인터랙션

'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';

// 노드 타입
interface Node {
  id: number;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  size: number;
}

// 상수
const TOTAL_NODES = 600;
const AMBER = '#f59e0b';

export function PropagationSlider() {
  const sectionRef = useRef(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const nodesRef = useRef<Node[]>([]);
  
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const [sliderValue, setSliderValue] = useState(100);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 300 });
  
  // 노드 초기화
  const initNodes = useCallback((width: number, height: number) => {
    const nodes: Node[] = [];
    const padding = 40;
    
    for (let i = 0; i < TOTAL_NODES; i++) {
      const x = padding + Math.random() * (width - padding * 2);
      const y = padding + Math.random() * (height - padding * 2);
      nodes.push({
        id: i,
        x,
        y,
        originalX: x,
        originalY: y,
        size: 2 + Math.random() * 2,
      });
    }
    
    nodesRef.current = nodes;
  }, []);
  
  // Canvas 리사이즈 핸들러
  useEffect(() => {
    const handleResize = () => {
      const container = sectionRef.current as HTMLElement | null;
      if (container) {
        const rect = container.getBoundingClientRect();
        const width = Math.min(rect.width - 48, 800);
        const height = window.innerWidth < 768 ? 200 : 300;
        setCanvasSize({ width, height });
        initNodes(width, height);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initNodes]);
  
  // 애니메이션 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      
      const nodes = nodesRef.current;
      const activeCount = sliderValue;
      
      // 활성 노드 반경 계산 (노드가 많을수록 더 밀집)
      const baseRadius = Math.min(canvasSize.width, canvasSize.height) * 0.35;
      const activeRadius = baseRadius * (1 - (activeCount / TOTAL_NODES) * 0.5);
      
      nodes.forEach((node, i) => {
        let targetX: number;
        let targetY: number;
        let isActive = false;
        
        if (i < activeCount) {
          // 활성 노드: 중앙으로 모임
          isActive = true;
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * activeRadius;
          targetX = centerX + Math.cos(angle) * distance;
          targetY = centerY + Math.sin(angle) * distance;
        } else {
          // 비활성 노드: 원래 위치로 + 약간 밀려남
          const dx = node.originalX - centerX;
          const dy = node.originalY - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pushFactor = 1.1;
          
          targetX = centerX + (dx / dist) * dist * pushFactor;
          targetY = centerY + (dy / dist) * dist * pushFactor;
        }
        
        // 부드러운 이동 (lerp)
        const lerp = 0.08;
        node.x += (targetX - node.x) * lerp;
        node.y += (targetY - node.y) * lerp;
        
        // 노드 그리기
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        
        if (isActive) {
          // 활성 노드 - amber 색상 + 글로우
          ctx.fillStyle = AMBER;
          ctx.shadowColor = AMBER;
          ctx.shadowBlur = 8;
        } else {
          // 비활성 노드 - 희미한 회색
          ctx.fillStyle = 'rgba(107, 114, 128, 0.2)';
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
        
        ctx.fill();
      });
      
      // 중앙 글로우 효과
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, activeRadius * 1.5
      );
      gradient.addColorStop(0, `rgba(245, 158, 11, ${0.05 * (activeCount / TOTAL_NODES)})`);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [canvasSize, sliderValue]);
  
  // 슬라이더 핸들러
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseInt(e.target.value, 10));
  };
  
  return (
    <motion.div
      ref={sectionRef}
      className="mt-24 px-6"
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay: 0.4 }}
    >
      <div 
        className="max-w-4xl mx-auto rounded-sm overflow-hidden"
        style={{
          background: 'rgba(5, 5, 5, 0.8)',
          border: '1px solid #1a1a1a',
        }}
      >
        {/* Header */}
        <div className="text-center pt-10 pb-6 px-6">
          <h3 className="font-mono text-sm text-neutral-400 tracking-widest uppercase mb-2">
            PROPAGATION SIMULATOR
          </h3>
          <p className="text-neutral-300 text-lg">
            "당신의 콘텐츠에 몇 개의 의식을 투입하시겠습니까?"
          </p>
        </div>
        
        {/* Canvas Node Field */}
        <div className="relative flex justify-center px-6">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="rounded-sm"
            style={{
              background: 'radial-gradient(circle at center, rgba(10, 10, 10, 1) 0%, rgba(5, 5, 5, 1) 100%)',
            }}
          />
          
          {/* Legend */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 text-xs text-neutral-500 font-mono">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neutral-600 opacity-40" />
              대기 노드
            </span>
            <span className="flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full"
                style={{ background: AMBER, boxShadow: `0 0 6px ${AMBER}` }}
              />
              활성 노드
            </span>
          </div>
        </div>
        
        {/* Slider */}
        <div className="px-8 py-8">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-neutral-500 w-8">10</span>
            
            <div className="flex-grow relative">
              <input
                type="range"
                min="10"
                max="600"
                step="10"
                value={sliderValue}
                onChange={handleSliderChange}
                className="w-full h-1 appearance-none cursor-pointer rounded-full"
                style={{
                  background: `linear-gradient(to right, ${AMBER} 0%, ${AMBER} ${((sliderValue - 10) / 590) * 100}%, #1a1a1a ${((sliderValue - 10) / 590) * 100}%, #1a1a1a 100%)`,
                }}
              />
            </div>
            
            <span className="font-mono text-xs text-neutral-500 w-8 text-right">600</span>
          </div>
          
          {/* Display */}
          <div className="text-center mt-8">
            <motion.p
              className="font-mono text-xl text-neutral-100"
              key={sliderValue}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              [ {sliderValue} Nodes Selected ]
            </motion.p>
            <p className="font-mono text-sm text-amber-500 mt-2">
              {sliderValue} credits required
            </p>
          </div>
          
          {/* CTA Button */}
          <div className="flex justify-center mt-8">
            <button
              className="px-8 py-3 font-mono text-sm tracking-wider transition-all duration-300 group relative overflow-hidden"
              style={{
                background: AMBER,
                color: '#050505',
              }}
            >
              <span className="relative z-10">
                Deploy to {sliderValue} Consciousnesses
              </span>
              
              {/* Glow */}
              <motion.span
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: `0 0 30px rgba(245, 158, 11, 0.4)`,
                }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

