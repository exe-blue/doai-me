"""
화면 캡처 및 스트리밍 모듈

xinhui의 XWCaptureScreen을 통해 실시간 화면 캡처와 스트리밍을 제공합니다.
ADB screencap보다 빠르고, 동영상 재생 상태 등을 실시간으로 확인할 수 있습니다.
"""

import asyncio
import io
import logging
import socket
import struct
import threading
import time
from typing import Optional, Callable, Dict, Any
from dataclasses import dataclass
from queue import Queue
from pathlib import Path

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

from src.controller.xinhui_controller import (
    XinhuiController,
    XinhuiConfig,
    get_xinhui_controller
)

logger = logging.getLogger(__name__)


@dataclass
class CaptureConfig:
    """캡처 설정"""
    # 이미지
    format: str = "jpeg"          # jpeg 또는 png
    quality: int = 80             # JPEG 품질 (1-100)
    scale: float = 1.0            # 스케일 (0.5 = 50% 크기)
    
    # 스트리밍
    stream_port: int = 22222      # 스트리밍 포트
    stream_fps: int = 15          # 목표 FPS
    buffer_size: int = 65536      # 버퍼 크기
    
    # 타임아웃
    capture_timeout: float = 5.0  # 캡처 타임아웃 (초)
    stream_timeout: float = 30.0  # 스트리밍 연결 타임아웃 (초)


class ScreenCapture:
    """
    화면 캡처 클래스
    
    단일 스크린샷 및 연속 캡처를 지원합니다.
    """
    
    def __init__(
        self,
        xinhui: Optional[XinhuiController] = None,
        config: Optional[CaptureConfig] = None
    ):
        """
        Args:
            xinhui: XinhuiController 인스턴스
            config: 캡처 설정
        """
        self.xinhui = xinhui or get_xinhui_controller()
        self.config = config or CaptureConfig()
        self.logger = logging.getLogger(__name__)
    
    def capture(
        self,
        device_id: str,
        save_path: Optional[str] = None
    ) -> Optional[bytes]:
        """
        화면 캡처
        
        Args:
            device_id: 디바이스 ID
            save_path: 저장 경로 (None이면 바이트 반환)
            
        Returns:
            이미지 바이트 또는 None
        """
        return self.xinhui.capture_screen(device_id, save_path)
    
    async def capture_async(
        self,
        device_id: str,
        save_path: Optional[str] = None
    ) -> Optional[bytes]:
        """비동기 화면 캡처"""
        return await self.xinhui.capture_screen_async(device_id, save_path)
    
    def capture_to_image(self, device_id: str) -> Optional['Image.Image']:
        """
        화면 캡처 후 PIL Image로 반환
        
        Args:
            device_id: 디바이스 ID
            
        Returns:
            PIL Image 또는 None
        """
        if not HAS_PIL:
            self.logger.error("PIL is required for capture_to_image")
            return None
        
        data = self.capture(device_id)
        if data:
            return Image.open(io.BytesIO(data))
        return None
    
    def capture_multiple(
        self,
        device_ids: list,
        save_dir: str,
        prefix: str = "screen"
    ) -> Dict[str, str]:
        """
        여러 디바이스 화면 캡처
        
        Args:
            device_ids: 디바이스 ID 리스트
            save_dir: 저장 디렉토리
            prefix: 파일 이름 접두사
            
        Returns:
            {device_id: 저장 경로} 딕셔너리
        """
        results = {}
        save_path = Path(save_dir)
        save_path.mkdir(parents=True, exist_ok=True)
        
        for device_id in device_ids:
            safe_id = device_id.replace(':', '_').replace('.', '_')
            filename = f"{prefix}_{safe_id}_{int(time.time())}.png"
            filepath = save_path / filename
            
            if self.capture(device_id, str(filepath)):
                results[device_id] = str(filepath)
                self.logger.info(f"Captured {device_id} -> {filepath}")
            else:
                self.logger.warning(f"Failed to capture {device_id}")
        
        return results


