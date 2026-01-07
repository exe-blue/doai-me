/**
 * YouTube New Video Polling API
 * 
 * 구독 중인 채널에서 신규 영상 감지 및 자동 등록
 * 
 * GET /api/youtube/poll - 신규 영상 확인 및 등록
 */

import { NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

// 등록된 구독 조회
async function getSubscriptions() {
  // 같은 프로세스 내 subscribe API 호출
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/youtube/subscribe`, {
    cache: 'no-store',
  });
  const data = await response.json();
  return data.data || [];
}

// 채널의 최신 영상 조회
async function fetchLatestVideo(uploadsPlaylistId: string) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API 키가 설정되지 않았습니다');
  }
  
  const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=1&key=${YOUTUBE_API_KEY}`;
  
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    return null;
  }
  
  const item = data.items[0];
  const snippet = item.snippet;
  const contentDetails = item.contentDetails;
  
  return {
    videoId: contentDetails.videoId,
    title: snippet.title,
    description: snippet.description,
    thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
    publishedAt: contentDetails.videoPublishedAt || snippet.publishedAt,
    channelId: snippet.channelId,
    channelTitle: snippet.channelTitle,
  };
}

// Laixi Bridge로 영상 전송
async function sendToLaixiBridge(video: {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}) {
  const wsUrl = process.env.NEXT_PUBLIC_DOAI_WS_URL || 'ws://localhost:8080';
  
  // REST API로 영상 등록 (WebSocket 대신)
  // Bridge가 HTTP 엔드포인트도 제공한다고 가정
  try {
    const response = await fetch(`${wsUrl.replace('ws://', 'http://').replace('wss://', 'https://')}/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ADD_VIDEO',
        video: {
          id: `yt_${video.videoId}_${Date.now()}`,
          videoId: video.videoId,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          title: video.title,
          channel: video.channelTitle,
          thumbnail: video.thumbnail,
          targetViews: 50, // 기본 목표 조회수
          source: 'auto_subscribe', // 자동 구독에서 등록됨
        },
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to send to Laixi Bridge:', error);
    return false;
  }
}

export async function GET() {
  try {
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'YouTube API 키가 설정되지 않았습니다',
      }, { status: 500 });
    }
    
    const subscriptions = await getSubscriptions();
    
    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: '구독 중인 채널이 없습니다',
        newVideos: [],
      });
    }
    
    const newVideos: Array<{
      videoId: string;
      title: string;
      channelTitle: string;
      thumbnail: string;
      registered: boolean;
    }> = [];
    
    for (const sub of subscriptions) {
      try {
        const latestVideo = await fetchLatestVideo(sub.uploadsPlaylistId);
        
        if (latestVideo && latestVideo.videoId !== sub.lastVideoId) {
          // 새 영상 발견!
          console.log(`[YouTube Poll] New video detected: ${latestVideo.title} from ${sub.channelTitle}`);
          
          let registered = false;
          
          // 자동 등록이 활성화되어 있으면 Laixi로 전송
          if (sub.autoRegister) {
            registered = await sendToLaixiBridge(latestVideo);
          }
          
          newVideos.push({
            videoId: latestVideo.videoId,
            title: latestVideo.title,
            channelTitle: latestVideo.channelTitle,
            thumbnail: latestVideo.thumbnail,
            registered,
          });
          
          // TODO: lastVideoId 업데이트 (DB 사용 시)
        }
      } catch (error) {
        console.error(`Failed to check channel ${sub.channelId}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      checkedChannels: subscriptions.length,
      newVideos,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Poll error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

