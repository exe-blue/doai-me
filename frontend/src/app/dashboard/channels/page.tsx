'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlowCard } from '@/components/common/GlowCard';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { LevelBadge, LevelBadgeWithLabel } from '@/components/common/LevelBadge';
import { StatBar } from '@/components/common/StatBar';
import { mockChannels, mockQuests, mockCompetitors } from '@/data/mock';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy,
  TrendingUp,
  Users,
  Eye,
  Target,
  CheckCircle,
  Clock,
  Star,
  Swords
} from 'lucide-react';

export default function ChannelsPage() {
  const [selectedChannel, setSelectedChannel] = useState(mockChannels[0]);
  const channelQuests = mockQuests.filter(q => q.channelId === selectedChannel.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          채널 관리
        </h1>
        <p className="text-muted-foreground">10개 자체 채널을 RPG 캐릭터처럼 육성하세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel List */}
        <div className="lg:col-span-1">
          <GlowCard glowColor="purple" hover={false} className="h-full">
            <h2 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Our Channels
            </h2>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2 pr-4">
                {mockChannels.map((channel, i) => (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedChannel.id === channel.id 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-background/50 hover:bg-background/70'
                    }`}
                    onClick={() => setSelectedChannel(channel)}
                  >
                    <div className="flex items-center gap-3">
                      <LevelBadge level={channel.level} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{channel.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{channel.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            #{channel.categoryRank}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-400">
                          +{channel.weeklyGrowth}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">weekly</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </GlowCard>
        </div>

        {/* Channel Detail */}
        <div className="lg:col-span-2">
          <motion.div
            key={selectedChannel.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlowCard glowColor="cyan" hover={false}>
              {/* Channel Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-3xl">
                    {selectedChannel.category === '게임' ? '🎮' : 
                     selectedChannel.category === '뷰티' ? '💄' : 
                     selectedChannel.category === 'IT/테크' ? '💻' : 
                     selectedChannel.category === '요리' ? '🍳' : '💪'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                      {selectedChannel.name}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{selectedChannel.category}</span>
                      <Badge variant="outline">#{selectedChannel.categoryRank} in Category</Badge>
                    </div>
                  </div>
                </div>
                <LevelBadgeWithLabel level={selectedChannel.level} size="lg" />
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-background/50 text-center">
                  <Users className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                  <div className="text-xl font-bold">
                    <AnimatedNumber value={selectedChannel.subscriberCount} format="compact" />
                  </div>
                  <div className="text-xs text-muted-foreground">Subscribers</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 text-center">
                  <Eye className="w-5 h-5 mx-auto mb-1 text-pink-400" />
                  <div className="text-xl font-bold">
                    <AnimatedNumber value={selectedChannel.totalViews} format="compact" />
                  </div>
                  <div className="text-xs text-muted-foreground">Total Views</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 text-center">
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-400" />
                  <div className="text-xl font-bold text-green-400">
                    +{selectedChannel.weeklyGrowth}%
                  </div>
                  <div className="text-xs text-muted-foreground">Weekly Growth</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 text-center">
                  <Star className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                  <div className="text-xl font-bold">
                    {selectedChannel.compositeScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
              </div>

              {/* EXP Bar */}
              <div className="mb-6 p-4 rounded-lg bg-background/50">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">Experience Points</span>
                  <span className="text-cyan-400">
                    {selectedChannel.experiencePoints.toLocaleString()} / {selectedChannel.experienceToNextLevel.toLocaleString()} XP
                  </span>
                </div>
                <Progress 
                  value={(selectedChannel.experiencePoints / selectedChannel.experienceToNextLevel) * 100} 
                  className="h-3"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {(selectedChannel.experienceToNextLevel - selectedChannel.experiencePoints).toLocaleString()} XP to Level {selectedChannel.level + 1}
                </div>
              </div>

              <Tabs defaultValue="stats" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="stats">스탯</TabsTrigger>
                  <TabsTrigger value="quests">퀘스트</TabsTrigger>
                  <TabsTrigger value="competitors">경쟁자</TabsTrigger>
                </TabsList>

                <TabsContent value="stats">
                  <div className="space-y-3">
                    <StatBar label="HP" value={selectedChannel.stats.hp} color="hp" size="lg" />
                    <StatBar label="MP" value={selectedChannel.stats.mp} color="mp" size="lg" />
                    <StatBar label="ATK" value={selectedChannel.stats.atk} color="atk" size="lg" />
                    <StatBar label="DEF" value={selectedChannel.stats.def} color="def" size="lg" />
                    <StatBar label="SPD" value={selectedChannel.stats.spd} color="spd" size="lg" />
                    <StatBar label="INT" value={selectedChannel.stats.int} color="int" size="lg" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                      <div className="text-xs text-red-400 font-medium">HP - 구독자 유지율</div>
                      <div className="text-[10px] text-muted-foreground mt-1">구독자가 떠나지 않고 유지되는 비율</div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                      <div className="text-xs text-blue-400 font-medium">MP - 업로드 일관성</div>
                      <div className="text-[10px] text-muted-foreground mt-1">정기적인 콘텐츠 업로드 점수</div>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                      <div className="text-xs text-orange-400 font-medium">ATK - 바이럴 파워</div>
                      <div className="text-[10px] text-muted-foreground mt-1">콘텐츠가 바이럴되는 힘</div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                      <div className="text-xs text-green-400 font-medium">DEF - 커뮤니티 건강도</div>
                      <div className="text-[10px] text-muted-foreground mt-1">댓글, 좋아요 등 인게이지먼트</div>
                    </div>
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                      <div className="text-xs text-yellow-400 font-medium">SPD - 성장 속도</div>
                      <div className="text-[10px] text-muted-foreground mt-1">구독자 및 조회수 증가율</div>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                      <div className="text-xs text-purple-400 font-medium">INT - AI 추천 수용률</div>
                      <div className="text-[10px] text-muted-foreground mt-1">AI 제안을 얼마나 반영하는지</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="quests">
                  <div className="space-y-3">
                    {channelQuests.length > 0 ? channelQuests.map((quest, i) => (
                      <motion.div
                        key={quest.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-lg border ${
                          quest.status === 'completed' 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : 'bg-background/50 border-border/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {quest.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : (
                              <Target className="w-5 h-5 text-cyan-400" />
                            )}
                            <div>
                              <div className="font-medium">{quest.title}</div>
                              <div className="text-xs text-muted-foreground">{quest.description}</div>
                            </div>
                          </div>
                          <Badge variant={quest.questType === 'daily' ? 'default' : quest.questType === 'weekly' ? 'secondary' : 'outline'}>
                            {quest.questType === 'daily' ? '일일' : quest.questType === 'weekly' ? '주간' : '업적'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">진행률</span>
                            <span>{quest.currentValue.toLocaleString()} / {quest.targetValue.toLocaleString()}</span>
                          </div>
                          <Progress value={quest.progress} className="h-2" />
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="text-yellow-400">+{quest.rewardExp} EXP</span>
                          {quest.rewardBadge && <span>{quest.rewardBadge}</span>}
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center py-8 text-muted-foreground">
                        이 채널의 활성 퀘스트가 없습니다.
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="competitors">
                  <div className="space-y-3">
                    {mockCompetitors.filter(c => c.category === selectedChannel.category).map((competitor, i) => (
                      <motion.div
                        key={competitor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-lg bg-background/50 border border-border/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              competitor.categoryRank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                              competitor.categoryRank === 2 ? 'bg-gray-500/20 text-gray-400' :
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              #{competitor.categoryRank}
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {competitor.name}
                                <Swords className="w-3 h-3 text-red-400" />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {(competitor.subscriberCount / 1000).toFixed(0)}K subs
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">
                              {competitor.engagementRate}%
                            </div>
                            <div className="text-[10px] text-muted-foreground">engagement</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </GlowCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
