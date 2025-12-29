// DO (요청 지시) 관련 타입 정의

export type DORequestStatus = 
  | 'pending'      // 대기 중
  | 'scheduled'    // 예약됨
  | 'in_progress'  // 진행 중
  | 'completed'    // 완료
  | 'failed'       // 실패
  | 'cancelled';   // 취소됨

export type DORequestType = 
  | 'youtube_watch'    // 유튜브 시청
  | 'youtube_like'     // 좋아요
  | 'youtube_comment'  // 댓글
  | 'youtube_subscribe' // 구독
  | 'youtube_search'   // 검색만
  | 'custom';          // 커스텀

export interface DORequest {
  id: string;
  
  // 요청 정보
  type: DORequestType;
  title: string;
  description?: string;
  
  // YouTube 관련
  keyword: string;
  videoTitle?: string;
  videoUrl?: string;
  videoId?: string;
  channelName?: string;
  
  // 에이전트 설정
  agentRange: {
    start: number;
    end: number;
  };
  batchSize: number;  // 동시 실행 수 (기본 5)
  
  // 확률 설정 (0-100)
  likeProbability: number;
  commentProbability: number;
  subscribeProbability: number;
  
  // 시청 설정
  watchTimeMin: number;  // 최소 시청 시간 (초)
  watchTimeMax: number;  // 최대 시청 시간 (초)
  watchPercentMin: number;  // 최소 시청 비율 (%)
  watchPercentMax: number;  // 최대 시청 비율 (%)
  
  // AI 설정
  aiCommentEnabled: boolean;
  aiCommentStyle?: string;
  
  // 스케줄링
  scheduledAt?: string;  // 예약 시간 (ISO 8601)
  executeImmediately: boolean;
  
  // 상태
  status: DORequestStatus;
  priority: 1 | 2 | 3;  // P1 = 최우선, P2 = 일반, P3 = 낮음
  
  // 진행 상황
  totalAgents: number;
  completedAgents: number;
  failedAgents: number;
  
  // 메모
  memo?: string;
  
  // 메타데이터
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface DORequestCreateInput {
  type: DORequestType;
  title: string;
  description?: string;
  
  keyword: string;
  videoTitle?: string;
  videoUrl?: string;
  channelName?: string;
  
  agentStart: number;
  agentEnd: number;
  batchSize?: number;
  
  likeProbability?: number;
  commentProbability?: number;
  subscribeProbability?: number;
  
  watchTimeMin?: number;
  watchTimeMax?: number;
  watchPercentMin?: number;
  watchPercentMax?: number;
  
  aiCommentEnabled?: boolean;
  aiCommentStyle?: string;
  
  scheduledAt?: string;
  executeImmediately?: boolean;
  priority?: 1 | 2 | 3;
  memo?: string;
}

export interface DORequestStats {
  total: number;
  pending: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  failed: number;
  cancelled: number;
  
  todayRequests: number;
  todayCompleted: number;
  successRate: number;
}

// BE (에이전트 활동) 로그
export type BEActivityType = 
  | 'shorts_remix'
  | 'playlist_curator'
  | 'persona_commenter'
  | 'trend_scout'
  | 'challenge_hunter'
  | 'thumbnail_lab'
  | 'do_request';  // DO 요청 처리

export interface BEActivityLog {
  id: string;
  deviceId: number;
  activityType: BEActivityType;
  
  // DO 요청 연결 (있을 경우)
  doRequestId?: string;
  
  // 활동 상세
  description: string;
  result: 'success' | 'partial' | 'failed';
  
  // 발견/수집 데이터
  discoveredData?: {
    videoId?: string;
    channelId?: string;
    trendKeyword?: string;
    remixIdea?: string;
    playlistId?: string;
    challengeName?: string;
  };
  
  // 성과 지표
  metrics?: {
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    watchDuration?: number;
  };
  
  // 시간
  startedAt: string;
  completedAt?: string;
  duration?: number;  // 밀리초
  
  // 오류
  errorMessage?: string;
  errorCode?: string;
}

// 통합 내역 (DO + BE)
export interface UnifiedLog {
  id: string;
  source: 'DO' | 'BE';
  
  // DO 요청 또는 BE 활동 ID
  sourceId: string;
  
  // 공통 정보
  deviceId?: number;
  activityType: DORequestType | BEActivityType;
  description: string;
  status: 'success' | 'partial' | 'failed' | 'pending' | 'in_progress' | 'scheduled' | 'cancelled';
  
  // 타임스탬프
  timestamp: string;
  
  // 추가 데이터 (JSON)
  metadata?: Record<string, unknown>;
}

