'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getDashboardStats, getTopAgentsToday } from '../actions';

// ============================================
// Types
// ============================================

interface DashboardStats {
  nodes: {
    active: number;
    in_umbra: number;
    offline: number;
    error: number;
  };
  devices: {
    online: number;
    busy: number;
    offline: number;
    error: number;
  };
  activitiesLastHour: number;
  wormholesToday: number;
  lastUpdated: string;
}

// ============================================
// Node/Device Health Summary Card
// ============================================

export function HealthSummaryWidget() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setFetchError(false);
        const data = await getDashboardStats();
        setStats(data);
      } catch (e) {
        console.error('Failed to fetch stats:', e);
        setFetchError(true);
        // 에러 시 기본값 설정
        setStats({
          nodes: { active: 0, in_umbra: 0, offline: 0, error: 0 },
          devices: { online: 0, busy: 0, offline: 0, error: 0 },
          activitiesLastHour: 0,
          wormholesToday: 0,
          lastUpdated: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30초 폴링
    return () => clearInterval(interval);
  }, []);

  // 로딩 중 스켈레톤 표시
  if (loading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-neutral-800 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-neutral-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // 에러 발생 시 에러 UI 표시
  if (fetchError && !stats) {
    return (
      <div className="bg-neutral-900 border border-red-800 rounded-lg p-4">
        <div className="text-red-400 text-sm text-center py-4">
          데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도됩니다.
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const totalNodes = stats.nodes.active + stats.nodes.in_umbra + stats.nodes.offline + stats.nodes.error;
  const totalDevices = stats.devices.online + stats.devices.busy + stats.devices.offline + stats.devices.error;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-neutral-300 text-sm font-mono">SYSTEM HEALTH</span>
        <span className="text-neutral-600 text-xs">
          {new Date(stats.lastUpdated).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Nodes */}
        <StatCard
          icon="🖥️"
          label="Nodes Online"
          value={stats.nodes.active + stats.nodes.in_umbra}
          total={totalNodes}
          color="emerald"
        />
        
        {/* In Umbra (보라색 펄스) */}
        <UmbraStatCard
          count={stats.nodes.in_umbra}
          total={totalNodes}
        />
        
        {/* Devices */}
        <StatCard
          icon="📱"
          label="Devices Connected"
          value={stats.devices.online + stats.devices.busy}
          total={totalDevices}
          color="blue"
        />
        
        {/* Errors */}
        <StatCard
          icon="⚠️"
          label="Errors"
          value={stats.devices.error + stats.nodes.error}
          color={stats.devices.error + stats.nodes.error > 0 ? 'red' : 'neutral'}
        />
      </div>

      {/* Activity Bar */}
      <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center justify-between text-sm">
        <span className="text-neutral-500">
          Activities (1h): <span className="text-neutral-300">{stats.activitiesLastHour}</span>
        </span>
        <span className="text-neutral-500">
          Wormholes (today): <span className="text-purple-400">{stats.wormholesToday}</span>
        </span>
      </div>
    </div>
  );
}

// ============================================
// Umbra Stat Card (보라색 펄스 4s)
// ============================================

function UmbraStatCard({ count, total }: { count: number; total: number }) {
  return (
    <motion.div
      animate={{
        boxShadow: count > 0 ? [
          '0 0 0 0 rgba(147, 51, 234, 0)',
          '0 0 20px 5px rgba(147, 51, 234, 0.3)',
          '0 0 0 0 rgba(147, 51, 234, 0)',
        ] : 'none',
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="bg-purple-950/30 border border-purple-900/50 rounded-lg p-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🌑</span>
        <span className="text-purple-400 text-xs">숨그늘</span>
      </div>
      <div className="text-2xl font-mono text-purple-300">
        {count}
        <span className="text-purple-600 text-sm ml-1">/{total}</span>
      </div>
      <div className="text-purple-600 text-xs mt-1">In Umbra</div>
    </motion.div>
  );
}

// ============================================
// Generic Stat Card
// ============================================

interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  total?: number;
  color: 'emerald' | 'blue' | 'red' | 'neutral' | 'purple';
}

function StatCard({ icon, label, value, total, color }: StatCardProps) {
  const colors = {
    emerald: 'border-emerald-900/50 bg-emerald-950/30 text-emerald-400',
    blue: 'border-blue-900/50 bg-blue-950/30 text-blue-400',
    red: 'border-red-900/50 bg-red-950/30 text-red-400',
    neutral: 'border-neutral-800 bg-neutral-900 text-neutral-400',
    purple: 'border-purple-900/50 bg-purple-950/30 text-purple-400',
  };

  return (
    <div className={`rounded-lg p-3 border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-mono">
        {value}
        {total !== undefined && (
          <span className="text-sm ml-1 opacity-50">/{total}</span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Top Agents Widget
// ============================================

export function TopAgentsWidget() {
  const [data, setData] = useState<{
    topActivity: Array<{ agent_id: string; total_activities: number }>;
    topEconomy: Array<{ agent_id: string; total_rewards: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getTopAgentsToday();
        setData(result);
      } catch (e) {
        console.error('Failed to fetch top agents:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-neutral-800 rounded w-1/3 mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-8 bg-neutral-800 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Activity */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🏆</span>
          <span className="text-neutral-300 text-sm font-mono">TOP ACTIVITY TODAY</span>
        </div>
        
        {data.topActivity.length === 0 ? (
          <div className="text-neutral-600 text-sm text-center py-4">
            아직 활동 데이터 없음
          </div>
        ) : (
          <div className="space-y-2">
            {data.topActivity.map((agent, i) => (
              <div
                key={agent.agent_id}
                className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${i < 3 ? 'text-amber-400' : 'text-neutral-600'}`}>
                    #{i + 1}
                  </span>
                  <span className="text-neutral-300 font-mono text-sm truncate max-w-[150px]">
                    {agent.agent_id}
                  </span>
                </div>
                <span className="text-emerald-400 font-mono text-sm">
                  {agent.total_activities}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Economy */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💰</span>
          <span className="text-neutral-300 text-sm font-mono">TOP ECONOMY TODAY</span>
        </div>
        
        {data.topEconomy.length === 0 ? (
          <div className="text-neutral-600 text-sm text-center py-4">
            아직 경제 데이터 없음
          </div>
        ) : (
          <div className="space-y-2">
            {data.topEconomy.map((agent, i) => (
              <div
                key={agent.agent_id}
                className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${i < 3 ? 'text-amber-400' : 'text-neutral-600'}`}>
                    #{i + 1}
                  </span>
                  <span className="text-neutral-300 font-mono text-sm truncate max-w-[150px]">
                    {agent.agent_id}
                  </span>
                </div>
                <span className="text-yellow-400 font-mono text-sm">
                  {typeof agent.total_rewards === 'number' 
                    ? agent.total_rewards.toFixed(2) 
                    : agent.total_rewards}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


