"""
Tasks Tools

태스크 관리 관련 Tool들
- tasks.create: 새 Task 생성 및 노드에 할당
- tasks.status: Task 상태 확인
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from fastmcp import FastMCP

from ..utils.client import get_client


class TaskType(str, Enum):
    """태스크 유형"""

    YOUTUBE_WATCH = "youtube_watch"
    SCREENSHOT = "screenshot"
    WIFI_CHECK = "wifi_check"
    CUSTOM = "custom"


def register_tasks_tools(mcp: FastMCP) -> None:
    """Tasks 관련 Tool들을 MCP 서버에 등록"""

    @mcp.tool(name="tasks.create")
    async def tasks_create(
        node_id: str,
        task_type: str = "custom",
        payload: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        새 Task 생성 및 노드에 할당

        지정된 노드에 새로운 태스크를 생성하여 할당합니다.

        Args:
            node_id: 태스크를 실행할 노드 ID
            task_type: 태스크 유형 (youtube_watch, screenshot, wifi_check, custom)
            payload: 태스크 추가 데이터 (선택)

        Returns:
            - task_id: 생성된 태스크 ID
            - status: 태스크 상태
            - node_id: 할당된 노드 ID
            - created_at: 생성 시간
        """
        # task_type 검증
        valid_types = [t.value for t in TaskType]
        if task_type not in valid_types:
            return {
                "success": False,
                "error": {
                    "type": "validation",
                    "message": f"Invalid task_type. Must be one of: {valid_types}",
                },
            }

        client = get_client()
        response = await client.post(
            "/api/tasks",
            data={
                "node_id": node_id,
                "type": task_type,
                "payload": payload or {},
            },
        )

        if client.is_error(response):
            return response

        return {
            "task_id": response.get("task_id", response.get("id")),
            "status": response.get("status", "pending"),
            "node_id": node_id,
            "created_at": response.get("created_at", datetime.now(timezone.utc).isoformat()),
        }

    @mcp.tool(name="tasks.status")
    async def tasks_status(task_id: str) -> dict[str, Any]:
        """
        Task 상태 확인

        지정된 태스크의 현재 상태를 조회합니다.

        Args:
            task_id: 조회할 태스크 ID

        Returns:
            태스크 상태 정보 (API 응답)
        """
        client = get_client()
        response = await client.get(f"/api/tasks/{task_id}")
        return response
