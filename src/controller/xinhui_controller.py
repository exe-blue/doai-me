"""
xinhui (xiaowei) 컨트롤러

touping.exe와 연동하여 HID 수준 입력 및 화면 캡처 기능을 제공합니다.

포트 정보:
- 10039: 디바이스 제어 API
- 22222: 화면 스트리밍 (WebSocket)
- 32991: 추가 통신
"""

import asyncio
import json
import logging
import socket
import struct
import subprocess
import os
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

logger = logging.getLogger(__name__)


class XinhuiCommand(str, Enum):
    """xinhui 명령 타입"""
    TOUCH = "touch"
    SWIPE = "swipe"
    TEXT = "text"
    KEY = "key"
    SCREENSHOT = "screenshot"
    SCREEN_STREAM = "screen_stream"


@dataclass
class XinhuiConfig:
    """xinhui 설정"""
    install_path: str = r"C:\Program Files (x86)\xinhui"
    control_port: int = 10039
    stream_port: int = 22222
    aux_port: int = 32991
    timeout: float = 5.0


@dataclass
class DeviceInfo:
    """디바이스 정보"""
    device_id: str
    ip: str
    port: int = 5555
    connected: bool = False
    xinhui_enabled: bool = False


class XinhuiController:
    """
    xinhui (touping.exe) 컨트롤러
    
    HID 수준 입력과 화면 캡처 기능을 제공합니다.
    """
    
    def __init__(self, config: Optional[XinhuiConfig] = None):
        """
        Args:
            config: xinhui 설정 (None이면 기본값 사용)
        """
        self.config = config or XinhuiConfig()
        self.logger = logging.getLogger(__name__)
        self._connected_devices: Dict[str, DeviceInfo] = {}
        self._socket: Optional[socket.socket] = None
        
    # ==================== 연결 관리 ====================
    
    def _get_socket(self) -> socket.socket:
        """컨트롤 소켓 가져오기"""
        if self._socket is None:
            self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._socket.settimeout(self.config.timeout)
            try:
                self._socket.connect(('127.0.0.1', self.config.control_port))
                self.logger.info(f"Connected to xinhui control port {self.config.control_port}")
            except ConnectionRefusedError:
                self._socket = None
                raise ConnectionError("xinhui (touping.exe) is not running or control port is not available")
        return self._socket
    
    def _close_socket(self):
        """소켓 닫기"""
        if self._socket:
            try:
                self._socket.close()
            except OSError:
                pass
            self._socket = None
    
    def is_xinhui_running(self) -> bool:
        """xinhui(touping.exe) 실행 중인지 확인"""
        try:
            result = subprocess.run(
                ['tasklist', '/FI', 'IMAGENAME eq touping.exe'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return 'touping.exe' in result.stdout
        except Exception as e:
            self.logger.error(f"Failed to check xinhui status: {e}")
            return False
    
    def start_xinhui(self) -> bool:
        """xinhui 시작"""
        if self.is_xinhui_running():
            self.logger.info("xinhui is already running")
            return True
        
        exe_path = Path(self.config.install_path) / "touping.exe"
        if not exe_path.exists():
            self.logger.error(f"touping.exe not found at {exe_path}")
            return False
        
        try:
            subprocess.Popen(
                [str(exe_path)],
                cwd=self.config.install_path,
                shell=True
            )
            # 시작 대기
            import time
            for _ in range(10):
                time.sleep(1)
                if self.is_xinhui_running():
                    self.logger.info("xinhui started successfully")
                    return True
            return False
        except Exception as e:
            self.logger.error(f"Failed to start xinhui: {e}")
            return False
    
    # ==================== 명령 전송 ====================
    
    def _send_command(self, command: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        xinhui에 명령 전송
        
        Args:
            command: 명령 딕셔너리
            
        Returns:
            응답 딕셔너리 또는 None
        """
        try:
            sock = self._get_socket()
            
            # JSON 명령 전송
            data = json.dumps(command).encode('utf-8')
            # 길이 프리픽스 (4바이트)
            sock.sendall(struct.pack('>I', len(data)) + data)
            
            # 응답 수신
            length_data = sock.recv(4)
            if not length_data:
                return None
            
            length = struct.unpack('>I', length_data)[0]
            response_data = sock.recv(length)
            
            return json.loads(response_data.decode('utf-8'))
            
        except socket.timeout:
            self.logger.warning("Command timeout")
            return None
        except Exception as e:
            self.logger.error(f"Command failed: {e}")
            self._close_socket()
            return None
    
    async def _send_command_async(self, command: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """비동기 명령 전송"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._send_command, command)
    
    # ==================== HID 입력 ====================
    
    def hid_tap(self, device_id: str, x: int, y: int, duration_ms: int = 100) -> bool:
        """
        HID 수준 탭 (하드웨어 레벨 터치)
        
        Args:
            device_id: 디바이스 ID (IP:포트)
            x: X 좌표
            y: Y 좌표
            duration_ms: 터치 지속 시간 (밀리초)
            
        Returns:
            성공 여부
        """
        command = {
            "cmd": XinhuiCommand.TOUCH,
            "device": device_id,
            "action": "tap",
            "x": x,
            "y": y,
            "duration": duration_ms
        }
        
        response = self._send_command(command)
        if response and response.get("success"):
            self.logger.debug(f"HID tap on {device_id} at ({x}, {y})")
            return True
        return False
    
    async def hid_tap_async(self, device_id: str, x: int, y: int, duration_ms: int = 100) -> bool:
        """비동기 HID 탭"""
        command = {
            "cmd": XinhuiCommand.TOUCH,
            "device": device_id,
            "action": "tap",
            "x": x,
            "y": y,
            "duration": duration_ms
        }
        
        response = await self._send_command_async(command)
        return response is not None and response.get("success", False)
    
    def hid_swipe(
        self, 
        device_id: str, 
        x1: int, 
        y1: int, 
        x2: int, 
        y2: int, 
        duration_ms: int = 300
    ) -> bool:
        """
        HID 수준 스와이프
        
        Args:
            device_id: 디바이스 ID
            x1, y1: 시작 좌표
            x2, y2: 종료 좌표
            duration_ms: 스와이프 지속 시간
            
        Returns:
            성공 여부
        """
        command = {
            "cmd": XinhuiCommand.SWIPE,
            "device": device_id,
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2,
            "duration": duration_ms
        }
        
        response = self._send_command(command)
        if response and response.get("success"):
            self.logger.debug(f"HID swipe on {device_id}: ({x1},{y1}) -> ({x2},{y2})")
            return True
        return False
    
    async def hid_swipe_async(
        self, 
        device_id: str, 
        x1: int, 
        y1: int, 
        x2: int, 
        y2: int, 
        duration_ms: int = 300
    ) -> bool:
        """비동기 HID 스와이프"""
        command = {
            "cmd": XinhuiCommand.SWIPE,
            "device": device_id,
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2,
            "duration": duration_ms
        }
        
        response = await self._send_command_async(command)
        return response is not None and response.get("success", False)
    
    def hid_text(self, device_id: str, text: str) -> bool:
        """
        HID 수준 텍스트 입력 (XWKeyboard 사용)
        
        Args:
            device_id: 디바이스 ID
            text: 입력할 텍스트 (한글 지원)
            
        Returns:
            성공 여부
        """
        command = {
            "cmd": XinhuiCommand.TEXT,
            "device": device_id,
            "text": text
        }
        
        response = self._send_command(command)
        if response and response.get("success"):
            self.logger.debug(f"HID text on {device_id}: {text[:20]}...")
            return True
        return False
    
    async def hid_text_async(self, device_id: str, text: str) -> bool:
        """비동기 HID 텍스트 입력"""
        command = {
            "cmd": XinhuiCommand.TEXT,
            "device": device_id,
            "text": text
        }
        
        response = await self._send_command_async(command)
        return response is not None and response.get("success", False)
    
    def hid_key(self, device_id: str, keycode: int) -> bool:
        """
        HID 수준 키 입력
        
        Args:
            device_id: 디바이스 ID
            keycode: Android 키코드
            
        Returns:
            성공 여부
        """
        command = {
            "cmd": XinhuiCommand.KEY,
            "device": device_id,
            "keycode": keycode
        }
        
        response = self._send_command(command)
        return response is not None and response.get("success", False)
    
    # ==================== 화면 캡처 ====================
    
    def capture_screen(self, device_id: str, save_path: Optional[str] = None) -> Optional[bytes]:
        """
        화면 캡처
        
        Args:
            device_id: 디바이스 ID
            save_path: 저장 경로 (None이면 바이트 반환)
            
        Returns:
            이미지 바이트 또는 None
        """
        command = {
            "cmd": XinhuiCommand.SCREENSHOT,
            "device": device_id
        }
        
        try:
            sock = self._get_socket()
            
            # 명령 전송
            data = json.dumps(command).encode('utf-8')
            sock.sendall(struct.pack('>I', len(data)) + data)
            
            # 이미지 데이터 수신
            length_data = sock.recv(4)
            if not length_data:
                return None
            
            length = struct.unpack('>I', length_data)[0]
            
            # 큰 이미지 데이터 수신
            image_data = b''
            while len(image_data) < length:
                chunk = sock.recv(min(8192, length - len(image_data)))
                if not chunk:
                    break
                image_data += chunk
            
            if save_path:
                with open(save_path, 'wb') as f:
                    f.write(image_data)
                self.logger.info(f"Screenshot saved to {save_path}")
            
            return image_data
            
        except Exception as e:
            self.logger.error(f"Screenshot failed: {e}")
            return None
    
    async def capture_screen_async(
        self, 
        device_id: str, 
        save_path: Optional[str] = None
    ) -> Optional[bytes]:
        """비동기 화면 캡처"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, 
            self.capture_screen, 
            device_id, 
            save_path
        )
    
    # ==================== 멀티터치 ====================
    
    def hid_multi_touch(
        self, 
        device_id: str, 
        points: List[Tuple[int, int]], 
        duration_ms: int = 100
    ) -> bool:
        """
        HID 수준 멀티터치
        
        Args:
            device_id: 디바이스 ID
            points: 터치 포인트 리스트 [(x1,y1), (x2,y2), ...]
            duration_ms: 터치 지속 시간
            
        Returns:
            성공 여부
        """
        command = {
            "cmd": XinhuiCommand.TOUCH,
            "device": device_id,
            "action": "multi",
            "points": [{"x": x, "y": y} for x, y in points],
            "duration": duration_ms
        }
        
        response = self._send_command(command)
        return response is not None and response.get("success", False)
    
    def hid_pinch(
        self, 
        device_id: str, 
        cx: int, 
        cy: int, 
        start_distance: int, 
        end_distance: int,
        duration_ms: int = 500
    ) -> bool:
        """
        HID 수준 핀치 제스처 (줌 인/아웃)
        
        Args:
            device_id: 디바이스 ID
            cx, cy: 중심 좌표
            start_distance: 시작 거리 (두 손가락 사이)
            end_distance: 종료 거리
            duration_ms: 제스처 지속 시간
            
        Returns:
            성공 여부
        """
        command = {
            "cmd": XinhuiCommand.TOUCH,
            "device": device_id,
            "action": "pinch",
            "cx": cx,
            "cy": cy,
            "start_distance": start_distance,
            "end_distance": end_distance,
            "duration": duration_ms
        }
        
        response = self._send_command(command)
        return response is not None and response.get("success", False)
    
    # ==================== 유틸리티 ====================
    
    def get_connected_devices(self) -> List[str]:
        """
        xinhui에 연결된 디바이스 목록
        
        Returns:
            디바이스 ID 리스트
        """
        command = {"cmd": "list_devices"}
        response = self._send_command(command)
        
        if response and "devices" in response:
            return response["devices"]
        return []
    
    def close(self):
        """연결 종료"""
        self._close_socket()
        self.logger.info("xinhui controller closed")


# ==================== ADB 폴백 래퍼 ====================

class HybridController:
    """
    ADB와 xinhui를 함께 사용하는 하이브리드 컨트롤러
    
    기본적으로 ADB를 사용하고, 필요한 경우 xinhui로 폴백합니다.
    """
    
    def __init__(
        self, 
        xinhui_config: Optional[XinhuiConfig] = None,
        prefer_xinhui: bool = False
    ):
        """
        Args:
            xinhui_config: xinhui 설정
            prefer_xinhui: xinhui 우선 사용 여부
        """
        self.xinhui = XinhuiController(xinhui_config)
        self.prefer_xinhui = prefer_xinhui
        self.logger = logging.getLogger(__name__)
    
    def tap(
        self, 
        device_id: str, 
        x: int, 
        y: int, 
        use_hid: bool = False
    ) -> bool:
        """
        탭 실행
        
        Args:
            device_id: 디바이스 ID
            x, y: 좌표
            use_hid: HID 모드 강제 사용
            
        Returns:
            성공 여부
        """
        if use_hid or self.prefer_xinhui:
            if self.xinhui.is_xinhui_running():
                return self.xinhui.hid_tap(device_id, x, y)
        
        # ADB 폴백
        return self._adb_tap(device_id, x, y)
    
    def _adb_tap(self, device_id: str, x: int, y: int) -> bool:
        """ADB 탭"""
        try:
            result = subprocess.run(
                ['adb', '-s', device_id, 'shell', 'input', 'tap', str(x), str(y)],
                capture_output=True,
                timeout=10
            )
            return result.returncode == 0
        except Exception as e:
            self.logger.error(f"ADB tap failed: {e}")
            return False
    
    def text(
        self, 
        device_id: str, 
        text: str, 
        use_hid: bool = True
    ) -> bool:
        """
        텍스트 입력 (한글은 HID 권장)
        
        Args:
            device_id: 디바이스 ID
            text: 입력할 텍스트
            use_hid: HID 모드 사용 (한글 지원)
            
        Returns:
            성공 여부
        """
        # 한글이 포함되면 HID 강제
        has_korean = any('\uac00' <= c <= '\ud7a3' for c in text)
        
        if has_korean or use_hid or self.prefer_xinhui:
            if self.xinhui.is_xinhui_running():
                return self.xinhui.hid_text(device_id, text)
            elif has_korean:
                self.logger.warning("Korean text requires xinhui, but it's not running")
                return False
        
        # ADB 폴백 (영문만)
        return self._adb_text(device_id, text)
    
    def _adb_text(self, device_id: str, text: str) -> bool:
        """ADB 텍스트 입력"""
        try:
            # 공백을 %s로 변환
            escaped_text = text.replace(' ', '%s')
            result = subprocess.run(
                ['adb', '-s', device_id, 'shell', 'input', 'text', escaped_text],
                capture_output=True,
                timeout=10
            )
            return result.returncode == 0
        except Exception as e:
            self.logger.error(f"ADB text failed: {e}")
            return False
    
    def swipe(
        self, 
        device_id: str, 
        x1: int, 
        y1: int, 
        x2: int, 
        y2: int,
        duration_ms: int = 300,
        use_hid: bool = False
    ) -> bool:
        """
        스와이프
        
        Args:
            device_id: 디바이스 ID
            x1, y1: 시작 좌표
            x2, y2: 종료 좌표
            duration_ms: 지속 시간
            use_hid: HID 모드 사용
            
        Returns:
            성공 여부
        """
        if use_hid or self.prefer_xinhui:
            if self.xinhui.is_xinhui_running():
                return self.xinhui.hid_swipe(device_id, x1, y1, x2, y2, duration_ms)
        
        # ADB 폴백
        return self._adb_swipe(device_id, x1, y1, x2, y2, duration_ms)
    
    def _adb_swipe(
        self, 
        device_id: str, 
        x1: int, 
        y1: int, 
        x2: int, 
        y2: int,
        duration_ms: int
    ) -> bool:
        """ADB 스와이프"""
        try:
            result = subprocess.run(
                ['adb', '-s', device_id, 'shell', 'input', 'swipe', 
                 str(x1), str(y1), str(x2), str(y2), str(duration_ms)],
                capture_output=True,
                timeout=10
            )
            return result.returncode == 0
        except Exception as e:
            self.logger.error(f"ADB swipe failed: {e}")
            return False
    
    def screenshot(
        self, 
        device_id: str, 
        save_path: str,
        use_xinhui: bool = False
    ) -> bool:
        """
        스크린샷
        
        Args:
            device_id: 디바이스 ID
            save_path: 저장 경로
            use_xinhui: xinhui 사용 (더 빠름)
            
        Returns:
            성공 여부
        """
        if use_xinhui and self.xinhui.is_xinhui_running():
            data = self.xinhui.capture_screen(device_id, save_path)
            return data is not None
        
        # ADB 폴백
        return self._adb_screenshot(device_id, save_path)
    
    def _adb_screenshot(self, device_id: str, save_path: str) -> bool:
        """ADB 스크린샷"""
        try:
            # 디바이스에서 캡처
            result = subprocess.run(
                ['adb', '-s', device_id, 'shell', 'screencap', '-p', '/sdcard/screen.png'],
                capture_output=True,
                timeout=10
            )
            if result.returncode != 0:
                return False
            
            # PC로 가져오기
            result = subprocess.run(
                ['adb', '-s', device_id, 'pull', '/sdcard/screen.png', save_path],
                capture_output=True,
                timeout=10
            )
            return result.returncode == 0
        except Exception as e:
            self.logger.error(f"ADB screenshot failed: {e}")
            return False
    
    def close(self):
        """리소스 해제"""
        self.xinhui.close()


# 싱글톤 인스턴스
_xinhui_controller: Optional[XinhuiController] = None
_hybrid_controller: Optional[HybridController] = None


def get_xinhui_controller(config: Optional[XinhuiConfig] = None) -> XinhuiController:
    """xinhui 컨트롤러 싱글톤"""
    global _xinhui_controller
    if _xinhui_controller is None:
        _xinhui_controller = XinhuiController(config)
    return _xinhui_controller


def get_hybrid_controller(
    config: Optional[XinhuiConfig] = None,
    prefer_xinhui: bool = False
) -> HybridController:
    """하이브리드 컨트롤러 싱글톤"""
    global _hybrid_controller
    if _hybrid_controller is None:
        _hybrid_controller = HybridController(config, prefer_xinhui)
    return _hybrid_controller

