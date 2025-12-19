"""
디바이스 Heartbeat/Keep-Alive 시스템

주요 기능:
- 주기적인 디바이스 상태 확인 (Pulse)
- WiFi(TCP) 연결 상태 모니터링
- 자동 재연결 (연결 끊김 시)
- 디바이스 상태 표준 정의 및 검증
- 상태 이력 관리
"""

import asyncio
import subprocess
import re
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== 상수 정의 ====================

# ADB 설정
ADB_PATH = r"C:\Program Files (x86)\xinhui\tools\adb.exe"
TCP_PORT = 5555

# Heartbeat 주기 (초)
DEFAULT_HEARTBEAT_INTERVAL = 30  # 30초마다 상태 확인
DEFAULT_RECONNECT_INTERVAL = 60  # 60초마다 재연결 시도
DEFAULT_HEALTH_CHECK_INTERVAL = 300  # 5분마다 전체 헬스체크

# 재연결 설정
MAX_RECONNECT_ATTEMPTS = 3
RECONNECT_BACKOFF_BASE = 5  # 초

# 상태 임계값
BATTERY_WARNING_THRESHOLD = 20  # 배터리 20% 이하 경고
BATTERY_CRITICAL_THRESHOLD = 10  # 배터리 10% 이하 위험
TEMPERATURE_WARNING_THRESHOLD = 40  # 40°C 이상 경고
TEMPERATURE_CRITICAL_THRESHOLD = 50  # 50°C 이상 위험


# ==================== Enum 정의 ====================

class DeviceStatus(Enum):
    """디바이스 연결 상태"""
    ONLINE = "online"           # 정상 연결 (TCP/WiFi)
    OFFLINE = "offline"         # 연결 끊김
    RECONNECTING = "reconnecting"  # 재연결 중
    USB_DETECTED = "usb_detected"  # USB 연결 감지 (오류)
    ERROR = "error"             # 오류 상태
    UNKNOWN = "unknown"         # 알 수 없음


class HealthLevel(Enum):
    """디바이스 건강 상태"""
    HEALTHY = "healthy"         # 정상
    WARNING = "warning"         # 경고 (주의 필요)
    CRITICAL = "critical"       # 위험 (즉시 조치 필요)
    UNKNOWN = "unknown"         # 알 수 없음


class ConnectionType(Enum):
    """연결 타입"""
    TCP = "tcp"      # WiFi 연결 (정상)
    USB = "usb"      # USB 연결 (오류)
    NONE = "none"    # 연결 없음


# ==================== 데이터 클래스 ====================

@dataclass
class DeviceHealthStandard:
    """
    디바이스 상태 표준 정의
    
    정상 상태 기준:
    - 연결: TCP(WiFi) 연결
    - 배터리: 20% 이상
    - 온도: 40°C 이하
    - 화면: 켜짐 상태
    - 응답시간: 5초 이내
    """
    # 연결
    connection_type: ConnectionType = ConnectionType.TCP
    is_connected: bool = True
    
    # 배터리
    battery_min: int = BATTERY_WARNING_THRESHOLD
    battery_critical: int = BATTERY_CRITICAL_THRESHOLD
    
    # 온도
    temperature_max: float = TEMPERATURE_WARNING_THRESHOLD
    temperature_critical: float = TEMPERATURE_CRITICAL_THRESHOLD
    
    # 응답
    max_response_time_ms: int = 5000
    
    # 화면
    screen_on: bool = True


