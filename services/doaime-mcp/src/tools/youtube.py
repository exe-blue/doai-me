"""
YouTube Tools

YouTube 시청 관련 Tool들
- youtube.queue: YouTube 시청 대기열 조회
- youtube.stats: YouTube 시청 통계 통합
"""

import asyncio
from typing import Any

from fastmcp import FastMCP

from ..utils.client import get_client
from ..utils.config import get_config


def register_youtube_tools(mcp: FastMCP) -> None:
    """YouTube 관련 Tool들을 MCP 서버에 등록"""

    @mcp.tool(name="youtube.queue")
    async def youtube_queue(limit: int = 50) -> dict[str, Any]:
        """
        YouTube 시청 대기열 조회

        시청 대기 중인 YouTube 영상 목록을 조회합니다.

        Args:
            limit: 조회할 영상 수 (기본: 50, 최대: 100)

        Returns:
            - count: 대기열 영상 수
            - videos: 영상 목록 (video_id, title, channel, priority, queued_at)
        """
        config = get_config()
        limit = min(limit, config.limits.max_results)

        client = get_client()
        response = await client.get(
            "/api/youtube-channels/queue", params={"limit": limit}
        )

        if client.is_error(response):
            return response

        # 응답 정규화
        videos_list = response.get("videos", response.get("queue", response))
        if isinstance(videos_list, list):
            return {
                "count": len(videos_list),
                "videos": [
                    {
                        "video_id": v.get("video_id", v.get("youtube_video_id")),
                        "title": v.get("title", "Unknown"),
                        "channel": v.get("channel", v.get("channel_name", "Unknown")),
                        "priority": v.get("priority", 0),
                        "queued_at": v.get("queued_at", v.get("created_at")),
                    }
                    for v in videos_list
                ],
            }

        return {"count": 0, "videos": []}

    @mcp.tool(name="youtube.stats")
    async def youtube_stats() -> dict[str, Any]:
        """
        YouTube 시청 통계 통합

        오늘의 시청 통계, 대기열 현황, 채널 정보를 통합하여 반환합니다.

        Returns:
            - today: 오늘의 통계 (watched, total_minutes, comments, likes)
            - queue: 대기열 현황 (pending, processing, completed_today)
            - channels: 채널 정보 (active, total_videos)
        """
        client = get_client()

        # 두 API 병렬 호출
        stats_response, queue_stats_response = await asyncio.gather(
            client.get("/api/youtube/stats"),
            client.get("/api/youtube-channels/queue/stats"),
        )

        # 오늘의 통계
        today_stats = {
            "watched": 0,
            "total_minutes": 0.0,
            "comments": 0,
            "likes": 0,
        }
        if not client.is_error(stats_response):
            today_stats = {
                "watched": stats_response.get(
                    "watched_today", stats_response.get("watched", 0)
                ),
                "total_minutes": stats_response.get(
                    "total_minutes", stats_response.get("watch_time_minutes", 0)
                ),
                "comments": stats_response.get(
                    "comments_today", stats_response.get("comments", 0)
                ),
                "likes": stats_response.get(
                    "likes_today", stats_response.get("likes", 0)
                ),
            }

        # 대기열 현황
        queue_data = {
            "pending": 0,
            "processing": 0,
            "completed_today": 0,
        }
        channels_data = {
            "active": 0,
            "total_videos": 0,
        }
        if not client.is_error(queue_stats_response):
            queue_data = {
                "pending": queue_stats_response.get("pending", 0),
                "processing": queue_stats_response.get("processing", 0),
                "completed_today": queue_stats_response.get("completed_today", 0),
            }
            channels_data = {
                "active": queue_stats_response.get(
                    "active_channels", queue_stats_response.get("channels", 0)
                ),
                "total_videos": queue_stats_response.get("total_videos", 0),
            }

        return {
            "today": today_stats,
            "queue": queue_data,
            "channels": channels_data,
        }
