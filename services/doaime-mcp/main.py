"""
DoAi.Me MCP Server Entry Point

Claude Desktop에서 stdio transport로 실행됨
"""

import sys
from pathlib import Path

# src 디렉토리를 path에 추가
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.server import get_server


def main():
    """MCP 서버 시작"""
    server = get_server()
    server.run()


if __name__ == "__main__":
    main()
