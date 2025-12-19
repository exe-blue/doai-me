"""
Heartbeat/Keep-Alive 시스템 자동 테스트 (비대화형)
"""

import time
import sys
import importlib.util
from datetime import datetime

# heartbeat 모듈 직접 임포트
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


def print_header(title: str):
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def main():
    print("\n" + "=" * 60)
    print(" AIFarm Heartbeat 자동 테스트")
    print("=" * 60)
    print(f" 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f" TCP 포트: 5555 (고정)")
    print("=" * 60)
    
    manager = HeartbeatManager()
    
    # 1. 디바이스 상태 표준
    print_header("디바이스 상태 표준")
    standard = DeviceHealthStandard()
    print(f"\n  연결: {standard.connection_type.value} (WiFi)")
    print(f"  배터리 경고: {standard.battery_min}% 이하")
    print(f"  배터리 위험: {standard.battery_critical}% 이하")
    print(f"  온도 경고: {standard.temperature_max}C 이상")
    print(f"  온도 위험: {standard.temperature_critical}C 이상")
    print(f"  최대 응답시간: {standard.max_response_time_ms}ms")
    
    # 2. 디바이스 발견
    print_header("디바이스 발견")
    
    devices = manager.get_connected_devices()
    tcp_count = sum(1 for c in devices.values() if c == ConnectionType.TCP)
    usb_count = sum(1 for c in devices.values() if c == ConnectionType.USB)
    
    print(f"\n  TCP(WiFi) 연결: {tcp_count}대")
    print(f"  USB 연결: {usb_count}대 {'[경고: WiFi 전환 필요]' if usb_count > 0 else ''}")
    
    tcp_devices = manager.get_tcp_devices()
    usb_devices = manager.get_usb_devices()
    
    if tcp_devices:
        print("\n  [TCP 디바이스]")
        for ip in tcp_devices:
            print(f"    - {ip}:5555")
    
    if usb_devices:
        print("\n  [USB 디바이스 - 경고]")
        for serial in usb_devices:
            print(f"    - {serial}")
    
    if not tcp_devices:
        print("\n  TCP 연결된 디바이스가 없습니다.")
        return
    
    # 3. Heartbeat Pulse
    print_header("Heartbeat Pulse")
    
    manager.add_devices(tcp_devices)
    
    print(f"\n  {len(tcp_devices)}대 디바이스 상태 확인 중...")
    start = time.time()
    results = manager.pulse_all(tcp_devices)
    elapsed = time.time() - start
    
    success_count = sum(1 for r in results.values() if r.success)
    print(f"  완료! ({elapsed:.2f}초)")
    print(f"  성공: {success_count}/{len(results)}")
    
    # 4. 디바이스별 상세 정보
    print_header("디바이스 상세 정보")
    
    for ip, result in results.items():
        if result.health:
            h = result.health
            status_icon = {"online": "O", "offline": "X", "usb_detected": "!"}
            health_icon = {"healthy": "OK", "warning": "W", "critical": "C"}
            
            s = status_icon.get(h.status.value, "?")
            hl = health_icon.get(h.health_level.value, "?")
            
            print(f"\n  [{s}] {ip}:5555 [{hl}]")
            print(f"      연결: {h.connection_type.value}")
            
            if h.battery_level is not None:
                print(f"      배터리: {h.battery_level}% ({h.battery_status or 'unknown'})")
            
            if h.temperature is not None:
                print(f"      온도: {h.temperature}C")
            
            if h.wifi_rssi is not None:
                print(f"      WiFi: {h.wifi_rssi} dBm")
            
            if h.response_time_ms is not None:
                print(f"      응답: {h.response_time_ms}ms")
            
            if h.model:
                print(f"      모델: {h.model}")
    
    # 5. 상태 요약
    print_header("상태 요약")
    
    summary = manager.get_status_summary()
    
    print(f"\n  [연결]")
    print(f"    전체: {summary['total']}대")
    print(f"    온라인: {summary['online']}대")
    print(f"    오프라인: {summary['offline']}대")
    print(f"    USB 감지: {summary['usb_detected']}대")
    
    print(f"\n  [건강]")
    print(f"    정상: {summary['healthy']}대")
    print(f"    경고: {summary['warning']}대")
    print(f"    위험: {summary['critical']}대")
    
    if summary['avg_battery'] is not None:
        print(f"\n  [평균]")
        print(f"    배터리: {summary['avg_battery']:.1f}%")
        if summary['avg_temperature'] is not None:
            print(f"    온도: {summary['avg_temperature']:.1f}C")
        if summary['avg_response_time_ms'] is not None:
            print(f"    응답: {summary['avg_response_time_ms']:.0f}ms")
    
    # 6. 연속 모니터링 (10초)
    print_header("연속 모니터링 (10초)")
    
    print("\n  모니터링 시작...")
    
    def on_status_change(ip, old, new):
        print(f"    [{datetime.now().strftime('%H:%M:%S')}] {ip}: {old.value} -> {new.value}")
    
    manager.on_status_change(on_status_change)
    manager.start()
    
    for i in range(2):
        time.sleep(5)
        s = manager.get_status_summary()
        print(f"    [{(i+1)*5}s] 온라인: {s['online']}/{s['total']}, 정상: {s['healthy']}")
    
    manager.stop()
    
    print("\n" + "=" * 60)
    print(" 테스트 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()

