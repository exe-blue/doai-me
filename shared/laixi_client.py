"""
Laixi App WebSocket 클라이언트

Laixi WebSocket API와 통신하여 Android 기기를 제어합니다.
API 문서: ws://127.0.0.1:22221/

주요 기능:
- 디바이스 목록 조회
- 스크린샷 캡처
- 터치/스와이프 입력 (백분율 좌표)
- 클립보드 조작
- ADB 명령 실행
- 기본 작업 (Home, Back, 화면 켜기/끄기)
"""

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

try:
    import websockets

    HAS_WEBSOCKETS = True
except ImportError:
    HAS_WEBSOCKETS = False

logger = logging.getLogger(__name__)


@dataclass
class LaixiConfig:
    """Laixi 설정"""

    websocket_url: str = "ws://127.0.0.1:22221/"
    timeout: float = 10.0
    reconnect_interval: float = 5.0
    max_reconnect_attempts: int = 3


class LaixiClient:
    """
    Laixi WebSocket API 클라이언트

    Laixi 앱과 WebSocket으로 통신하여 Android 기기를 제어합니다.
    """

    def __init__(self, config: Optional[LaixiConfig] = None):
        """
        Args:
            config: Laixi 설정 (None이면 기본값 사용)
        """
        if not HAS_WEBSOCKETS:
            raise ImportError("websockets 모듈이 필요합니다: pip install websockets")

        self.config = config or LaixiConfig()
        self._websocket: Optional[Any] = None
        self._lock = asyncio.Lock()

    async def connect(self) -> bool:
        """Laixi WebSocket 서버에 연결"""
        try:
            self._websocket = await asyncio.wait_for(
                websockets.connect(self.config.websocket_url), timeout=self.config.timeout
            )
            logger.info(f"Laixi 연결 성공: {self.config.websocket_url}")
            return True
        except Exception as e:
            logger.error(f"Laixi 연결 실패: {e}")
            self._websocket = None
            return False

    async def disconnect(self):
        """연결 종료"""
        if self._websocket:
            await self._websocket.close()
            self._websocket = None
            logger.info("Laixi 연결 종료")

    async def ensure_connected(self) -> bool:
        """연결 상태 확인 및 재연결"""
        if self._websocket and not self._websocket.closed:
            return True

        for attempt in range(self.config.max_reconnect_attempts):
            logger.info(f"재연결 시도 ({attempt + 1}/{self.config.max_reconnect_attempts})")
            if await self.connect():
                return True
            await asyncio.sleep(self.config.reconnect_interval)

        return False

    async def send_command(self, command: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Laixi에 명령 전송

        Args:
            command: 명령 딕셔너리

        Returns:
            응답 딕셔너리 또는 None
        """
        async with self._lock:
            if not await self.ensure_connected():
                logger.error("Laixi 연결되지 않음")
                return None

            try:
                # JSON 명령 전송
                await self._websocket.send(json.dumps(command))

                # 응답 수신
                response_text = await asyncio.wait_for(
                    self._websocket.recv(), timeout=self.config.timeout
                )

                return json.loads(response_text)

            except asyncio.TimeoutError:
                logger.warning("명령 타임아웃")
                return None
            except Exception as e:
                logger.error(f"명령 실패: {e}")
                self._websocket = None
                return None

    # ==================== 디바이스 관리 ====================

    async def list_devices(self) -> List[Dict[str, Any]]:
        """
        모든 연결된 디바이스 목록

        Returns:
            디바이스 정보 리스트
        """
        response = await self.send_command({"action": "List"})
        if response and "devices" in response:
            return response["devices"]
        return []

    # ==================== 터치 입력 ====================

    async def tap(self, device_ids: str, x: float, y: float) -> bool:
        """
        탭 (백분율 좌표)

        Args:
            device_ids: 디바이스 ID (콤마 구분, "all" 가능)
            x: X 좌표 (0.0-1.0)
            y: Y 좌표 (0.0-1.0)

        Returns:
            성공 여부
        """
        # Press
        await self.send_command(
            {
                "action": "PointerEvent",
                "comm": {
                    "deviceIds": device_ids,
                    "mask": "0",  # press
                    "x": str(x),
                    "y": str(y),
                    "endx": "0",
                    "endy": "0",
                    "delta": "0",
                },
            }
        )
        await asyncio.sleep(0.1)

        # Release
        response = await self.send_command(
            {
                "action": "PointerEvent",
                "comm": {
                    "deviceIds": device_ids,
                    "mask": "2",  # release
                    "x": str(x),
                    "y": str(y),
                    "endx": "0",
                    "endy": "0",
                    "delta": "0",
                },
            }
        )

        return response is not None

    async def swipe(
        self, device_ids: str, x1: float, y1: float, x2: float, y2: float, duration_ms: int = 300
    ) -> bool:
        """
        스와이프 (백분율 좌표)

        Args:
            device_ids: 디바이스 ID
            x1, y1: 시작 좌표 (0.0-1.0)
            x2, y2: 종료 좌표 (0.0-1.0)
            duration_ms: 지속 시간

        Returns:
            성공 여부
        """
        # Press
        await self.send_command(
            {
                "action": "PointerEvent",
                "comm": {
                    "deviceIds": device_ids,
                    "mask": "0",
                    "x": str(x1),
                    "y": str(y1),
                    "endx": "0",
                    "endy": "0",
                    "delta": "0",
                },
            }
        )
        await asyncio.sleep(0.05)

        # Move
        await self.send_command(
            {
                "action": "PointerEvent",
                "comm": {
                    "deviceIds": device_ids,
                    "mask": "1",
                    "x": str(x2),
                    "y": str(y2),
                    "endx": "0",
                    "endy": "0",
                    "delta": "0",
                },
            }
        )
        await asyncio.sleep(duration_ms / 1000.0)

        # Release
        response = await self.send_command(
            {
                "action": "PointerEvent",
                "comm": {
                    "deviceIds": device_ids,
                    "mask": "2",
                    "x": str(x2),
                    "y": str(y2),
                    "endx": "0",
                    "endy": "0",
                    "delta": "0",
                },
            }
        )

        return response is not None

    # ==================== 화면 캡처 ====================

    async def screenshot(self, device_ids: str, save_path: str) -> bool:
        """
        스크린샷

        Args:
            device_ids: 디바이스 ID (콤마 구분, "all" 가능)
            save_path: 저장 경로 (예: "d:\\screenshots")

        Returns:
            성공 여부
        """
        response = await self.send_command(
            {"action": "screen", "comm": {"deviceIds": device_ids, "savePath": save_path}}
        )
        return response is not None

    # ==================== 클립보드 ====================

    async def get_clipboard(self, device_id: str) -> Optional[str]:
        """
        클립보드 내용 가져오기 (단일 디바이스만)

        Args:
            device_id: 디바이스 ID

        Returns:
            클립보드 내용
        """
        response = await self.send_command(
            {"action": "getclipboard", "comm": {"deviceIds": device_id}}
        )
        if response and "content" in response:
            return response["content"]
        return None

    async def set_clipboard(self, device_ids: str, text: str) -> bool:
        """
        클립보드에 텍스트 쓰기

        Args:
            device_ids: 디바이스 ID
            text: 텍스트 (한글 지원)

        Returns:
            성공 여부
        """
        response = await self.send_command(
            {"action": "writeclipboard", "comm": {"deviceIds": device_ids, "content": text}}
        )
        return response is not None

    # ==================== ADB 명령 ====================

    async def execute_adb(self, device_id: str, command: str) -> bool:
        """
        ADB 명령 실행

        Args:
            device_id: 디바이스 ID
            command: ADB 명령 (예: "am start -a android.intent.action.VIEW -d https://youtube.com")

        Returns:
            성공 여부
        """
        response = await self.send_command(
            {"action": "adb", "comm": {"command": command, "deviceIds": device_id}}
        )
        return response is not None

    # ==================== 기본 작업 ====================

    async def press_home(self, device_id: str) -> bool:
        """홈 버튼"""
        return await self._basis_operate(device_id, 4)

    async def press_back(self, device_id: str) -> bool:
        """뒤로가기"""
        return await self._basis_operate(device_id, 3)

    async def screen_on(self, device_id: str) -> bool:
        """화면 켜기"""
        return await self._basis_operate(device_id, 15)

    async def screen_off(self, device_id: str) -> bool:
        """화면 끄기"""
        return await self._basis_operate(device_id, 14)

    async def volume_up(self, device_id: str) -> bool:
        """볼륨 증가"""
        return await self._basis_operate(device_id, 1)

    async def volume_down(self, device_id: str) -> bool:
        """볼륨 감소"""
        return await self._basis_operate(device_id, 2)

    async def _basis_operate(self, device_id: str, operation_type: int) -> bool:
        """기본 작업 실행"""
        response = await self.send_command(
            {
                "action": "BasisOperate",
                "comm": {"deviceIds": device_id, "type": str(operation_type)},
            }
        )
        return response is not None

    # ==================== Toast ====================

    async def show_toast(self, device_ids: str, message: str) -> bool:
        """
        Toast 메시지 표시

        Args:
            device_ids: 디바이스 ID
            message: 메시지

        Returns:
            성공 여부
        """
        response = await self.send_command(
            {"action": "Toast", "comm": {"deviceIds": device_ids, "content": message}}
        )
        return response is not None

    # ==================== 현재 앱 ====================

    async def get_current_app(self, device_ids: str) -> Optional[Dict]:
        """
        현재 활성 앱 정보

        Args:
            device_ids: 디바이스 ID

        Returns:
            앱 정보
        """
        return await self.send_command(
            {"action": "CurrentAppInfo", "comm": {"deviceIds": device_ids}}
        )


# 싱글톤 인스턴스
_laixi_client: Optional[LaixiClient] = None


def get_laixi_client(config: Optional[LaixiConfig] = None) -> LaixiClient:
    """Laixi 클라이언트 싱글톤"""
    global _laixi_client
    if _laixi_client is None:
        _laixi_client = LaixiClient(config)
    return _laixi_client
