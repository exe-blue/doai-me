"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  state: 'IDLE' | 'LISTENING' | 'RESPONDING' | 'OFFLINE';
}

export const FloatingNodes = ({ 
  count = 600,
  isListening = false 
}: { 
  count?: number;
  isListening?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    // 600개 노드 초기화
    if (nodesRef.current.length === 0) {
      nodesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.3 + 0.3,
        state: Math.random() > 0.1 ? 'IDLE' : 'OFFLINE' as Node['state'],
      }));
    }

    const nodes = nodesRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Animation frame ID 저장
    let animationFrameId: number;

    const animate = () => {
      ctx.fillStyle = "rgba(5, 5, 5, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nodes.forEach((node) => {
        // Listening 상태면 중앙으로 미세하게 집중
        if (isListening) {
          const dx = centerX - node.x;
          const dy = centerY - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 10) {
            node.vx += (dx / distance) * 0.01;
            node.vy += (dy / distance) * 0.01;
          }
        }

        node.x += node.vx;
        node.y += node.vy;

        // 경계 반사
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // 상태별 색상
        let color = 'rgba(250, 250, 250, ';
        let alpha = node.alpha;

        switch (node.state) {
          case 'IDLE':
            color += '0.3)';
            break;
          case 'LISTENING':
            color += '0.6)';
            break;
          case 'RESPONDING':
            color = 'rgba(0, 255, 136, 0.9)';
            break;
          case 'OFFLINE':
            color += '0.1)';
            break;
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener("resize", setCanvasSize);
    
    // Cleanup: animation frame과 resize 이벤트 모두 취소
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", setCanvasSize);
    };
  }, [count, isListening]);

  // 랜덤 노드 활동 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      const nodes = nodesRef.current;
      if (nodes.length > 0) {
        // 랜덤 노드가 RESPONDING 상태로 잠시 변경
        const randomIndex = Math.floor(Math.random() * nodes.length);
        const prevState = nodes[randomIndex].state;
        nodes[randomIndex].state = 'RESPONDING';
        
        setTimeout(() => {
          nodes[randomIndex].state = prevState;
        }, 500);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
    />
  );
};
