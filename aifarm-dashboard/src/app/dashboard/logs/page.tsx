'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowCard } from '@/components/common/GlowCard';
import { mockUnifiedLogs, mockBEActivityLogs, mockDORequests } from '@/data/do-mock';
import type { UnifiedLog, BEActivityLog } from '@/types/do-request';
import { 
  List,
  Filter,
  Search,
  Calendar,
  Send,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Smartphone,
  RefreshCw,
  Ban,
  CalendarClock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function LogsPage() {
  const [filter, setFilter] = useState<'all' | 'DO' | 'BE'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = mockUnifiedLogs.filter(log => {
    if (filter !== 'all' && log.source !== filter) return false;
    if (searchQuery && !log.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getSourceIcon = (source: 'DO' | 'BE') => {
    return source === 'DO' 
      ? <Send className="w-4 h-4 text-cyan-400" />
      : <Activity className="w-4 h-4 text-purple-400" />;
  };

  const getStatusIcon = (status: UnifiedLog['status']) => {
    const icons = {
      success: <CheckCircle className="w-4 h-4 text-green-400" />,
      partial: <CheckCircle className="w-4 h-4 text-yellow-400" />,
      failed: <XCircle className="w-4 h-4 text-red-400" />,
      pending: <Clock className="w-4 h-4 text-gray-400" />,
      in_progress: <Play className="w-4 h-4 text-yellow-400" />,
      scheduled: <CalendarClock className="w-4 h-4 text-blue-400" />,
      cancelled: <Ban className="w-4 h-4 text-gray-500" />,
    };
    return icons[status];
  };

  const getActivityBadge = (activityType: string) => {
    const colors: Record<string, string> = {
      shorts_remix: 'bg-cyan-500/20 text-cyan-400',
      playlist_curator: 'bg-purple-500/20 text-purple-400',
      persona_commenter: 'bg-pink-500/20 text-pink-400',
      trend_scout: 'bg-yellow-500/20 text-yellow-400',
      challenge_hunter: 'bg-orange-500/20 text-orange-400',
      thumbnail_lab: 'bg-blue-500/20 text-blue-400',
      do_request: 'bg-cyan-500/20 text-cyan-400',
      youtube_watch: 'bg-red-500/20 text-red-400',
    };
    
    const labels: Record<string, string> = {
      shorts_remix: '리믹스',
      playlist_curator: '플레이리스트',
      persona_commenter: '코멘터',
      trend_scout: '트렌드',
      challenge_hunter: '챌린지',
      thumbnail_lab: '썸네일',
      do_request: 'DO처리',
      youtube_watch: '시청',
    };

    return (
      <Badge className={colors[activityType] || 'bg-gray-500/20 text-gray-400'}>
        {labels[activityType] || activityType}
      </Badge>
    );
  };

  // 통계
  const stats = {
    total: filteredLogs.length,
    doCount: filteredLogs.filter(l => l.source === 'DO').length,
    beCount: filteredLogs.filter(l => l.source === 'BE').length,
    success: filteredLogs.filter(l => l.status === 'success').length,
    failed: filteredLogs.filter(l => l.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <List className="w-7 h-7 text-purple-400" />
            통합 내역
          </h1>
          <p className="text-muted-foreground">DO 요청 지시와 BE 에이전트 활동의 통합 기록</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            기간 선택
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<List />} label="전체" value={stats.total} color="purple" />
        <StatCard icon={<Send />} label="DO 요청" value={stats.doCount} color="cyan" />
        <StatCard icon={<Activity />} label="BE 활동" value={stats.beCount} color="pink" />
        <StatCard icon={<CheckCircle />} label="성공" value={stats.success} color="green" />
        <StatCard icon={<XCircle />} label="실패" value={stats.failed} color="red" />
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <Tabs defaultValue="all" className="flex-1" onValueChange={(v) => setFilter(v as 'all' | 'DO' | 'BE')}>
          <TabsList className="bg-background/50 border border-border/50">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <List className="w-4 h-4" /> 전체
            </TabsTrigger>
            <TabsTrigger value="DO" className="flex items-center gap-2">
              <Send className="w-4 h-4" /> DO 요청
            </TabsTrigger>
            <TabsTrigger value="BE" className="flex items-center gap-2">
              <Activity className="w-4 h-4" /> BE 활동
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="검색..."
            className="pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:border-purple-500 outline-none w-full md:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Logs List */}
      <GlowCard glowColor="purple" hover={false}>
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredLogs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.02 }}
                  className="p-4 rounded-lg bg-background/50 border border-border/50 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Source & Status */}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`p-2 rounded-lg ${log.source === 'DO' ? 'bg-cyan-500/10' : 'bg-purple-500/10'}`}>
                        {getSourceIcon(log.source)}
                      </div>
                      {getStatusIcon(log.status)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={log.source === 'DO' ? 'border-cyan-500/50 text-cyan-400' : 'border-purple-500/50 text-purple-400'}>
                          {log.source}
                        </Badge>
                        {getActivityBadge(log.activityType)}
                        {log.deviceId && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            #{log.deviceId}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{log.description}</p>
                      
                      {/* Metadata */}
                      {log.metadata && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {log.source === 'DO' && log.metadata.progress && (
                            <span>
                              진행: {(log.metadata.progress as { completed: number; total: number }).completed}/
                              {(log.metadata.progress as { completed: number; total: number }).total}
                            </span>
                          )}
                          {log.source === 'BE' && log.metadata.discoveredData && (
                            <span className="text-purple-400">
                              {Object.entries(log.metadata.discoveredData as Record<string, unknown>)
                                .filter(([, v]) => v)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: ko })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>해당하는 내역이 없습니다</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </GlowCard>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span>DO: 요청 지시</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>BE: 에이전트 활동</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3 h-3 text-green-400" />
          <span>성공</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="w-3 h-3 text-red-400" />
          <span>실패</span>
        </div>
        <div className="flex items-center gap-2">
          <Play className="w-3 h-3 text-yellow-400" />
          <span>진행중</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarClock className="w-3 h-3 text-blue-400" />
          <span>예약됨</span>
        </div>
        <div className="flex items-center gap-2">
          <Ban className="w-3 h-3 text-gray-500" />
          <span>취소됨</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode;
  label: string; 
  value: number; 
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    purple: 'border-purple-500/30 text-purple-400',
    cyan: 'border-cyan-500/30 text-cyan-400',
    pink: 'border-pink-500/30 text-pink-400',
    green: 'border-green-500/30 text-green-400',
    red: 'border-red-500/30 text-red-400',
  };

  return (
    <div className={`p-3 rounded-lg border bg-background/50 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  );
}

