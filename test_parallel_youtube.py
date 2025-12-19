"""
AIFarm 병렬 YouTube 검색 테스트
6대 디바이스에서 동시에 서로 다른 검색어로 YouTube 검색을 수행합니다.
"""

import subprocess
import time
import random
from concurrent.futures import ThreadPoolExecutor, as_completed

# ADB 경로 설정
ADB_PATH = r"C:\Program Files (x86)\xinhui\tools\adb.exe"

# WiFi 연결 디바이스 목록
WIFI_DEVICES = [
    "192.168.200.104:5555",
    "192.168.200.132:5555",
    "192.168.200.157:5555",
    "192.168.200.172:5555",
    "192.168.200.193:5555",
    "192.168.200.197:5555",
]

# 각 디바이스에서 검색할 키워드
SEARCH_KEYWORDS = [
    "BTS",
    "BLACKPINK",
    "IVE",
    "NewJeans",
    "aespa",
    "TWICE",
]


def run_adb(device_id: str, command: list) -> tuple[bool, str]:
    """ADB 명령 실행"""
    full_command = [ADB_PATH, "-s", device_id] + command
    try:
        result = subprocess.run(full_command, capture_output=True, text=True, timeout=15)
        return result.returncode == 0, result.stdout.strip()
    except Exception as e:
        return False, str(e)


def youtube_search_flow(device_id: str, keyword: str) -> dict:
    """YouTube 검색 플로우 실행"""
    result = {
        "device": device_id,
        "keyword": keyword,
        "steps": {},
        "success": True
    }
    
    # 1. 화면 켜기
    success, _ = run_adb(device_id, ["shell", "input", "keyevent", "KEYCODE_WAKEUP"])
    result["steps"]["wake"] = success
    time.sleep(0.3)
    
    # 2. 홈으로 이동
    success, _ = run_adb(device_id, ["shell", "input", "keyevent", "KEYCODE_HOME"])
    result["steps"]["home"] = success
    time.sleep(0.5)
    
    # 3. YouTube 앱 실행
    success, _ = run_adb(device_id, [
        "shell", "am", "start", "-n", 
        "com.google.android.youtube/com.google.android.youtube.HomeActivity"
    ])
    result["steps"]["youtube_launch"] = success
    time.sleep(2 + random.uniform(0, 1))  # 랜덤 딜레이
    
    # 4. 검색 버튼 탭
    success, _ = run_adb(device_id, ["shell", "input", "tap", "950", "100"])
    result["steps"]["search_tap"] = success
    time.sleep(1.5 + random.uniform(0, 0.5))
    
    # 5. 검색어 입력
    success, _ = run_adb(device_id, ["shell", "input", "text", keyword])
    result["steps"]["type_keyword"] = success
    time.sleep(0.3)
    
    # 6. 엔터 키
    success, _ = run_adb(device_id, ["shell", "input", "keyevent", "KEYCODE_ENTER"])
    result["steps"]["search_enter"] = success
    time.sleep(2 + random.uniform(0, 1))
    
    # 7. 스크린샷
    safe_device = device_id.replace(":", "_").replace(".", "_")
    screenshot_path = f"D:\\exe-blue\\aifarm\\parallel_{safe_device}_{keyword}.png"
    run_adb(device_id, ["shell", "screencap", "-p", "/sdcard/parallel_test.png"])
    success, _ = run_adb(device_id, ["pull", "/sdcard/parallel_test.png", screenshot_path])
    result["steps"]["screenshot"] = success
    result["screenshot_path"] = screenshot_path
    
    # 전체 성공 여부
    result["success"] = all(result["steps"].values())
    
    return result


def main():
    print("=" * 70)
    print("AIFarm 병렬 YouTube 검색 테스트")
    print("6대 디바이스에서 동시에 서로 다른 K-POP 검색!")
    print("=" * 70)
    
    # 디바이스-키워드 매핑
    device_keyword_pairs = list(zip(WIFI_DEVICES, SEARCH_KEYWORDS))
    
    print("\n[준비] 디바이스별 검색 키워드:")
    for device, keyword in device_keyword_pairs:
        print(f"  {device} -> {keyword}")
    
    print("\n[실행] 병렬 검색 시작...")
    start_time = time.time()
    
    results = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(youtube_search_flow, device, keyword): (device, keyword)
            for device, keyword in device_keyword_pairs
        }
        
        for future in as_completed(futures):
            device, keyword = futures[future]
            result = future.result()
            results.append(result)
            
            status = "SUCCESS" if result["success"] else "FAILED"
            print(f"  [{status}] {device} - {keyword}")
    
    elapsed = time.time() - start_time
    
    # 결과 요약
    print("\n" + "=" * 70)
    print("테스트 결과 요약")
    print("=" * 70)
    
    success_count = sum(1 for r in results if r["success"])
    print(f"\n성공: {success_count}/6")
    print(f"소요 시간: {elapsed:.2f}초")
    
    print("\n상세 결과:")
    for result in results:
        print(f"\n  {result['device']} ({result['keyword']}):")
        for step, success in result["steps"].items():
            icon = "OK" if success else "FAIL"
            print(f"    - {step}: {icon}")
        if "screenshot_path" in result:
            print(f"    - screenshot: {result['screenshot_path']}")
    
    print("\n" + "=" * 70)
    print("병렬 테스트 완료!")
    print("=" * 70)


if __name__ == "__main__":
    main()

