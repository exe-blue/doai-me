// AIFarm Dashboard v4 - Types

// ==================== 디바이스 상태 ====================
export type DeviceStatus = 
  | 'online'       // 정상 (🟢)
  | 'temp_high'    // 문제-온도 (🟠)
  | 'wrong_mode'   // 문제-모드 (🟡)
  | 'disconnected' // 연결-없음 (🔴)
  | 'unstable';    // 연결-불안정 (🟣)

export interface Device {
  id: number;
  device_name: string;        // "01-01" ~ "30-20" (보드번호-슬롯번호)
  board_id: number;           // 1~30
  slot_number: number;        // 1~20
  serial_number?: string;     // ADB serial
  
  // 네트워크
  ip_address?: string;
  ap_group?: number;          // 1~5
  
  // 계정
  google_account?: string;
  youtube_channel_id?: string;
  
  // 상태
  status: DeviceStatus;
  temperature?: number;
  connection_mode?: 'wifi' | 'usb' | 'otg';
  last_heartbeat?: string;
  error_message?: string;
  
  // 현재 작업
  current_task?: string;
  
  created_at?: string;
  updated_at?: string;
}

// ==================== 보드 ====================
export interface PhoneBoard {
  id: number;                  // 1~30
  name: string;                // "보드 01" 등
  is_connected: boolean;
  total_slots: number;         // 20
  online_devices: number;
  offline_devices: number;
  error_devices: number;
  last_seen?: string;
}

// ==================== 시청 요청 ====================
export type WatchRequestStatus = 
  | 'pending'      // 대기중
  | 'scheduled'    // 예약됨
  | 'in_progress'  // 진행중
  | 'completed'    // 완료
  | 'failed'       // 실패
  | 'cancelled';   // 취소됨

export interface WatchRequest {
  id: string;
  video_title: string;
  video_url?: string;
  keywords: string[];          // 5개 키워드 세트
  target_views: number;
  completed_views: number;
  failed_views: number;
  like_rate: number;           // 0~100 %
  comment_rate: number;        // 0~100 %
  subscribe_rate?: number;     // 0~100 %
  watch_time_min?: number;     // 최소 시청시간 (초)
  watch_time_max?: number;     // 최대 시청시간 (초)
  status: WatchRequestStatus;
  priority: 1 | 2 | 3;         // 1=긴급, 2=일반, 3=낮음
  created_at: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  assigned_devices?: number[];
  memo?: string;
}

export interface WatchSession {
  id: string;
  request_id: string;
  device_id: number;
  device_name: string;
  keyword: string;
  video_title: string;
  watch_duration: number;      // 시청 시간 (초)
  total_duration: number;      // 영상 총 길이 (초)
  watch_percentage: number;    // 시청률 %
  liked: boolean;
  commented: boolean;
  subscribed?: boolean;
  status: 'searching' | 'watching' | 'interacting' | 'completed' | 'error';
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

// ==================== 유휴 활동 ====================
export type ActivityType = 
  | 'shorts_remix'        // Shorts 리믹스
  | 'playlist_curator'    // 플레이리스트 큐레이터
  | 'persona_commenter'   // 페르소나 코멘터
  | 'trend_scout'         // 트렌드 스카우터
  | 'challenge_hunter'    // 챌린지 헌터
  | 'thumbnail_lab';      // 썸네일 랩

export interface IdleActivity {
  id: ActivityType;
  name: string;
  icon: string;
  description: string;
  allocated_devices: number;   // 할당된 기기 수
  active_devices: number;      // 현재 활동 중
  is_enabled: boolean;
  today_tasks: number;         // 오늘 완료 수
  success_rate: number;        // 성공률 %
  last_run?: string;
}

// ==================== YouTube 채널 ====================
export interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  thumbnail_url?: string;
  
  // 오늘 통계
  today_views: number;
  today_watch_time: number;    // 분 단위
  today_subscribers: number;   // 순증감
  today_uploads: number;
  
  // 누적 통계
  total_subscribers: number;
  total_views: number;
  total_videos: number;
  
  // 최근 영상
  recent_videos?: RecentVideo[];
  
  created_at?: string;
  updated_at?: string;
}

export interface RecentVideo {
  video_id: string;
  title: string;
  thumbnail_url?: string;
  published_at: string;
  views: number;
  likes: number;
  comments: number;
  duration?: number;           // 초
}

