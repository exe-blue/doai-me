"""
ADB over TCP 전용 컨트롤러
모든 명령은 WiFi(TCP) 연결로만 실행됩니다.
USB 연결은 최초 세팅 시에만 사용됩니다.
"""

import subprocess
import logging
import re
from typing import List, Optional, Dict, Tuple
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from enum import Enum

from src.utils.ip_generator import generate_ips, format_device_address

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ADB over TCP 포트 (고정)
ADB_TCP_PORT = 5555


class ConnectionType(Enum):
    """연결 타입"""
    TCP = "tcp"      # WiFi 연결 (정상)
    USB = "usb"      # USB 연결 (오류로 처리)
    UNKNOWN = "unknown"


class ConnectionError(Exception):
    """연결 오류"""
    pass


class USBConnectionError(ConnectionError):
    """USB 연결 오류 - WiFi 연결이 필요합니다"""
    pass


@dataclass
class DeviceInfo:
    """디바이스 정보"""
    device_id: str
    connection_type: ConnectionType
    ip: Optional[str] = None
    port: int = ADB_TCP_PORT
    serial: Optional[str] = None  # USB 시리얼 (오류 추적용)
    
    @property
    def is_tcp(self) -> bool:
        return self.connection_type == ConnectionType.TCP
    
    @property
    def is_usb(self) -> bool:
        return self.connection_type == ConnectionType.USB
    
    @property
    def tcp_address(self) -> Optional[str]:
        """TCP 주소 (IP:PORT 형식)"""
        if self.ip:
            return f"{self.ip}:{self.port}"
        return None


