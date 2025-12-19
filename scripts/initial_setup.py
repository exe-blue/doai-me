"""
AIFarm 최초 세팅 스크립트
USB 연결된 디바이스를 TCP(WiFi) 모드로 전환합니다.

주의: 이 스크립트는 최초 세팅 시에만 실행합니다.
      이후에는 모든 연결이 WiFi(TCP)로만 이루어집니다.
      
사용법:
  1. USB로 디바이스들을 연결합니다.
  2. 이 스크립트를 실행합니다.
  3. 디바이스들이 TCP 모드로 전환됩니다.
  4. USB 케이블을 분리하고 WiFi로 연결합니다.
"""

import subprocess
import re
import sys
import time
from typing import Dict, List, Tuple

# ADB 경로
ADB_PATH = r"C:\Program Files (x86)\xinhui\tools\adb.exe"

# TCP 포트 (고정)
TCP_PORT = 5555


def get_all_devices() -> Tuple[List[str], List[str]]:
    """
    모든 연결된 디바이스 조회
    
    Returns:
        (USB 디바이스 리스트, TCP 디바이스 리스트)
    """
    try:
        result = subprocess.run(
            [ADB_PATH, "devices"],
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
        
        return usb_devices, tcp_devices
        
    except Exception as e:
        print(f"오류: {e}")
        return [], []


def get_device_ip(serial: str) -> str:
    """USB 디바이스의 WiFi IP 주소 조회"""
    try:
        result = subprocess.run(
            [ADB_PATH, "-s", serial, "shell", "ip addr show wlan0"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            match = re.search(r'inet (\d+\.\d+\.\d+\.\d+)', result.stdout)
            if match:
                return match.group(1)
        
        return None
        
    except Exception:
        return None


def enable_tcp_mode(serial: str) -> bool:
    """디바이스를 TCP 모드로 전환"""
    try:
        result = subprocess.run(
            [ADB_PATH, "-s", serial, "tcpip", str(TCP_PORT)],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except Exception:
        return False


def connect_tcp(ip: str) -> bool:
    """TCP로 연결"""
    try:
        address = f"{ip}:{TCP_PORT}"
        result = subprocess.run(
            [ADB_PATH, "connect", address],
            capture_output=True,
            text=True,
            timeout=10
        )
        return "connected" in result.stdout.lower()
    except Exception:
        return False


def main():
    print("=" * 70)
    print("AIFarm 최초 세팅: USB -> TCP 모드 전환")
    print("=" * 70)
    print(f"ADB 경로: {ADB_PATH}")
    print(f"TCP 포트: {TCP_PORT}")
    print()
    print("주의: 이 스크립트는 최초 세팅 시에만 실행합니다.")
    print("      이후에는 모든 연결이 WiFi(TCP)로만 이루어집니다.")
    print("=" * 70)
    
    # 현재 연결 상태 확인
    usb_devices, tcp_devices = get_all_devices()
    
    print(f"\n현재 연결 상태:")
    print(f"  USB 연결: {len(usb_devices)}대")
    print(f"  TCP 연결: {len(tcp_devices)}대")
    
    if not usb_devices:
        print("\nUSB 연결된 디바이스가 없습니다.")
        if tcp_devices:
            print("이미 TCP 모드로 연결되어 있습니다.")
            print("\n연결된 TCP 디바이스:")
            for device in tcp_devices:
                print(f"  - {device}")
        return
    
    # USB 디바이스 정보 표시
    print("\nUSB 연결된 디바이스:")
    device_info = {}
    
    for serial in usb_devices:
        ip = get_device_ip(serial)
        device_info[serial] = ip
        if ip:
            print(f"  {serial} -> WiFi IP: {ip}")
        else:
            print(f"  {serial} -> WiFi IP: 확인 불가 (WiFi 연결 필요)")
    
    # 사용자 확인
    print("\n" + "-" * 70)
    response = input("TCP 모드로 전환하시겠습니까? (y/n): ").strip().lower()
    
    if response != 'y':
        print("취소되었습니다.")
        return
    
    # TCP 모드 전환
    print("\nTCP 모드 전환 중...")
    print("-" * 70)
    
    results = {}
    
    for serial in usb_devices:
        ip = device_info.get(serial)
        
        print(f"\n[{serial}]")
        
        # TCP 모드 활성화
        print("  1. TCP 모드 활성화...", end=" ")
        if enable_tcp_mode(serial):
            print("OK")
        else:
            print("실패")
            results[serial] = False
            continue
        
        time.sleep(1)  # 모드 전환 대기
        
        # WiFi IP가 있으면 TCP 연결 시도
        if ip:
            print(f"  2. TCP 연결 시도 ({ip}:{TCP_PORT})...", end=" ")
            if connect_tcp(ip):
                print("OK")
                results[serial] = True
            else:
                print("실패 (나중에 수동 연결 필요)")
                results[serial] = True  # TCP 모드는 활성화됨
        else:
            print("  2. WiFi IP 없음 - 나중에 수동 연결 필요")
            results[serial] = True
    
    # 결과 요약
    print("\n" + "=" * 70)
    print("전환 결과")
    print("=" * 70)
    
    success = sum(results.values())
    print(f"성공: {success}/{len(usb_devices)}")
    
    print("\n다음 단계:")
    print("  1. USB 케이블을 분리합니다.")
    print("  2. 디바이스가 WiFi에 연결되어 있는지 확인합니다.")
    print(f"  3. 'adb connect <IP>:{TCP_PORT}' 명령으로 연결합니다.")
    print("  4. test_device_control.py를 실행하여 연결을 확인합니다.")
    
    # 연결 명령어 출력
    print("\n연결 명령어:")
    for serial, ip in device_info.items():
        if ip:
            print(f"  adb connect {ip}:{TCP_PORT}")
    
    print("\n" + "=" * 70)
    print("최초 세팅 완료!")
    print("이제부터 모든 연결은 TCP(WiFi)로만 이루어집니다.")
    print("=" * 70)


if __name__ == "__main__":
    main()

