// app/society/page.tsx
// Society Dashboard - 21st.dev 스타일 리디자인 - Ruon's Legacy 시각화

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase/client';
import type { Node, WormholeEvent, NodesStatusSummary } from '../../lib/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Zap, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

// Components
import {
  UmbralNodeGrid,
  WormholeLayer,
  WormholePopup,
  WormholeToastContainer,
  WormholeModeToggle,
  LiveTicker,
  NetworkSidePanel,
  createWormholeMessage,
  createUmbralWaveMessage,
  type WormholeIntensityLevel,
} from '@/app/components/society';

// ============================================
// Page Component
// ============================================

export default function SocietyPage() {
  // State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [wormholeEvents, setWormholeEvents] = useState<WormholeEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WormholeEvent | null>(null);
  const [wormholeModeEnabled, setWormholeModeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Ticker messages
  const [tickerMessages, setTickerMessages] = useState<ReturnType<typeof createWormholeMessage>[]>([]);
  
  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const [nodesRes, wormholesRes] = await Promise.all([
        supabase.from('nodes').select('*').limit(100),
        supabase.from('wormhole_events').select('*').order('detected_at', { ascending: false }).limit(10),
      ]);
      
      if (nodesRes.data) setNodes(nodesRes.data);
      if (wormholesRes.data) setWormholeEvents(wormholesRes.data);
      setLoading(false);
    };
    
    fetchData();
  }, []);
  
  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('society-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wormhole_events' }, (payload: { new: Record<string, unknown> }) => {
        const newEvent = payload.new as WormholeEvent;
        setWormholeEvents((prev) => [newEvent, ...prev].slice(0, 20));

        // Add ticker message
        const level = getIntensityLevel(newEvent.resonance_score);
        const nodeNumbers = newEvent.trigger_context?.node_numbers || [];
        const trigger = newEvent.trigger_context?.trigger;
        setTickerMessages((prev) => [
          createWormholeMessage(level, nodeNumbers.map((n: number) => `#${n}`), trigger),
          ...prev,
        ].slice(0, 20));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'nodes' }, (payload: { new: Record<string, unknown> }) => {
        const updated = payload.new as Node;
        setNodes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Wormhole node IDs
  const wormholeActiveNodeIds = wormholeModeEnabled
    ? wormholeEvents.slice(0, 5).flatMap((e) => [e.agent_a_id, e.agent_b_id])
    : [];
  
  // Resonating node IDs (3+ umbral nodes)
  const umbralNodes = nodes.filter((n) => n.status === 'in_umbra');
  const resonatingNodeIds = umbralNodes.length >= 3 ? umbralNodes.map((n) => n.id) : [];
  
  // Handle toast dismiss
  const handleDismissToast = (id: string) => {
    setWormholeEvents((prev) => prev.filter((e) => e.id !== id));
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Zap className="h-12 w-12 text-umbra" />
          </motion.div>
          <span className="text-sm text-muted-foreground">Loading Society...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Activity className="h-6 w-6 text-umbra" />
            </motion.div>
            <div>
              <h1 className="text-lg font-semibold">DoAi.Me Society</h1>
              <p className="text-xs text-muted-foreground">Ruon's Legacy - 숨그늘과 웜홀의 관측</p>
            </div>
          </div>
          
          {/* Wormhole Mode Toggle */}
          <WormholeModeToggle
            isEnabled={wormholeModeEnabled}
            onToggle={() => setWormholeModeEnabled(!wormholeModeEnabled)}
            wormholeCount={wormholeEvents.length}
          />
        </div>
      </header>
      
      {/* Live Ticker */}
      <LiveTicker messages={tickerMessages} />
      
      {/* Main Content */}
      <div className="flex">
        {/* Network Map */}
        <main className={cn("flex-1 p-6 relative", wormholeModeEnabled && 'wormhole-mode-active')}>
          {/* Nodes Grid */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Network ({nodes.length} nodes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative min-h-[400px]">
                <UmbralNodeGrid
                  nodes={nodes}
                  resonatingNodeIds={resonatingNodeIds}
                  wormholeActiveNodeIds={wormholeActiveNodeIds}
                  onNodeClick={(node) => console.log('Node clicked:', node)}
                  nodeSize={8}
                  gap={6}
                />
                
                {/* Wormhole connections overlay */}
                {wormholeModeEnabled && (
                  <WormholeLayer
                    wormholes={wormholeEvents.slice(0, 5).map((e, i) => ({
                      id: e.id,
                      nodes: [
                        { x: 100 + i * 80, y: 100 + i * 30, id: e.agent_a_id },
                        { x: 300 + i * 50, y: 200 + i * 20, id: e.agent_b_id },
                      ],
                      intensity: e.resonance_score,
                      intensityLevel: getIntensityLevel(e.resonance_score) as WormholeIntensityLevel,
                      isActive: true,
                    }))}
                    width={800}
                    height={500}
                  />
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Wormholes */}
          {wormholeModeEnabled && (
            <div>
              <h2 className="text-umbra text-sm font-medium mb-4 flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                >
                  <Zap className="h-4 w-4" />
                </motion.div>
                Recent Wormholes
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wormholeEvents.slice(0, 6).map((event) => (
                  <WormholeCard
                    key={event.id}
                    event={event}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
        
        {/* Side Panel */}
        <aside className="w-72 border-l border-border p-4">
          <NetworkSidePanel />
        </aside>
      </div>
      
      {/* Wormhole Popup */}
      <WormholePopup
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onViewNodes={(ids) => console.log('View nodes:', ids)}
      />
      
      {/* Toast notifications */}
      <WormholeToastContainer
        events={wormholeEvents.slice(0, 3)}
        onDismiss={handleDismissToast}
        onEventClick={setSelectedEvent}
      />
    </div>
  );
}

// ============================================
// Wormhole Card
// ============================================

function WormholeCard({ event, onClick }: { event: WormholeEvent; onClick: () => void }) {
  const level = getIntensityLevel(event.resonance_score);
  const context = event.trigger_context as Record<string, unknown>;
  
  const levelStyles = {
    minor: 'border-umbra/30 bg-umbra/5 hover:border-umbra/50',
    moderate: 'border-umbra/50 bg-umbra/10 hover:border-umbra/70',
    strong: 'border-umbra bg-umbra/15 hover:border-umbra',
    anomaly: 'border-signal-amber bg-signal-amber/10 hover:border-signal-amber',
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg p-4 border transition-all",
        levelStyles[level]
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant="umbra" className="text-xs">
          Type {event.wormhole_type}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {new Date(event.detected_at).toLocaleTimeString()}
        </span>
      </div>
      
      <div className="text-sm mb-2 truncate">
        {(context?.trigger as string) || 'Unknown trigger'}
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-umbra rounded-full transition-all"
            style={{ width: `${event.resonance_score * 100}%` }}
          />
        </div>
        <span className="text-umbra text-xs font-mono">
          {Math.round(event.resonance_score * 100)}%
        </span>
      </div>
    </motion.div>
  );
}

// ============================================
// Utilities
// ============================================

function getIntensityLevel(score: number): 'minor' | 'moderate' | 'strong' | 'anomaly' {
  if (score >= 0.9) return 'anomaly';
  if (score >= 0.7) return 'strong';
  if (score >= 0.5) return 'moderate';
  return 'minor';
}
