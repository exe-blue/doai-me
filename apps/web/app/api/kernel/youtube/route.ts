/**
 * Kernel YouTube 웹 자동화 API
 * 
 * Kernel Browsers-as-a-Service를 사용하여 YouTube 웹에서
 * 댓글 작성, 좋아요, 구독 자동화를 실행합니다.
 * 
 * @author Axon (Tech Lead)
 */

import { NextRequest, NextResponse } from 'next/server';

// Kernel SDK 타입 정의 (런타임 임포트)
interface KernelBrowser {
  cdp_ws_url: string;
  browser_id: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KernelClient = any;

// 작업 결과 타입
interface ActionResult {
  success: boolean;
  action: string;
  videoId?: string;
  channelId?: string;
  message: string;
  error?: string;
  duration?: number;
}

// 요청 바디 타입
interface YouTubeActionRequest {
  action: 'comment' | 'like' | 'subscribe' | 'watch';
  videoId?: string;
  channelId?: string;
  comment?: string;
  watchDuration?: number; // 초 단위
  profile?: string; // Kernel Profile 이름 (세션 재사용)
}

// 환경 변수
const KERNEL_API_KEY = process.env.KERNEL_API_KEY;

// ============================================
// 유틸리티 함수
// ============================================

/**
 * Kernel SDK 동적 로드
 */
async function getKernelClient(): Promise<KernelClient | null> {
  if (!KERNEL_API_KEY) {
    console.error('KERNEL_API_KEY가 설정되지 않았습니다');
    return null;
  }
  
  try {
    // 동적 임포트 - @onkernel/sdk는 선택적 의존성
    // @ts-expect-error - @onkernel/sdk may not be installed
    const KernelModule = await import('@onkernel/sdk');
    const Kernel = KernelModule.default || KernelModule;
    return new Kernel({ apiKey: KERNEL_API_KEY });
  } catch (error) {
    console.error('Kernel SDK 로드 실패:', error);
    return null;
  }
}

/**
 * Playwright 동적 로드
 */
async function getPlaywright() {
  try {
    const { chromium } = await import('playwright');
    return chromium;
  } catch (error) {
    console.error('Playwright 로드 실패:', error);
    return null;
  }
}

/**
 * 랜덤 딜레이 (인간다운 행동 시뮬레이션)
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// ============================================
// YouTube 자동화 함수
// ============================================

/**
 * YouTube 페이지 로드 대기
 */
async function waitForYouTubeLoad(page: unknown): Promise<void> {
  const p = page as { waitForLoadState: (state: string) => Promise<void>; waitForTimeout: (ms: number) => Promise<void> };
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(2000); // 추가 대기 (동적 콘텐츠 로드)
}

/**
 * 좋아요 클릭
 */
async function clickLike(page: unknown, videoId: string): Promise<ActionResult> {
  const p = page as {
    goto: (url: string) => Promise<void>;
    locator: (selector: string) => { 
      first: () => { click: () => Promise<void>; getAttribute: (attr: string) => Promise<string | null> };
      click: () => Promise<void>; 
      getAttribute: (attr: string) => Promise<string | null>; 
      isVisible: () => Promise<boolean>;
    };
    getByRole: (role: string, options: { name: RegExp }) => { 
      first: () => { click: () => Promise<void>; getAttribute: (attr: string) => Promise<string | null> };
      click: () => Promise<void>; 
      getAttribute: (attr: string) => Promise<string | null>;
    };
    waitForTimeout: (ms: number) => Promise<void>;
  };
  
  const startTime = Date.now();
  
  try {
    // 영상 페이지로 이동
    await p.goto(`https://www.youtube.com/watch?v=${videoId}`);
    await randomDelay(2000, 4000);
    
    // 좋아요 버튼 찾기 - "like this video" 텍스트를 포함하는 첫 번째 버튼
    // YouTube의 버튼은 "like this video along with X other people" 형식
    const likeButton = p.getByRole('button', { name: /like this video along with/i }).first();
    
    // 이미 좋아요했는지 확인
    const ariaPressed = await likeButton.getAttribute('aria-pressed');
    if (ariaPressed === 'true') {
      return {
        success: true,
        action: 'like',
        videoId,
        message: '이미 좋아요한 영상입니다',
        duration: Date.now() - startTime,
      };
    }
    
    // 좋아요 클릭
    await likeButton.click();
    await randomDelay(500, 1000);
    
    return {
      success: true,
      action: 'like',
      videoId,
      message: '좋아요 완료',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      action: 'like',
      videoId,
      message: '좋아요 실패',
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 댓글 작성
 */
async function postComment(page: unknown, videoId: string, comment: string): Promise<ActionResult> {
  const p = page as {
    goto: (url: string) => Promise<void>;
    locator: (selector: string) => { 
      click: () => Promise<void>; 
      fill: (text: string) => Promise<void>;
      isVisible: () => Promise<boolean>;
    };
    waitForTimeout: (ms: number) => Promise<void>;
    evaluate: (fn: () => void) => Promise<void>;
  };
  
  const startTime = Date.now();
  
  try {
    // 영상 페이지로 이동
    await p.goto(`https://www.youtube.com/watch?v=${videoId}`);
    await randomDelay(3000, 5000);
    
    // 스크롤해서 댓글 섹션 로드
    await p.evaluate(() => {
      window.scrollBy(0, 500);
    });
    await randomDelay(2000, 3000);
    
    // 댓글 입력란 클릭
    const commentInput = p.locator('#simplebox-placeholder, ytd-comment-simplebox-renderer #placeholder-area');
    await commentInput.click();
    await randomDelay(500, 1000);
    
    // 댓글 입력
    const commentTextarea = p.locator('#contenteditable-root, ytd-comment-simplebox-renderer #contenteditable-textarea');
    await commentTextarea.fill(comment);
    await randomDelay(500, 1000);
    
    // 게시 버튼 클릭
    const submitButton = p.locator('#submit-button button, ytd-comment-simplebox-renderer #submit-button');
    await submitButton.click();
    await randomDelay(1000, 2000);
    
    return {
      success: true,
      action: 'comment',
      videoId,
      message: `댓글 작성 완료: "${comment.slice(0, 30)}..."`,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      action: 'comment',
      videoId,
      message: '댓글 작성 실패',
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 구독 클릭
 */
async function clickSubscribe(page: unknown, channelId: string): Promise<ActionResult> {
  const p = page as {
    goto: (url: string) => Promise<void>;
    locator: (selector: string) => { 
      click: () => Promise<void>; 
      textContent: () => Promise<string | null>;
      isVisible: () => Promise<boolean>;
    };
    waitForTimeout: (ms: number) => Promise<void>;
  };
  
  const startTime = Date.now();
  
  try {
    // 채널 페이지로 이동
    await p.goto(`https://www.youtube.com/channel/${channelId}`);
    await randomDelay(2000, 4000);
    
    // 구독 버튼 찾기
    const subscribeButton = p.locator('#subscribe-button button, ytd-subscribe-button-renderer button');
    
    // 이미 구독했는지 확인
    const buttonText = await subscribeButton.textContent();
    if (buttonText?.includes('구독중') || buttonText?.toLowerCase().includes('subscribed')) {
      return {
        success: true,
        action: 'subscribe',
        channelId,
        message: '이미 구독한 채널입니다',
        duration: Date.now() - startTime,
      };
    }
    
    // 구독 클릭
    await subscribeButton.click();
    await randomDelay(500, 1000);
    
    return {
      success: true,
      action: 'subscribe',
      channelId,
      message: '구독 완료',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      action: 'subscribe',
      channelId,
      message: '구독 실패',
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 영상 시청
 */
async function watchVideo(page: unknown, videoId: string, duration: number): Promise<ActionResult> {
  const p = page as {
    goto: (url: string) => Promise<void>;
    locator: (selector: string) => { 
      click: () => Promise<void>;
      isVisible: () => Promise<boolean>;
    };
    waitForTimeout: (ms: number) => Promise<void>;
  };
  
  const startTime = Date.now();
  
  try {
    // 영상 페이지로 이동
    await p.goto(`https://www.youtube.com/watch?v=${videoId}`);
    await randomDelay(3000, 5000);
    
    // 재생 버튼 클릭 (자동 재생 안 되는 경우)
    try {
      const playButton = p.locator('.ytp-play-button');
      const isVisible = await playButton.isVisible();
      if (isVisible) {
        await playButton.click();
      }
    } catch {
      // 자동 재생 중이면 무시
    }
    
    // 지정된 시간 동안 시청
    await p.waitForTimeout(duration * 1000);
    
    return {
      success: true,
      action: 'watch',
      videoId,
      message: `${duration}초 시청 완료`,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      action: 'watch',
      videoId,
      message: '시청 실패',
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

// ============================================
// API 핸들러
// ============================================

/**
 * POST /api/kernel/youtube
 * YouTube 자동화 액션 실행
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 요청 바디 파싱
    const body: YouTubeActionRequest = await request.json();
    const { action, videoId, channelId, comment, watchDuration = 30, profile } = body;
    
    // 필수 파라미터 검증
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'action 파라미터가 필요합니다' },
        { status: 400 }
      );
    }
    
    if ((action === 'like' || action === 'comment' || action === 'watch') && !videoId) {
      return NextResponse.json(
        { success: false, error: 'videoId가 필요합니다' },
        { status: 400 }
      );
    }
    
    if (action === 'subscribe' && !channelId) {
      return NextResponse.json(
        { success: false, error: 'channelId가 필요합니다' },
        { status: 400 }
      );
    }
    
    if (action === 'comment' && !comment) {
      return NextResponse.json(
        { success: false, error: 'comment 내용이 필요합니다' },
        { status: 400 }
      );
    }
    
    // Kernel 클라이언트 초기화
    const kernel = await getKernelClient();
    if (!kernel) {
      return NextResponse.json(
        { success: false, error: 'Kernel 초기화 실패. KERNEL_API_KEY를 확인하세요.' },
        { status: 500 }
      );
    }
    
    // Playwright 로드
    const chromium = await getPlaywright();
    if (!chromium) {
      return NextResponse.json(
        { success: false, error: 'Playwright 로드 실패' },
        { status: 500 }
      );
    }
    
    // Kernel 브라우저 생성
    const kernelBrowser = await kernel.browsers.create({
      profile: profile, // 세션 재사용
      timeout: 5 * 60 * 1000, // 5분 타임아웃
    });
    
    let result: ActionResult;
    let browser;
    
    try {
      // CDP로 Playwright 연결
      browser = await chromium.connectOverCDP(kernelBrowser.cdp_ws_url);
      const context = browser.contexts()[0] || await browser.newContext();
      const page = await context.newPage();
      
      // YouTube 로드
      await waitForYouTubeLoad(page);
      
      // 액션 실행
      switch (action) {
        case 'like':
          result = await clickLike(page, videoId!);
          break;
          
        case 'comment':
          result = await postComment(page, videoId!, comment!);
          break;
          
        case 'subscribe':
          result = await clickSubscribe(page, channelId!);
          break;
          
        case 'watch':
          result = await watchVideo(page, videoId!, watchDuration);
          break;
          
        default:
          result = {
            success: false,
            action: action,
            message: '지원하지 않는 액션입니다',
            error: `Unknown action: ${action}`,
          };
      }
      
    } finally {
      // 브라우저 정리
      if (browser) {
        await browser.close();
      }
      
      // Kernel 브라우저 종료
      try {
        await kernel.browsers.terminate(kernelBrowser.browser_id);
      } catch (e) {
        console.warn('Kernel 브라우저 종료 실패:', e);
      }
    }
    
    return NextResponse.json({
      success: result.success,
      data: result,
      totalDuration: Date.now() - startTime,
    });
    
  } catch (error) {
    console.error('YouTube 자동화 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        totalDuration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/kernel/youtube
 * API 상태 확인
 */
export async function GET() {
  const hasApiKey = !!KERNEL_API_KEY;
  
  return NextResponse.json({
    success: true,
    status: 'ready',
    kernelConfigured: hasApiKey,
    supportedActions: ['like', 'comment', 'subscribe', 'watch'],
    message: hasApiKey 
      ? 'Kernel YouTube API가 준비되었습니다' 
      : 'KERNEL_API_KEY가 설정되지 않았습니다',
  });
}
