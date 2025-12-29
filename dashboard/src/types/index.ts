// Types for AIFarm Dashboard

export interface Device {
  id: number;
  phoneBoardId: number;
  status: 'active' | 'idle' | 'error' | 'maintenance';
  currentActivity?: ActivityType;
  currentActivityStartedAt?: string;
  lastHeartbeat?: string;
  totalActivitiesToday: number;
  errorCountToday: number;
}

export type ActivityType = 
  | 'shorts_remix'
  | 'playlist_curator'
  | 'persona_commenter'
  | 'trend_scout'
  | 'challenge_hunter'
  | 'thumbnail_lab';

export interface Activity {
  id: ActivityType;
  name: string;
  icon: string;
  description: string;
  color: string;
  allocatedDevices: number;
  activeDevices: number;
  itemsProcessedToday: number;
  successRate: number;
}

export interface Channel {
  id: string;
  youtubeChannelId: string;
  name: string;
  category: string;
  thumbnailUrl?: string;
  subscriberCount: number;
  totalViews: number;
  level: number;
  experiencePoints: number;
  experienceToNextLevel: number;
  compositeScore: number;
  categoryRank: number;
  globalRank: number;
  stats: ChannelStats;
  weeklyGrowth: number;
}

export interface ChannelStats {
  hp: number; // 구독자 유지율
  mp: number; // 업로드 일관성
  atk: number; // 바이럴 파워
  def: number; // 커뮤니티 건강도
  spd: number; // 성장 속도
  int: number; // AI 추천 수용률
}

export interface Competitor {
  id: string;
  youtubeChannelId: string;
  name: string;
  category: string;
  subscriberCount: number;
  recentViews: number;
  engagementRate: number;
  categoryRank: number;
  thumbnailUrl?: string;
}

export interface Quest {
  id: string;
  channelId: string;
  questType: 'daily' | 'weekly' | 'achievement';
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  rewardExp: number;
  rewardBadge?: string;
  status: 'active' | 'completed' | 'failed';
  deadlineAt?: string;
}

export interface BattleLogEntry {
  id: string;
  eventType: 'rank_up' | 'rank_down' | 'viral_hit' | 'quest_complete' | 'challenge_join' | 'trend_catch';
  ourChannelId?: string;
  ourChannelName?: string;
  competitorChannelId?: string;
  competitorChannelName?: string;
  description: string;
  impactScore: number;
  createdAt: string;
}

export interface TrendingShorts {
  id: string;
  videoId: string;
  title: string;
  channelName: string;
  viewCount: number;
  viralScore: number;
  viralFactors: string[];
  musicTitle?: string;
  hashtags: string[];
  detectedAt: string;
}

export interface RemixIdea {
  id: string;
  sourceShorts: TrendingShorts[];
  title: string;
  conceptDescription: string;
  differentiationPoint: string;
  remixDirection: 'parody' | 'mashup' | 'localization' | 'twist';
  recommendedMusic?: string;
  estimatedViralProbability: number;
  status: 'pending' | 'approved' | 'in_production' | 'published' | 'rejected';
  targetChannel?: Channel;
  createdAt: string;
}

export interface Challenge {
  id: string;
  name: string;
  hashtags: string[];
  musicTitle?: string;
  lifecycleStage: 'birth' | 'growth' | 'peak' | 'decline' | 'dead';
  totalParticipants: number;
  dailyNewParticipants: number;
  avgViewCount: number;
  isActive: boolean;
  firstDetectedAt: string;
  opportunityScore: number;
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  interests: string[];
  toneDescription: string;
  sampleComments: string[];
  isActive: boolean;
  commentsToday: number;
  engagementRate: number;
}

export interface PlaylistTheme {
  id: string;
  themeName: string;
  themeDescription: string;
  searchKeywords: string[];
  moodTags: string[];
  targetVideoCount: number;
  currentVideoCount: number;
  status: 'pending' | 'in_progress' | 'completed';
  themeDate: string;
}

export interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  idleDevices: number;
  errorDevices: number;
  totalChannels: number;
  avgChannelLevel: number;
  totalQuestsActive: number;
  questsCompletedToday: number;
  trendsDetectedToday: number;
  remixIdeasToday: number;
  challengesTracked: number;
  commentsPostedToday: number;
}

export interface Notification {
  id: string;
  type: 'alert' | 'info' | 'warning' | 'error' | 'success';
  sourceActivity?: ActivityType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
