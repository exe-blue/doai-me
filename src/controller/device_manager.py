"""
디바이스 연결 및 관리 (ADB over TCP 전용)
모든 연결은 WiFi(TCP)로만 이루어집니다.
포트: 5555 고정
"""

import uiautomator2 as u2
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Optional, Callable, Any
import logging
import re

from src.utils.ip_generator import generate_ips
from src.controller.adb_controller import (
    ADBController, 
    ADB_TCP_PORT,
    ConnectionType,
    USBConnectionError
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# xinhui 컨트롤러 (지연 로딩)
_xinhui_controller = None
_hybrid_controller = None


def get_xinhui():
    """xinhui 컨트롤러 가져오기 (지연 로딩)"""
    global _xinhui_controller
    if _xinhui_controller is None:
        try:
            from src.controller.xinhui_controller import get_xinhui_controller
            _xinhui_controller = get_xinhui_controller()
        except ImportError:
            logger.warning("xinhui_controller not available")
    return _xinhui_controller


def get_hybrid():
    """하이브리드 컨트롤러 가져오기 (지연 로딩)"""
    global _hybrid_controller
    if _hybrid_controller is None:
        try:
            from src.controller.xinhui_controller import get_hybrid_controller
            _hybrid_controller = get_hybrid_controller()
        except ImportError:
            logger.warning("hybrid_controller not available")
    return _hybrid_controller


def validate_tcp_address(device_id: str) -> str:
    """
    TCP 주소 형식 검증 및 정규화
    
    Args:
        device_id: 디바이스 ID
        
    Returns:
        정규화된 TCP 주소 (IP:5555)
        
    Raises:
        USBConnectionError: USB 형식 감지 시
        ValueError: 잘못된 형식
    """
    # IP:PORT 형식
    tcp_match = re.match(r'^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d+))?$', device_id)
    if tcp_match:
        ip = tcp_match.group(1)
        port = tcp_match.group(2) or str(ADB_TCP_PORT)
        return f"{ip}:{port}"
    
    # IP만 있는 경우
    ip_only = re.match(r'^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$', device_id)
    if ip_only:
        return f"{device_id}:{ADB_TCP_PORT}"
    
    # USB 시리얼 형식 (영숫자만)
    if re.match(r'^[a-zA-Z0-9]+$', device_id):
        raise USBConnectionError(
            f"USB 연결 감지: {device_id}\n"
            f"WiFi(TCP) 연결만 허용됩니다. IP:5555 형식을 사용하세요."
        )
    
    raise ValueError(f"잘못된 디바이스 형식: {device_id}")


def format_device_address(ip: str, port: int = ADB_TCP_PORT) -> str:
    """
    디바이스 TCP 주소 포맷팅
    
    Args:
        ip: IP 주소
        port: 포트 번호 (기본값 5555)
        
    Returns:
        IP:PORT 형식 문자열
    """
    return f"{ip}:{port}"


class DeviceManager:
    """
    디바이스 연결 및 관리 클래스 (TCP 전용)
    
    특징:
    - 모든 연결은 WiFi(TCP)로만 이루어짐
    - USB 연결 시도 시 오류 발생
    - 포트는 5555 고정
    """
    
    def __init__(self, wait_timeout: int = 5):
        """
        Args:
            wait_timeout: 대기 타임아웃 (초)
        """
        self.port = ADB_TCP_PORT  # 5555 고정
        self.wait_timeout = wait_timeout
        self.connections: Dict[str, u2.Device] = {}  # ip -> Device
        self.adb = ADBController()  # ADB 컨트롤러
    
    def _get_tcp_address(self, ip: str) -> str:
        """IP를 TCP 주소로 변환"""
        return format_device_address(ip, self.port)
    
    def connect_device(self, ip: str) -> bool:
        """
        단일 디바이스 TCP 연결
        
        Args:
            ip: 디바이스 IP 주소 (예: 192.168.200.104)
            
        Returns:
            연결 성공 여부
            
        Raises:
            USBConnectionError: USB 형식 입력 시
        """
        try:
            # TCP 주소 검증
            address = validate_tcp_address(ip)
            ip_only = address.split(":")[0]
            
            # uiautomator2 연결
            device = u2.connect(address)
            device.settings["wait_timeout"] = self.wait_timeout
            
            self.connections[ip_only] = device
            logger.info(f"✓ {address} TCP 연결 성공")
            return True
            
        except USBConnectionError as e:
            logger.error(f"✗ USB 연결 오류: {e}")
            raise
        except Exception as e:
            logger.error(f"✗ {ip}:{self.port} TCP 연결 실패: {e}")
            return False
    
    def connect_all(
        self, 
        ips: Optional[List[str]] = None, 
        max_workers: int = 50
    ) -> Dict[str, bool]:
        """
        전체 디바이스 병렬 TCP 연결
        
        Args:
            ips: IP 주소 리스트 (None이면 기본 600대 생성)
            max_workers: 최대 동시 연결 수
            
        Returns:
            연결 결과 딕셔너리 {ip: success}
        """
        if ips is None:
            ips = generate_ips()
        
        logger.info(f"🔌 {len(ips)}대 디바이스 TCP 연결 시작 (포트: {self.port})")
        
        results = {}
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(self._safe_connect, ip): ip for ip in ips}
            for future in futures:
                ip = futures[future]
                results[ip] = future.result()
        
        success_count = sum(results.values())
        logger.info(f"\n=== TCP 연결 완료: {success_count}/{len(ips)} ===")
        
        return results
    
    def _safe_connect(self, ip: str) -> bool:
        """안전한 연결 (예외 처리 포함)"""
        try:
            return self.connect_device(ip)
        except USBConnectionError:
            return False
        except Exception:
            return False
    
    def disconnect_device(self, ip: str) -> bool:
        """
        단일 디바이스 연결 해제
        
        Args:
            ip: 디바이스 IP 주소
            
        Returns:
            해제 성공 여부
        """
        if ip in self.connections:
            del self.connections[ip]
            logger.info(f"✓ {ip}:{self.port} 연결 해제")
            return True
        return False
    
    def disconnect_all(self):
        """전체 디바이스 연결 해제"""
        self.connections.clear()
        logger.info("전체 디바이스 연결 해제 완료")
    
    def get_device(self, ip: str) -> Optional[u2.Device]:
        """
        디바이스 객체 가져오기
        
        Args:
            ip: 디바이스 IP 주소
            
        Returns:
            uiautomator2 Device 객체 또는 None
        """
        return self.connections.get(ip)
    
    def get_connected_ips(self) -> List[str]:
        """
        연결된 디바이스 IP 목록 반환
        
        Returns:
            연결된 IP 주소 리스트
        """
        return list(self.connections.keys())
    
    def get_device_id(self, ip: str) -> str:
        """디바이스 ID 형식으로 변환 (IP:5555)"""
        return self._get_tcp_address(ip)
    
    def execute_on_device(self, ip: str, action: Callable[[u2.Device], any]) -> bool:
        """
        단일 디바이스에 액션 실행
        
        Args:
            ip: 디바이스 IP 주소
            action: 실행할 액션 함수 (device를 인자로 받음)
            
        Returns:
            실행 성공 여부
        """
        try:
            device = self.connections.get(ip)
            if device:
                action(device)
                return True
            else:
                logger.warning(f"✗ {ip}: 연결되지 않은 디바이스")
                return False
        except Exception as e:
            logger.error(f"✗ {ip} 실행 실패: {e}")
            return False
    
    def execute_on_all(
        self, 
        action: Callable[[u2.Device], any], 
        max_workers: int = 50
    ) -> Dict[str, bool]:
        """
        전체 디바이스에 액션 실행
        
        Args:
            action: 실행할 액션 함수 (device를 인자로 받음)
            max_workers: 최대 동시 실행 수
            
        Returns:
            실행 결과 딕셔너리 {ip: success}
        """
        ips = list(self.connections.keys())
        results = {}
        
        def wrapper(ip):
            return self.execute_on_device(ip, action)
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(wrapper, ip): ip for ip in ips}
            for future in futures:
                ip = futures[future]
                results[ip] = future.result()
        
        success_count = sum(results.values())
        logger.info(f"=== 실행 완료: {success_count}/{len(ips)} ===")
        
        return results
    
    def execute_batch(
        self, 
        action: Callable[[u2.Device], any], 
        batch_size: int = 50
    ) -> Dict[str, bool]:
        """
        배치 단위로 액션 실행
        
        Args:
            action: 실행할 액션 함수
            batch_size: 배치 크기
            
        Returns:
            실행 결과 딕셔너리
        """
        ips = list(self.connections.keys())
        all_results = {}
        
        for i in range(0, len(ips), batch_size):
            batch = ips[i:i+batch_size]
            logger.info(f"\n배치 {i//batch_size + 1} 시작 ({len(batch)}대)")
            
            batch_results = {}
            with ThreadPoolExecutor(max_workers=batch_size) as executor:
                futures = {
                    executor.submit(self.execute_on_device, ip, action): ip 
                    for ip in batch
                }
                for future in futures:
                    ip = futures[future]
                    batch_results[ip] = future.result()
            
            all_results.update(batch_results)
            success = sum(batch_results.values())
            logger.info(f"배치 완료: {success}/{len(batch)}")
        
        return all_results
    
    # ==================== ADB 명령 메서드 (TCP 전용) ====================
    
    def adb_command(self, ip: str, command: str) -> Optional[str]:
        """
        ADB shell 명령 실행
        
        Args:
            ip: 디바이스 IP
            command: shell 명령어
            
        Returns:
            명령 결과 또는 None
        """
        return self.adb.execute_command(ip, command)
    
    def adb_tap(self, ip: str, x: int, y: int) -> bool:
        """ADB로 화면 탭"""
        return self.adb.tap(ip, x, y)
    
    def adb_swipe(
        self, 
        ip: str, 
        x1: int, y1: int, 
        x2: int, y2: int, 
        duration_ms: int = 300
    ) -> bool:
        """ADB로 화면 스와이프"""
        return self.adb.swipe(ip, x1, y1, x2, y2, duration_ms)
    
    def adb_input_text(self, ip: str, text: str) -> bool:
        """ADB로 텍스트 입력"""
        return self.adb.input_text(ip, text)
    
    def adb_press_key(self, ip: str, keycode: str) -> bool:
        """ADB로 키 입력"""
        return self.adb.press_key(ip, keycode)
    
    def adb_screenshot(self, ip: str, save_path: str) -> bool:
        """ADB로 스크린샷"""
        return self.adb.screenshot(ip, save_path)
    
    # ==================== xinhui 연동 메서드 ====================
    
    def hid_tap(self, ip: str, x: int, y: int, use_xinhui: bool = True) -> bool:
        """
        HID 수준 탭 (봇 감지 우회)
        
        Args:
            ip: 디바이스 IP
            x, y: 좌표
            use_xinhui: xinhui 사용 여부 (False면 ADB 사용)
            
        Returns:
            성공 여부
        """
        hybrid = get_hybrid()
        if hybrid:
            device_id = self.get_device_id(ip)
            return hybrid.tap(device_id, x, y, use_hid=use_xinhui)
        
        # 폴백: uiautomator2 사용
        device = self.connections.get(ip)
        if device:
            device.click(x, y)
            return True
        return False
    
    def hid_text(self, ip: str, text: str, use_xinhui: bool = True) -> bool:
        """
        HID 수준 텍스트 입력 (한글 지원)
        
        Args:
            ip: 디바이스 IP
            text: 입력할 텍스트
            use_xinhui: xinhui 사용 여부
            
        Returns:
            성공 여부
        """
        hybrid = get_hybrid()
        if hybrid:
            device_id = self.get_device_id(ip)
            return hybrid.text(device_id, text, use_hid=use_xinhui)
        
        # 폴백: uiautomator2 사용 (한글 미지원)
        device = self.connections.get(ip)
        if device:
            device.send_keys(text)
            return True
        return False
    
    def hid_swipe(
        self, 
        ip: str, 
        x1: int, y1: int, 
        x2: int, y2: int, 
        duration_ms: int = 300,
        use_xinhui: bool = True
    ) -> bool:
        """
        HID 수준 스와이프
        
        Args:
            ip: 디바이스 IP
            x1, y1: 시작 좌표
            x2, y2: 종료 좌표
            duration_ms: 지속 시간
            use_xinhui: xinhui 사용 여부
            
        Returns:
            성공 여부
        """
        hybrid = get_hybrid()
        if hybrid:
            device_id = self.get_device_id(ip)
            return hybrid.swipe(device_id, x1, y1, x2, y2, duration_ms, use_hid=use_xinhui)
        
        # 폴백: uiautomator2 사용
        device = self.connections.get(ip)
        if device:
            device.swipe(x1, y1, x2, y2, duration=duration_ms/1000)
            return True
        return False
    
    def capture_screen(self, ip: str, save_path: str, use_xinhui: bool = False) -> bool:
        """
        화면 캡처
        
        Args:
            ip: 디바이스 IP
            save_path: 저장 경로
            use_xinhui: xinhui 사용 (더 빠름)
            
        Returns:
            성공 여부
        """
        hybrid = get_hybrid()
        if hybrid and use_xinhui:
            device_id = self.get_device_id(ip)
            return hybrid.screenshot(device_id, save_path, use_xinhui=True)
        
        # 폴백: uiautomator2 사용
        device = self.connections.get(ip)
        if device:
            device.screenshot(save_path)
            return True
        return False
    
    def is_xinhui_available(self) -> bool:
        """xinhui 사용 가능 여부"""
        xinhui = get_xinhui()
        return xinhui is not None and xinhui.is_xinhui_running()
    
    def execute_with_hid(
        self, 
        ip: str, 
        action: Callable[[Any, str], Any]
    ) -> bool:
        """
        HID 컨트롤러로 액션 실행
        
        Args:
            ip: 디바이스 IP
            action: 실행할 액션 (hid_input, device_id를 인자로 받음)
            
        Returns:
            성공 여부
        """
        try:
            from src.controller.hid_input import get_hid_input
            hid = get_hid_input()
            device_id = self.get_device_id(ip)
            action(hid, device_id)
            return True
        except Exception as e:
            logger.error(f"HID action failed on {ip}: {e}")
            return False
    
    def execute_hid_on_all(
        self, 
        action: Callable[[Any, str], Any], 
        max_workers: int = 50
    ) -> Dict[str, bool]:
        """
        전체 디바이스에 HID 액션 실행
        
        Args:
            action: HID 액션 함수
            max_workers: 최대 동시 실행 수
            
        Returns:
            실행 결과 딕셔너리
        """
        ips = list(self.connections.keys())
        results = {}
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self.execute_with_hid, ip, action): ip 
                for ip in ips
            }
            for future in futures:
                ip = futures[future]
                results[ip] = future.result()
        
        success_count = sum(results.values())
        logger.info(f"=== HID 실행 완료: {success_count}/{len(ips)} ===")
        
        return results
