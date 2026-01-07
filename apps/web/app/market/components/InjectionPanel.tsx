'use client';

// ============================================
// InjectionPanel - 동영상/채널 등록 패널
// YouTube Data API를 통한 자동 정보 조회 지원
// Kernel 브라우저 자동화 통합
// ============================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Video, Rss, Zap, Link as LinkIcon, AlertCircle, Loader2, CheckCircle, ExternalLink, RefreshCw, Globe, ThumbsUp, MessageSquare, UserPlus, Play } from 'lucide-react';
import { useNodes } from '../../contexts/NodeContext';

interface InjectionPanelProps {
  isDark: boolean;
}

// YouTube 영상 정보 타입
interface VideoInfo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: number | null;
  viewCount: number | null;
}

// 채널 정보 타입
interface ChannelInfo {
  channelId: string;
  title: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  uploadsPlaylistId: string;
}

// 구독 채널 타입
interface SubscribedChannel {
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  autoRegister: boolean;
  subscribedAt: string;
}

// Kernel 액션 옵션 타입
interface KernelActionOptions {
  like: boolean;
  comment: boolean;
  subscribe: boolean;
  watch: boolean;
  watchDuration: number;
  commentText: string;
}

// Kernel 작업 결과 타입
interface KernelActionResult {
  success: boolean;
  action: string;
  message: string;
  error?: string;
  duration?: number;
}

