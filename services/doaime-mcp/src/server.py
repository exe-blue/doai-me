"""
DoAi.Me MCP Server

FastMCP 기반 MCP 서버 초기화 및 Tool 등록
"""

from fastmcp import FastMCP

from .tools import register_all_tools


def create_server() -> FastMCP:
    """
    MCP 서버 인스턴스 생성 및 Tool 등록

    Returns:
        설정된 FastMCP 인스턴스
    """
    # MCP 서버 생성
    mcp = FastMCP(
        name="DoAi.Me Agent Farm",
        version="1.0.0",
    )

    # 모든 Tool 등록
    register_all_tools(mcp)

    return mcp


# 서버 싱글톤
_server: FastMCP | None = None


def get_server() -> FastMCP:
    """MCP 서버 싱글톤 반환"""
    global _server
    if _server is None:
        _server = create_server()
    return _server


def main() -> None:
    """CLI 엔트리포인트"""
    server = get_server()
    server.run()