@dataclass
class DeviceHealth:
    """디바이스 건강 상태"""
    ip: str
    status: DeviceStatus = DeviceStatus.UNKNOWN
    health_level: HealthLevel = HealthLevel.UNKNOWN
    connection_type: ConnectionType = ConnectionType.NONE
    
    # 상세 정보
    battery_level: Optional[int] = None
    battery_status: Optional[str] = None  # charging, discharging, full
    temperature: Optional[float] = None
    screen_on: Optional[bool] = None
    wifi_rssi: Optional[int] = None  # WiFi 신호 강도
    
    # 디바이스 정보
    model: Optional[str] = None
    android_version: Optional[str] = None
    
    # 응답 시간
    response_time_ms: Optional[int] = None
    
    # 타임스탬프
    last_seen: Optional[datetime] = None
    last_heartbeat: Optional[datetime] = None
    
    # 오류 정보
    error_count: int = 0
    last_error: Optional[str] = None
    
    # 재연결 정보
    reconnect_attempts: int = 0
    last_reconnect: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """딕셔너리로 변환"""
        return {
            "ip": self.ip,
            "status": self.status.value,
            "health_level": self.health_level.value,
            "connection_type": self.connection_type.value,
            "battery_level": self.battery_level,
            "battery_status": self.battery_status,
            "temperature": self.temperature,
            "screen_on": self.screen_on,
            "wifi_rssi": self.wifi_rssi,
            "model": self.model,
            "android_version": self.android_version,
            "response_time_ms": self.response_time_ms,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
            "error_count": self.error_count,
            "last_error": self.last_error,
            "reconnect_attempts": self.reconnect_attempts,
        }


@dataclass
class HeartbeatResult:
    """Heartbeat 결과"""
    ip: str
    success: bool
    response_time_ms: int
    timestamp: datetime
    health: Optional[DeviceHealth] = None
    error: Optional[str] = None


# ==================== Heartbeat Manager ====================