class ScreenStream:
    """
    화면 스트리밍 클래스
    
    실시간 화면 스트림을 수신하고 처리합니다.
    """
    
    def __init__(
        self,
        device_id: str,
        config: Optional[CaptureConfig] = None
    ):
        """
        Args:
            device_id: 디바이스 ID
            config: 캡처 설정
        """
        self.device_id = device_id
        self.config = config or CaptureConfig()
        self.logger = logging.getLogger(__name__)
        
        self._socket: Optional[socket.socket] = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._frame_queue: Queue = Queue(maxsize=10)
        self._callbacks: list = []
        
        # 통계
        self._frame_count = 0
        self._start_time: Optional[float] = None
        self._last_frame_time: Optional[float] = None
    
    def add_callback(self, callback: Callable[[bytes], None]):
        """프레임 콜백 추가"""
        self._callbacks.append(callback)
    
    def remove_callback(self, callback: Callable[[bytes], None]):
        """프레임 콜백 제거"""
        if callback in self._callbacks:
            self._callbacks.remove(callback)
    
    def start(self) -> bool:
        """
        스트리밍 시작
        
        Returns:
            성공 여부
        """
        if self._running:
            self.logger.warning("Stream already running")
            return True
        
        try:
            # 스트리밍 소켓 연결
            self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._socket.settimeout(self.config.stream_timeout)
            self._socket.connect(('127.0.0.1', self.config.stream_port))
            
            # 스트리밍 요청 전송
            request = {
                "cmd": "start_stream",
                "device": self.device_id,
                "fps": self.config.stream_fps,
                "quality": self.config.quality
            }
            
            import json
            data = json.dumps(request).encode('utf-8')
            self._socket.sendall(struct.pack('>I', len(data)) + data)
            
            # 수신 스레드 시작
            self._running = True
            self._start_time = time.time()
            self._thread = threading.Thread(target=self._receive_frames, daemon=True)
            self._thread.start()
            
            self.logger.info(f"Screen stream started for {self.device_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start stream: {e}")
            self._cleanup()
            return False
    
    def _receive_frames(self):
        """프레임 수신 스레드"""
        while self._running:
            try:
                # 프레임 길이 수신
                length_data = self._socket.recv(4)
                if not length_data:
                    break
                
                length = struct.unpack('>I', length_data)[0]
                
                # 프레임 데이터 수신
                frame_data = b''
                while len(frame_data) < length:
                    chunk = self._socket.recv(min(
                        self.config.buffer_size, 
                        length - len(frame_data)
                    ))
                    if not chunk:
                        break
                    frame_data += chunk
                
                if len(frame_data) != length:
                    self.logger.warning("Incomplete frame received")
                    continue
                
                self._frame_count += 1
                self._last_frame_time = time.time()
                
                # 큐에 추가 (오래된 프레임은 버림)
                if self._frame_queue.full():
                    try:
                        self._frame_queue.get_nowait()
                    except:
                        pass
                self._frame_queue.put(frame_data)
                
                # 콜백 호출
                for callback in self._callbacks:
                    try:
                        callback(frame_data)
                    except Exception as e:
                        self.logger.error(f"Callback error: {e}")
                
            except socket.timeout:
                continue
            except Exception as e:
                self.logger.error(f"Frame receive error: {e}")
                break
        
        self._cleanup()
    
    def _cleanup(self):
        """리소스 정리"""
        self._running = False
        if self._socket:
            try:
                self._socket.close()
            except:
                pass
            self._socket = None
    
    def stop(self):
        """스트리밍 중지"""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)
        self._cleanup()
        self.logger.info(f"Screen stream stopped for {self.device_id}")
    
    def get_frame(self, timeout: float = 1.0) -> Optional[bytes]:
        """
        최신 프레임 가져오기
        
        Args:
            timeout: 대기 시간 (초)
            
        Returns:
            프레임 바이트 또는 None
        """
        try:
            return self._frame_queue.get(timeout=timeout)
        except:
            return None
    
    def get_fps(self) -> float:
        """현재 FPS 계산"""
        if not self._start_time or self._frame_count == 0:
            return 0.0
        
        elapsed = time.time() - self._start_time
        return self._frame_count / elapsed if elapsed > 0 else 0.0
    
    @property
    def is_running(self) -> bool:
        """스트리밍 실행 중 여부"""
        return self._running
    
    @property
    def frame_count(self) -> int:
        """수신된 프레임 수"""
        return self._frame_count


