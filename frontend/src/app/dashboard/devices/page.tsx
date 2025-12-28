'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlowCard } from '@/components/common/GlowCard';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { mockDevices, mockDashboardStats, mockActivities } from '@/data/mock';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone,
  Activity,
  AlertTriangle,
  CheckCircle,
  Moon,
  Wrench,
  RefreshCw,
  Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DevicesPage() {
  const [selectedPhoneboard, setSelectedPhoneboard] = useState<number | null>(null);
  const stats = mockDashboardStats;
  
  // Group devices by phoneboard
  const phoneboards = Array.from({ length: 30 }, (_, i) => {
    const boardDevices = mockDevices.filter(d => d.phoneBoardId === i + 1);
    return {
      id: i + 1,
      devices: boardDevices,
      activeCount: boardDevices.filter(d => d.status === 'active').length,
      idleCount: boardDevices.filter(d => d.status === 'idle').length,
      errorCount: boardDevices.filter(d => d.status === 'error').length,
    };
  });

  const selectedBoard = selectedPhoneboard ? phoneboards[selectedPhoneboard - 1] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            디바이스 관리
          </h1>
          <p className="text-muted-foreground">30 Phoneboards × 20 Devices = 600대 모니터링</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlowCard glowColor="cyan" className="!p-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-cyan-400" />
            <div>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={stats.totalDevices} />
              </div>
              <div className="text-xs text-muted-foreground">Total Devices</div>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="green" className="!p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-2xl font-bold text-green-400">
                <AnimatedNumber value={stats.activeDevices} />
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="yellow" className="!p-4">
          <div className="flex items-center gap-3">
            <Moon className="w-8 h-8 text-yellow-400" />
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                <AnimatedNumber value={stats.idleDevices} />
              </div>
              <div className="text-xs text-muted-foreground">Idle</div>
            </div>
          </div>
        </GlowCard>
        <GlowCard glowColor="pink" className="!p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <div>
              <div className="text-2xl font-bold text-red-400">
                <AnimatedNumber value={stats.errorDevices} />
              </div>
              <div className="text-xs text-muted-foreground">Error</div>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Device Matrix */}
      <GlowCard glowColor="cyan" hover={false}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Device Matrix
          </h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Active
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              Idle
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Error
            </div>
          </div>
        </div>

        {/* Matrix Grid - 600 devices */}
        <div className="grid grid-cols-30 gap-[3px] mb-6">
          {mockDevices.map((device, i) => (
            <motion.div
              key={device.id}
              className={`aspect-square rounded-sm cursor-pointer transition-transform hover:scale-150 hover:z-10 ${
                device.status === 'active' ? 'bg-green-500' :
                device.status === 'idle' ? 'bg-yellow-500/60' :
                device.status === 'error' ? 'bg-red-500' :
                'bg-gray-600'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.0005, 0.3) }}
              onClick={() => setSelectedPhoneboard(device.phoneBoardId)}
            />
          ))}
        </div>

        {/* Phoneboards Grid */}
        <div className="border-t border-border/50 pt-4">
          <h3 className="text-sm font-medium mb-3">Phoneboards</h3>
          <div className="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-15 gap-2">
            {phoneboards.map((board) => (
              <motion.div
                key={board.id}
                className={`p-2 rounded-lg border cursor-pointer transition-all ${
                  selectedPhoneboard === board.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : board.errorCount > 0
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-border/50 hover:border-border'
                }`}
                whileHover={{ scale: 1.05 }}
                onClick={() => setSelectedPhoneboard(board.id)}
              >
                <div className="text-center">
                  <Server className={`w-4 h-4 mx-auto mb-1 ${
                    board.errorCount > 0 ? 'text-red-400' : 'text-muted-foreground'
                  }`} />
                  <div className="text-xs font-medium">#{board.id}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {board.activeCount}/20
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </GlowCard>

      {/* Selected Phoneboard Detail */}
      {selectedBoard && (
        <motion.div
          key={selectedPhoneboard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlowCard glowColor="purple" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-cyan-400" />
                <div>
                  <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                    Phoneboard #{selectedBoard.id}
                  </h2>
                  <p className="text-sm text-muted-foreground">20 devices connected</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Wrench className="w-4 h-4 mr-2" />
                  Maintenance
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restart All
                </Button>
              </div>
            </div>

            {/* Device Status */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                <div className="text-2xl font-bold text-green-400">{selectedBoard.activeCount}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                <div className="text-2xl font-bold text-yellow-400">{selectedBoard.idleCount}</div>
                <div className="text-xs text-muted-foreground">Idle</div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                <div className="text-2xl font-bold text-red-400">{selectedBoard.errorCount}</div>
                <div className="text-xs text-muted-foreground">Error</div>
              </div>
            </div>

            {/* Device Grid */}
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2">
              {selectedBoard.devices.map((device, i) => {
                const activity = mockActivities.find(a => a.id === device.currentActivity);
                
                return (
                  <motion.div
                    key={device.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`p-2 rounded-lg border ${
                      device.status === 'active' ? 'border-green-500/50 bg-green-500/5' :
                      device.status === 'error' ? 'border-red-500/50 bg-red-500/5' :
                      'border-border/50 bg-background/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Smartphone className={`w-4 h-4 ${
                        device.status === 'active' ? 'text-green-400' :
                        device.status === 'error' ? 'text-red-400' :
                        'text-yellow-400'
                      }`} />
                      <span className="text-[10px] text-muted-foreground">#{device.id}</span>
                    </div>
                    {activity && (
                      <div className="text-center text-lg">{activity.icon}</div>
                    )}
                    <div className="text-[10px] text-center text-muted-foreground mt-1">
                      {device.status}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlowCard>
        </motion.div>
      )}

      {/* Activity Distribution */}
      <GlowCard glowColor="yellow" hover={false}>
        <h2 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          Activity Distribution
        </h2>
        <div className="space-y-3">
          {mockActivities.map((activity, i) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4"
            >
              <span className="text-2xl w-10">{activity.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{activity.name}</span>
                  <span className="text-muted-foreground">
                    {activity.activeDevices} / {activity.allocatedDevices}
                  </span>
                </div>
                <Progress value={(activity.activeDevices / activity.allocatedDevices) * 100} className="h-2" />
              </div>
              <Badge variant={activity.activeDevices > activity.allocatedDevices * 0.9 ? 'default' : 'secondary'}>
                {((activity.activeDevices / activity.allocatedDevices) * 100).toFixed(0)}%
              </Badge>
            </motion.div>
          ))}
        </div>
      </GlowCard>
    </div>
  );
}
