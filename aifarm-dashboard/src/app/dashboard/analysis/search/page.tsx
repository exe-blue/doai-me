'use client';

import { useState } from 'react';
import { 
  Search, 
  Plus,
  X,
  Loader2,
  BarChart3,
  Users,
  TrendingUp,
  Image as ImageIcon,
  Lightbulb,
  AlertCircle,
  ExternalLink,
  Play,
  ThumbsUp,
  MessageSquare,
  Eye,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { 
  SearchVideoResult, 
  KeywordSearchResult, 
  AIInsights,
  SearchAnalysisResult 
} from '@/types';

// 모의 데이터 - 실제로는 API에서 가져옴
const generateMockSearchResult = (keyword: string): KeywordSearchResult => {
  const videos: SearchVideoResult[] = Array.from({ length: 10 }, (_, i) => ({
    video_id: `vid_${keyword}_${i}`,
    title: `${keyword} 관련 영상 제목 ${i + 1} - 이것은 예시 제목입니다`,
    title_length: 25 + Math.floor(Math.random() * 20),
    thumbnail_url: `https://via.placeholder.com/320x180?text=${encodeURIComponent(keyword)}`,
    channel_name: `채널${i + 1}`,
    channel_id: `ch_${i}`,
    subscriber_count: Math.floor(Math.random() * 500000) + 1000,
    view_count: Math.floor(Math.random() * 1000000) + 10000,
    like_count: Math.floor(Math.random() * 50000) + 100,
    comment_count: Math.floor(Math.random() * 5000) + 10,
    published_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    duration: Math.floor(Math.random() * 1200) + 60,
    duration_formatted: `${Math.floor(Math.random() * 20)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
  }));
  
  return {
    keyword,
    videos,
    searched_at: new Date().toISOString(),
  };
};

const mockAIInsights: AIInsights = {
  title_pattern: {
    avg_length: 32,
    number_usage_rate: 45,
    emoji_usage_rate: 25,
    common_keywords: ['완벽', '최신', '꿀팁', '방법', '추천'],
    hook_patterns: ['~하는 법', '~만 알면', '~없이', '~만으로'],
  },
  channel_characteristics: {
    subscriber_distribution: {
      under_1k: 5,
      under_10k: 15,
      under_100k: 40,
      under_1m: 30,
      over_1m: 10,
    },
    avg_subscriber_count: 125000,
    top_channels: [
      { name: '인기채널1', subscribers: 1200000, video_count: 450 },
      { name: '인기채널2', subscribers: 850000, video_count: 320 },
      { name: '인기채널3', subscribers: 650000, video_count: 280 },
    ],
  },
  performance_metrics: {
    avg_view_count: 125000,
    median_view_count: 45000,
    avg_like_ratio: 4.2,
    avg_comment_ratio: 0.8,
    optimal_duration: { min: 480, max: 900, avg: 660 },
    best_upload_time: ['오후 6시', '오후 8시', '오후 10시'],
  },
  thumbnail_analysis: {
    face_exposure_rate: 65,
    text_inclusion_rate: 80,
    dominant_colors: ['빨강', '노랑', '파랑'],
    common_elements: ['사람 얼굴', '강조 텍스트', '화살표', '테두리'],
  },
  competition_score: 72,
  opportunity_score: 58,
  entry_difficulty: 'medium',
  recommended_strategies: [
    '제목에 숫자를 활용하여 구체성 강조 (예: "5가지 방법", "10분 완성")',
    '썸네일에 얼굴과 감정 표현을 포함하여 클릭률 향상',
    '영상 길이를 8-15분 사이로 유지하여 시청 시간 최적화',
    '업로드 시간은 저녁 6-10시 사이가 가장 효과적',
    '댓글 유도 문구를 영상 마지막에 추가하여 참여율 향상',
  ],
};

export default function SearchAnalysisPage() {
  const [keywords, setKeywords] = useState<string[]>(['']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchResults, setSearchResults] = useState<KeywordSearchResult[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);

  const addKeyword = () => {
    if (keywords.length < 3) {
      setKeywords([...keywords, '']);
    }
  };

  const removeKeyword = (index: number) => {
    if (keywords.length > 1) {
      setKeywords(keywords.filter((_, i) => i !== index));
    }
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  const handleAnalyze = async () => {
    const validKeywords = keywords.filter(k => k.trim());
    if (validKeywords.length === 0) return;

    setIsAnalyzing(true);
    
    // 모의 API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = validKeywords.map(k => generateMockSearchResult(k));
    setSearchResults(results);
    setAiInsights(mockAIInsights);
    setIsAnalyzing(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return '오늘';
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    return `${Math.floor(days / 30)}개월 전`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'hard': return 'text-orange-400 bg-orange-500/20';
      case 'very_hard': return 'text-red-400 bg-red-500/20';
      default: return 'text-zinc-400 bg-zinc-500/20';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '쉬움';
      case 'medium': return '보통';
      case 'hard': return '어려움';
      case 'very_hard': return '매우 어려움';
      default: return difficulty;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-cyan-400" />
          검색 분석
        </h1>
        <p className="text-zinc-400 text-sm">키워드별 YouTube 검색 결과 비교 및 AI 분석</p>
      </div>

      {/* 키워드 입력 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">키워드 입력 (최대 3개)</CardTitle>
          <CardDescription>비교 분석할 키워드를 입력하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {keywords.map((keyword, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold shrink-0">
                  {index + 1}
                </div>
                <Input
                  placeholder={`키워드 ${index + 1} 입력...`}
                  value={keyword}
                  onChange={(e) => updateKeyword(index, e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAnalyze();
                  }}
                />
                {keywords.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeKeyword(index)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            
            <div className="flex items-center gap-3 pt-2">
              {keywords.length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addKeyword}
                  className="border-zinc-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  키워드 추가
                </Button>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || keywords.every(k => !k.trim())}
                className="bg-cyan-600 hover:bg-cyan-700 ml-auto"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    분석중...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    분석 시작
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      {searchResults.length > 0 && (
        <>
          {/* 검색 결과 비교 */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg">검색 결과 비교</CardTitle>
              <CardDescription>각 키워드별 상위 10개 영상</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${searchResults.length === 1 ? 'grid-cols-1' : searchResults.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {searchResults.map((result, colIndex) => (
                  <div key={result.keyword} className="space-y-3">
                    <div className="sticky top-0 bg-zinc-900 py-2 z-10">
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-sm">
                        {result.keyword}
                      </Badge>
                    </div>
                    <ScrollArea className="h-[600px] pr-2">
                      <div className="space-y-3">
                        {result.videos.map((video, index) => (
                          <div 
                            key={video.video_id}
                            className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-zinc-500 font-mono">#{index + 1}</span>
                              <span className="text-xs text-zinc-400">{getTimeAgo(video.published_at)}</span>
                            </div>
                            
                            {/* 썸네일 */}
                            <div className="relative aspect-video bg-zinc-700 rounded-lg mb-2 overflow-hidden group">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="w-8 h-8 text-zinc-500" />
                              </div>
                              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                                {video.duration_formatted}
                              </div>
                            </div>
                            
                            {/* 제목 */}
                            <h4 className="text-sm text-white font-medium line-clamp-2 mb-1">
                              {video.title}
                            </h4>
                            <p className="text-xs text-zinc-500 mb-2">
                              제목 {video.title_length}자
                            </p>
                            
                            {/* 채널 */}
                            <div className="flex items-center gap-1 text-xs text-zinc-400 mb-2">
                              <span className="truncate">{video.channel_name}</span>
                              <span className="text-zinc-600">•</span>
                              <span>{formatNumber(video.subscriber_count)} 구독자</span>
                            </div>
                            
                            {/* 통계 */}
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {formatNumber(video.view_count)}
                              </span>
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3" />
                                {formatNumber(video.like_count)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {formatNumber(video.comment_count)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI 분석 결과 */}
          {aiInsights && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  AI 분석 결과
                </CardTitle>
                <CardDescription>OpenAI 기반 콘텐츠 분석 인사이트</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="title" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 bg-zinc-800">
                    <TabsTrigger value="title">📊 제목 패턴</TabsTrigger>
                    <TabsTrigger value="channel">👤 채널 특성</TabsTrigger>
                    <TabsTrigger value="performance">📈 성과 지표</TabsTrigger>
                    <TabsTrigger value="thumbnail">🖼️ 썸네일</TabsTrigger>
                    <TabsTrigger value="strategy">💡 전략</TabsTrigger>
                  </TabsList>
                  
                  {/* 제목 패턴 */}
                  <TabsContent value="title" className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">평균 제목 길이</p>
                        <p className="text-2xl font-bold text-white">{aiInsights.title_pattern.avg_length}자</p>
                      </div>
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">숫자 사용률</p>
                        <p className="text-2xl font-bold text-cyan-400">{aiInsights.title_pattern.number_usage_rate}%</p>
                      </div>
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">이모지 사용률</p>
                        <p className="text-2xl font-bold text-yellow-400">{aiInsights.title_pattern.emoji_usage_rate}%</p>
                      </div>
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">공통 키워드</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {aiInsights.title_pattern.common_keywords.slice(0, 3).map((kw, i) => (
                            <Badge key={i} variant="secondary" className="bg-zinc-700 text-xs">{kw}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-zinc-400 mb-2">후킹 패턴</p>
                      <div className="flex flex-wrap gap-2">
                        {aiInsights.title_pattern.hook_patterns.map((pattern, i) => (
                          <Badge key={i} className="bg-purple-500/20 text-purple-400 border-0">{pattern}</Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* 채널 특성 */}
                  <TabsContent value="channel" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-3">구독자 분포</p>
                        <div className="space-y-2">
                          {[
                            { label: '1K 미만', value: aiInsights.channel_characteristics.subscriber_distribution.under_1k },
                            { label: '1K-10K', value: aiInsights.channel_characteristics.subscriber_distribution.under_10k },
                            { label: '10K-100K', value: aiInsights.channel_characteristics.subscriber_distribution.under_100k },
                            { label: '100K-1M', value: aiInsights.channel_characteristics.subscriber_distribution.under_1m },
                            { label: '1M+', value: aiInsights.channel_characteristics.subscriber_distribution.over_1m },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-zinc-400 w-16">{item.label}</span>
                              <Progress value={item.value} className="flex-1 h-2" />
                              <span className="text-xs text-white w-8">{item.value}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-3">상위 노출 채널</p>
                        <div className="space-y-3">
                          {aiInsights.channel_characteristics.top_channels.map((ch, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-white">{ch.name}</p>
                                <p className="text-xs text-zinc-500">{ch.video_count}개 영상</p>
                              </div>
                              <Badge className="bg-cyan-500/20 text-cyan-400 border-0">
                                {formatNumber(ch.subscribers)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* 성과 지표 */}
                  <TabsContent value="performance" className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">평균 조회수</p>
                        <p className="text-2xl font-bold text-white">{formatNumber(aiInsights.performance_metrics.avg_view_count)}</p>
                      </div>
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">좋아요 비율</p>
                        <p className="text-2xl font-bold text-green-400">{aiInsights.performance_metrics.avg_like_ratio}%</p>
                      </div>
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">댓글 비율</p>
                        <p className="text-2xl font-bold text-blue-400">{aiInsights.performance_metrics.avg_comment_ratio}%</p>
                      </div>
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">최적 영상 길이</p>
                        <p className="text-2xl font-bold text-purple-400">
                          {Math.floor(aiInsights.performance_metrics.optimal_duration.avg / 60)}분
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-zinc-400 mb-2">최적 업로드 시간</p>
                      <div className="flex gap-2">
                        {aiInsights.performance_metrics.best_upload_time.map((time, i) => (
                          <Badge key={i} className="bg-green-500/20 text-green-400 border-0">
                            <Clock className="w-3 h-3 mr-1" />
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* 썸네일 분석 */}
                  <TabsContent value="thumbnail" className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">얼굴 노출률</p>
                        <p className="text-2xl font-bold text-white">{aiInsights.thumbnail_analysis.face_exposure_rate}%</p>
                      </div>
                      <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">텍스트 포함률</p>
                        <p className="text-2xl font-bold text-cyan-400">{aiInsights.thumbnail_analysis.text_inclusion_rate}%</p>
                      </div>
                      <div className="p-4 bg-zinc-800/50 rounded-lg col-span-2">
                        <p className="text-sm text-zinc-400 mb-2">주요 색상</p>
                        <div className="flex gap-2">
                          {aiInsights.thumbnail_analysis.dominant_colors.map((color, i) => (
                            <Badge key={i} variant="secondary" className="bg-zinc-700">{color}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-zinc-400 mb-2">공통 요소</p>
                      <div className="flex flex-wrap gap-2">
                        {aiInsights.thumbnail_analysis.common_elements.map((el, i) => (
                          <Badge key={i} className="bg-orange-500/20 text-orange-400 border-0">{el}</Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* 전략 추천 */}
                  <TabsContent value="strategy" className="mt-4">
                    {/* 점수 카드 */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
                        <p className="text-sm text-zinc-400 mb-2">경쟁 난이도</p>
                        <p className="text-3xl font-bold text-orange-400">{aiInsights.competition_score}</p>
                        <Progress value={aiInsights.competition_score} className="mt-2 h-2" />
                      </div>
                      <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
                        <p className="text-sm text-zinc-400 mb-2">기회 점수</p>
                        <p className="text-3xl font-bold text-green-400">{aiInsights.opportunity_score}</p>
                        <Progress value={aiInsights.opportunity_score} className="mt-2 h-2" />
                      </div>
                      <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
                        <p className="text-sm text-zinc-400 mb-2">진입 난이도</p>
                        <Badge className={`text-lg ${getDifficultyColor(aiInsights.entry_difficulty)}`}>
                          {getDifficultyLabel(aiInsights.entry_difficulty)}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* 추천 전략 */}
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-zinc-400 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-400" />
                        추천 전략 (5가지)
                      </p>
                      <div className="space-y-3">
                        {aiInsights.recommended_strategies.map((strategy, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-zinc-700/50 rounded-lg">
                            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold shrink-0">
                              {i + 1}
                            </span>
                            <p className="text-sm text-zinc-200">{strategy}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 빈 상태 */}
      {searchResults.length === 0 && !isAnalyzing && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-zinc-400 mb-2">분석할 키워드를 입력하세요</h3>
            <p className="text-sm text-zinc-500">
              최대 3개의 키워드를 입력하여 YouTube 검색 결과를 비교 분석할 수 있습니다
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
