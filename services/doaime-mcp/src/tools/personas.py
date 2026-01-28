"""
Personas Tools

페르소나 관리 관련 Tool들
- personas.list: 페르소나 목록
- personas.drift: 페르소나 성격 변화 분석
"""

from typing import Any

from fastmcp import FastMCP

from ..utils.client import get_client


def register_personas_tools(mcp: FastMCP) -> None:
    """Personas 관련 Tool들을 MCP 서버에 등록"""

    @mcp.tool(name="personas.list")
    async def personas_list() -> dict[str, Any]:
        """
        페르소나 목록

        등록된 모든 페르소나를 조회합니다.

        Returns:
            - count: 페르소나 수
            - personas: 페르소나 목록 (id, name, status, device_id, relevance_score)
        """
        client = get_client()
        response = await client.get("/api/personas")

        if client.is_error(response):
            return response

        # 응답 정규화
        personas_list = response.get("personas", response)
        if isinstance(personas_list, list):
            return {
                "count": len(personas_list),
                "personas": [
                    {
                        "id": p.get("id", p.get("persona_id")),
                        "name": p.get("name", "Unknown"),
                        "status": p.get("status", "unknown"),
                        "device_id": p.get("device_id"),
                        "relevance_score": p.get(
                            "relevance_score", p.get("existence_score", 0.0)
                        ),
                    }
                    for p in personas_list
                ],
            }

        return {"count": 0, "personas": []}

    @mcp.tool(name="personas.drift")
    async def personas_drift(persona_id: str) -> dict[str, Any]:
        """
        페르소나 성격 변화 분석

        특정 페르소나의 시간에 따른 성격 변화를 분석합니다.

        Args:
            persona_id: 분석할 페르소나 ID

        Returns:
            성격 변화 분석 결과 (API 응답)
        """
        client = get_client()
        response = await client.get(f"/api/personas/{persona_id}/personality-drift")
        return response