class ScreenStreamManager:
    """
    다중 디바이스 화면 스트리밍 관리자
    """
    
    def __init__(self, config: Optional[CaptureConfig] = None):
        """
        Args:
            config: 캡처 설정
        """
        self.config = config or CaptureConfig()
        self._streams: Dict[str, ScreenStream] = {}
        self.logger = logging.getLogger(__name__)
    
    def start_stream(
        self,
        device_id: str,
        callback: Optional[Callable[[bytes], None]] = None
    ) -> ScreenStream:
        """
        디바이스 스트리밍 시작
        
        Args:
            device_id: 디바이스 ID
            callback: 프레임 콜백
            
        Returns:
            ScreenStream 인스턴스
        """
        if device_id in self._streams:
            stream = self._streams[device_id]
            if stream.is_running:
                self.logger.info(f"Stream already running for {device_id}")
                if callback:
                    stream.add_callback(callback)
                return stream
        
        stream = ScreenStream(device_id, self.config)
        if callback:
            stream.add_callback(callback)
        
        if stream.start():
            self._streams[device_id] = stream
        
        return stream
    
    def stop_stream(self, device_id: str):
        """디바이스 스트리밍 중지"""
        if device_id in self._streams:
            self._streams[device_id].stop()
            del self._streams[device_id]
    
    def stop_all(self):
        """모든 스트리밍 중지"""
        for stream in self._streams.values():
            stream.stop()
        self._streams.clear()
    
    def get_stream(self, device_id: str) -> Optional[ScreenStream]:
        """디바이스 스트림 가져오기"""
        return self._streams.get(device_id)
    
    def get_frame(self, device_id: str, timeout: float = 1.0) -> Optional[bytes]:
        """특정 디바이스의 최신 프레임 가져오기"""
        stream = self._streams.get(device_id)
        if stream and stream.is_running:
            return stream.get_frame(timeout)
        return None
    
    def get_all_frames(self, timeout: float = 0.5) -> Dict[str, bytes]:
        """모든 디바이스의 최신 프레임 가져오기"""
        frames = {}
        for device_id, stream in self._streams.items():
            if stream.is_running:
                frame = stream.get_frame(timeout)
                if frame:
                    frames[device_id] = frame
        return frames
    
    @property
    def active_streams(self) -> list:
        """활성 스트림 디바이스 목록"""
        return [d for d, s in self._streams.items() if s.is_running]
    
    def get_stats(self) -> Dict[str, Any]:
        """스트리밍 통계"""
        return {
            device_id: {
                "fps": stream.get_fps(),
                "frames": stream.frame_count,
                "running": stream.is_running
            }
            for device_id, stream in self._streams.items()
        }


# 싱글톤 인스턴스
_screen_capture: Optional[ScreenCapture] = None
_stream_manager: Optional[ScreenStreamManager] = None


def get_screen_capture(
    xinhui: Optional[XinhuiController] = None,
    config: Optional[CaptureConfig] = None
) -> ScreenCapture:
    """ScreenCapture 싱글톤"""
    global _screen_capture
    if _screen_capture is None:
        _screen_capture = ScreenCapture(xinhui, config)
    return _screen_capture


def get_stream_manager(config: Optional[CaptureConfig] = None) -> ScreenStreamManager:
    """ScreenStreamManager 싱글톤"""
    global _stream_manager
    if _stream_manager is None:
        _stream_manager = ScreenStreamManager(config)
    return _stream_manager

