"""
디바이스 제어 모듈 (ADB over TCP 전용)

모든 연결은 WiFi(TCP)로만 이루어집니다.
USB 연결은 최초 세팅 시에만 사용됩니다.
포트: 5555 (고정)

Heartbeat 시스템으로 디바이스 상태를 주기적으로 확인합니다.
"""

from src.controller.device_manager import (
    DeviceManager,
    validate_tcp_address,
    format_device_address,
    get_xinhui,
    get_hybrid
)

from src.controller.adb_controller import (
    ADBController,
    ADB_TCP_PORT,
    ConnectionType,
    DeviceInfo,
    ConnectionError,
    USBConnectionError,
    setup_tcp_mode,
    get_wifi_ips_from_usb
)

from src.controller.heartbeat import (
    HeartbeatManager,
    DeviceStatus,
    HealthLevel,
    DeviceHealth,
    DeviceHealthStandard,
    HeartbeatResult,
    get_heartbeat_manager,
    start_monitoring,
    stop_monitoring,
    get_status_summary,
)

# 편의를 위한 기본 인스턴스 생성 함수
def get_device_manager(wait_timeout: int = 5) -> DeviceManager:
    """DeviceManager 인스턴스 생성"""
    return DeviceManager(wait_timeout=wait_timeout)


def get_adb_controller() -> ADBController:
    """ADBController 인스턴스 생성"""
    return ADBController()


__all__ = [
    # 메인 클래스
    'DeviceManager',
    'ADBController',
    'HeartbeatManager',
    
    # 상수
    'ADB_TCP_PORT',
    
    # 타입/Enum
    'ConnectionType',
    'DeviceInfo',
    'DeviceStatus',
    'HealthLevel',
    'DeviceHealth',
    'DeviceHealthStandard',
    'HeartbeatResult',
    
    # 예외
    'ConnectionError',
    'USBConnectionError',
    
    # 유틸리티 함수
    'validate_tcp_address',
    'format_device_address',
    'setup_tcp_mode',
    'get_wifi_ips_from_usb',
    
    # 인스턴스 생성 함수
    'get_device_manager',
    'get_adb_controller',
    'get_heartbeat_manager',
    
    # Heartbeat 편의 함수
    'start_monitoring',
    'stop_monitoring',
    'get_status_summary',
    
    # xinhui 관련
    'get_xinhui',
    'get_hybrid',
]