class HeartbeatManager:
    """
    디바이스 Heartbeat 관리자
    
    주요 기능:
    - 주기적인 상태 확인 (Pulse)
    - 자동 재연결
    - 상태 표준 검증
    - 상태 이력 관리
    """
    
    # TCP 패턴
    TCP_PATTERN = re.compile(r'^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)$')
    USB_PATTERN = re.compile(r'^[a-zA-Z0-9]+$')
    
    def __init__(
        self,
        adb_path: str = ADB_PATH,
        heartbeat_interval: int = DEFAULT_HEARTBEAT_INTERVAL,
        reconnect_interval: int = DEFAULT_RECONNECT_INTERVAL,
        health_check_interval: int = DEFAULT_HEALTH_CHECK_INTERVAL,
        max_workers: int = 50
    ):
        self.adb_path = adb_path
        self.heartbeat_interval = heartbeat_interval
        self.reconnect_interval = reconnect_interval
        self.health_check_interval = health_check_interval
        self.max_workers = max_workers
        
        # 상태 표준
        self.standard = DeviceHealthStandard()
        
        # 디바이스 상태 저장
        self._devices: Dict[str, DeviceHealth] = {}
        self._device_lock = threading.Lock()
        
        # 모니터링 대상 IP 목록
        self._monitored_ips: Set[str] = set()
        
        # 실행 상태
        self._running = False
        self._heartbeat_task = None
        self._reconnect_task = None
        self._health_check_task = None
        
        # 콜백
        self._on_status_change: Optional[Callable[[str, DeviceStatus, DeviceStatus], None]] = None
        self._on_health_warning: Optional[Callable[[str, DeviceHealth], None]] = None
        self._on_reconnect: Optional[Callable[[str, bool], None]] = None
        
        # 통계
        self._stats = {
            "total_heartbeats": 0,
            "successful_heartbeats": 0,
            "failed_heartbeats": 0,
            "reconnect_attempts": 0,
            "successful_reconnects": 0,
            "usb_detections": 0,
        }
    
    # ==================== ADB 명령 ====================
    
    def _run_adb(self, args: List[str], timeout: int = 10) -> tuple[bool, str]:
        """ADB 명령 실행"""
        try:
            result = subprocess.run(
                [self.adb_path] + args,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result.returncode == 0, result.stdout.strip()
        except subprocess.TimeoutExpired:
            return False, "Timeout"
        except Exception as e:
            return False, str(e)
    
    def _run_adb_shell(self, ip: str, command: str, timeout: int = 10) -> tuple[bool, str]:
        """디바이스에서 shell 명령 실행"""
        address = f"{ip}:{TCP_PORT}"
        return self._run_adb(["-s", address, "shell", command], timeout)
    
    # ==================== 디바이스 검색 ====================
    
    def get_connected_devices(self) -> Dict[str, ConnectionType]:
        """
        현재 연결된 모든 디바이스 조회
        
        Returns:
            {device_id: ConnectionType}
        """
        success, output = self._run_adb(["devices"])
        
        if not success:
            return {}
        
        devices = {}
        for line in output.split('\n')[1:]:
            if line.strip() and '\tdevice' in line:
                device_id = line.split('\t')[0]
                
                # TCP 연결
                tcp_match = self.TCP_PATTERN.match(device_id)
                if tcp_match:
                    ip = tcp_match.group(1)
                    devices[ip] = ConnectionType.TCP
                    continue
                
                # USB 연결
                if self.USB_PATTERN.match(device_id):
                    devices[device_id] = ConnectionType.USB
        
        return devices
    
    def get_tcp_devices(self) -> List[str]:
        """TCP 연결된 디바이스 IP 목록"""
        devices = self.get_connected_devices()
        return [ip for ip, conn_type in devices.items() if conn_type == ConnectionType.TCP]
    
    def get_usb_devices(self) -> List[str]:
        """USB 연결된 디바이스 시리얼 목록"""
        devices = self.get_connected_devices()
        return [serial for serial, conn_type in devices.items() if conn_type == ConnectionType.USB]
    
    # ==================== 상태 확인 ====================
    
    def check_device_health(self, ip: str) -> DeviceHealth:
        """
        디바이스 건강 상태 확인
        
        Args:
            ip: 디바이스 IP
            
        Returns:
            DeviceHealth
        """
        start_time = time.time()
        health = DeviceHealth(ip=ip)
        
        # 연결 확인
        connected_devices = self.get_connected_devices()
        
        # TCP 연결 확인
        if ip in connected_devices:
            conn_type = connected_devices[ip]
            health.connection_type = conn_type
            
            if conn_type == ConnectionType.TCP:
                health.status = DeviceStatus.ONLINE
            elif conn_type == ConnectionType.USB:
                health.status = DeviceStatus.USB_DETECTED
                health.health_level = HealthLevel.WARNING
                self._stats["usb_detections"] += 1
                logger.warning(f"⚠️ USB 연결 감지: {ip} - WiFi로 전환 필요")
        else:
            health.status = DeviceStatus.OFFLINE
            health.connection_type = ConnectionType.NONE
            health.health_level = HealthLevel.CRITICAL
            return health
        
        # 상세 정보 조회 (TCP 연결만)
        if health.connection_type == ConnectionType.TCP:
            # 배터리 정보
            success, battery_output = self._run_adb_shell(ip, "dumpsys battery")
            if success:
                for line in battery_output.split('\n'):
                    if 'level:' in line:
                        try:
                            health.battery_level = int(line.split(':')[1].strip())
                        except ValueError:
                            pass
                    elif 'status:' in line:
                        status_code = line.split(':')[1].strip()
                        status_map = {'2': 'charging', '3': 'discharging', '5': 'full'}
                        health.battery_status = status_map.get(status_code, 'unknown')
                    elif 'temperature:' in line:
                        try:
                            # 온도는 10배로 저장됨
                            health.temperature = int(line.split(':')[1].strip()) / 10.0
                        except ValueError:
                            pass
            
            # 화면 상태
            success, power_output = self._run_adb_shell(ip, "dumpsys power | grep 'Display Power'")
            if success:
                health.screen_on = "state=ON" in power_output
            
            # WiFi 신호 강도
            success, wifi_output = self._run_adb_shell(ip, "dumpsys wifi | grep 'mWifiInfo'")
            if success:
                rssi_match = re.search(r'RSSI: (-?\d+)', wifi_output)
                if rssi_match:
                    health.wifi_rssi = int(rssi_match.group(1))
            
            # 디바이스 정보 (캐시)
            if not health.model:
                success, model = self._run_adb_shell(ip, "getprop ro.product.model")
                if success:
                    health.model = model
            
            if not health.android_version:
                success, version = self._run_adb_shell(ip, "getprop ro.build.version.release")
                if success:
                    health.android_version = version
        
        # 응답 시간
        health.response_time_ms = int((time.time() - start_time) * 1000)
        
        # 타임스탬프
        now = datetime.now()
        health.last_seen = now
        health.last_heartbeat = now
        
        # 건강 수준 평가
        health.health_level = self._evaluate_health_level(health)
        
        return health
    
    def _evaluate_health_level(self, health: DeviceHealth) -> HealthLevel:
        """건강 수준 평가"""
        # 오프라인
        if health.status == DeviceStatus.OFFLINE:
            return HealthLevel.CRITICAL
        
        # USB 연결 (WiFi로 전환 필요)
        if health.status == DeviceStatus.USB_DETECTED:
            return HealthLevel.WARNING
        
        # 배터리 위험
        if health.battery_level is not None:
            if health.battery_level <= self.standard.battery_critical:
                return HealthLevel.CRITICAL
            if health.battery_level <= self.standard.battery_min:
                return HealthLevel.WARNING
        
        # 온도 위험
        if health.temperature is not None:
            if health.temperature >= self.standard.temperature_critical:
                return HealthLevel.CRITICAL
            if health.temperature >= self.standard.temperature_max:
                return HealthLevel.WARNING
        
        # 응답 시간 초과
        if health.response_time_ms is not None:
            if health.response_time_ms > self.standard.max_response_time_ms:
                return HealthLevel.WARNING
        
        return HealthLevel.HEALTHY
    
    # ==================== Heartbeat (Pulse) ====================
    
    def pulse(self, ip: str) -> HeartbeatResult:
        """
        단일 디바이스 Heartbeat (Pulse)
        
        Args:
            ip: 디바이스 IP
            
        Returns:
            HeartbeatResult
        """
        start_time = time.time()
        self._stats["total_heartbeats"] += 1
        
        try:
            health = self.check_device_health(ip)
            response_time = int((time.time() - start_time) * 1000)
            
            # 상태 저장
            with self._device_lock:
                old_status = self._devices.get(ip, DeviceHealth(ip=ip)).status
                self._devices[ip] = health
                
                # 상태 변경 콜백
                if old_status != health.status and self._on_status_change:
                    self._on_status_change(ip, old_status, health.status)
                
                # 경고 콜백
                if health.health_level in [HealthLevel.WARNING, HealthLevel.CRITICAL]:
                    if self._on_health_warning:
                        self._on_health_warning(ip, health)
            
            success = health.status == DeviceStatus.ONLINE
            if success:
                self._stats["successful_heartbeats"] += 1
            else:
                self._stats["failed_heartbeats"] += 1
            
            return HeartbeatResult(
                ip=ip,
                success=success,
                response_time_ms=response_time,
                timestamp=datetime.now(),
                health=health
            )
            
        except Exception as e:
            self._stats["failed_heartbeats"] += 1
            return HeartbeatResult(
                ip=ip,
                success=False,
                response_time_ms=int((time.time() - start_time) * 1000),
                timestamp=datetime.now(),
                error=str(e)
            )
    
    def pulse_all(self, ips: Optional[List[str]] = None) -> Dict[str, HeartbeatResult]:
        """
        모든 디바이스 Heartbeat
        
        Args:
            ips: IP 목록 (None이면 모니터링 대상 전체)
            
        Returns:
            {ip: HeartbeatResult}
        """
        if ips is None:
            ips = list(self._monitored_ips)
        
        if not ips:
            return {}
        
        results = {}
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.pulse, ip): ip for ip in ips}
            for future in as_completed(futures):
                ip = futures[future]
                results[ip] = future.result()
        
        return results
    
    # ==================== 자동 재연결 ====================
    
    def reconnect_device(self, ip: str) -> bool:
        """
        디바이스 재연결 (TCP/WiFi)
        
        Args:
            ip: 디바이스 IP
            
        Returns:
            성공 여부
        """
        self._stats["reconnect_attempts"] += 1
        
        with self._device_lock:
            if ip in self._devices:
                self._devices[ip].status = DeviceStatus.RECONNECTING
                self._devices[ip].reconnect_attempts += 1
                self._devices[ip].last_reconnect = datetime.now()
        
        logger.info(f"🔄 재연결 시도: {ip}:{TCP_PORT}")
        
        # 기존 연결 해제
        self._run_adb(["disconnect", f"{ip}:{TCP_PORT}"])
        time.sleep(0.5)
        
        # 재연결
        success, output = self._run_adb(["connect", f"{ip}:{TCP_PORT}"])
        
        if success and "connected" in output.lower():
            logger.info(f"✅ 재연결 성공: {ip}:{TCP_PORT}")
            self._stats["successful_reconnects"] += 1
            
            with self._device_lock:
                if ip in self._devices:
                    self._devices[ip].status = DeviceStatus.ONLINE
                    self._devices[ip].connection_type = ConnectionType.TCP
                    self._devices[ip].error_count = 0
            
            if self._on_reconnect:
                self._on_reconnect(ip, True)
            
            return True
        else:
            logger.error(f"❌ 재연결 실패: {ip}:{TCP_PORT}")
            
            with self._device_lock:
                if ip in self._devices:
                    self._devices[ip].status = DeviceStatus.OFFLINE
                    self._devices[ip].error_count += 1
                    self._devices[ip].last_error = "Reconnect failed"
            
            if self._on_reconnect:
                self._on_reconnect(ip, False)
            
            return False
    
    def reconnect_offline_devices(self) -> Dict[str, bool]:
        """
        오프라인 디바이스 일괄 재연결
        
        Returns:
            {ip: 성공여부}
        """
        offline_ips = []
        
        with self._device_lock:
            for ip, health in self._devices.items():
                if health.status in [DeviceStatus.OFFLINE, DeviceStatus.ERROR]:
                    if health.reconnect_attempts < MAX_RECONNECT_ATTEMPTS:
                        offline_ips.append(ip)
        
        if not offline_ips:
            return {}
        
        logger.info(f"🔄 오프라인 디바이스 재연결: {len(offline_ips)}대")
        
        results = {}
        for ip in offline_ips:
            results[ip] = self.reconnect_device(ip)
            time.sleep(0.5)  # 순차 처리 (ADB 안정성)
        
        return results
    
    def convert_usb_to_wifi(self, serial: str) -> Optional[str]:
        """
        USB 연결을 WiFi로 전환
        
        Args:
            serial: USB 시리얼 번호
            
        Returns:
            WiFi IP 주소 또는 None
        """
        logger.info(f"🔄 USB -> WiFi 전환: {serial}")
        
        # WiFi IP 조회
        success, output = self._run_adb(["-s", serial, "shell", "ip addr show wlan0"])
        if not success:
            logger.error(f"❌ WiFi IP 조회 실패: {serial}")
            return None
        
        ip_match = re.search(r'inet (\d+\.\d+\.\d+\.\d+)', output)
        if not ip_match:
            logger.error(f"❌ WiFi IP 없음: {serial}")
            return None
        
        wifi_ip = ip_match.group(1)
        
        # TCP 모드 활성화
        success, _ = self._run_adb(["-s", serial, "tcpip", str(TCP_PORT)])
        if not success:
            logger.error(f"❌ TCP 모드 활성화 실패: {serial}")
            return None
        
        time.sleep(1)
        
        # WiFi로 연결
        success, output = self._run_adb(["connect", f"{wifi_ip}:{TCP_PORT}"])
        if success and "connected" in output.lower():
            logger.info(f"✅ WiFi 전환 성공: {serial} -> {wifi_ip}:{TCP_PORT}")
            
            # 모니터링 추가
            self.add_device(wifi_ip)
            
            return wifi_ip
        
        logger.error(f"❌ WiFi 연결 실패: {wifi_ip}:{TCP_PORT}")
        return None
    
    def convert_all_usb_to_wifi(self) -> Dict[str, Optional[str]]:
        """
        모든 USB 디바이스를 WiFi로 전환
        
        Returns:
            {serial: wifi_ip or None}
        """
        usb_devices = self.get_usb_devices()
        
        if not usb_devices:
            return {}
        
        logger.info(f"🔄 USB -> WiFi 일괄 전환: {len(usb_devices)}대")
        
        results = {}
        for serial in usb_devices:
            results[serial] = self.convert_usb_to_wifi(serial)
            time.sleep(1)
        
        return results
    
    # ==================== 모니터링 관리 ====================
    
    def add_device(self, ip: str):
        """모니터링 대상 추가"""
        self._monitored_ips.add(ip)
        
        with self._device_lock:
            if ip not in self._devices:
                self._devices[ip] = DeviceHealth(ip=ip)
    
    def add_devices(self, ips: List[str]):
        """여러 디바이스 모니터링 추가"""
        for ip in ips:
            self.add_device(ip)
    
    def remove_device(self, ip: str):
        """모니터링 대상 제거"""
        self._monitored_ips.discard(ip)
        
        with self._device_lock:
            self._devices.pop(ip, None)
    
    def auto_discover(self) -> List[str]:
        """
        TCP 연결된 디바이스 자동 발견 및 등록
        
        Returns:
            새로 등록된 IP 목록
        """
        tcp_devices = self.get_tcp_devices()
        new_devices = []
        
        for ip in tcp_devices:
            if ip not in self._monitored_ips:
                self.add_device(ip)
                new_devices.append(ip)
                logger.info(f"📱 새 디바이스 발견: {ip}:{TCP_PORT}")
        
        return new_devices
    
    # ==================== 상태 조회 ====================
    
    def get_device_status(self, ip: str) -> Optional[DeviceHealth]:
        """단일 디바이스 상태 조회"""
        with self._device_lock:
            return self._devices.get(ip)
    
    def get_all_status(self) -> Dict[str, DeviceHealth]:
        """전체 디바이스 상태 조회"""
        with self._device_lock:
            return dict(self._devices)
    
    def get_status_summary(self) -> Dict[str, Any]:
        """상태 요약"""
        with self._device_lock:
            devices = list(self._devices.values())
        
        summary = {
            "total": len(devices),
            "online": sum(1 for d in devices if d.status == DeviceStatus.ONLINE),
            "offline": sum(1 for d in devices if d.status == DeviceStatus.OFFLINE),
            "reconnecting": sum(1 for d in devices if d.status == DeviceStatus.RECONNECTING),
            "usb_detected": sum(1 for d in devices if d.status == DeviceStatus.USB_DETECTED),
            "error": sum(1 for d in devices if d.status == DeviceStatus.ERROR),
            "healthy": sum(1 for d in devices if d.health_level == HealthLevel.HEALTHY),
            "warning": sum(1 for d in devices if d.health_level == HealthLevel.WARNING),
            "critical": sum(1 for d in devices if d.health_level == HealthLevel.CRITICAL),
            "avg_battery": None,
            "avg_temperature": None,
            "avg_response_time_ms": None,
        }
        
        # 평균 계산
        batteries = [d.battery_level for d in devices if d.battery_level is not None]
        if batteries:
            summary["avg_battery"] = sum(batteries) / len(batteries)
        
        temps = [d.temperature for d in devices if d.temperature is not None]
        if temps:
            summary["avg_temperature"] = sum(temps) / len(temps)
        
        response_times = [d.response_time_ms for d in devices if d.response_time_ms is not None]
        if response_times:
            summary["avg_response_time_ms"] = sum(response_times) / len(response_times)
        
        summary["stats"] = self._stats.copy()
        
        return summary
    
    def get_devices_by_status(self, status: DeviceStatus) -> List[str]:
        """특정 상태의 디바이스 IP 목록"""
        with self._device_lock:
            return [ip for ip, health in self._devices.items() if health.status == status]
    
    def get_devices_by_health(self, level: HealthLevel) -> List[str]:
        """특정 건강 수준의 디바이스 IP 목록"""
        with self._device_lock:
            return [ip for ip, health in self._devices.items() if health.health_level == level]
    
    # ==================== 콜백 설정 ====================
    
    def on_status_change(self, callback: Callable[[str, DeviceStatus, DeviceStatus], None]):
        """상태 변경 콜백 설정"""
        self._on_status_change = callback
    
    def on_health_warning(self, callback: Callable[[str, DeviceHealth], None]):
        """건강 경고 콜백 설정"""
        self._on_health_warning = callback
    
    def on_reconnect(self, callback: Callable[[str, bool], None]):
        """재연결 콜백 설정"""
        self._on_reconnect = callback
    
    # ==================== 비동기 모니터링 ====================
    
    async def _heartbeat_loop(self):
        """Heartbeat 루프 (비동기)"""
        while self._running:
            try:
                # 모든 디바이스 Pulse
                self.pulse_all()
                
                # USB 감지 시 WiFi 전환
                usb_devices = self.get_usb_devices()
                if usb_devices:
                    logger.warning(f"⚠️ USB 디바이스 감지: {len(usb_devices)}대 -> WiFi 전환 시도")
                    self.convert_all_usb_to_wifi()
                
            except Exception as e:
                logger.error(f"Heartbeat 오류: {e}")
            
            await asyncio.sleep(self.heartbeat_interval)
    
    async def _reconnect_loop(self):
        """재연결 루프 (비동기)"""
        while self._running:
            try:
                self.reconnect_offline_devices()
            except Exception as e:
                logger.error(f"Reconnect 오류: {e}")
            
            await asyncio.sleep(self.reconnect_interval)
    
    async def _health_check_loop(self):
        """전체 헬스체크 루프 (비동기)"""
        while self._running:
            try:
                # 자동 발견
                self.auto_discover()
                
                # 전체 헬스체크
                self.pulse_all()
                
                # 상태 요약 로깅
                summary = self.get_status_summary()
                logger.info(
                    f"📊 상태 요약: "
                    f"온라인 {summary['online']}/{summary['total']}, "
                    f"건강 {summary['healthy']}, "
                    f"경고 {summary['warning']}, "
                    f"위험 {summary['critical']}"
                )
                
            except Exception as e:
                logger.error(f"Health check 오류: {e}")
            
            await asyncio.sleep(self.health_check_interval)
    
    async def start_async(self):
        """비동기 모니터링 시작"""
        if self._running:
            return
        
        self._running = True
        logger.info("🚀 Heartbeat 모니터링 시작")
        logger.info(f"   - Heartbeat 주기: {self.heartbeat_interval}초")
        logger.info(f"   - 재연결 주기: {self.reconnect_interval}초")
        logger.info(f"   - 헬스체크 주기: {self.health_check_interval}초")
        
        # 초기 발견
        self.auto_discover()
        
        # 루프 시작
        await asyncio.gather(
            self._heartbeat_loop(),
            self._reconnect_loop(),
            self._health_check_loop()
        )
    
    def start(self):
        """동기 모니터링 시작 (별도 스레드)"""
        if self._running:
            return
        
        def run_async():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.start_async())
        
        self._running = True
        thread = threading.Thread(target=run_async, daemon=True)
        thread.start()
        
        logger.info("🚀 Heartbeat 모니터링 시작 (백그라운드)")
    
    def stop(self):
        """모니터링 중지"""
        self._running = False
        logger.info("🛑 Heartbeat 모니터링 중지")


# ==================== 싱글톤 인스턴스 ====================

_heartbeat_manager: Optional[HeartbeatManager] = None


def get_heartbeat_manager() -> HeartbeatManager:
    """HeartbeatManager 싱글톤 인스턴스"""
    global _heartbeat_manager
    if _heartbeat_manager is None:
        _heartbeat_manager = HeartbeatManager()
    return _heartbeat_manager


# ==================== 편의 함수 ====================

def start_monitoring(ips: Optional[List[str]] = None):
    """모니터링 시작"""
    manager = get_heartbeat_manager()
    
    if ips:
        manager.add_devices(ips)
    
    manager.start()
    return manager


def stop_monitoring():
    """모니터링 중지"""
    manager = get_heartbeat_manager()
    manager.stop()


def get_status_summary() -> Dict[str, Any]:
    """상태 요약 조회"""
    manager = get_heartbeat_manager()
    return manager.get_status_summary()