// ==================== 업로드 관리 ====================
export type UploadStatus = 'scheduled' | 'uploading' | 'processing' | 'published' | 'failed';

export interface ScheduledUpload {
  id: string;
  video_title: string;
  video_file?: string;
  channel_id: string;
  channel_name: string;
  scheduled_at: string;
  status: UploadStatus;
  progress?: number;           // 0~100 업로드 진행률
  published_url?: string;
  error_message?: string;
  created_at: string;
}

// ==================== 작업 로그 ====================
export type TaskLogType = 'watch' | 'upload' | 'idle_activity' | 'system';

export interface TaskLog {
  id: string;
  type: TaskLogType;
  title: string;
  description: string;
  status: 'success' | 'failed' | 'partial';
  device_count?: number;
  success_count?: number;
  failed_count?: number;
  started_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

// ==================== 장애 이슈 ====================
export type IssueType = 
  | 'board_disconnected' 
  | 'device_offline' 
  | 'device_error'
  | 'temperature_high'
  | 'connection_unstable';

export interface DeviceIssue {
  id: number;
  device_id?: number;
  device_name: string;
  board_id: number;
  slot_number?: number;
  issue_type: IssueType;
  message: string;
  detected_at: string;
  resolved: boolean;
  resolved_at?: string;
  notes?: string;
}

// ==================== 대시보드 통계 ====================
export interface DashboardStats {
  // 디바이스 현황
  devices: {
    total: number;
    online: number;
    temp_high: number;
    wrong_mode: number;
    disconnected: number;
    unstable: number;
  };
  
  // 보드 현황
  boards: {
    total: number;
    connected: number;
    disconnected: number;
  };
  
  // 시청 요청 현황
  watch_requests: {
    pending: number;
    in_progress: number;
    completed_today: number;
    total_views_today: number;
  };
  
  // 유휴 활동 현황
  idle_activities: {
    active_count: number;
    total_tasks_today: number;
    avg_success_rate: number;
  };
  
  // 채널 현황
  channels: {
    total: number;
    total_views_today: number;
    total_subscribers_change: number;
  };
}

// ==================== 검색 분석 ====================
export interface SearchVideoResult {
  video_id: string;
  title: string;
  title_length: number;
  thumbnail_url: string;
  channel_name: string;
  channel_id: string;
  subscriber_count: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
  duration: number;              // 초
  duration_formatted: string;    // "10:30"
}

export interface KeywordSearchResult {
  keyword: string;
  videos: SearchVideoResult[];
  searched_at: string;
}

export interface TitlePattern {
  avg_length: number;
  number_usage_rate: number;     // 숫자 사용률 %
  emoji_usage_rate: number;      // 이모지 사용률 %
  common_keywords: string[];     // 공통 키워드
  hook_patterns: string[];       // 후킹 패턴
}

export interface ChannelCharacteristics {
  subscriber_distribution: {
    under_1k: number;
    under_10k: number;
    under_100k: number;
    under_1m: number;
    over_1m: number;
  };
  avg_subscriber_count: number;
  top_channels: Array<{
    name: string;
    subscribers: number;
    video_count: number;
  }>;
}

export interface PerformanceMetrics {
  avg_view_count: number;
  median_view_count: number;
  avg_like_ratio: number;        // 좋아요/조회수 비율 %
  avg_comment_ratio: number;     // 댓글/조회수 비율 %
  optimal_duration: {
    min: number;
    max: number;
    avg: number;
  };
  best_upload_time: string[];
}

export interface ThumbnailAnalysis {
  face_exposure_rate: number;    // 얼굴 노출률 %
  text_inclusion_rate: number;   // 텍스트 포함률 %
  dominant_colors: string[];     // 주요 색상
  common_elements: string[];     // 공통 요소
}

export interface AIInsights {
  title_pattern: TitlePattern;
  channel_characteristics: ChannelCharacteristics;
  performance_metrics: PerformanceMetrics;
  thumbnail_analysis: ThumbnailAnalysis;
  competition_score: number;     // 경쟁 난이도 (1-100)
  opportunity_score: number;     // 기회 점수 (1-100)
  entry_difficulty: 'easy' | 'medium' | 'hard' | 'very_hard';
  recommended_strategies: string[];
}

export interface SearchAnalysisResult {
  keywords: KeywordSearchResult[];
  ai_insights: AIInsights;
  analyzed_at: string;
}

// ==================== API 응답 타입 ====================
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
