"""
Heartbeat/Keep-Alive 시스템 테스트

디바이스 상태 표준:
- 연결: TCP(WiFi) - IP:5555 형식
- 배터리: 20% 이상 (경고), 10% 이상 (위험)
- 온도: 40°C 이하 (경고), 50°C 이하 (위험)
- 응답시간: 5초 이내
- 화면: 켜짐 상태
"""

import time
import sys
import os
from datetime import datetime

# 직접 heartbeat 모듈 임포트 (uiautomator2 의존성 회피)
sys.path.insert(0, r"D:\exe-blue\aifarm")

# heartbeat 모듈 직접 임포트
import importlib.util
spec = importlib.util.spec_from_file_location(
    "heartbeat", 
    r"D:\exe-blue\aifarm\src\controller\heartbeat.py"
)
heartbeat_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(heartbeat_module)

HeartbeatManager = heartbeat_module.HeartbeatManager
DeviceStatus = heartbeat_module.DeviceStatus
HealthLevel = heartbeat_module.HealthLevel
ConnectionType = heartbeat_module.ConnectionType
DeviceHealthStandard = heartbeat_module.DeviceHealthStandard
get_heartbeat_manager = heartbeat_module.get_heartbeat_manager


def print_header(title: str):
    """헤더 출력"""
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def print_device_health(ip: str, health):
    """디바이스 건강 상태 출력"""
    status_icon = {
        DeviceStatus.ONLINE: "🟢",
        DeviceStatus.OFFLINE: "🔴",
        DeviceStatus.RECONNECTING: "🟡",
        DeviceStatus.USB_DETECTED: "🟠",
        DeviceStatus.ERROR: "❌",
        DeviceStatus.UNKNOWN: "❓",
    }
    
    health_icon = {
        HealthLevel.HEALTHY: "✅",
        HealthLevel.WARNING: "⚠️",
        HealthLevel.CRITICAL: "🚨",
        HealthLevel.UNKNOWN: "❓",
    }
    
    icon = status_icon.get(health.status, "❓")
    h_icon = health_icon.get(health.health_level, "❓")
    
    print(f"\n  {icon} {ip}:5555")
    print(f"     상태: {health.status.value} | 건강: {h_icon} {health.health_level.value}")
    print(f"     연결: {health.connection_type.value}")
    
    if health.battery_level is not None:
        battery_bar = "█" * (health.battery_level // 10) + "░" * (10 - health.battery_level // 10)
        print(f"     배터리: [{battery_bar}] {health.battery_level}% ({health.battery_status or 'unknown'})")
    
    if health.temperature is not None:
        temp_status = "정상" if health.temperature < 40 else ("경고" if health.temperature < 50 else "위험")
        print(f"     온도: {health.temperature}°C ({temp_status})")
    
    if health.wifi_rssi is not None:
        signal = "강함" if health.wifi_rssi > -50 else ("보통" if health.wifi_rssi > -70 else "약함")
        print(f"     WiFi: {health.wifi_rssi} dBm ({signal})")
    
    if health.response_time_ms is not None:
        print(f"     응답: {health.response_time_ms}ms")
    
    if health.model:
        print(f"     모델: {health.model} (Android {health.android_version or 'unknown'})")


def test_health_standard():
    """디바이스 상태 표준 테스트"""
    print_header("디바이스 상태 표준")
    
    standard = DeviceHealthStandard()
    
    print("\n  [정상 상태 기준]")
    print(f"  ├─ 연결 타입: {standard.connection_type.value} (WiFi)")
    print(f"  ├─ 배터리 경고: {standard.battery_min}% 이하")
    print(f"  ├─ 배터리 위험: {standard.battery_critical}% 이하")
    print(f"  ├─ 온도 경고: {standard.temperature_max}°C 이상")
    print(f"  ├─ 온도 위험: {standard.temperature_critical}°C 이상")
    print(f"  ├─ 최대 응답시간: {standard.max_response_time_ms}ms")
    print(f"  └─ 화면 상태: {'켜짐' if standard.screen_on else '꺼짐'}")


def test_device_discovery():
    """디바이스 발견 테스트"""
    print_header("디바이스 발견")
    
    manager = HeartbeatManager()
    
    # 연결된 디바이스 조회
    devices = manager.get_connected_devices()
    
    tcp_count = sum(1 for conn in devices.values() if conn == ConnectionType.TCP)
    usb_count = sum(1 for conn in devices.values() if conn == ConnectionType.USB)
    
    print(f"\n  TCP(WiFi) 연결: {tcp_count}대")
    print(f"  USB 연결: {usb_count}대 {'⚠️ WiFi 전환 필요' if usb_count > 0 else ''}")
    
    # TCP 디바이스 목록
    tcp_devices = manager.get_tcp_devices()
    if tcp_devices:
        print("\n  [TCP 디바이스 목록]")
        for ip in tcp_devices:
            print(f"    - {ip}:5555")
    
    # USB 디바이스 목록 (경고)
    usb_devices = manager.get_usb_devices()
    if usb_devices:
        print("\n  [USB 디바이스 목록] ⚠️")
        for serial in usb_devices:
            print(f"    - {serial} (WiFi 전환 필요)")
    
    return tcp_devices, usb_devices


def test_heartbeat_pulse(manager: HeartbeatManager, ips: list):
    """Heartbeat Pulse 테스트"""
    print_header("Heartbeat Pulse")
    
    print(f"\n  {len(ips)}대 디바이스 상태 확인 중...")
    
    # 디바이스 등록
    manager.add_devices(ips)
    
    # Pulse 실행
    start = time.time()
    results = manager.pulse_all(ips)
    elapsed = time.time() - start
    
    print(f"  완료! ({elapsed:.2f}초)")
    
    # 결과 출력
    success_count = sum(1 for r in results.values() if r.success)
    print(f"\n  성공: {success_count}/{len(results)}")
    
    for ip, result in results.items():
        if result.health:
            print_device_health(ip, result.health)


def test_usb_detection(manager: HeartbeatManager, usb_devices: list):
    """USB 감지 및 WiFi 전환 테스트"""
    if not usb_devices:
        print_header("USB -> WiFi 전환")
        print("\n  USB 연결된 디바이스가 없습니다.")
        return
    
    print_header("USB -> WiFi 전환")
    
    print(f"\n  USB 디바이스 {len(usb_devices)}대 감지됨")
    print("  WiFi로 전환하시겠습니까?")
    
    response = input("  전환하려면 'y' 입력: ").strip().lower()
    
    if response != 'y':
        print("  취소됨")
        return
    
    print("\n  전환 중...")
    results = manager.convert_all_usb_to_wifi()
    
    for serial, wifi_ip in results.items():
        if wifi_ip:
            print(f"    ✅ {serial} -> {wifi_ip}:5555")
        else:
            print(f"    ❌ {serial} -> 실패")


def test_status_summary(manager: HeartbeatManager):
    """상태 요약 테스트"""
    print_header("상태 요약")
    
    summary = manager.get_status_summary()
    
    print(f"\n  [연결 상태]")
    print(f"  ├─ 전체: {summary['total']}대")
    print(f"  ├─ 온라인: {summary['online']}대")
    print(f"  ├─ 오프라인: {summary['offline']}대")
    print(f"  ├─ 재연결 중: {summary['reconnecting']}대")
    print(f"  └─ USB 감지: {summary['usb_detected']}대")
    
    print(f"\n  [건강 상태]")
    print(f"  ├─ 정상: {summary['healthy']}대")
    print(f"  ├─ 경고: {summary['warning']}대")
    print(f"  └─ 위험: {summary['critical']}대")
    
    if summary['avg_battery'] is not None:
        print(f"\n  [평균 수치]")
        print(f"  ├─ 배터리: {summary['avg_battery']:.1f}%")
        if summary['avg_temperature'] is not None:
            print(f"  ├─ 온도: {summary['avg_temperature']:.1f}°C")
        if summary['avg_response_time_ms'] is not None:
            print(f"  └─ 응답시간: {summary['avg_response_time_ms']:.0f}ms")
    
    stats = summary.get('stats', {})
    print(f"\n  [통계]")
    print(f"  ├─ 총 Heartbeat: {stats.get('total_heartbeats', 0)}")
    print(f"  ├─ 성공: {stats.get('successful_heartbeats', 0)}")
    print(f"  ├─ 실패: {stats.get('failed_heartbeats', 0)}")
    print(f"  ├─ 재연결 시도: {stats.get('reconnect_attempts', 0)}")
    print(f"  └─ USB 감지: {stats.get('usb_detections', 0)}")


def test_continuous_monitoring(manager: HeartbeatManager, duration: int = 60):
    """연속 모니터링 테스트"""
    print_header(f"연속 모니터링 ({duration}초)")
    
    print("\n  모니터링 시작...")
    print("  Ctrl+C로 중지")
    
    # 콜백 설정
    def on_status_change(ip, old_status, new_status):
        print(f"  [{datetime.now().strftime('%H:%M:%S')}] {ip}: {old_status.value} -> {new_status.value}")
    
    def on_health_warning(ip, health):
        print(f"  [{datetime.now().strftime('%H:%M:%S')}] ⚠️ {ip}: {health.health_level.value}")
    
    manager.on_status_change(on_status_change)
    manager.on_health_warning(on_health_warning)
    
    # 모니터링 시작
    manager.start()
    
    try:
        start = time.time()
        while time.time() - start < duration:
            time.sleep(5)
            
            # 상태 출력
            summary = manager.get_status_summary()
            online = summary['online']
            total = summary['total']
            healthy = summary['healthy']
            
            elapsed = int(time.time() - start)
            print(f"  [{elapsed}s] 온라인: {online}/{total}, 정상: {healthy}")
            
    except KeyboardInterrupt:
        print("\n  중지됨")
    
    manager.stop()


def main():
    print("\n" + "=" * 60)
    print(" AIFarm Heartbeat/Keep-Alive 테스트")
    print("=" * 60)
    print(f" 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f" TCP 포트: 5555 (고정)")
    print("=" * 60)
    
    manager = HeartbeatManager(
        heartbeat_interval=10,  # 테스트용: 10초
        reconnect_interval=30,
        health_check_interval=60
    )
    
    # 1. 상태 표준 출력
    test_health_standard()
    
    # 2. 디바이스 발견
    tcp_devices, usb_devices = test_device_discovery()
    
    if not tcp_devices and not usb_devices:
        print("\n연결된 디바이스가 없습니다.")
        return
    
    # 3. USB -> WiFi 전환 (필요 시)
    if usb_devices:
        test_usb_detection(manager, usb_devices)
        # 전환 후 다시 발견
        tcp_devices = manager.get_tcp_devices()
    
    if not tcp_devices:
        print("\nTCP 연결된 디바이스가 없습니다.")
        return
    
    # 4. Heartbeat Pulse
    test_heartbeat_pulse(manager, tcp_devices)
    
    # 5. 상태 요약
    test_status_summary(manager)
    
    # 6. 연속 모니터링 (옵션)
    print("\n" + "-" * 60)
    response = input("연속 모니터링을 시작하시겠습니까? (y/n): ").strip().lower()
    
    if response == 'y':
        try:
            duration = int(input("모니터링 시간 (초, 기본 60): ").strip() or "60")
        except ValueError:
            duration = 60
        
        test_continuous_monitoring(manager, duration)
    
    print("\n" + "=" * 60)
    print(" 테스트 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()

