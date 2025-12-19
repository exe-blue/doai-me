'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowCard } from '@/components/common/GlowCard';
import { mockDORequests, mockDOStats } from '@/data/do-mock';
import type { DORequest, DORequestCreateInput, DORequestStatus } from '@/types/do-request';
import { 
  Plus, 
  Play, 
  Pause, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  Eye,
  Edit,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function DORequestsPage() {
  const [requests, setRequests] = useState<DORequest[]>(mockDORequests);
  const [selectedRequest, setSelectedRequest] = useState<DORequest | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<DORequestStatus | 'all'>('all');
  const stats = mockDOStats;

  const filteredRequests = filterStatus === 'all' 
    ? requests 
    : requests.filter(r => r.status === filterStatus);

  const getStatusBadge = (status: DORequestStatus) => {
    const styles: Record<DORequestStatus, { color: string; icon: React.ReactNode; label: string }> = {
      pending: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <Clock className="w-3 h-3" />, label: '대기' },
      scheduled: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Clock className="w-3 h-3" />, label: '예약' },
      in_progress: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Play className="w-3 h-3" />, label: '진행중' },
      completed: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle className="w-3 h-3" />, label: '완료' },
      failed: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="w-3 h-3" />, label: '실패' },
      cancelled: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <XCircle className="w-3 h-3" />, label: '취소' },
    };

    const style = styles[status];
    return (
      <Badge variant="outline" className={`${style.color} flex items-center gap-1`}>
        {style.icon}
        {style.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: 1 | 2 | 3) => {
    const styles = {
      1: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'P1' },
      2: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'P2' },
      3: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'P3' },
    };
    const style = styles[priority];
    return (
      <Badge variant="outline" className={style.color}>
        {style.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Send className="w-7 h-7 text-cyan-400" />
            DO 요청 지시
          </h1>
          <p className="text-muted-foreground">에이전트에게 작업을 요청하고 진행 상황을 확인합니다</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" />
              새 요청 만들기
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 DO 요청 만들기</DialogTitle>
              <DialogDescription>
                에이전트에게 보낼 작업 요청을 입력하세요
              </DialogDescription>
            </DialogHeader>
            <DORequestForm onSubmit={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="전체" value={stats.total} color="cyan" />
        <StatCard label="대기" value={stats.pending} color="gray" />
        <StatCard label="예약" value={stats.scheduled} color="blue" />
        <StatCard label="진행중" value={stats.inProgress} color="yellow" highlight />
        <StatCard label="완료" value={stats.completed} color="green" />
        <StatCard label="실패" value={stats.failed} color="red" />
        <StatCard label="성공률" value={`${stats.successRate}%`} color="purple" />
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="all" className="w-full" onValueChange={(v) => setFilterStatus(v as DORequestStatus | 'all')}>
        <TabsList className="bg-background/50 border border-border/50">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="in_progress">진행중</TabsTrigger>
          <TabsTrigger value="pending">대기</TabsTrigger>
          <TabsTrigger value="scheduled">예약</TabsTrigger>
          <TabsTrigger value="completed">완료</TabsTrigger>
          <TabsTrigger value="failed">실패</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Request List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlowCard glowColor="cyan" hover={false}>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredRequests.map((request, i) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedRequest(request)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedRequest?.id === request.id
                          ? 'bg-cyan-500/10 border-cyan-500/50'
                          : 'bg-background/50 border-border/50 hover:border-cyan-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getPriorityBadge(request.priority)}
                            {getStatusBadge(request.status)}
                            {request.executeImmediately && (
                              <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                <Zap className="w-3 h-3 mr-1" />
                                즉시
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-medium truncate">{request.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {request.keyword} {request.videoTitle && `• ${request.videoTitle}`}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>에이전트 {request.agentRange.start}-{request.agentRange.end}</div>
                          <div>
                            {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: ko })}
                          </div>
                        </div>
                      </div>
                      
                      {request.status === 'in_progress' && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>진행률</span>
                            <span>{request.completedAgents}/{request.totalAgents} ({Math.round(request.completedAgents / request.totalAgents * 100)}%)</span>
                          </div>
                          <Progress value={(request.completedAgents / request.totalAgents) * 100} className="h-1.5" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </GlowCard>
        </div>

        {/* Detail Panel */}
        <div>
          <GlowCard glowColor="purple" hover={false} className="h-[600px]">
            {selectedRequest ? (
              <DORequestDetail request={selectedRequest} />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Eye className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>요청을 선택하면 상세 정보가 표시됩니다</p>
                </div>
              </div>
            )}
          </GlowCard>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, highlight }: { 
  label: string; 
  value: number | string; 
  color: string;
  highlight?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    cyan: 'border-cyan-500/30 text-cyan-400',
    gray: 'border-gray-500/30 text-gray-400',
    blue: 'border-blue-500/30 text-blue-400',
    yellow: 'border-yellow-500/30 text-yellow-400',
    green: 'border-green-500/30 text-green-400',
    red: 'border-red-500/30 text-red-400',
    purple: 'border-purple-500/30 text-purple-400',
  };

  return (
    <div className={`p-3 rounded-lg border bg-background/50 ${colorClasses[color]} ${highlight ? 'ring-1 ring-yellow-500/50' : ''}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  );
}

function DORequestDetail({ request }: { request: DORequest }) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {getStatusBadgeStatic(request.status)}
            {getPriorityBadgeStatic(request.priority)}
          </div>
          <h2 className="text-lg font-bold">{request.title}</h2>
          {request.description && (
            <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoItem label="키워드" value={request.keyword} />
          <InfoItem label="에이전트" value={`${request.agentRange.start}-${request.agentRange.end}`} />
          <InfoItem label="배치 크기" value={`${request.batchSize}대`} />
          <InfoItem label="좋아요 확률" value={`${request.likeProbability}%`} />
          <InfoItem label="댓글 확률" value={`${request.commentProbability}%`} />
          <InfoItem label="구독 확률" value={`${request.subscribeProbability}%`} />
          <InfoItem label="시청 시간" value={`${request.watchTimeMin}-${request.watchTimeMax}초`} />
          <InfoItem label="시청 비율" value={`${request.watchPercentMin}-${request.watchPercentMax}%`} />
        </div>

        {request.videoTitle && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">영상 정보</div>
            <div className="font-medium">{request.videoTitle}</div>
            {request.channelName && (
              <div className="text-sm text-muted-foreground">{request.channelName}</div>
            )}
            {request.videoUrl && (
              <a href={request.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline">
                YouTube에서 보기 →
              </a>
            )}
          </div>
        )}

        {request.aiCommentEnabled && (
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <div className="text-xs text-purple-400 mb-1">AI 댓글 활성화</div>
            <div className="text-sm">{request.aiCommentStyle || '기본 스타일'}</div>
          </div>
        )}

        {request.status === 'in_progress' && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex justify-between text-sm mb-2">
              <span>진행 상황</span>
              <span>{request.completedAgents}/{request.totalAgents}</span>
            </div>
            <Progress value={(request.completedAgents / request.totalAgents) * 100} className="h-2" />
            {request.failedAgents > 0 && (
              <div className="text-xs text-red-400 mt-2">
                실패: {request.failedAgents}건
              </div>
            )}
          </div>
        )}

        {request.memo && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">메모</div>
            <div className="text-sm">{request.memo}</div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div>생성: {new Date(request.createdAt).toLocaleString('ko-KR')}</div>
          <div>수정: {new Date(request.updatedAt).toLocaleString('ko-KR')}</div>
          {request.completedAt && (
            <div>완료: {new Date(request.completedAt).toLocaleString('ko-KR')}</div>
          )}
        </div>

        <div className="flex gap-2">
          {request.status === 'pending' && (
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
              <Play className="w-3 h-3 mr-1" /> 시작
            </Button>
          )}
          {request.status === 'in_progress' && (
            <Button size="sm" variant="outline" className="flex-1 border-yellow-500/50 text-yellow-400">
              <Pause className="w-3 h-3 mr-1" /> 일시정지
            </Button>
          )}
          <Button size="sm" variant="outline" className="flex-1">
            <Edit className="w-3 h-3 mr-1" /> 수정
          </Button>
          <Button size="sm" variant="outline" className="border-red-500/50 text-red-400">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-background/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function getStatusBadgeStatic(status: DORequestStatus) {
  const styles: Record<DORequestStatus, { color: string; label: string }> = {
    pending: { color: 'bg-gray-500/20 text-gray-400', label: '대기' },
    scheduled: { color: 'bg-blue-500/20 text-blue-400', label: '예약' },
    in_progress: { color: 'bg-yellow-500/20 text-yellow-400', label: '진행중' },
    completed: { color: 'bg-green-500/20 text-green-400', label: '완료' },
    failed: { color: 'bg-red-500/20 text-red-400', label: '실패' },
    cancelled: { color: 'bg-gray-500/20 text-gray-400', label: '취소' },
  };
  return <Badge className={styles[status].color}>{styles[status].label}</Badge>;
}

function getPriorityBadgeStatic(priority: 1 | 2 | 3) {
  const styles = {
    1: { color: 'bg-red-500/20 text-red-400', label: 'P1 긴급' },
    2: { color: 'bg-yellow-500/20 text-yellow-400', label: 'P2 일반' },
    3: { color: 'bg-gray-500/20 text-gray-400', label: 'P3 낮음' },
  };
  return <Badge className={styles[priority].color}>{styles[priority].label}</Badge>;
}

function DORequestForm({ onSubmit }: { onSubmit: () => void }) {
  const [formData, setFormData] = useState<Partial<DORequestCreateInput>>({
    type: 'youtube_watch',
    priority: 2,
    agentStart: 1,
    agentEnd: 100,
    batchSize: 5,
    likeProbability: 30,
    commentProbability: 10,
    subscribeProbability: 5,
    watchTimeMin: 60,
    watchTimeMax: 180,
    watchPercentMin: 40,
    watchPercentMax: 90,
    aiCommentEnabled: true,
    executeImmediately: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit DO Request:', formData);
    // TODO: API 호출
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">제목 *</label>
          <input
            type="text"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            placeholder="요청 제목"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">키워드 *</label>
          <input
            type="text"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            placeholder="검색할 키워드"
            value={formData.keyword || ''}
            onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">영상 제목 (선택)</label>
          <input
            type="text"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            placeholder="특정 영상 제목"
            value={formData.videoTitle || ''}
            onChange={(e) => setFormData({ ...formData, videoTitle: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">채널명 (선택)</label>
          <input
            type="text"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            placeholder="채널명"
            value={formData.channelName || ''}
            onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">에이전트 시작</label>
          <input
            type="number"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            min={1}
            max={600}
            value={formData.agentStart || 1}
            onChange={(e) => setFormData({ ...formData, agentStart: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">에이전트 끝</label>
          <input
            type="number"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            min={1}
            max={600}
            value={formData.agentEnd || 100}
            onChange={(e) => setFormData({ ...formData, agentEnd: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">좋아요 확률 (%)</label>
          <input
            type="number"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            min={0}
            max={100}
            value={formData.likeProbability || 30}
            onChange={(e) => setFormData({ ...formData, likeProbability: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">댓글 확률 (%)</label>
          <input
            type="number"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            min={0}
            max={100}
            value={formData.commentProbability || 10}
            onChange={(e) => setFormData({ ...formData, commentProbability: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">구독 확률 (%)</label>
          <input
            type="number"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            min={0}
            max={100}
            value={formData.subscribeProbability || 5}
            onChange={(e) => setFormData({ ...formData, subscribeProbability: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">배치 크기</label>
          <input
            type="number"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            min={1}
            max={50}
            value={formData.batchSize || 5}
            onChange={(e) => setFormData({ ...formData, batchSize: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">우선순위</label>
          <select
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            value={formData.priority || 2}
            onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as 1 | 2 | 3 })}
          >
            <option value={1}>P1 - 긴급</option>
            <option value={2}>P2 - 일반</option>
            <option value={3}>P3 - 낮음</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">최소 시청 시간 (초)</label>
          <input
            type="number"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            min={10}
            max={600}
            value={formData.watchTimeMin || 60}
            onChange={(e) => setFormData({ ...formData, watchTimeMin: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">최대 시청 시간 (초)</label>
          <input
            type="number"
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none"
            min={10}
            max={600}
            value={formData.watchTimeMax || 180}
            onChange={(e) => setFormData({ ...formData, watchTimeMax: Number(e.target.value) })}
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">메모</label>
          <textarea
            className="w-full p-2 rounded-lg bg-background border border-border focus:border-cyan-500 outline-none resize-none h-20"
            placeholder="추가 메모"
            value={formData.memo || ''}
            onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
          />
        </div>

        <div className="col-span-2 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.aiCommentEnabled || false}
              onChange={(e) => setFormData({ ...formData, aiCommentEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">AI 댓글 생성</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.executeImmediately || false}
              onChange={(e) => setFormData({ ...formData, executeImmediately: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">즉시 실행</span>
          </label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onSubmit}>
          취소
        </Button>
        <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
          <Send className="w-4 h-4 mr-2" />
          요청 생성
        </Button>
      </DialogFooter>
    </form>
  );
}

