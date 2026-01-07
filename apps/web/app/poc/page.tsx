// apps/web/app/poc/page.tsx
// Kernel YouTube Automation PoC 페이지

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ActionResult {
  success: boolean;
  data?: {
    action: string;
    videoId?: string;
    channelId?: string;
    message: string;
    error?: string;
    duration?: number;
  };
  totalDuration?: number;
  error?: string;
}

export default function PoCPage() {
  const [videoId, setVideoId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [comment, setComment] = useState('');
  const [action, setAction] = useState<'like' | 'comment' | 'subscribe' | 'watch'>('like');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('');

  // API 상태 확인
  const checkApiStatus = async () => {
    try {
      const response = await fetch('/api/kernel/youtube');
      const data = await response.json();
      setApiStatus(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiStatus(`Error: ${error}`);
    }
  };

  // 액션 실행
  const executeAction = async () => {
    setLoading(true);
    setResult(null);

    try {
      const body: Record<string, unknown> = { action };
      
      if (action === 'like' || action === 'comment' || action === 'watch') {
        body.videoId = videoId;
      }
      
      if (action === 'subscribe') {
        body.channelId = channelId;
      }
      
      if (action === 'comment') {
        body.comment = comment;
      }

      const response = await fetch('/api/kernel/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">홈으로</span>
            </Link>
            <div className="h-6 w-px bg-white/20" />
            <h1 className="text-lg font-bold text-[#FFCC00]">Kernel PoC</h1>
          </div>
          
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#FFCC00]">DoAi</span>
            <span className="text-xl font-light text-white">.Me</span>
          </Link>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="pt-24 pb-12 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              🤖 Kernel YouTube Automation PoC
            </h2>
            <p className="text-neutral-500">
              Kernel Browsers-as-a-Service를 통한 YouTube 자동화 테스트
            </p>
          </div>

          {/* API 상태 확인 */}
          <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              API Status
            </h3>
            <button
              onClick={checkApiStatus}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
            >
              Check API Status
            </button>
            {apiStatus && (
              <pre className="mt-4 p-4 bg-black/50 rounded-lg text-sm overflow-x-auto font-mono text-neutral-300">
                {apiStatus}
              </pre>
            )}
          </div>

          {/* 액션 선택 */}
          <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFCC00]" />
              YouTube Action
            </h3>
            
            <div className="mb-4">
              <label htmlFor="action-type" className="block mb-2 text-sm text-neutral-400">Action Type</label>
              <select
                id="action-type"
                value={action}
                onChange={(e) => setAction(e.target.value as typeof action)}
                className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:border-[#FFCC00] outline-none transition-colors"
              >
                <option value="like">👍 Like</option>
                <option value="comment">💬 Comment</option>
                <option value="subscribe">🔔 Subscribe</option>
                <option value="watch">👀 Watch</option>
              </select>
            </div>

            {/* Video ID (for like, comment, watch) */}
            {(action === 'like' || action === 'comment' || action === 'watch') && (
              <div className="mb-4">
                <label htmlFor="video-id" className="block mb-2 text-sm text-neutral-400">Video ID</label>
                <input
                  id="video-id"
                  type="text"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                  placeholder="dQw4w9WgXcQ"
                  className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:border-[#FFCC00] outline-none transition-colors"
                />
                <p className="text-neutral-500 text-xs mt-1">
                  YouTube URL에서 v= 뒤의 값 (예: youtube.com/watch?v=<strong className="text-[#FFCC00]">dQw4w9WgXcQ</strong>)
                </p>
              </div>
            )}

            {/* Channel ID (for subscribe) */}
            {action === 'subscribe' && (
              <div className="mb-4">
                <label htmlFor="channel-id" className="block mb-2 text-sm text-neutral-400">Channel ID</label>
                <input
                  id="channel-id"
                  type="text"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  placeholder="UCxxxxxx"
                  className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:border-[#FFCC00] outline-none transition-colors"
                />
              </div>
            )}

            {/* Comment (for comment action) */}
            {action === 'comment' && (
              <div className="mb-4">
                <label htmlFor="comment-text" className="block mb-2 text-sm text-neutral-400">Comment</label>
                <textarea
                  id="comment-text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="좋은 영상이네요!"
                  className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:border-[#FFCC00] outline-none transition-colors resize-none"
                  rows={3}
                />
              </div>
            )}

            <button
              onClick={executeAction}
              disabled={loading}
              className={`w-full px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-neutral-700 cursor-not-allowed'
                  : 'bg-[#FFCC00] text-black hover:bg-yellow-400'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  실행 중...
                </>
              ) : (
                <>
                  🚀 Execute Action
                </>
              )}
            </button>
          </div>

          {/* 결과 표시 */}
          {result && (
            <div
              className={`p-4 rounded-xl border ${
                result.success 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400">Success</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400">Failed</span>
                  </>
                )}
              </h3>
              <pre className="p-4 bg-black/30 rounded-lg text-sm overflow-x-auto font-mono">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {/* 사용 설명 */}
          <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl text-sm">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              💡 사용 방법
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-neutral-400">
              <li>먼저 &quot;Check API Status&quot;로 Kernel 연결 상태를 확인하세요.</li>
              <li><code className="px-1.5 py-0.5 bg-black/50 rounded text-[#FFCC00]">kernelConfigured: true</code> 인지 확인하세요.</li>
              <li>Action Type을 선택하고 필요한 정보를 입력하세요.</li>
              <li>&quot;Execute Action&quot;을 클릭하여 실행하세요.</li>
            </ol>
            <p className="mt-4 text-yellow-400 flex items-start gap-2">
              <span>⚠️</span>
              <span>
                주의: 좋아요, 댓글, 구독은 실제 YouTube 계정에 영향을 미칩니다.
                테스트 시 신중히 사용하세요.
              </span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

