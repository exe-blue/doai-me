"""
DoAi.Me HTTP 클라이언트

API Server와 Cloud Gateway에 HTTP 요청을 보내는 클라이언트.
path prefix로 자동 라우팅:
- /api/nodes/* → Gateway
- /api/tasks/* → Gateway
- 나머지 /api/* → API Server
"""

from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from .config import get_config


class DoAiMeClient:
    """DoAi.Me API/Gateway HTTP 클라이언트"""

    # Gateway로 라우팅되는 path prefix 목록
    GATEWAY_PATHS = [
        "/api/nodes",
        "/api/tasks",
    ]

    def __init__(
        self,
        api_base: Optional[str] = None,
        gateway_base: Optional[str] = None,
        timeout: Optional[int] = None,
    ):
        config = get_config()
        self.api_base = (api_base or config.api.server).rstrip("/")
        self.gateway_base = (gateway_base or config.api.gateway).rstrip("/")
        self.timeout = timeout or config.api.timeout
        self._session: Optional[httpx.AsyncClient] = None

    async def _get_session(self) -> httpx.AsyncClient:
        """HTTP 세션 가져오기 (lazy initialization)"""
        if self._session is None or self._session.is_closed:
            self._session = httpx.AsyncClient(timeout=self.timeout)
        return self._session

    def _get_base_url(self, path: str) -> str:
        """path에 따라 base URL 결정"""
        for gateway_path in self.GATEWAY_PATHS:
            if path.startswith(gateway_path):
                return self.gateway_base
        return self.api_base

    async def get(
        self, path: str, params: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """
        GET 요청

        Args:
            path: API 경로 (예: /api/oob/nodes)
            params: 쿼리 파라미터

        Returns:
            JSON 응답 또는 에러 객체
        """
        base_url = self._get_base_url(path)
        url = f"{base_url}{path}"

        try:
            session = await self._get_session()
            response = await session.get(url, params=params)
            response.raise_for_status()
            return response.json()

        except httpx.TimeoutException:
            return self._error_response("timeout", f"요청 시간 초과: {path}")

        except httpx.ConnectError:
            return self._error_response("connection", f"서버 연결 실패: {base_url}")

        except httpx.HTTPStatusError as e:
            return self._error_response(
                "http",
                f"HTTP {e.response.status_code}: {path}",
                {"status_code": e.response.status_code},
            )

        except Exception as e:
            return self._error_response("unknown", str(e))

    async def post(
        self, path: str, data: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """
        POST 요청

        Args:
            path: API 경로
            data: JSON body

        Returns:
            JSON 응답 또는 에러 객체
        """
        base_url = self._get_base_url(path)
        url = f"{base_url}{path}"

        try:
            session = await self._get_session()
            response = await session.post(url, json=data or {})
            response.raise_for_status()
            return response.json()

        except httpx.TimeoutException:
            return self._error_response("timeout", f"요청 시간 초과: {path}")

        except httpx.ConnectError:
            return self._error_response("connection", f"서버 연결 실패: {base_url}")

        except httpx.HTTPStatusError as e:
            return self._error_response(
                "http",
                f"HTTP {e.response.status_code}: {path}",
                {"status_code": e.response.status_code},
            )

        except Exception as e:
            return self._error_response("unknown", str(e))

    def _error_response(
        self,
        error_type: str,
        message: str,
        details: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """표준 에러 응답 생성"""
        response = {
            "success": False,
            "error": {
                "type": error_type,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        }
        if details:
            response["error"]["details"] = details
        return response

    async def close(self) -> None:
        """HTTP 세션 종료"""
        if self._session and not self._session.is_closed:
            await self._session.aclose()

    def is_error(self, response: dict[str, Any]) -> bool:
        """응답이 에러인지 확인"""
        return response.get("success") is False and "error" in response


# 싱글톤 클라이언트
_client: Optional[DoAiMeClient] = None


def get_client() -> DoAiMeClient:
    """클라이언트 싱글톤 반환"""
    global _client
    if _client is None:
        _client = DoAiMeClient()
    return _client
