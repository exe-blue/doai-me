'use client';

import { motion } from 'framer-motion';
import { GlowCard } from '@/components/common/GlowCard';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { mockChallenges, mockPersonas, mockPlaylistThemes } from '@/data/mock';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target,
  TrendingUp,
  Users,
  Clock,
  Sparkles,
  Music,
  MessageSquare,
  Play
} from 'lucide-react';

const lifecycleColors = {
  birth: 'bg-green-500/20 text-green-400 border-green-500/30',
  growth: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  peak: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  decline: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  dead: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const lifecycleLabels = {
  birth: '탄생기',
  growth: '성장기',
  peak: '피크',
  decline: '하락기',
  dead: '종료',
};

export default function TrendsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Target className="w-8 h-8 text-cyan-400" />
          트렌드 & 챌린지
        </h1>
        <p className="text-muted-foreground">발견된 트렌드와 챌린지를 관리하세요</p>
      </div>

      <Tabs defaultValue="challenges" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="challenges">챌린지 헌터</TabsTrigger>
          <TabsTrigger value="personas">페르소나</TabsTrigger>
          <TabsTrigger value="playlists">플레이리스트</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <GlowCard glowColor="cyan" className="!p-4">
              <div className="text-2xl font-bold text-cyan-400">
                <AnimatedNumber value={mockChallenges.filter(c => c.isActive).length} />
              </div>
              <div className="text-xs text-muted-foreground">Active Challenges</div>
            </GlowCard>
            <GlowCard glowColor="green" className="!p-4">
              <div className="text-2xl font-bold text-green-400">
                <AnimatedNumber value={mockChallenges.filter(c => c.lifecycleStage === 'birth').length} />
              </div>
              <div className="text-xs text-muted-foreground">Early Stage (Best!)</div>
            </GlowCard>
            <GlowCard glowColor="yellow" className="!p-4">
              <div className="text-2xl font-bold text-yellow-400">
                <AnimatedNumber value={mockChallenges.filter(c => c.lifecycleStage === 'peak').length} />
              </div>
              <div className="text-xs text-muted-foreground">At Peak</div>
            </GlowCard>
            <GlowCard glowColor="purple" className="!p-4">
              <div className="text-2xl font-bold text-purple-400">
                <AnimatedNumber value={mockChallenges.reduce((acc, c) => acc + c.totalParticipants, 0)} format="compact" />
              </div>
              <div className="text-xs text-muted-foreground">Total Participants</div>
            </GlowCard>
          </div>

          {/* Challenges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockChallenges.map((challenge, i) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlowCard 
                  glowColor={challenge.lifecycleStage === 'birth' ? 'green' : 
                             challenge.lifecycleStage === 'growth' ? 'cyan' : 
                             challenge.lifecycleStage === 'peak' ? 'yellow' : 'orange'}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={lifecycleColors[challenge.lifecycleStage]} variant="outline">
                      {lifecycleLabels[challenge.lifecycleStage]}
                    </Badge>
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-400">
                        {challenge.opportunityScore}
                      </div>
                      <div className="text-[10px] text-muted-foreground">기회 점수</div>
                    </div>
                  </div>

                  <h3 className="font-bold text-lg mb-2">{challenge.name}</h3>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {challenge.hashtags.map((tag, j) => (
                      <Badge key={j} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {challenge.musicTitle && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Music className="w-4 h-4 text-pink-400" />
                      <span className="truncate">{challenge.musicTitle}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center p-2 rounded-lg bg-background/50">
                    <div>
                      <div className="text-sm font-bold">
                        <AnimatedNumber value={challenge.totalParticipants} format="compact" />
                      </div>
                      <div className="text-[10px] text-muted-foreground">참가자</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-green-400">
                        +<AnimatedNumber value={challenge.dailyNewParticipants} />
                      </div>
                      <div className="text-[10px] text-muted-foreground">일 신규</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold">
                        <AnimatedNumber value={challenge.avgViewCount} format="compact" />
                      </div>
                      <div className="text-[10px] text-muted-foreground">평균 조회</div>
                    </div>
                  </div>

                  <Button className="w-full mt-3" size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    참여 추천 받기
                  </Button>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="personas">
          {/* Persona Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <GlowCard glowColor="pink" className="!p-4">
              <div className="text-2xl font-bold text-pink-400">
                <AnimatedNumber value={mockPersonas.filter(p => p.isActive).length} />
              </div>
              <div className="text-xs text-muted-foreground">Active Personas</div>
            </GlowCard>
            <GlowCard glowColor="cyan" className="!p-4">
              <div className="text-2xl font-bold text-cyan-400">
                <AnimatedNumber value={mockPersonas.reduce((acc, p) => acc + p.commentsToday, 0)} />
              </div>
              <div className="text-xs text-muted-foreground">Comments Today</div>
            </GlowCard>
            <GlowCard glowColor="green" className="!p-4">
              <div className="text-2xl font-bold text-green-400">
                {(mockPersonas.reduce((acc, p) => acc + p.engagementRate, 0) / mockPersonas.length).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Avg Engagement</div>
            </GlowCard>
            <GlowCard glowColor="yellow" className="!p-4">
              <div className="text-2xl font-bold text-yellow-400">125</div>
              <div className="text-xs text-muted-foreground">Devices Assigned</div>
            </GlowCard>
          </div>

          {/* Personas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockPersonas.map((persona, i) => (
              <motion.div
                key={persona.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlowCard glowColor="pink">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-2xl">
                      {persona.name.includes('게임') ? '🎮' :
                       persona.name.includes('직장인') ? '💼' :
                       persona.name.includes('뷰티') ? '💄' :
                       persona.name.includes('테크') ? '💻' :
                       persona.name.includes('엄마') ? '👩‍👧' : '👤'}
                    </div>
                    <div>
                      <h3 className="font-bold">{persona.name}</h3>
                      <div className="text-xs text-muted-foreground">{persona.age}세</div>
                    </div>
                    <Badge variant={persona.isActive ? 'default' : 'secondary'} className="ml-auto">
                      {persona.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {persona.interests.map((interest, j) => (
                      <Badge key={j} variant="outline" className="text-[10px]">
                        {interest}
                      </Badge>
                    ))}
                  </div>

                  <div className="p-2 rounded-lg bg-background/50 mb-3">
                    <div className="text-xs text-muted-foreground mb-1">톤 & 스타일</div>
                    <div className="text-sm">{persona.toneDescription}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-background/50">
                      <div className="text-lg font-bold text-cyan-400">{persona.commentsToday}</div>
                      <div className="text-[10px] text-muted-foreground">오늘 댓글</div>
                    </div>
                    <div className="p-2 rounded-lg bg-background/50">
                      <div className="text-lg font-bold text-green-400">{persona.engagementRate}%</div>
                      <div className="text-[10px] text-muted-foreground">인게이지먼트</div>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="playlists">
          {/* Theme Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <GlowCard glowColor="purple" className="!p-4">
              <div className="text-2xl font-bold text-purple-400">
                <AnimatedNumber value={mockPlaylistThemes.length} />
              </div>
              <div className="text-xs text-muted-foreground">Today's Themes</div>
            </GlowCard>
            <GlowCard glowColor="cyan" className="!p-4">
              <div className="text-2xl font-bold text-cyan-400">
                <AnimatedNumber value={mockPlaylistThemes.filter(t => t.status === 'completed').length} />
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </GlowCard>
            <GlowCard glowColor="yellow" className="!p-4">
              <div className="text-2xl font-bold text-yellow-400">
                <AnimatedNumber value={mockPlaylistThemes.reduce((acc, t) => acc + t.currentVideoCount, 0)} />
              </div>
              <div className="text-xs text-muted-foreground">Videos Curated</div>
            </GlowCard>
            <GlowCard glowColor="green" className="!p-4">
              <div className="text-2xl font-bold text-green-400">100</div>
              <div className="text-xs text-muted-foreground">Devices Assigned</div>
            </GlowCard>
          </div>

          {/* Playlists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockPlaylistThemes.map((theme, i) => (
              <motion.div
                key={theme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlowCard glowColor="purple">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{theme.themeName}</h3>
                      <p className="text-sm text-muted-foreground">{theme.themeDescription}</p>
                    </div>
                    <Badge variant={
                      theme.status === 'completed' ? 'default' :
                      theme.status === 'in_progress' ? 'secondary' : 'outline'
                    }>
                      {theme.status === 'completed' ? '완료' : 
                       theme.status === 'in_progress' ? '진행중' : '대기'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {theme.moodTags.map((tag, j) => (
                      <Badge key={j} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{theme.currentVideoCount} / {theme.targetVideoCount}</span>
                    </div>
                    <Progress value={(theme.currentVideoCount / theme.targetVideoCount) * 100} className="h-2" />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {theme.searchKeywords.map((keyword, j) => (
                      <Badge key={j} variant="secondary" className="text-[10px]">
                        🔍 {keyword}
                      </Badge>
                    ))}
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
