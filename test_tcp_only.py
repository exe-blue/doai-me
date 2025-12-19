"""
AIFarm TCP 전용 모드 테스트
uiautomator2 없이 ADB 직접 사용
"""

import subprocess
import re
import time
from typing import List, Dict, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from enum import Enum


# ADB 경로 및 TCP 포트 (고정)
ADB_PATH = r"C:\Program Files (x86)\xinhui\tools\adb.exe"
TCP_PORT = 5555


class ConnectionType(Enum):
    TCP = "tcp"
    USB = "usb"
    UNKNOWN = "unknown"


class USBConnectionError(Exception):
    """USB 연결 오류"""
    pass


@dataclass
class DeviceInfo:
    device_id: str
    connection_type: ConnectionType
    ip: Optional[str] = None
    
    @property
    def is_tcp(self) -> bool:
        return self.connection_type == ConnectionType.TCP


def detect_connection_type(device_id: str) -> Tuple[ConnectionType, Optional[str]]:
    """디바이스 ID에서 연결 타입 감지"""
    # TCP 패턴 (IP:PORT)
    tcp_match = re.match(r'^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)$', device_id)
    if tcp_match:
        return ConnectionType.TCP, tcp_match.group(1)
    
    # USB 패턴 (영숫자)
    if re.match(r'^[a-zA-Z0-9]+$', device_id):
        return ConnectionType.USB, None
    
    return ConnectionType.UNKNOWN, None


def validate_tcp_only(device_id: str) -> str:
    """TCP 연결만 허용"""
    conn_type, ip = detect_connection_type(device_id)
    
    if conn_type == ConnectionType.USB:
        raise USBConnectionError(
            f"USB 연결 감지: {device_id}\n"
            f"WiFi(TCP) 연결만 허용됩니다."
        )
    
    if conn_type == ConnectionType.TCP:
        return ip
    
    raise ValueError(f"알 수 없는 형식: {device_id}")


