"""
AIFarm 디바이스 제어 테스트 스크립트 (TCP 전용)
WiFi 연결된 디바이스에서만 동작합니다.
USB 연결은 오류로 처리됩니다.
"""

import time
import sys
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed

# 프로젝트 모듈 임포트
sys.path.insert(0, r"D:\exe-blue\aifarm")

from src.controller.adb_controller import (
    ADBController, 
    ADB_TCP_PORT,
    USBConnectionError,
    setup_tcp_mode,
    get_wifi_ips_from_usb
)


def test_tcp_only_mode():
    """TCP 전용 모드 테스트"""
    print("=" * 60)
    print("AIFarm TCP 전용 모드 테스트")
    print(f"ADB over TCP 포트: {ADB_TCP_PORT}")
    print("=" * 60)
    
    adb = ADBController()
    
    # 1. 연결된 디바이스 확인 (TCP만)
    print("\n[1] TCP 연결 디바이스 조회...")
    tcp_devices = adb.get_tcp_devices()
    
    if not tcp_devices:
        print("  -> TCP 연결된 디바이스가 없습니다.")
        print("  -> USB 연결 디바이스가 있다면 setup_tcp_mode()를 먼저 실행하세요.")
        return False
    
    print(f"  -> TCP 연결 디바이스: {len(tcp_devices)}대")
    for device in tcp_devices:
        print(f"     {device.ip}:{device.port}")
    
    return tcp_devices


def test_device_info(adb: ADBController, ips: List[str]):
    """디바이스 정보 조회 테스트"""
    print("\n[2] 디바이스 정보 조회...")
    print("-" * 50)
    
    for ip in ips[:6]:  # 최대 6대만
        info = adb.get_device_info(ip)
        print(f"  {ip}:{ADB_TCP_PORT}")
        print(f"    모델: {info.get('model', 'Unknown')}")
        print(f"    Android: {info.get('android_version', 'Unknown')}")
        print(f"    배터리: {info.get('battery', 'Unknown')}")
        print()


def test_parallel_control(adb: ADBController, ips: List[str]):
    """병렬 제어 테스트"""
    print("\n[3] 병렬 제어 테스트...")
    print("-" * 50)
    
    # 화면 켜기
    print("  화면 켜기...")
    results = {}
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(adb.wake_screen, ip): ip for ip in ips[:6]}
        for future in as_completed(futures):
            ip = futures[future]
            results[ip] = future.result()
    
    success = sum(results.values())
    print(f"  -> 성공: {success}/{len(results)}")
    
    time.sleep(0.5)
    
    # 홈 버튼
    print("  홈 버튼...")
    results = {}
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(adb.press_home, ip): ip for ip in ips[:6]}
        for future in as_completed(futures):
            ip = futures[future]
            results[ip] = future.result()
    
    success = sum(results.values())
    print(f"  -> 성공: {success}/{len(results)}")
    
    time.sleep(0.5)
    
    # 스와이프
    print("  스와이프 (위로)...")
    results = {}
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(adb.swipe, ip, 540, 1500, 540, 500, 500): ip 
            for ip in ips[:6]
        }
        for future in as_completed(futures):
            ip = futures[future]
            results[ip] = future.result()
    
    success = sum(results.values())
    print(f"  -> 성공: {success}/{len(results)}")


def test_usb_rejection():
    """USB 연결 거부 테스트"""
    print("\n[4] USB 연결 거부 테스트...")
    print("-" * 50)
    
    adb = ADBController()
    
    # 가짜 USB 시리얼로 테스트
    fake_usb_serial = "ABC123DEF456"
    
    try:
        adb._validate_tcp_only(fake_usb_serial)
        print(f"  -> 오류! USB 연결이 허용되었습니다.")
        return False
    except USBConnectionError as e:
        print(f"  -> 정상! USB 연결 거부됨")
        print(f"     메시지: {str(e)[:60]}...")
        return True


def test_screenshot(adb: ADBController, ip: str):
    """스크린샷 테스트"""
    print("\n[5] 스크린샷 테스트...")
    print("-" * 50)
    
    safe_ip = ip.replace(".", "_")
    path = f"D:\\exe-blue\\aifarm\\test_tcp_{safe_ip}.png"
    
    success = adb.screenshot(ip, path)
    
    if success:
        print(f"  -> 성공: {path}")
    else:
        print(f"  -> 실패")
    
    return success


def main():
    print("\n" + "=" * 60)
    print("AIFarm ADB over TCP 테스트")
    print("=" * 60)
    print(f"포트: {ADB_TCP_PORT} (고정)")
    print("모드: WiFi(TCP) 전용")
    print("=" * 60)
    
    # ADB 컨트롤러 생성
    adb = ADBController()
    
    # 1. TCP 디바이스 확인
    tcp_devices = test_tcp_only_mode()
    
    if not tcp_devices:
        print("\n" + "=" * 60)
        print("TCP 디바이스가 없습니다.")
        print("USB 디바이스를 TCP 모드로 전환하시겠습니까?")
        print("=" * 60)
        
        response = input("전환하려면 'y' 입력: ").strip().lower()
        if response == 'y':
            setup_tcp_mode()
        return
    
    # IP 목록 추출
    ips = [d.ip for d in tcp_devices if d.ip]
    
    # 2. 디바이스 정보 조회
    test_device_info(adb, ips)
    
    # 3. 병렬 제어 테스트
    test_parallel_control(adb, ips)
    
    # 4. USB 거부 테스트
    test_usb_rejection()
    
    # 5. 스크린샷 테스트
    if ips:
        test_screenshot(adb, ips[0])
    
    print("\n" + "=" * 60)
    print("테스트 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()
