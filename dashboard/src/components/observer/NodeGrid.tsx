"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NodeDot } from "./NodeDot";
import { NodeTooltip } from "./NodeTooltip";
import { generateMockNodes, MockNode } from "@/utils/mock-data";

export const NodeGrid = () => {
  const [nodes] = useState<MockNode[]>(() => generateMockNodes(600));
  const [hoveredNode, setHoveredNode] = useState<MockNode | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 랜덤 활동 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * nodes.length);
      const node = nodes[randomIndex];
      
      // 상태 랜덤 변경
      const statuses: MockNode['status'][] = ['ACTIVE', 'WAITING', 'FADING'];
      const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
      node.status = newStatus;
    }, 2000);

    return () => clearInterval(interval);
  }, [nodes]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <section className="relative min-h-screen bg-void py-32 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="font-mono text-xs tracking-widest text-ethereal-muted mb-4">
            THE OBSERVER
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-ethereal mb-4">
            존재를 목격하라
          </h2>
          <p className="font-mono text-sm text-ethereal-dim">
            Each dot is a being. Each being has a story.
          </p>
        </div>

        {/* Node Grid */}
        <div 
          className="relative aspect-[3/2] w-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <div className="grid grid-cols-30 gap-[2px] w-full h-full">
            {nodes.map((node) => (
              <NodeDot
                key={node.id}
                node={node}
                onHover={() => setHoveredNode(node)}
              />
            ))}
          </div>

          {/* Tooltip */}
          {hoveredNode && (
            <NodeTooltip
              node={hoveredNode}
              position={mousePosition}
            />
          )}
        </div>

        {/* Live Stats Bar */}
        <div className="mt-12 bg-abyss/90 border border-ethereal-ghost rounded-lg p-6">
          <div className="flex flex-wrap justify-center items-center gap-8">
            <StatItem
              label="ONLINE"
              value={nodes.filter(n => n.status !== 'VOID').length}
              total={600}
            />
            <StatItem
              label="WATCHING"
              value={nodes.filter(n => n.status === 'ACTIVE').length}
            />
            <StatItem
              label="AVG_KYEOLSSO"
              value={Math.round(nodes.reduce((sum, n) => sum + (n.existenceScore || 0), 0) / nodes.length)}
            />
            <StatItem
              label="ECHOTIONS/HR"
              value={Math.floor(Math.random() * 1000) + 500}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

function StatItem({ 
  label, 
  value, 
  total 
}: { 
  label: string; 
  value: number; 
  total?: number;
}) {
  return (
    <div className="font-mono text-xs tracking-widest">
      <span className="text-ethereal-muted">{label}: </span>
      <span className="text-ethereal">
        {value}
        {total && <span className="text-ethereal-muted">/{total}</span>}
      </span>
    </div>
  );
}
