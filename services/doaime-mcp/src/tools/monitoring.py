"""
Monitoring Tools

시스템 모니터링 관련 Tool들
- monitoring.summary: 시스템 전체 요약
- monitoring.alerts: 최근 알림 조회
"""

from typing import Any

from fastmcp import FastMCP

from ..utils.client import get_client
from ..utils.config import get_config


def register_monitoring_tools(mcp: FastMCP) -> None:
    """Monitoring 관련 Tool들을 MCP 서버에 등록"""

    @mcp.tool(name="monitoring.summary")
    async def monitoring_summary() -> dict[str, Any]:
        """
        시스템 전체 요약

        CPU, 메모리, 디스크 사용량 등 시스템 메트릭을 반환합니다.

        Returns:
            API 서버의 /api/monitoring/summary 응답
        """
        client = get_client()
        response = await client.get("/api/monitoring/summary")

        if client.is_error(response):
            return response

        return response

    @mcp.tool(name="monitoring.alerts")
    async def monitoring_alerts(limit: int = 20) -> dict[str, Any]:
        """
        최근 알림 조회

        시스템에서 발생한 최근 알림들을 조회합니다.

        Args:
            limit: 조회할 알림 수 (기본: 20, 최대: 100)

        Returns:
            - count: 알림 수
            - alerts: 알림 목록
        """
        config = get_config()
        # limit 제한 적용
        limit = min(limit, config.limits.max_results)

        client = get_client()
        response = await client.get("/api/monitoring/alerts", params={"limit": limit})

        if client.is_error(response):
            return response

        # 응답 정규화
        alerts_list = response.get("alerts", response)
        if isinstance(alerts_list, list):
            return {
                "count": len(alerts_list),
                "alerts": alerts_list,
            }

        return {"count": 0, "alerts": []}
