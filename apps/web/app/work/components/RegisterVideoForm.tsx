// apps/web/app/work/components/RegisterVideoForm.tsx
// YouTube 영상 등록 폼 - 자동 정보 로딩 지원

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Youtube, Loader2, CheckCircle, AlertCircle, Search, Calendar, Eye, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchVideoInfo as fetchVideoInfoAction, registerVideo } from '../actions';

interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
  publishedAt?: string;
  viewCount?: number;
}

// YouTube URL에서 video ID 추출
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// 조회수 포맷팅
function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toLocaleString();
}

// 날짜 포맷팅
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function RegisterVideoForm() {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedUrl = useRef<string>('');

  // 자동 영상 정보 조회 (debounced)
  const fetchVideoInfoDebounced = useCallback(async (inputUrl: string) => {
    const videoId = extractVideoId(inputUrl);
    if (!videoId) {
      setVideoInfo(null);
      return;
    }

    // 이미 같은 URL을 조회했으면 스킵
    if (lastFetchedUrl.current === inputUrl) return;
    lastFetchedUrl.current = inputUrl;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchVideoInfoAction(inputUrl);

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to fetch video info');
        setVideoInfo(null);
        return;
      }

      setVideoInfo(result.data);
    } catch {
      setError('Failed to fetch video info');
      setVideoInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // URL 변경 시 자동 조회 (800ms debounce)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!url.trim()) {
      setVideoInfo(null);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchVideoInfoDebounced(url);
    }, 800);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [url, fetchVideoInfoDebounced]);

  // 수동 영상 정보 조회
  const handleFetchVideoInfo = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    lastFetchedUrl.current = ''; // 강제 재조회
    await fetchVideoInfoDebounced(url);
  };

  // 영상 등록
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInfo) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await registerVideo({
        videoId: videoInfo.videoId,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        channelTitle: videoInfo.channelTitle,
        duration: videoInfo.duration,
      });

      if (!result.success) {
        setError(result.error || 'Failed to register video');
        return;
      }

      setSuccess(true);
      setUrl('');
      setVideoInfo(null);

      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to register video');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL Input */}
        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            YouTube URL
            {isLoading && (
              <span className="ml-2 text-xs text-[#FFCC00]">
                Loading...
              </span>
            )}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... (auto-loads)"
                className={cn(
                  "w-full pl-11 pr-12 py-3 bg-black/50 border rounded-lg",
                  "text-white placeholder:text-neutral-600",
                  "focus:outline-none focus:ring-2 focus:ring-[#FFCC00]/50",
                  error ? "border-red-500/50" : videoInfo ? "border-green-500/50" : "border-white/10"
                )}
              />
              {/* 로딩/성공 인디케이터 */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-[#FFCC00] animate-spin" />
                ) : videoInfo ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleFetchVideoInfo}
              disabled={!url || isLoading}
              className={cn(
                "px-4 py-3 rounded-lg font-mono text-sm uppercase",
                "border border-white/20 bg-white/5",
                "hover:bg-white/10 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-2"
              )}
              title="Refresh video info"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Fetch
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              {error}
            </p>
          )}
          {!error && !videoInfo && url && !isLoading && (
            <p className="mt-2 text-xs text-neutral-500">
              Paste a YouTube URL to automatically load video info
            </p>
          )}
        </div>

        {/* Video Preview - 개선된 UI */}
        {videoInfo && (
          <div className="bg-black/30 rounded-lg p-4 border border-white/10 animate-in fade-in duration-300">
            <div className="flex gap-4">
              {/* 확대된 썸네일 */}
              <div className="relative shrink-0">
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-48 h-28 object-cover rounded-lg"
                />
                {/* 재생 시간 뱃지 */}
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                  {videoInfo.duration}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {/* 영상 제목 */}
                <h3 className="font-medium text-white line-clamp-2 leading-tight">
                  {videoInfo.title}
                </h3>

                {/* 채널명 */}
                <p className="text-sm text-neutral-400 mt-2">
                  {videoInfo.channelTitle}
                </p>

                {/* 메타 정보 (업로드 날짜, 조회수) */}
                <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                  {videoInfo.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(videoInfo.publishedAt)}
                    </span>
                  )}
                  {videoInfo.viewCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatViewCount(videoInfo.viewCount)} views
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {videoInfo.duration}
                  </span>
                </div>
              </div>
            </div>

            {/* Search Method Info */}
            <div className="mt-4 p-3 bg-[#FFCC00]/10 rounded border border-[#FFCC00]/20">
              <p className="text-sm text-[#FFCC00] flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span className="truncate">
                  Devices will search by title: &quot;{videoInfo.title.slice(0, 50)}{videoInfo.title.length > 50 ? '...' : ''}&quot;
                </span>
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Human-like behavior: Random wait → Search by title → Watch video
              </p>
            </div>
          </div>
        )}

        {/* Device Target Info */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Target Devices</span>
            <span className="font-mono text-[#FFCC00]">100% (All Devices)</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            All available devices will watch this video
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!videoInfo || isSubmitting}
          className={cn(
            "w-full py-4 rounded-lg font-mono text-sm uppercase tracking-wider",
            "border transition-all duration-300",
            "flex items-center justify-center gap-2",
            videoInfo && !isSubmitting
              ? "border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black"
              : "border-white/10 bg-white/5 text-neutral-500 cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Registering...
            </>
          ) : (
            <>
              <Youtube className="w-4 h-4" />
              Register Video
            </>
          )}
        </button>

        {/* Success Message */}
        {success && (
          <div role="status" className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" aria-hidden="true" />
            <div>
              <p className="text-green-400 font-medium">Video Registered!</p>
              <p className="text-sm text-green-400/70">
                Devices will start watching shortly
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
