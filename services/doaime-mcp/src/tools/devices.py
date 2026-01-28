"""
Devices Tools

디바이스 관리 관련 Tool들
- devices.screenshot: 디바이스 스크린샷 캡처
"""

from datetime import datetime, timezone
from typing import Any

from fastmcp import FastMCP

from ..utils.client import DoAiMeClient
from ..utils.config import get_config


def register_devices_tools(mcp: FastMCP) -> None:
    """Devices 관련 Tool들을 MCP 서버에 등록"""

    @mcp.tool(name="devices.screenshot")
    async def devices_screenshot(device_id: str) -> dict[str, Any]:
        """
        디바이스 스크린샷 캡처

        지정된 디바이스의 현재 화면을 캡처합니다.

        Args:
            device_id: 캡처할 디바이스 ID

        Returns:
            - success: 성공 여부
            - device_id: 디바이스 ID
            - image_url: 이미지 URL (또는 base64)
            - captured_at: 캡처 시간
        """
        config = get_config()

        # 스크린샷 전용 타임아웃으로 클라이언트 생성
        screenshot_client = DoAiMeClient(timeout=config.limits.screenshot_timeout)

        try:
            response = await screenshot_client.post(
                "/api/laixi/screenshot",
                data={"device_id": device_id},
            )

            if screenshot_client.is_error(response):
                return response

            return {
                "success": True,
                "device_id": device_id,
                "image_url": response.get("image_url", response.get("url")),
                "image_base64": response.get("image_base64", response.get("data")),
                "captured_at": response.get(
                    "captured_at", datetime.now(timezone.utc).isoformat()
                ),
            }

        finally:
            await screenshot_client.close()
