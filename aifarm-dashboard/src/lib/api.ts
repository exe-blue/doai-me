/**
 * AIFarm Dashboard v4 - API Client
 * Vultr 백엔드 (158.247.210.152) 연동
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ==================== 디바이스 관리 ====================

  async getDevices(params?: { 
    board_id?: number; 
    status?: string; 
    limit?: number;
    offset?: number;
  }) {
    const query = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return this.request<{ devices: any[] }>(`/api/devices${query ? `?${query}` : ''}`);
  }

  async getDevice(deviceId: number) {
    return this.request<any>(`/api/devices/${deviceId}`);
  }

  async getDevicesByBoard(boardId: number) {
    return this.request<{ devices: any[] }>(`/api/devices/board/${boardId}`);
  }

  async getDevicesByStatus(status: string) {
    return this.request<{ devices: any[] }>(`/api/devices/status/${status}`);
  }

  async updateDevice(deviceId: number, data: Record<string, any>) {
    return this.request<any>(`/api/devices/${deviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async bulkRegisterDevices(devices: any[]) {
    return this.request<{ status: string; count: number }>('/api/devices/bulk-register', {
      method: 'POST',
      body: JSON.stringify({ devices }),
    });
  }

  // ==================== 보드 관리 ====================

  async getBoards() {
    return this.request<{ boards: any[] }>('/api/boards');
  }

  async getBoard(boardId: number) {
    return this.request<any>(`/api/boards/${boardId}`);
  }

  async getBoardDevices(boardId: number) {
    return this.request<{ devices: any[] }>(`/api/boards/${boardId}/devices`);
  }

  // ==================== 시청 요청 ====================

  async getWatchRequests(params?: { status?: string; limit?: number }) {
    const query = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return this.request<{ requests: any[] }>(`/api/watch-requests${query ? `?${query}` : ''}`);
  }

  async createWatchRequest(data: {
    video_title: string;
    video_url?: string;
    keywords: string[];
    target_views: number;
    like_rate?: number;
    comment_rate?: number;
    subscribe_rate?: number;
    watch_time_min?: number;
    watch_time_max?: number;
    priority?: 1 | 2 | 3;
    scheduled_at?: string;
    memo?: string;
  }) {
    return this.request<any>('/api/watch-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWatchRequest(requestId: string) {
    return this.request<any>(`/api/watch-requests/${requestId}`);
  }

  async cancelWatchRequest(requestId: string) {
    return this.request<any>(`/api/watch-requests/${requestId}`, {
      method: 'DELETE',
    });
  }

  async getWatchRequestSessions(requestId: string) {
    return this.request<{ sessions: any[] }>(`/api/watch-requests/${requestId}/sessions`);
  }

  // ==================== YouTube 채널 ====================

  async getYouTubeChannels() {
    return this.request<{ channels: any[] }>('/api/youtube/channels');
  }

  async getYouTubeChannelStats(channelId: string) {
    return this.request<any>(`/api/youtube/channels/${channelId}/stats`);
  }

  async getYouTubeTodaySummary() {
    return this.request<any>('/api/youtube/today');
  }

  async getRecentVideos(limit = 10) {
    return this.request<{ videos: any[] }>(`/api/youtube/videos/recent?limit=${limit}`);
  }

  // ==================== 유휴 활동 ====================

  async getIdleActivities() {
    return this.request<{ activities: any[] }>('/api/idle/activities');
  }

  async updateIdleActivity(activityId: string, data: {
    is_enabled?: boolean;
    allocated_devices?: number;
    success_probability?: number;
    interval_minutes?: number;
  }) {
    return this.request<any>(`/api/idle/activities/${activityId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getIdleStats() {
    return this.request<any>('/api/idle/stats');
  }

  // ==================== 업로드 관리 ====================

  async getScheduledUploads(params?: { status?: string; limit?: number }) {
    const query = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return this.request<{ uploads: any[] }>(`/api/uploads${query ? `?${query}` : ''}`);
  }

  async createScheduledUpload(data: {
    video_title: string;
    channel_id: string;
    scheduled_at: string;
    video_file?: string;
  }) {
    return this.request<any>('/api/uploads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelScheduledUpload(uploadId: string) {
    return this.request<any>(`/api/uploads/${uploadId}`, {
      method: 'DELETE',
    });
  }

  // ==================== 작업 로그 ====================

  async getTaskLogs(params?: { type?: string; status?: string; limit?: number }) {
    const query = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return this.request<{ logs: any[] }>(`/api/logs${query ? `?${query}` : ''}`);
  }

  // ==================== 대시보드 통계 ====================

  async getDashboardStats() {
    return this.request<any>('/api/stats');
  }

  // ==================== 알림 ====================

  async getNotifications(unreadOnly = false) {
    return this.request<{ notifications: any[] }>(`/api/notifications?unread_only=${unreadOnly}`);
  }

  async markNotificationRead(notificationId: string) {
    return this.request<{ status: string }>(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ status: string }>('/api/notifications/read-all', {
      method: 'PATCH',
    });
  }

  // ==================== 장애 관리 ====================

  async getDeviceIssues(params?: { resolved?: boolean; limit?: number }) {
    const query = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return this.request<{ issues: any[] }>(`/api/device-issues${query ? `?${query}` : ''}`);
  }

  async resolveDeviceIssue(issueId: number, notes?: string) {
    return this.request<any>(`/api/device-issues/${issueId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  }

  // ==================== 검색 분석 ====================

  async analyzeKeywords(keywords: string[]) {
    return this.request<{
      keywords: Array<{
        keyword: string;
        videos: any[];
        searched_at: string;
      }>;
      ai_insights: any;
      analyzed_at: string;
    }>('/api/analysis/search', {
      method: 'POST',
      body: JSON.stringify({ keywords }),
    });
  }

  async getSearchHistory(limit = 10) {
    return this.request<{ history: any[] }>(`/api/analysis/search/history?limit=${limit}`);
  }

  // ==================== 트렌드 분석 ====================

  async getTrendingVideos(params?: { category?: string; region?: string }) {
    const query = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return this.request<{ videos: any[] }>(`/api/analysis/trending${query ? `?${query}` : ''}`);
  }

  async getTrendReport(period: 'daily' | 'weekly' | 'monthly' = 'weekly') {
    return this.request<any>(`/api/analysis/trends/report?period=${period}`);
  }

  // ==================== 경쟁사 분석 ====================

  async getCompetitors() {
    return this.request<{ competitors: any[] }>('/api/analysis/competitors');
  }

  async addCompetitor(channelId: string) {
    return this.request<any>('/api/analysis/competitors', {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId }),
    });
  }

  async analyzeCompetitor(channelId: string) {
    return this.request<any>(`/api/analysis/competitors/${channelId}/analyze`);
  }

  // ==================== 아이디어 생성 ====================

  async generateIdeas(params: {
    topic: string;
    style?: string;
    count?: number;
  }) {
    return this.request<{ ideas: any[] }>('/api/analysis/ideas/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async generateTitles(params: {
    topic: string;
    keywords?: string[];
    count?: number;
  }) {
    return this.request<{ titles: string[] }>('/api/analysis/ideas/titles', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async generateThumbnailConcepts(params: {
    title: string;
    style?: string;
  }) {
    return this.request<{ concepts: any[] }>('/api/analysis/ideas/thumbnails', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

export const api = new APIClient(API_URL);
export default api;
export const getApiUrl = () => API_URL;
