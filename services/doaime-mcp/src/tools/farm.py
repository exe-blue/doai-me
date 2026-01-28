"""
Farm Tools

전체 Agent Farm 상태를 조회하는 Tool들
- farm.overview: 전체 Farm 상태 한눈에 보기
- farm.unhealthy: 비정상 노드만 빠르게 확인
"""

import asyncio
from datetime import datetime, timezone
from typing import Any

from fastmcp import FastMCP

from ..utils.client import get_client


def register_farm_tools(mcp: FastMCP) -> None:
    """Farm 관련 Tool들을 MCP 서버에 등록"""

    @mcp.tool(name="farm.overview")
    async def farm_overview() -> dict[str, Any]:
        """
        전체 Farm 상태 한눈에 보기

        노드, 디바이스, 시스템 메트릭을 통합하여 반환합니다.

        Returns:
            - nodes: 노드 통계 (total, healthy, unhealthy, list)
            - devices: 디바이스 통계 (total, online, offline)
            - system: 시스템 메트릭 (cpu_percent, memory_percent, uptime)
            - timestamp: 조회 시간
        """
        client = get_client()

        # 병렬로 3개 API 호출
        nodes_response, devices_response, system_response = await asyncio.gather(
            client.get("/api/oob/nodes"),
            client.get("/api/laixi/devices"),
            client.get("/api/monitoring/summary"),
        )

        # 노드 데이터 집계
        nodes_data = {"total": 0, "healthy": 0, "unhealthy": 0, "list": []}
        if not client.is_error(nodes_response):
            nodes_list = nodes_response.get("nodes", nodes_response)
            if isinstance(nodes_list, list):
                nodes_data["total"] = len(nodes_list)
                nodes_data["healthy"] = sum(
                    1 for n in nodes_list if n.get("status") == "healthy"
                )
                nodes_data["unhealthy"] = nodes_data["total"] - nodes_data["healthy"]
                nodes_data["list"] = [
                    {
                        "id": n.get("id", n.get("node_id")),
                        "status": n.get("status", "unknown"),
                        "last_seen": n.get("last_seen", n.get("last_heartbeat")),
                    }
                    for n in nodes_list[:10]  # 최대 10개만
                ]
        else:
            nodes_data["error"] = nodes_response.get("error")

        # 디바이스 데이터 집계
        devices_data = {"total": 0, "online": 0, "offline": 0}
        if not client.is_error(devices_response):
            devices_list = devices_response.get("devices", devices_response)
            if isinstance(devices_list, list):
                devices_data["total"] = len(devices_list)
                devices_data["online"] = sum(
                    1 for d in devices_list if d.get("status") == "online"
                )
                devices_data["offline"] = devices_data["total"] - devices_data["online"]
        else:
            devices_data["error"] = devices_response.get("error")

        # 시스템 데이터
        system_data = {"cpu_percent": 0, "memory_percent": 0, "uptime": "unknown"}
        if not client.is_error(system_response):
            system_data = {
                "cpu_percent": system_response.get("cpu_percent", 0),
                "memory_percent": system_response.get("memory_percent", 0),
                "uptime": system_response.get("uptime", "unknown"),
            }
        else:
            system_data["error"] = system_response.get("error")

        return {
            "nodes": nodes_data,
            "devices": devices_data,
            "system": system_data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @mcp.tool(name="farm.unhealthy")
    async def farm_unhealthy() -> dict[str, Any]:
        """
        비정상 노드만 빠르게 확인

        문제가 있는 노드들만 필터링하여 반환합니다.

        Returns:
            - count: 비정상 노드 수
            - nodes: 비정상 노드 목록 (id, status, issue, last_healthy, suggested_action)
        """
        client = get_client()
        response = await client.get("/api/oob/unhealthy")

        if client.is_error(response):
            return response

        # API 응답 정규화
        nodes_list = response.get("nodes", response)
        if isinstance(nodes_list, list):
            return {
                "count": len(nodes_list),
                "nodes": [
                    {
                        "id": n.get("id", n.get("node_id")),
                        "status": n.get("status", "unhealthy"),
                        "issue": n.get("issue", n.get("error", "Unknown issue")),
                        "last_healthy": n.get("last_healthy"),
                        "suggested_action": n.get(
                            "suggested_action", _suggest_action(n.get("status"))
                        ),
                    }
                    for n in nodes_list
                ],
            }

        return {"count": 0, "nodes": []}


def _suggest_action(status: str | None) -> str:
    """상태에 따른 권장 조치 반환"""
    actions = {
        "offline": "노드 재시작 필요 (recovery.execute 사용)",
        "error": "로그 확인 후 reconnect 시도",
        "degraded": "시스템 리소스 확인 필요",
        "timeout": "네트워크 연결 확인",
    }
    return actions.get(status or "", "상태 확인 필요")