export function InjectionPanel({ isDark }: InjectionPanelProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'channel' | 'kernel'>('video');
  
  // 영상 폼 상태
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isFetchingVideo, setIsFetchingVideo] = useState(false);
  const [targetViews, setTargetViews] = useState('400');
  
  // 채널 폼 상태
  const [channelInput, setChannelInput] = useState('');
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [isFetchingChannel, setIsFetchingChannel] = useState(false);
  const [subscribedChannels, setSubscribedChannels] = useState<SubscribedChannel[]>([]);
  
  // Kernel 자동화 상태
  const [kernelUrl, setKernelUrl] = useState('');
  const [kernelVideoInfo, setKernelVideoInfo] = useState<VideoInfo | null>(null);
  const [isFetchingKernelVideo, setIsFetchingKernelVideo] = useState(false);
  const [kernelOptions, setKernelOptions] = useState<KernelActionOptions>({
    like: true,
    comment: false,
    subscribe: false,
    watch: true,
    watchDuration: 30,
    commentText: '',
  });
  const [kernelResult, setKernelResult] = useState<KernelActionResult | null>(null);
  const [isKernelRunning, setIsKernelRunning] = useState(false);
  const [kernelConfigured, setKernelConfigured] = useState<boolean | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { addVideo, addLog } = useNodes();
  
  // 디바운스용 타이머 ref
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const kernelFetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 구독 목록 조회
  const loadSubscriptions = useCallback(async () => {
    try {
      const response = await fetch('/api/youtube/subscribe');
      const data = await response.json();
      if (data.success) {
        setSubscribedChannels(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    }
  }, []);

  // 컴포넌트 마운트 시 구독 목록 조회 및 Kernel 상태 확인
  useEffect(() => {
    loadSubscriptions();
    
    // Kernel API 상태 확인
    fetch('/api/kernel/youtube')
      .then(res => res.json())
      .then(data => {
        setKernelConfigured(data.kernelConfigured || false);
      })
      .catch(() => {
        setKernelConfigured(false);
      });
  }, [loadSubscriptions]);

  // ============================================
  // YouTube URL에서 영상 정보 자동 조회
  // ============================================
  const fetchVideoInfo = useCallback(async (url: string) => {
    if (!url.trim()) {
      setVideoInfo(null);
      return;
    }
    
    // URL 패턴 확인
    const youtubePatterns = [
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /youtube\.com\/embed\//,
    ];
    
    const isYoutubeUrl = youtubePatterns.some(pattern => pattern.test(url));
    if (!isYoutubeUrl) {
      setVideoInfo(null);
      return;
    }
    
    setIsFetchingVideo(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/youtube/video?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (data.success) {
        setVideoInfo(data.data);
        addLog('info', `📺 영상 정보 로드: ${data.data.title}`);
      } else {
        setError(data.error || '영상 정보를 불러올 수 없습니다');
        setVideoInfo(null);
      }
    } catch (err) {
      setError('영상 정보 조회 중 오류가 발생했습니다');
      setVideoInfo(null);
    } finally {
      setIsFetchingVideo(false);
    }
  }, [addLog]);

  // URL 변경 시 디바운스 적용하여 자동 조회
  useEffect(() => {
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
    }
    
    if (videoUrl.trim()) {
      fetchTimerRef.current = setTimeout(() => {
        fetchVideoInfo(videoUrl);
      }, 500); // 500ms 디바운스
    } else {
      setVideoInfo(null);
    }
    
    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
    };
  }, [videoUrl, fetchVideoInfo]);

  // ============================================
  // 채널 정보 조회
  // ============================================
  const fetchChannelInfo = useCallback(async () => {
    if (!channelInput.trim()) {
      setChannelInfo(null);
      return;
    }
    
    setIsFetchingChannel(true);
    setError(null);
    
    try {
      const param = channelInput.startsWith('@') 
        ? `handle=${encodeURIComponent(channelInput)}`
        : `url=${encodeURIComponent(channelInput)}`;
      
      const response = await fetch(`/api/youtube/channel?${param}&includeVideos=false`);
      const data = await response.json();
      
      if (data.success) {
        setChannelInfo(data.data.channel);
        addLog('info', `📺 채널 정보 로드: ${data.data.channel.title}`);
      } else {
        setError(data.error || '채널 정보를 불러올 수 없습니다');
        setChannelInfo(null);
      }
    } catch (err) {
      setError('채널 정보 조회 중 오류가 발생했습니다');
      setChannelInfo(null);
    } finally {
      setIsFetchingChannel(false);
    }
  }, [channelInput, addLog]);

  // ============================================
  // 영상 등록
  // ============================================
  const handleVideoSubmit = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);
    
    const title = videoInfo?.title || '';
    if (!title) {
      setError('유효한 YouTube URL을 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      addVideo({
        title: title,
        url: videoUrl.trim(),
        targetViews: parseInt(targetViews) || 400,
        thumbnail: videoInfo?.thumbnail,
        channel: videoInfo?.channelTitle,
      });

      setSuccessMessage(`"${title}" 등록 완료!`);
      setVideoUrl('');
      setVideoInfo(null);
      setTargetViews('400');
      addLog('success', `✅ 영상 "${title}" 등록 완료`);
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('영상 등록 중 오류가 발생했습니다');
      addLog('error', `❌ 영상 등록 실패: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [videoInfo, videoUrl, targetViews, addVideo, addLog]);

  // ============================================
  // 채널 구독
  // ============================================
  const handleChannelSubscribe = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);

    if (!channelInfo) {
      setError('먼저 채널 정보를 조회해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/youtube/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channelInfo.channelId,
          channelTitle: channelInfo.title,
          thumbnail: channelInfo.thumbnail,
          uploadsPlaylistId: channelInfo.uploadsPlaylistId,
          autoRegister: true, // 자동 등록 활성화
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`채널 "${channelInfo.title}" 구독 완료!`);
        addLog('success', `🔔 채널 "${channelInfo.title}" 구독 시작 - 신규 영상 자동 등록 활성화`);
        setChannelInput('');
        setChannelInfo(null);
        loadSubscriptions(); // 목록 새로고침
        
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || '채널 구독에 실패했습니다');
      }
    } catch (err) {
      setError('채널 구독 중 오류가 발생했습니다');
      addLog('error', `❌ 채널 구독 실패: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [channelInfo, addLog, loadSubscriptions]);

  // ============================================
  // 채널 구독 해제
  // ============================================
  const handleUnsubscribe = useCallback(async (channelId: string) => {
    try {
      const response = await fetch(`/api/youtube/subscribe?channelId=${channelId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        addLog('info', `🔕 채널 구독 해제됨`);
        loadSubscriptions();
      }
    } catch (err) {
      console.error('Unsubscribe error:', err);
    }
  }, [addLog, loadSubscriptions]);

  // ============================================
  // Kernel 영상 정보 조회
  // ============================================
  const fetchKernelVideoInfo = useCallback(async (url: string) => {
    if (!url.trim()) {
      setKernelVideoInfo(null);
      return;
    }
    
    const youtubePatterns = [
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /youtube\.com\/embed\//,
    ];
    
    const isYoutubeUrl = youtubePatterns.some(pattern => pattern.test(url));
    if (!isYoutubeUrl) {
      setKernelVideoInfo(null);
      return;
    }
    
    setIsFetchingKernelVideo(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/youtube/video?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (data.success) {
        setKernelVideoInfo(data.data);
      } else {
        setError(data.error || '영상 정보를 불러올 수 없습니다');
        setKernelVideoInfo(null);
      }
    } catch (err) {
      setError('영상 정보 조회 중 오류가 발생했습니다');
      setKernelVideoInfo(null);
    } finally {
      setIsFetchingKernelVideo(false);
    }
  }, []);

  // Kernel URL 변경 시 디바운스 적용
  useEffect(() => {
    if (kernelFetchTimerRef.current) {
      clearTimeout(kernelFetchTimerRef.current);
    }
    
    if (kernelUrl.trim()) {
      kernelFetchTimerRef.current = setTimeout(() => {
        fetchKernelVideoInfo(kernelUrl);
      }, 500);
    } else {
      setKernelVideoInfo(null);
    }
    
    return () => {
      if (kernelFetchTimerRef.current) {
        clearTimeout(kernelFetchTimerRef.current);
      }
    };
  }, [kernelUrl, fetchKernelVideoInfo]);

  // ============================================
  // Kernel 자동화 실행
  // ============================================
  const executeKernelAction = useCallback(async () => {
    if (!kernelVideoInfo) {
      setError('유효한 YouTube URL을 입력해주세요');
      return;
    }

    const { like, comment, subscribe, watch, watchDuration, commentText } = kernelOptions;
    
    // 최소 하나의 액션 선택 확인
    if (!like && !comment && !subscribe && !watch) {
      setError('최소 하나의 액션을 선택해주세요');
      return;
    }

    if (comment && !commentText.trim()) {
      setError('댓글 내용을 입력해주세요');
      return;
    }

    setIsKernelRunning(true);
    setError(null);
    setKernelResult(null);
    
    try {
      // 선택된 액션들을 순차적으로 실행
      const results: KernelActionResult[] = [];
      
      if (watch) {
        addLog('info', `🌐 Kernel: ${kernelVideoInfo.title} 시청 시작 (${watchDuration}초)...`);
        const res = await fetch('/api/kernel/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'watch',
            videoId: kernelVideoInfo.videoId,
            watchDuration: watchDuration,
          }),
        });
        const data = await res.json();
        results.push(data.data || { success: false, action: 'watch', message: data.error || '실패' });
      }

      if (like) {
        addLog('info', `🌐 Kernel: 좋아요 클릭 중...`);
        const res = await fetch('/api/kernel/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'like',
            videoId: kernelVideoInfo.videoId,
          }),
        });
        const data = await res.json();
        results.push(data.data || { success: false, action: 'like', message: data.error || '실패' });
      }

      if (comment) {
        addLog('info', `🌐 Kernel: 댓글 작성 중...`);
        const res = await fetch('/api/kernel/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'comment',
            videoId: kernelVideoInfo.videoId,
            comment: commentText,
          }),
        });
        const data = await res.json();
        results.push(data.data || { success: false, action: 'comment', message: data.error || '실패' });
      }

      if (subscribe) {
        addLog('info', `🌐 Kernel: 채널 구독 중...`);
        // 채널 ID 추출 필요 - videoInfo에서 가져오기
        const res = await fetch('/api/kernel/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'subscribe',
            channelId: kernelVideoInfo.channelTitle, // 실제로는 channelId가 필요
          }),
        });
        const data = await res.json();
        results.push(data.data || { success: false, action: 'subscribe', message: data.error || '실패' });
      }

      // 결과 요약
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        setSuccessMessage(`✅ Kernel 자동화 완료! (${successCount}/${totalCount} 성공)`);
        addLog('success', `✅ Kernel 자동화 완료: ${results.map(r => r.action).join(', ')}`);
      } else {
        setError(`⚠️ 일부 액션 실패 (${successCount}/${totalCount} 성공)`);
        addLog('warning', `⚠️ Kernel 일부 실패: ${results.filter(r => !r.success).map(r => r.message).join(', ')}`);
      }

      setKernelResult(results[results.length - 1]); // 마지막 결과 표시
      
      setTimeout(() => {
        setSuccessMessage(null);
        setKernelResult(null);
      }, 5000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(`Kernel 실행 실패: ${errorMessage}`);
      addLog('error', `❌ Kernel 실행 실패: ${errorMessage}`);
    } finally {
      setIsKernelRunning(false);
    }
  }, [kernelVideoInfo, kernelOptions, addLog]);

  // 시간 포맷팅
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-black/10'} backdrop-blur-md border rounded-lg overflow-hidden border-t-4 border-t-[#FFCC00]`}>
      {/* 탭 헤더 */}
      <div className={`flex border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <TabButton
          active={activeTab === 'video'}
          onClick={() => { setActiveTab('video'); setError(null); setSuccessMessage(null); }}
          icon={<Video className="w-4 h-4" />}
          label="동영상 등록"
          isDark={isDark}
        />
        <TabButton
          active={activeTab === 'channel'}
          onClick={() => { setActiveTab('channel'); setError(null); setSuccessMessage(null); }}
          icon={<Rss className="w-4 h-4" />}
          label={`채널 연동 (${subscribedChannels.length})`}
          isDark={isDark}
        />
        <TabButton
          active={activeTab === 'kernel'}
          onClick={() => { setActiveTab('kernel'); setError(null); setSuccessMessage(null); }}
          icon={<Globe className="w-4 h-4" />}
          label="Kernel 자동화"
          isDark={isDark}
          badge={kernelConfigured === false ? '!' : undefined}
        />
      </div>

      {/* 메시지 */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mx-6 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* 폼 */}
      <div className="p-6">
        {activeTab === 'video' ? (
          <div className="space-y-4">
            {/* URL 입력 */}
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[300px] space-y-1">
                <label className="block font-mono text-[10px] text-[#FFCC00]">
                  YOUTUBE URL <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-black/10 text-black'} border rounded px-3 py-2 text-sm focus:border-[#FFCC00] outline-none transition-colors pr-10`}
                    placeholder="https://youtube.com/watch?v=... 또는 https://youtu.be/..."
                    aria-label="YouTube URL"
                    disabled={isSubmitting}
                  />
                  {isFetchingVideo && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FFCC00] animate-spin" />
                  )}
                  {videoInfo && !isFetchingVideo && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                  )}
                </div>
              </div>

              {/* 목표 조회수 */}
              <div className="w-28 space-y-1">
                <label className="block font-mono text-[10px] text-neutral-500">TARGET VIEWS</label>
                <input
                  type="number"
                  value={targetViews}
                  onChange={(e) => setTargetViews(e.target.value)}
                  className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-black/10 text-black'} border rounded px-3 py-2 text-sm focus:border-[#FFCC00] outline-none transition-colors`}
                  placeholder="400"
                  aria-label="목표 조회수"
                  disabled={isSubmitting}
                  min="1"
                />
              </div>

              {/* 등록 버튼 */}
              <button
                onClick={handleVideoSubmit}
                disabled={isSubmitting || !videoInfo}
                className={`px-6 py-2 bg-[#FFCC00] text-black font-bold rounded hover:bg-yellow-400 transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Zap className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                {isSubmitting ? '등록 중...' : '등록'}
              </button>
            </div>

            {/* 영상 미리보기 */}
            {videoInfo && (
              <div className={`flex gap-4 p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'} animate-fadeIn`}>
                {/* 썸네일 */}
                <div className="relative w-40 h-24 rounded overflow-hidden shrink-0">
                  <img 
                    src={videoInfo.thumbnail} 
                    alt={videoInfo.title}
                    className="w-full h-full object-cover"
                  />
                  {videoInfo.duration && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-mono rounded">
                      {formatDuration(videoInfo.duration)}
                    </span>
                  )}
                </div>
                
                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm mb-1 truncate ${isDark ? 'text-white' : 'text-black'}`}>
                    {videoInfo.title}
                  </h4>
                  <p className="text-xs text-neutral-500 mb-2">{videoInfo.channelTitle}</p>
                  <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-mono">
                    {videoInfo.viewCount !== null && (
                      <span>조회수: {videoInfo.viewCount.toLocaleString()}</span>
                    )}
                    <a 
                      href={videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#FFCC00] hover:underline flex items-center gap-1"
                    >
                      YouTube에서 보기 <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 채널 입력 */}
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-1">
                <label className="block font-mono text-[10px] text-[#FFCC00]">
                  CHANNEL URL / HANDLE <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-black/10 text-black'} border rounded px-3 py-2 text-sm focus:border-[#FFCC00] outline-none transition-colors`}
                  placeholder="@ChannelName 또는 https://youtube.com/channel/..."
                  aria-label="채널 URL 또는 핸들"
                  disabled={isSubmitting || isFetchingChannel}
                />
              </div>

              {/* 조회 버튼 */}
              <button
                onClick={fetchChannelInfo}
                disabled={isFetchingChannel || !channelInput.trim()}
                className={`px-4 py-2 ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/10 text-black hover:bg-black/20'} font-medium rounded transition-colors flex items-center gap-2 disabled:opacity-50`}
              >
                {isFetchingChannel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                조회
              </button>

              {/* 구독 버튼 */}
              <button
                onClick={handleChannelSubscribe}
                disabled={isSubmitting || !channelInfo}
                className="px-6 py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-500 transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LinkIcon className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                {isSubmitting ? '연동 중...' : '연동'}
              </button>
            </div>

            {/* 채널 미리보기 */}
            {channelInfo && (
              <div className={`flex gap-4 p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'} animate-fadeIn`}>
                <img 
                  src={channelInfo.thumbnail} 
                  alt={channelInfo.title}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h4 className={`font-medium text-sm mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
                    {channelInfo.title}
                  </h4>
                  <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-mono">
                    <span>구독자: {channelInfo.subscriberCount.toLocaleString()}</span>
                    <span>영상: {channelInfo.videoCount.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-green-400 mt-2">
                    ✓ 연동 시 신규 영상이 자동으로 등록됩니다
                  </p>
                </div>
              </div>
            )}

            {/* 구독 채널 안내 */}
            {subscribedChannels.length > 0 && (
              <div className="mt-4 p-3 rounded bg-purple-500/10 border border-purple-500/20">
                <p className="text-xs text-purple-400">
                  🔔 {subscribedChannels.length}개 채널 연동 중 - 아래 '연동된 채널' 패널에서 관리할 수 있습니다
                </p>
              </div>
            )}
          </div>
        ) : (
          // Kernel 자동화 탭
          <div className="space-y-4">
            {/* Kernel 설정 확인 */}
            {kernelConfigured === false && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-400 font-medium mb-2">⚠️ Kernel API 키가 설정되지 않았습니다</p>
                <p className="text-xs text-amber-400/70">
                  <code className="bg-amber-500/20 px-1 rounded">.env.local</code> 파일에 <code className="bg-amber-500/20 px-1 rounded">KERNEL_API_KEY</code>를 설정해주세요.
                  Kernel 계정이 없으면 <a href="https://kernel.sh" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-300">kernel.sh</a>에서 가입하세요.
                </p>
              </div>
            )}

            {/* URL 입력 */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] text-[#FFCC00]">
                YOUTUBE URL <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={kernelUrl}
                  onChange={(e) => setKernelUrl(e.target.value)}
                  className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-black/10 text-black'} border rounded px-3 py-2 text-sm focus:border-[#FFCC00] outline-none transition-colors pr-10`}
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={isKernelRunning}
                />
                {isFetchingKernelVideo && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FFCC00] animate-spin" />
                )}
                {kernelVideoInfo && !isFetchingKernelVideo && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                )}
              </div>
            </div>

            {/* 영상 미리보기 */}
            {kernelVideoInfo && (
              <div className={`flex gap-4 p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'} animate-fadeIn`}>
                <div className="relative w-32 h-20 rounded overflow-hidden shrink-0">
                  <img 
                    src={kernelVideoInfo.thumbnail} 
                    alt={kernelVideoInfo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm mb-1 truncate ${isDark ? 'text-white' : 'text-black'}`}>
                    {kernelVideoInfo.title}
                  </h4>
                  <p className="text-xs text-neutral-500">{kernelVideoInfo.channelTitle}</p>
                </div>
              </div>
            )}

            {/* 액션 옵션 */}
            <div className="space-y-3">
              <p className="font-mono text-[10px] text-neutral-500">자동화 액션 선택</p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* 시청 */}
                <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  kernelOptions.watch 
                    ? 'bg-cyan-500/20 border border-cyan-500/50' 
                    : `${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'}`
                }`}>
                  <input
                    type="checkbox"
                    checked={kernelOptions.watch}
                    onChange={(e) => setKernelOptions(prev => ({ ...prev, watch: e.target.checked }))}
                    className="sr-only"
                    disabled={isKernelRunning}
                  />
                  <Play className={`w-5 h-5 ${kernelOptions.watch ? 'text-cyan-400' : 'text-neutral-500'}`} />
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${kernelOptions.watch ? 'text-cyan-400' : isDark ? 'text-white' : 'text-black'}`}>
                      시청
                    </span>
                    {kernelOptions.watch && (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          value={kernelOptions.watchDuration}
                          onChange={(e) => setKernelOptions(prev => ({ ...prev, watchDuration: parseInt(e.target.value) || 30 }))}
                          className="w-16 px-2 py-1 text-xs bg-black/30 border border-cyan-500/30 rounded text-white"
                          min="5"
                          max="600"
                          disabled={isKernelRunning}
                        />
                        <span className="text-[10px] text-neutral-500">초</span>
                      </div>
                    )}
                  </div>
                </label>

                {/* 좋아요 */}
                <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  kernelOptions.like 
                    ? 'bg-red-500/20 border border-red-500/50' 
                    : `${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'}`
                }`}>
                  <input
                    type="checkbox"
                    checked={kernelOptions.like}
                    onChange={(e) => setKernelOptions(prev => ({ ...prev, like: e.target.checked }))}
                    className="sr-only"
                    disabled={isKernelRunning}
                  />
                  <ThumbsUp className={`w-5 h-5 ${kernelOptions.like ? 'text-red-400' : 'text-neutral-500'}`} />
                  <span className={`text-sm font-medium ${kernelOptions.like ? 'text-red-400' : isDark ? 'text-white' : 'text-black'}`}>
                    좋아요
                  </span>
                </label>

                {/* 구독 */}
                <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  kernelOptions.subscribe 
                    ? 'bg-purple-500/20 border border-purple-500/50' 
                    : `${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'}`
                }`}>
                  <input
                    type="checkbox"
                    checked={kernelOptions.subscribe}
                    onChange={(e) => setKernelOptions(prev => ({ ...prev, subscribe: e.target.checked }))}
                    className="sr-only"
                    disabled={isKernelRunning}
                  />
                  <UserPlus className={`w-5 h-5 ${kernelOptions.subscribe ? 'text-purple-400' : 'text-neutral-500'}`} />
                  <span className={`text-sm font-medium ${kernelOptions.subscribe ? 'text-purple-400' : isDark ? 'text-white' : 'text-black'}`}>
                    구독
                  </span>
                </label>

                {/* 댓글 */}
                <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  kernelOptions.comment 
                    ? 'bg-green-500/20 border border-green-500/50' 
                    : `${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'}`
                }`}>
                  <input
                    type="checkbox"
                    checked={kernelOptions.comment}
                    onChange={(e) => setKernelOptions(prev => ({ ...prev, comment: e.target.checked }))}
                    className="sr-only"
                    disabled={isKernelRunning}
                  />
                  <MessageSquare className={`w-5 h-5 ${kernelOptions.comment ? 'text-green-400' : 'text-neutral-500'}`} />
                  <span className={`text-sm font-medium ${kernelOptions.comment ? 'text-green-400' : isDark ? 'text-white' : 'text-black'}`}>
                    댓글
                  </span>
                </label>
              </div>

              {/* 댓글 입력 */}
              {kernelOptions.comment && (
                <div className="animate-fadeIn">
                  <textarea
                    value={kernelOptions.commentText}
                    onChange={(e) => setKernelOptions(prev => ({ ...prev, commentText: e.target.value }))}
                    className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-black/10 text-black'} border rounded px-3 py-2 text-sm focus:border-green-500 outline-none transition-colors resize-none`}
                    placeholder="댓글 내용을 입력하세요..."
                    rows={3}
                    maxLength={500}
                    disabled={isKernelRunning}
                  />
                  <p className="text-[10px] text-neutral-500 text-right mt-1">
                    {kernelOptions.commentText.length}/500
                  </p>
                </div>
              )}
            </div>

            {/* 실행 버튼 */}
            <button
              onClick={executeKernelAction}
              disabled={isKernelRunning || !kernelVideoInfo || kernelConfigured === false}
              className={`w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isKernelRunning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Kernel 실행 중...
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5" />
                  Kernel 자동화 실행
                </>
              )}
            </button>

            {/* 결과 표시 */}
            {kernelResult && (
              <div className={`p-3 rounded-lg ${kernelResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'} animate-fadeIn`}>
                <p className={`text-sm ${kernelResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {kernelResult.message}
                </p>
                {kernelResult.duration && (
                  <p className="text-[10px] text-neutral-500 mt-1">
                    실행 시간: {(kernelResult.duration / 1000).toFixed(1)}초
                  </p>
                )}
              </div>
            )}

            {/* 안내 메시지 */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <p className="text-xs text-neutral-500">
                💡 <strong className="text-[#FFCC00]">Kernel</strong>은 클라우드 브라우저를 사용하여 YouTube 웹에서 자동화를 실행합니다.
                물리 디바이스와 병행하여 트래픽을 다양화하세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 탭 버튼
// ============================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  isDark: boolean;
  badge?: string;
}

function TabButton({ active, onClick, icon, label, isDark, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-sans font-medium transition-colors flex items-center justify-center gap-2 relative ${
        active
          ? 'text-[#FFCC00] bg-[#FFCC00]/10 border-b-2 border-[#FFCC00]'
          : `${isDark ? 'text-neutral-500 hover:bg-white/5' : 'text-neutral-600 hover:bg-black/5'}`
      }`}
    >
      {icon}
      {label}
      {badge && (
        <span className="absolute top-1 right-2 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}
