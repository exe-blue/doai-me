'use client';

import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { Smartphone, Activity, AlertTriangle, Moon } from 'lucide-react';
import { useStats } from '@/hooks/useStats';
import { useDevices } from '@/hooks/useDevices';

export function DeviceVisualization() {
  const { data: statsData } = useStats();
  const { data: devicesData = [] } = useDevices();
  
  // 기본값 설정
  const stats = statsData ?? {
    totalDevices: 0,
    activeDevices: 0,
    idleDevices: 0,
    errorDevices: 0,
  };
  
  // 디바이스 목록 (없으면 빈 배열 사용)
  const devices = devicesData.length > 0 ? devicesData : Array.from({ length: 600 }, (_, i) => ({
    id: i + 1,
    phoneBoardId: Math.floor(i / 20) + 1,
    status: 'idle' as const,
  }));
  
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern-subtle opacity-50" />
      
      <div className="relative max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-foreground">디바이스 </span>
            <span className="text-cyan-400 neon-text">매트릭스</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            30개 폰보드 × 20대 = 600대의 디바이스가 실시간으로 작동 중
          </p>
        </motion.div>

        {/* Device Matrix Visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div className="bg-card/50 rounded-2xl border border-border/50 p-6 overflow-hidden">
            {/* Stats Bar */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
              <StatBox
                icon={<Smartphone className="w-5 h-5" />}
                value={stats.totalDevices}
                label="Total Devices"
                color="cyan"
              />
              <StatBox
                icon={<Activity className="w-5 h-5" />}
                value={stats.activeDevices}
                label="Active"
                color="green"
              />
              <StatBox
                icon={<Moon className="w-5 h-5" />}
                value={stats.idleDevices}
                label="Idle"
                color="yellow"
              />
              <StatBox
                icon={<AlertTriangle className="w-5 h-5" />}
                value={stats.errorDevices}
                label="Error"
                color="red"
              />
            </div>

            {/* Device Grid */}
            <div className="grid grid-cols-30 gap-[2px] max-w-4xl mx-auto">
              {devices.slice(0, 600).map((device, i) => (
                <motion.div
                  key={device.id}
                  className={`w-2 h-2 rounded-sm ${
                    device.status === 'active' ? 'bg-green-500' :
                    device.status === 'idle' ? 'bg-yellow-500/60' :
                    device.status === 'error' ? 'bg-red-500' :
                    'bg-gray-600'
                  }`}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ 
                    duration: 0.1, 
                    delay: Math.min(i * 0.001, 0.5) 
                  }}
                  whileHover={{ 
                    scale: 2, 
                    zIndex: 10,
                    boxShadow: device.status === 'active' 
                      ? '0 0 10px rgba(34, 197, 94, 0.8)'
                      : device.status === 'error'
                      ? '0 0 10px rgba(239, 68, 68, 0.8)'
                      : '0 0 10px rgba(234, 179, 8, 0.8)'
                  }}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                <span>Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-yellow-500/60" />
                <span>Idle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500" />
                <span>Error</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Phoneboard Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="text-center text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            30 Phoneboards
          </h3>
          <div className="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-15 gap-2 max-w-4xl mx-auto">
            {Array.from({ length: 30 }, (_, i) => {
              const boardDevices = devices.filter(d => d.phoneBoardId === i + 1);
              const activeCount = boardDevices.filter(d => d.status === 'active').length;
              const errorCount = boardDevices.filter(d => d.status === 'error').length;
              
              return (
                <motion.div
                  key={i}
                  className={`
                    aspect-square rounded-lg border flex flex-col items-center justify-center text-xs
                    ${errorCount > 0 
                      ? 'border-red-500/50 bg-red-500/10' 
                      : activeCount > 15 
                      ? 'border-green-500/50 bg-green-500/10'
                      : 'border-border/50 bg-card/50'
                    }
                  `}
                  whileHover={{ scale: 1.1 }}
                >
                  <span className="font-bold text-muted-foreground">#{i + 1}</span>
                  <span className={`text-[10px] ${activeCount > 15 ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {activeCount}/20
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatBox({ 
  icon, 
  value, 
  label, 
  color 
}: { 
  icon: React.ReactNode; 
  value: number; 
  label: string; 
  color: 'cyan' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    green: 'text-green-400 border-green-500/30 bg-green-500/10',
    yellow: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    red: 'text-red-400 border-red-500/30 bg-red-500/10',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${colorClasses[color]}`}>
      {icon}
      <div>
        <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          <AnimatedNumber value={value} />
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