def run_adb(args: List[str], timeout: int = 30) -> Tuple[bool, str]:
    """ADB 명령 실행"""
    try:
        result = subprocess.run(
            [ADB_PATH] + args,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.returncode == 0, result.stdout.strip()
    except Exception as e:
        return False, str(e)


def get_tcp_devices() -> List[DeviceInfo]:
    """TCP 연결된 디바이스만 반환"""
    success, output = run_adb(["devices"])
    
    if not success:
        return []
    
    devices = []
    usb_count = 0
    
    for line in output.split('\n')[1:]:
        if line.strip() and '\tdevice' in line:
            device_id = line.split('\t')[0]
            conn_type, ip = detect_connection_type(device_id)
            
            if conn_type == ConnectionType.TCP:
                devices.append(DeviceInfo(
                    device_id=device_id,
                    connection_type=conn_type,
                    ip=ip
                ))
            elif conn_type == ConnectionType.USB:
                usb_count += 1
    
    if usb_count > 0:
        print(f"  [경고] USB 연결 {usb_count}대 감지됨 (무시됨)")
    
    return devices


def execute_on_device(ip: str, command: str) -> Optional[str]:
    """디바이스에서 shell 명령 실행"""
    address = f"{ip}:{TCP_PORT}"
    
    # TCP 검증
    try:
        validate_tcp_only(address)
    except USBConnectionError as e:
        print(f"  [오류] {e}")
        return None
    
    success, output = run_adb(["-s", address, "shell", command])
    return output if success else None


def tap(ip: str, x: int, y: int) -> bool:
    """화면 탭"""
    result = execute_on_device(ip, f"input tap {x} {y}")
    return result is not None


def swipe(ip: str, x1: int, y1: int, x2: int, y2: int, duration: int = 300) -> bool:
    """화면 스와이프"""
    result = execute_on_device(ip, f"input swipe {x1} {y1} {x2} {y2} {duration}")
    return result is not None


def press_key(ip: str, keycode: str) -> bool:
    """키 입력"""
    result = execute_on_device(ip, f"input keyevent {keycode}")
    return result is not None


def wake_screen(ip: str) -> bool:
    return press_key(ip, "KEYCODE_WAKEUP")


def press_home(ip: str) -> bool:
    return press_key(ip, "KEYCODE_HOME")


def input_text(ip: str, text: str) -> bool:
    safe_text = text.replace(" ", "%s")
    result = execute_on_device(ip, f"input text {safe_text}")
    return result is not None


def screenshot(ip: str, save_path: str) -> bool:
    """스크린샷 저장"""
    address = f"{ip}:{TCP_PORT}"
    
    # 디바이스에서 캡처
    success, _ = run_adb(["-s", address, "shell", "screencap", "-p", "/sdcard/screen.png"])
    if not success:
        return False
    
    # PC로 복사
    success, _ = run_adb(["-s", address, "pull", "/sdcard/screen.png", save_path])
    return success


def get_device_info(ip: str) -> Dict[str, str]:
    """디바이스 정보 조회"""
    info = {"ip": ip}
    
    # 모델
    model = execute_on_device(ip, "getprop ro.product.model")
    info["model"] = model or "Unknown"
    
    # Android 버전
    version = execute_on_device(ip, "getprop ro.build.version.release")
    info["android_version"] = version or "Unknown"
    
    # 배터리
    battery = execute_on_device(ip, "dumpsys battery | grep level")
    if battery:
        info["battery"] = battery.split(":")[-1].strip() + "%"
    else:
        info["battery"] = "Unknown"
    
    return info


def test_usb_rejection():
    """USB 연결 거부 테스트"""
    print("\n[테스트] USB 연결 거부...")
    print("-" * 50)
    
    fake_serial = "ABC123DEF456"
    
    try:
        validate_tcp_only(fake_serial)
        print("  [실패] USB가 허용되었습니다!")
        return False
    except USBConnectionError:
        print("  [성공] USB 연결이 거부되었습니다")
        return True


def main():
    print("=" * 60)
    print("AIFarm TCP 전용 모드 테스트")
    print("=" * 60)
    print(f"ADB 경로: {ADB_PATH}")
    print(f"TCP 포트: {TCP_PORT} (고정)")
    print("모드: WiFi(TCP) 전용")
    print("=" * 60)
    
    # 1. USB 거부 테스트
    test_usb_rejection()
    
    # 2. TCP 디바이스 조회
    print("\n[1] TCP 디바이스 조회...")
    print("-" * 50)
    
    devices = get_tcp_devices()
    
    if not devices:
        print("  TCP 연결된 디바이스가 없습니다.")
        print("  USB 디바이스가 있다면 scripts/initial_setup.py를 실행하세요.")
        return
    
    print(f"  TCP 연결: {len(devices)}대")
    for d in devices:
        print(f"    - {d.ip}:{TCP_PORT}")
    
    ips = [d.ip for d in devices if d.ip]
    
    # 3. 디바이스 정보
    print("\n[2] 디바이스 정보 조회...")
    print("-" * 50)
    
    for ip in ips[:6]:
        info = get_device_info(ip)
        print(f"  {ip}:{TCP_PORT}")
        print(f"    모델: {info['model']}")
        print(f"    Android: {info['android_version']}")
        print(f"    배터리: {info['battery']}")
    
    # 4. 병렬 제어 테스트
    print("\n[3] 병렬 제어 테스트...")
    print("-" * 50)
    
    test_ips = ips[:6]
    
    # 화면 켜기
    print("  화면 켜기...", end=" ")
    results = {}
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(wake_screen, ip): ip for ip in test_ips}
        for future in as_completed(futures):
            ip = futures[future]
            results[ip] = future.result()
    print(f"성공: {sum(results.values())}/{len(results)}")
    
    time.sleep(0.5)
    
    # 홈 버튼
    print("  홈 버튼...", end=" ")
    results = {}
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(press_home, ip): ip for ip in test_ips}
        for future in as_completed(futures):
            ip = futures[future]
            results[ip] = future.result()
    print(f"성공: {sum(results.values())}/{len(results)}")
    
    time.sleep(0.5)
    
    # 스와이프
    print("  스와이프 (위로)...", end=" ")
    results = {}
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(swipe, ip, 540, 1500, 540, 500, 500): ip for ip in test_ips}
        for future in as_completed(futures):
            ip = futures[future]
            results[ip] = future.result()
    print(f"성공: {sum(results.values())}/{len(results)}")
    
    time.sleep(0.5)
    
    # 탭
    print("  탭 (중앙)...", end=" ")
    results = {}
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(tap, ip, 540, 1000): ip for ip in test_ips}
        for future in as_completed(futures):
            ip = futures[future]
            results[ip] = future.result()
    print(f"성공: {sum(results.values())}/{len(results)}")
    
    # 5. 스크린샷
    print("\n[4] 스크린샷 테스트...")
    print("-" * 50)
    
    if test_ips:
        ip = test_ips[0]
        safe_ip = ip.replace(".", "_")
        path = f"D:\\exe-blue\\aifarm\\tcp_test_{safe_ip}.png"
        
        if screenshot(ip, path):
            print(f"  [성공] {path}")
        else:
            print("  [실패]")
    
    print("\n" + "=" * 60)
    print("테스트 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()

