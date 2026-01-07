// ============================================
// DoAi.ME - Videos Queue API
// 비디오 시청 큐 관리 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// Types
// ============================================

interface QueuedVideo {
  id: string;
  title: string;
  url: string;
  registeredAt: string;
  scheduledTime?: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
  assignedNodes: string[];
  progress: number;
  targetViews: number;
  currentViews: number;
  completedAt?: string;
  errorCount: number;
}

// ============================================
// In-memory store (실제 구현 시 Redis/DB로 대체)
// ============================================

const videoQueue = new Map<string, QueuedVideo>();
const completedVideos: QueuedVideo[] = [];

// ============================================
// GET /api/nodes/videos - 비디오 큐 조회
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    let videos = Array.from(videoQueue.values());

    // 상태 필터링
    if (status) {
      videos = videos.filter(v => v.status === status);
    }

    // 미완료 순 정렬
    videos.sort((a, b) => a.progress - b.progress);

    const response: {
      success: boolean;
      data: {
        queue: QueuedVideo[];
        completed?: QueuedVideo[];
        stats: {
          totalQueued: number;
          running: number;
          completed: number;
          totalViews: number;
        };
      };
    } = {
      success: true,
      data: {
        queue: videos,
        stats: {
          totalQueued: videoQueue.size,
          running: videos.filter(v => v.status === 'running').length,
          completed: completedVideos.length,
          totalViews: completedVideos.reduce((sum, v) => sum + v.currentViews, 0),
        },
      },
    };

    if (includeCompleted) {
      response.data.completed = completedVideos.slice(0, 50); // 최근 50개
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/nodes/videos - 비디오 관리
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, video, videoId } = body;

    switch (action) {
      // 비디오 등록
      case 'add': {
        if (!video || !video.title) {
          return NextResponse.json(
            { success: false, error: 'Video data with title is required' },
            { status: 400 }
          );
        }

        const newVideo: QueuedVideo = {
          id: video.id || `video_${Date.now()}`,
          title: video.title,
          url: video.url || '',
          registeredAt: new Date().toISOString(),
          scheduledTime: video.scheduledTime,
          status: 'queued',
          assignedNodes: [],
          progress: 0,
          targetViews: video.targetViews || 400,
          currentViews: 0,
          errorCount: 0,
        };

        videoQueue.set(newVideo.id, newVideo);

        return NextResponse.json({
          success: true,
          data: { video: newVideo },
        });
      }

      // 비디오 상태 업데이트
      case 'status': {
        if (!videoId) {
          return NextResponse.json(
            { success: false, error: 'videoId is required' },
            { status: 400 }
          );
        }

        const existingVideo = videoQueue.get(videoId);
        if (!existingVideo) {
          return NextResponse.json(
            { success: false, error: 'Video not found' },
            { status: 404 }
          );
        }

        if (body.status) existingVideo.status = body.status;
        if (body.currentViews !== undefined) {
          existingVideo.currentViews = body.currentViews;
          existingVideo.progress = (existingVideo.currentViews / existingVideo.targetViews) * 100;
        }
        if (body.assignedNodes) {
          existingVideo.assignedNodes = [...new Set([...existingVideo.assignedNodes, ...body.assignedNodes])];
        }
        if (body.errorCount !== undefined) {
          existingVideo.errorCount = body.errorCount;
        }

        videoQueue.set(videoId, existingVideo);

        return NextResponse.json({
          success: true,
          data: { video: existingVideo },
        });
      }

      // 비디오 진행 업데이트 (노드로부터 보고)
      case 'progress': {
        if (!videoId) {
          return NextResponse.json(
            { success: false, error: 'videoId is required' },
            { status: 400 }
          );
        }

        const existingVideo = videoQueue.get(videoId);
        if (!existingVideo) {
          return NextResponse.json(
            { success: false, error: 'Video not found' },
            { status: 404 }
          );
        }

        const { nodeId, viewsAdded, isError } = body;
        
        if (nodeId) {
          existingVideo.assignedNodes = [...new Set([...existingVideo.assignedNodes, nodeId])];
        }
        
        if (viewsAdded) {
          existingVideo.currentViews = Math.min(
            existingVideo.targetViews,
            existingVideo.currentViews + viewsAdded
          );
          existingVideo.progress = (existingVideo.currentViews / existingVideo.targetViews) * 100;
        }

        if (isError) {
          existingVideo.errorCount++;
        }

        // 완료 체크
        if (existingVideo.currentViews >= existingVideo.targetViews) {
          existingVideo.status = 'completed';
          existingVideo.completedAt = new Date().toISOString();
          
          videoQueue.delete(videoId);
          completedVideos.unshift(existingVideo);
          
          return NextResponse.json({
            success: true,
            data: { video: existingVideo, completed: true },
          });
        }

        existingVideo.status = 'running';
        videoQueue.set(videoId, existingVideo);

        return NextResponse.json({
          success: true,
          data: { video: existingVideo, completed: false },
        });
      }

      // 비디오 완료 처리
      case 'complete': {
        if (!videoId) {
          return NextResponse.json(
            { success: false, error: 'videoId is required' },
            { status: 400 }
          );
        }

        const existingVideo = videoQueue.get(videoId);
        if (!existingVideo) {
          return NextResponse.json(
            { success: false, error: 'Video not found' },
            { status: 404 }
          );
        }

        existingVideo.status = 'completed';
        existingVideo.completedAt = new Date().toISOString();
        
        videoQueue.delete(videoId);
        completedVideos.unshift(existingVideo);

        return NextResponse.json({
          success: true,
          data: { video: existingVideo },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Failed to process request: ${error}` },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/nodes/videos - 비디오 삭제
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (videoId) {
      const deleted = videoQueue.delete(videoId);
      return NextResponse.json({
        success: true,
        data: { deleted: deleted ? 1 : 0 },
      });
    }

    // 전체 큐 초기화
    const count = videoQueue.size;
    videoQueue.clear();

    return NextResponse.json({
      success: true,
      data: { deleted: count },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete videos' },
      { status: 500 }
    );
  }
}

