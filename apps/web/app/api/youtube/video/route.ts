/**
 * YouTube Video Info API
 * 
 * YouTube Data API를 사용하여 영상 정보 조회
 * URL 유효성 검사 및 상세한 에러 피드백 제공
 * 
 * GET /api/youtube/video?url=YOUTUBE_URL
 * GET /api/youtube/video?videoId=VIDEO_ID
 */

import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

// ============================================
// URL 유효성 검사
// ============================================

interface UrlValidationResult {
  isValid: boolean;
  videoId: string | null;
  error?: string;
  suggestion?: string;
}

function validateYouTubeUrl(input: string): UrlValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      videoId: null,
      error: 'URL이 비어있습니다',
      suggestion: 'YouTube 영상 URL을 입력해주세요',
    };
  }

  const trimmedInput = input.trim();

  // 빈 문자열 체크
  if (trimmedInput.length === 0) {
    return {
      isValid: false,
      videoId: null,
      error: 'URL이 비어있습니다',
      suggestion: 'YouTube 영상 URL을 입력해주세요',
    };
  }

  // 직접 Video ID 입력 (11자리)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedInput)) {
    return { isValid: true, videoId: trimmedInput };
  }

  // URL 형식 검사
  let url: URL;
  try {
    // URL에 프로토콜이 없으면 추가
    const urlString = trimmedInput.startsWith('http') ? trimmedInput : `https://${trimmedInput}`;
    url = new URL(urlString);
  } catch {
    return {
      isValid: false,
      videoId: null,
      error: '올바른 URL 형식이 아닙니다',
      suggestion: '예시: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };
  }

  // YouTube 도메인 검사
  const validDomains = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com'];
  if (!validDomains.includes(url.hostname)) {
    return {
      isValid: false,
      videoId: null,
      error: 'YouTube URL이 아닙니다',
      suggestion: `입력된 도메인: ${url.hostname}. youtube.com 또는 youtu.be URL을 입력해주세요`,
    };
  }

  // Video ID 추출 패턴들
  const patterns: Array<{ pattern: RegExp; extract: (match: RegExpMatchArray) => string }> = [
    // youtube.com/watch?v=VIDEO_ID
    { pattern: /[?&]v=([a-zA-Z0-9_-]{11})/, extract: (m) => m[1] },
    // youtu.be/VIDEO_ID
    { pattern: /youtu\.be\/([a-zA-Z0-9_-]{11})/, extract: (m) => m[1] },
    // youtube.com/embed/VIDEO_ID
    { pattern: /\/embed\/([a-zA-Z0-9_-]{11})/, extract: (m) => m[1] },
    // youtube.com/v/VIDEO_ID
    { pattern: /\/v\/([a-zA-Z0-9_-]{11})/, extract: (m) => m[1] },
    // youtube.com/shorts/VIDEO_ID
    { pattern: /\/shorts\/([a-zA-Z0-9_-]{11})/, extract: (m) => m[1] },
    // youtube.com/live/VIDEO_ID
    { pattern: /\/live\/([a-zA-Z0-9_-]{11})/, extract: (m) => m[1] },
  ];

  for (const { pattern, extract } of patterns) {
    const match = trimmedInput.match(pattern);
    if (match) {
      return { isValid: true, videoId: extract(match) };
    }
  }

  // YouTube URL이지만 영상 ID를 찾을 수 없음
  return {
    isValid: false,
    videoId: null,
    error: 'URL에서 영상 ID를 찾을 수 없습니다',
    suggestion: '유효한 YouTube 영상 URL인지 확인해주세요. 채널 URL이나 재생목록 URL은 지원하지 않습니다.',
  };
}

// ============================================
// YouTube API 호출
// ============================================

interface VideoApiResponse {
  success: boolean;
  data?: {
    videoId: string;
    title: string;
    description: string | null;
    channelId: string | null;
    channelTitle: string;
    thumbnail: string;
    publishedAt: string | null;
    duration: number | null;
    viewCount: number | null;
    likeCount: number | null;
    tags: string[];
    status: 'public' | 'unlisted' | 'private' | 'unknown';
  };
  error?: string;
  errorCode?: string;
  suggestion?: string;
}

