"""
Recovery Tools

노드 복구 관련 Tool들
- recovery.execute: 노드 복구 실행 (위험 - 확인 필요)
- recovery.history: 복구 이력 조회
"""

from enum import Enum
from typing import Any, Optional

from fastmcp import FastMCP

from ..utils.client import get_client
from ..utils.config import get_config


class RecoveryAction(str, Enum):
    """복구 액션 유형"""

    RESTART = "restart"  # 노드 재시작
    RECONNECT = "reconnect"  # 연결 재설정
    FULL_RESET = "full_reset"  # 전체 리셋


def register_recovery_tools(mcp: FastMCP) -> None:
    """Recovery 관련 Tool들을 MCP 서버에 등록"""

    @mcp.tool(name="recovery.execute")
    async def recovery_execute(node_id: str, action: str) -> dict[str, Any]:
        """
        노드 복구 실행

        ⚠️ 주의: 이 작업은 노드에 영향을 줍니다.
        - restart: 노드 재시작 (연결된 디바이스 작업 중단)
        - reconnect: Gateway 연결 재설정
        - full_reset: 전체 리셋 (모든 상태 초기화)

        Args:
            node_id: 복구할 노드 ID
            action: 복구 액션 (restart, reconnect, full_reset)

        Returns:
            - success: 성공 여부
            - node_id: 노드 ID
            - action: 실행한 액션
            - message: 결과 메시지
            - recovery_id: 복구 작업 ID
        """
        # action 검증
        valid_actions = [a.value for a in RecoveryAction]
        if action not in valid_actions:
            return {
                "success": False,
                "error": {
                    "type": "validation",
                    "message": f"Invalid action. Must be one of: {valid_actions}",
                },
            }

        # 위험한 작업 경고 (full_reset)
        if action == RecoveryAction.FULL_RESET.value:
            warning = (
                f"⚠️ full_reset은 {node_id}의 모든 상태를 초기화합니다. "
                "진행 중인 모든 작업이 중단됩니다."
            )
        else:
            warning = None

        client = get_client()
        response = await client.post(
            "/api/oob/recover",
            data={
                "node_id": node_id,
                "action": action,
            },
        )

        if client.is_error(response):
            return response

        result = {
            "success": response.get("success", True),
            "node_id": node_id,
            "action": action,
            "message": response.get("message", f"{action} 요청이 전송되었습니다."),
            "recovery_id": response.get("recovery_id", response.get("id")),
        }

        if warning:
            result["warning"] = warning

        return result

    @mcp.tool(name="recovery.history")
    async def recovery_history(
        node_id: Optional[str] = None, limit: int = 20
    ) -> dict[str, Any]:
        """
        복구 이력 조회

        노드 복구 작업 이력을 조회합니다.

        Args:
            node_id: 특정 노드만 조회 (선택)
            limit: 조회할 이력 수 (기본: 20)

        Returns:
            - count: 이력 수
            - history: 복구 이력 목록
        """
        config = get_config()
        limit = min(limit, config.limits.max_results)

        params: dict[str, Any] = {"limit": limit}
        if node_id:
            params["node_id"] = node_id

        client = get_client()
        response = await client.get("/api/oob/recovery/history", params=params)

        if client.is_error(response):
            return response

        # 응답 정규화
        history_list = response.get("history", response)
        if isinstance(history_list, list):
            return {
                "count": len(history_list),
                "history": history_list,
            }

        return {"count": 0, "history": []}