class ADBController:
    """
    ADB over TCP 전용 컨트롤러
    
    주요 특징:
    - 모든 명령은 WiFi(TCP) 연결로만 실행
    - USB 연결 감지 시 오류 발생
    - 포트는 5555 고정
    """
    
    # IP:PORT 패턴 (TCP 연결)
    TCP_PATTERN = re.compile(r'^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)$')
    
    # USB 시리얼 패턴 (영숫자)
    USB_PATTERN = re.compile(r'^[a-zA-Z0-9]+$')
    
    def __init__(self, adb_path: str = r"C:\Program Files (x86)\xinhui\tools\adb.exe"):
        """
        Args:
            adb_path: ADB 실행 파일 경로
        """
        self.adb_path = adb_path
        self.port = ADB_TCP_PORT
        self._connected_devices: Dict[str, DeviceInfo] = {}  # ip -> DeviceInfo
    
    @classmethod
    def detect_connection_type(cls, device_id: str) -> Tuple[ConnectionType, Optional[str], Optional[str]]:
        """
        디바이스 ID에서 연결 타입 감지
        
        Args:
            device_id: 디바이스 ID (IP:PORT 또는 시리얼)
            
        Returns:
            (연결타입, IP, 시리얼)
        """
        # TCP 연결 체크 (IP:PORT 형식)
        tcp_match = cls.TCP_PATTERN.match(device_id)
        if tcp_match:
            ip = tcp_match.group(1)
            return ConnectionType.TCP, ip, None
        
        # USB 연결 체크 (시리얼 번호)
        if cls.USB_PATTERN.match(device_id):
            return ConnectionType.USB, None, device_id
        
        return ConnectionType.UNKNOWN, None, None
    
    def _validate_tcp_only(self, device_id: str) -> DeviceInfo:
        """
        TCP 연결만 허용하고 USB 연결은 거부
        
        Args:
            device_id: 디바이스 ID
            
        Returns:
            DeviceInfo
            
        Raises:
            USBConnectionError: USB 연결 감지 시
        """
        conn_type, ip, serial = self.detect_connection_type(device_id)
        
        if conn_type == ConnectionType.USB:
            raise USBConnectionError(
                f"USB 연결이 감지되었습니다 (시리얼: {serial}). "
                f"WiFi(TCP) 연결만 허용됩니다. "
                f"먼저 'adb tcpip {self.port}'로 TCP 모드를 활성화하세요."
            )
        
        if conn_type == ConnectionType.TCP:
            return DeviceInfo(
                device_id=device_id,
                connection_type=conn_type,
                ip=ip,
                port=self.port
            )
        
        raise ConnectionError(f"알 수 없는 디바이스 형식: {device_id}")
    
    def _run_adb(
        self, 
        args: List[str], 
        timeout: int = 30,
        check_tcp: bool = True
    ) -> subprocess.CompletedProcess:
        """
        ADB 명령 실행 (내부용)
        
        Args:
            args: ADB 인자 리스트
            timeout: 타임아웃 (초)
            check_tcp: TCP 검증 여부
            
        Returns:
            CompletedProcess
        """
        # -s 옵션이 있으면 TCP 검증
        if check_tcp and "-s" in args:
            idx = args.index("-s")
            if idx + 1 < len(args):
                device_id = args[idx + 1]
                self._validate_tcp_only(device_id)
        
        full_command = [self.adb_path] + args
        return subprocess.run(
            full_command,
            capture_output=True,
            text=True,
            timeout=timeout
        )
    
    def get_tcp_devices(self) -> List[DeviceInfo]:
        """
        연결된 TCP(WiFi) 디바이스만 반환
        USB 연결은 제외됨
        
        Returns:
            TCP 연결된 DeviceInfo 리스트
        """
        try:
            result = self._run_adb(["devices"], check_tcp=False)
            devices = []
            usb_devices = []
            
            for line in result.stdout.split('\n')[1:]:
                if line.strip() and '\tdevice' in line:
                    device_id = line.split('\t')[0]
                    conn_type, ip, serial = self.detect_connection_type(device_id)
                    
                    if conn_type == ConnectionType.TCP:
                        devices.append(DeviceInfo(
                            device_id=device_id,
                            connection_type=conn_type,
                            ip=ip,
                            port=self.port
                        ))
                    elif conn_type == ConnectionType.USB:
                        usb_devices.append(serial)
            
            # USB 연결 경고
            if usb_devices:
                logger.warning(
                    f"⚠️ USB 연결 감지됨 (무시됨): {usb_devices}\n"
                    f"   WiFi 전용 모드입니다. USB 연결은 최초 세팅 시에만 사용하세요."
                )
            
            return devices
            
        except Exception as e:
            logger.error(f"디바이스 목록 가져오기 실패: {e}")
            return []
    
    def get_tcp_ips(self) -> List[str]:
        """
        연결된 TCP 디바이스의 IP 목록만 반환
        
        Returns:
            IP 주소 리스트
        """
        devices = self.get_tcp_devices()
        return [d.ip for d in devices if d.ip]
    
    def connect_device(self, ip: str) -> bool:
        """
        단일 디바이스 TCP 연결
        
        Args:
            ip: 디바이스 IP 주소 (포트 제외)
            
        Returns:
            연결 성공 여부
        """
        try:
            address = f"{ip}:{self.port}"
            result = self._run_adb(["connect", address], check_tcp=False)
            
            if "connected" in result.stdout.lower():
                self._connected_devices[ip] = DeviceInfo(
                    device_id=address,
                    connection_type=ConnectionType.TCP,
                    ip=ip,
                    port=self.port
                )
                logger.info(f"✓ {address} TCP 연결 성공")
                return True
            else:
                logger.error(f"✗ {address} TCP 연결 실패: {result.stdout}")
                return False
                
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
            ips: IP 주소 리스트 (None이면 기본 600대)
            max_workers: 최대 동시 연결 수
            
        Returns:
            연결 결과 {ip: success}
        """
        if ips is None:
            ips = generate_ips()
        
        logger.info(f"🔌 {len(ips)}대 디바이스 TCP 연결 시작 (포트: {self.port})")
        
        results = {}
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(self.connect_device, ip): ip for ip in ips}
            for future in futures:
                ip = futures[future]
                results[ip] = future.result()
        
        success_count = sum(results.values())
        logger.info(f"\n=== TCP 연결 완료: {success_count}/{len(ips)} ===")
        
        return results
    
    def disconnect_device(self, ip: str) -> bool:
        """
        단일 디바이스 연결 해제
        
        Args:
            ip: 디바이스 IP 주소
            
        Returns:
            해제 성공 여부
        """
        try:
            address = f"{ip}:{self.port}"
            result = self._run_adb(["disconnect", address], check_tcp=False)
            
            if ip in self._connected_devices:
                del self._connected_devices[ip]
            
            logger.info(f"✓ {address} 연결 해제")
            return True
            
        except Exception as e:
            logger.error(f"✗ {ip} 연결 해제 실패: {e}")
            return False
    
    def execute_command(self, ip: str, command: str, timeout: int = 30) -> Optional[str]:
        """
        단일 디바이스에 ADB shell 명령 실행 (TCP 전용)
        
        Args:
            ip: 디바이스 IP 주소
            command: 실행할 shell 명령어
            timeout: 타임아웃 (초)
            
        Returns:
            명령 실행 결과 또는 None
        """
        address = f"{ip}:{self.port}"
        
        try:
            # TCP 검증
            self._validate_tcp_only(address)
            
            result = self._run_adb(
                ["-s", address, "shell", command],
                timeout=timeout
            )
            
            if result.returncode == 0:
                return result.stdout.strip()
            else:
                logger.error(f"✗ {address} 명령 실패: {result.stderr}")
                return None
                
        except USBConnectionError as e:
            logger.error(f"✗ USB 연결 오류: {e}")
            return None
        except subprocess.TimeoutExpired:
            logger.error(f"✗ {address} 명령 타임아웃")
            return None
        except Exception as e:
            logger.error(f"✗ {address} 명령 실행 실패: {e}")
            return None
    
    def execute_raw(
        self, 
        ip: str, 
        args: List[str], 
        timeout: int = 30
    ) -> Tuple[bool, str]:
        """
        ADB 명령 직접 실행 (TCP 전용)
        
        Args:
            ip: 디바이스 IP 주소
            args: ADB 인자 리스트 (shell 포함)
            timeout: 타임아웃 (초)
            
        Returns:
            (성공여부, 출력)
        """
        address = f"{ip}:{self.port}"
        
        try:
            self._validate_tcp_only(address)
            
            result = self._run_adb(
                ["-s", address] + args,
                timeout=timeout
            )
            
            success = result.returncode == 0
            output = result.stdout if success else result.stderr
            return success, output.strip()
            
        except USBConnectionError as e:
            return False, str(e)
        except Exception as e:
            return False, str(e)
    
    def execute_on_all(
        self, 
        command: str, 
        ips: Optional[List[str]] = None,
        max_workers: int = 50
    ) -> Dict[str, Optional[str]]:
        """
        전체 디바이스에 명령 동시 실행
        
        Args:
            command: 실행할 shell 명령어
            ips: IP 목록 (None이면 연결된 TCP 디바이스)
            max_workers: 최대 동시 실행 수
            
        Returns:
            실행 결과 {ip: output}
        """
        if ips is None:
            ips = self.get_tcp_ips()
        
        if not ips:
            logger.warning("연결된 TCP 디바이스가 없습니다")
            return {}
        
        results = {}
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(self.execute_command, ip, command): ip for ip in ips}
            for future in futures:
                ip = futures[future]
                results[ip] = future.result()
        
        success_count = sum(1 for r in results.values() if r is not None)
        logger.info(f"=== 명령 실행 완료: {success_count}/{len(ips)} ===")
        
        return results
    
    # ==================== 편의 메서드 (TCP 전용) ====================
    
    def tap(self, ip: str, x: int, y: int) -> bool:
        """화면 탭"""
        result = self.execute_command(ip, f"input tap {x} {y}")
        return result is not None
    
    def swipe(
        self, 
        ip: str, 
        x1: int, y1: int, 
        x2: int, y2: int, 
        duration_ms: int = 300
    ) -> bool:
        """화면 스와이프"""
        result = self.execute_command(
            ip, 
            f"input swipe {x1} {y1} {x2} {y2} {duration_ms}"
        )
        return result is not None
    
    def input_text(self, ip: str, text: str) -> bool:
        """텍스트 입력 (영문/숫자만)"""
        # 공백 처리
        safe_text = text.replace(" ", "%s")
        result = self.execute_command(ip, f"input text {safe_text}")
        return result is not None
    
    def press_key(self, ip: str, keycode: str) -> bool:
        """키 입력"""
        result = self.execute_command(ip, f"input keyevent {keycode}")
        return result is not None
    
    def press_home(self, ip: str) -> bool:
        """홈 버튼"""
        return self.press_key(ip, "KEYCODE_HOME")
    
    def press_back(self, ip: str) -> bool:
        """뒤로가기"""
        return self.press_key(ip, "KEYCODE_BACK")
    
    def press_enter(self, ip: str) -> bool:
        """엔터 키"""
        return self.press_key(ip, "KEYCODE_ENTER")
    
    def wake_screen(self, ip: str) -> bool:
        """화면 켜기"""
        return self.press_key(ip, "KEYCODE_WAKEUP")
    
    def start_app(self, ip: str, package: str, activity: str) -> bool:
        """앱 실행"""
        result = self.execute_command(
            ip, 
            f"am start -n {package}/{activity}"
        )
        return result is not None
    
    def start_youtube(self, ip: str) -> bool:
        """YouTube 앱 실행"""
        return self.start_app(
            ip,
            "com.google.android.youtube",
            "com.google.android.youtube.HomeActivity"
        )
    
    def screenshot(self, ip: str, local_path: str) -> bool:
        """스크린샷 저장"""
        address = f"{ip}:{self.port}"
        try:
            # 디바이스에서 스크린샷 촬영
            self._run_adb(
                ["-s", address, "shell", "screencap", "-p", "/sdcard/screen.png"]
            )
            # PC로 가져오기
            result = self._run_adb(
                ["-s", address, "pull", "/sdcard/screen.png", local_path]
            )
            return result.returncode == 0
        except Exception as e:
            logger.error(f"스크린샷 실패 ({ip}): {e}")
            return False
    
    def get_device_info(self, ip: str) -> Dict[str, str]:
        """디바이스 정보 조회"""
        info = {"ip": ip, "port": str(self.port)}
        
        # 모델명
        model = self.execute_command(ip, "getprop ro.product.model")
        info["model"] = model or "Unknown"
        
        # Android 버전
        version = self.execute_command(ip, "getprop ro.build.version.release")
        info["android_version"] = version or "Unknown"
        
        # 배터리
        battery = self.execute_command(ip, "dumpsys battery | grep level")
        if battery:
            info["battery"] = battery.split(":")[-1].strip() + "%"
        else:
            info["battery"] = "Unknown"
        
        return info


# ==================== 최초 세팅용 함수 (USB 허용) ====================

def setup_tcp_mode(adb_path: str = r"C:\Program Files (x86)\xinhui\tools\adb.exe") -> Dict[str, bool]:
    """
    최초 세팅: USB 연결된 디바이스들을 TCP 모드로 전환
    
    이 함수는 최초 세팅 시에만 사용하세요.
    이후에는 모든 연결이 TCP(WiFi)로만 이루어집니다.
    
    Args:
        adb_path: ADB 실행 파일 경로
        
    Returns:
        설정 결과 {시리얼: 성공여부}
    """
    logger.info("=" * 60)
    logger.info("📱 최초 세팅: USB -> TCP 모드 전환")
    logger.info("=" * 60)
    
    results = {}
    
    try:
        # 연결된 디바이스 확인
        result = subprocess.run(
            [adb_path, "devices"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        usb_devices = []
        tcp_devices = []
        
        for line in result.stdout.split('\n')[1:]:
            if line.strip() and '\tdevice' in line:
                device_id = line.split('\t')[0]
                
                # IP:PORT 형식이면 TCP
                if re.match(r'^\d+\.\d+\.\d+\.\d+:\d+$', device_id):
                    tcp_devices.append(device_id)
                else:
                    usb_devices.append(device_id)
        
        logger.info(f"USB 연결 디바이스: {len(usb_devices)}대")
        logger.info(f"TCP 연결 디바이스: {len(tcp_devices)}대")
        
        if not usb_devices:
            logger.info("USB 연결된 디바이스가 없습니다. TCP 모드 전환 불필요.")
            return results
        
        # 각 USB 디바이스를 TCP 모드로 전환
        for serial in usb_devices:
            logger.info(f"\n[{serial}] TCP 모드 전환 중...")
            
            try:
                # TCP 모드 활성화
                tcp_result = subprocess.run(
                    [adb_path, "-s", serial, "tcpip", str(ADB_TCP_PORT)],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if tcp_result.returncode == 0:
                    logger.info(f"✓ {serial}: TCP 모드 활성화 완료 (포트: {ADB_TCP_PORT})")
                    results[serial] = True
                    
                    # IP 주소 확인
                    ip_result = subprocess.run(
                        [adb_path, "-s", serial, "shell", "ip addr show wlan0"],
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    if ip_result.returncode == 0:
                        ip_match = re.search(r'inet (\d+\.\d+\.\d+\.\d+)', ip_result.stdout)
                        if ip_match:
                            ip = ip_match.group(1)
                            logger.info(f"   → WiFi IP: {ip}")
                            logger.info(f"   → TCP 연결: adb connect {ip}:{ADB_TCP_PORT}")
                else:
                    logger.error(f"✗ {serial}: TCP 모드 전환 실패 - {tcp_result.stderr}")
                    results[serial] = False
                    
            except Exception as e:
                logger.error(f"✗ {serial}: 오류 - {e}")
                results[serial] = False
        
        logger.info("\n" + "=" * 60)
        success = sum(results.values())
        logger.info(f"TCP 모드 전환 완료: {success}/{len(usb_devices)}")
        logger.info("이제 USB 케이블을 분리하고 WiFi로 연결하세요.")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"설정 중 오류: {e}")
    
    return results


def get_wifi_ips_from_usb(
    adb_path: str = r"C:\Program Files (x86)\xinhui\tools\adb.exe"
) -> Dict[str, str]:
    """
    USB 연결된 디바이스들의 WiFi IP 주소 조회 (세팅용)
    
    Args:
        adb_path: ADB 경로
        
    Returns:
        {시리얼: IP주소}
    """
    results = {}
    
    try:
        result = subprocess.run(
            [adb_path, "devices"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        for line in result.stdout.split('\n')[1:]:
            if line.strip() and '\tdevice' in line:
                device_id = line.split('\t')[0]
                
                # USB 연결만 처리
                if not re.match(r'^\d+\.\d+\.\d+\.\d+:\d+$', device_id):
                    ip_result = subprocess.run(
                        [adb_path, "-s", device_id, "shell", 
                         "ip addr show wlan0 | grep 'inet '"],
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    if ip_result.returncode == 0:
                        ip_match = re.search(r'inet (\d+\.\d+\.\d+\.\d+)', ip_result.stdout)
                        if ip_match:
                            results[device_id] = ip_match.group(1)
                            
    except Exception as e:
        logger.error(f"IP 조회 실패: {e}")
    
    return results
