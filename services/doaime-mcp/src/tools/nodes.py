"""
Nodes Tools

노드 관리 관련 Tool들
- nodes.list: Gateway에 연결된 노드 목록
- nodes.detail: 특정 노드 상세 (Gateway + OOB 통합)
"""

import asyncio
from typing import Any

from fastmcp import FastMCP

from ..utils.client import get_client


def register_nodes_tools(mcp: FastMCP) -> None:
    """Nodes 관련 Tool들을 MCP 서버에 등록"""

    @mcp.tool(name="nodes.list")
    async def nodes_list() -> dict[str, Any]:
        """
        Gateway에 연결된 노드 목록

        현재 Cloud Gateway에 연결되어 있는 모든 노드를 조회합니다.

        Returns:
            - count: 노드 수
            - nodes: 노드 목록 (id, connected_at, device_count, status)
        """
        client = get_client()
        response = await client.get("/api/nodes")

        if client.is_error(response):
            return response

        # 응답 정규화
        nodes_list = response.get("nodes", response)
        if isinstance(nodes_list, list):
            return {
                "count": len(nodes_list),
                "nodes": [
                    {
                        "id": n.get("id", n.get("node_id")),
                        "connected_at": n.get("connected_at"),
                        "device_count": n.get("device_count", len(n.get("devices", []))),
                        "status": n.get("status", "connected"),
                    }
                    for n in nodes_list
                ],
            }

        return {"count": 0, "nodes": []}

    @mcp.tool(name="nodes.detail")
    async def nodes_detail(node_id: str) -> dict[str, Any]:
        """
        특정 노드 상세 정보 (Gateway + OOB 통합)

        Gateway 연결 정보와 OOB 헬스 정보를 통합하여 반환합니다.

        Args:
            node_id: 노드 ID

        Returns:
            - id: 노드 ID
            - gateway_info: Gateway 연결 정보
            - health_info: OOB 헬스 정보
            - devices: 연결된 디바이스 목록
            - metrics: 시스템 메트릭 (cpu, memory, disk)
        """
        client = get_client()

        # Gateway와 OOB 정보를 병렬로 조회
        gateway_response, oob_response = await asyncio.gather(
            client.get(f"/api/nodes/{node_id}"),
            client.get(f"/api/oob/nodes/{node_id}"),
        )

        # Gateway 정보 처리
        gateway_info: dict[str, Any] = {"connected": False}
        devices: list[dict[str, Any]] = []
        if not client.is_error(gateway_response):
            gateway_info = {
                "connected": True,
                "connected_at": gateway_response.get("connected_at"),
                "last_message": gateway_response.get("last_message"),
                "ip_address": gateway_response.get("ip_address"),
            }
            devices = gateway_response.get("devices", [])

        # OOB 헬스 정보 처리
        health_info: dict[str, Any] = {"status": "unknown"}
        metrics: dict[str, Any] = {"cpu": 0, "memory": 0, "disk": 0}
        if not client.is_error(oob_response):
            health_info = {
                "status": oob_response.get("status", "unknown"),
                "last_check": oob_response.get("last_check"),
                "uptime": oob_response.get("uptime"),
                "issues": oob_response.get("issues", []),
            }
            metrics = {
                "cpu": oob_response.get("cpu_percent", oob_response.get("cpu", 0)),
                "memory": oob_response.get(
                    "memory_percent", oob_response.get("memory", 0)
                ),
                "disk": oob_response.get("disk_percent", oob_response.get("disk", 0)),
            }

        return {
            "id": node_id,
            "gateway_info": gateway_info,
            "health_info": health_info,
            "devices": devices[:20],  # 최대 20개 디바이스
            "metrics": metrics,
        }