async function fetchVideoInfo(videoId: string): Promise<VideoApiResponse> {
  if (!YOUTUBE_API_KEY) {
    // API 키가 없으면 oEmbed 사용
    return fetchVideoInfoOEmbed(videoId);
  }

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${videoId}&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    // API 에러 처리
    if (data.error) {
      const apiError = data.error;
      
      if (apiError.code === 403) {
        // API 키 권한 오류 시 oEmbed로 폴백
        console.warn('YouTube API 403 error, falling back to oEmbed:', apiError.message);
        return fetchVideoInfoOEmbed(videoId);
      }
      
      if (apiError.code === 400) {
        return {
          success: false,
          error: 'API 요청이 잘못되었습니다',
          errorCode: 'BAD_REQUEST',
          suggestion: '영상 ID 형식을 확인해주세요',
        };
      }

      // 기타 API 오류 시에도 oEmbed로 폴백 시도
      console.warn('YouTube API error, falling back to oEmbed:', apiError.message);
      return fetchVideoInfoOEmbed(videoId);
    }

    // 영상을 찾을 수 없음
    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: '영상을 찾을 수 없습니다',
        errorCode: 'VIDEO_NOT_FOUND',
        suggestion: '삭제되었거나 비공개 영상일 수 있습니다. URL을 다시 확인해주세요.',
      };
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const statistics = video.statistics || {};
    const contentDetails = video.contentDetails || {};
    const statusInfo = video.status || {};

    // 영상 공개 상태 확인
    let status: 'public' | 'unlisted' | 'private' | 'unknown' = 'unknown';
    if (statusInfo.privacyStatus === 'public') status = 'public';
    else if (statusInfo.privacyStatus === 'unlisted') status = 'unlisted';
    else if (statusInfo.privacyStatus === 'private') status = 'private';

    // 비공개 영상 경고
    if (status === 'private') {
      return {
        success: false,
        error: '비공개 영상입니다',
        errorCode: 'VIDEO_PRIVATE',
        suggestion: '비공개 영상은 조회할 수 없습니다. 영상 공개 설정을 확인해주세요.',
      };
    }

    return {
      success: true,
      data: {
        videoId,
        title: snippet.title,
        description: snippet.description,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        publishedAt: snippet.publishedAt,
        duration: parseDuration(contentDetails.duration),
        viewCount: parseInt(statistics.viewCount || '0'),
        likeCount: statistics.likeCount ? parseInt(statistics.likeCount) : null,
        tags: snippet.tags || [],
        status,
      },
    };
  } catch (error) {
    console.error('YouTube API fetch error:', error);
    return {
      success: false,
      error: 'YouTube API 호출 중 오류가 발생했습니다',
      errorCode: 'FETCH_ERROR',
      suggestion: '네트워크 연결을 확인해주세요',
    };
  }
}

// oEmbed API (API 키 없을 때 대체)
async function fetchVideoInfoOEmbed(videoId: string): Promise<VideoApiResponse> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  try {
    const response = await fetch(oembedUrl);

    if (response.status === 404) {
      return {
        success: false,
        error: '영상을 찾을 수 없습니다',
        errorCode: 'VIDEO_NOT_FOUND',
        suggestion: '삭제되었거나 비공개 영상일 수 있습니다',
      };
    }

    if (response.status === 401) {
      return {
        success: false,
        error: '임베드가 비활성화된 영상입니다',
        errorCode: 'EMBED_DISABLED',
        suggestion: '이 영상은 외부 임베드가 허용되지 않습니다',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: '영상 정보를 불러올 수 없습니다',
        errorCode: 'OEMBED_ERROR',
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        videoId,
        title: data.title,
        channelTitle: data.author_name,
        channelId: null,
        thumbnail: data.thumbnail_url,
        description: null,
        publishedAt: null,
        duration: null,
        viewCount: null,
        likeCount: null,
        tags: [],
        status: 'unknown',
      },
    };
  } catch (error) {
    console.error('oEmbed fetch error:', error);
    return {
      success: false,
      error: '영상 정보 조회 중 오류가 발생했습니다',
      errorCode: 'FETCH_ERROR',
    };
  }
}

// ISO 8601 duration 파싱 (PT1H2M3S -> 초)
function parseDuration(duration: string | null): number | null {
  if (!duration) return null;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}

// ============================================
// API Route Handler
// ============================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const videoId = searchParams.get('videoId');

  // URL 유효성 검사
  let validationResult: UrlValidationResult;

  if (videoId) {
    // 직접 videoId가 제공된 경우
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 영상 ID입니다',
        errorCode: 'INVALID_VIDEO_ID',
        suggestion: '영상 ID는 11자리 영숫자입니다',
      }, { status: 400 });
    }
    validationResult = { isValid: true, videoId };
  } else if (url) {
    validationResult = validateYouTubeUrl(url);
  } else {
    return NextResponse.json({
      success: false,
      error: 'URL 또는 videoId 파라미터가 필요합니다',
      errorCode: 'MISSING_PARAMETER',
      suggestion: '예시: /api/youtube/video?url=https://youtube.com/watch?v=xxxxx',
    }, { status: 400 });
  }

  // URL 유효성 검사 실패
  if (!validationResult.isValid) {
    return NextResponse.json({
      success: false,
      error: validationResult.error,
      errorCode: 'INVALID_URL',
      suggestion: validationResult.suggestion,
    }, { status: 400 });
  }

  // YouTube API 호출
  const result = await fetchVideoInfo(validationResult.videoId!);

  if (!result.success) {
    return NextResponse.json(result, { status: result.errorCode === 'VIDEO_NOT_FOUND' ? 404 : 500 });
  }

  return NextResponse.json(result);
}
