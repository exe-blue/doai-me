"""
AIFarm YouTube 시뮬레이션 데모
첫 번째 디바이스에서 YouTube 검색을 수행합니다.
"""

import subprocess
import time

# ADB 경로 설정
ADB_PATH = r"C:\Program Files (x86)\xinhui\tools\adb.exe"
DEVICE = "192.168.200.104:5555"


def run_adb(command: list) -> tuple[bool, str]:
    """ADB 명령 실행"""
    full_command = [ADB_PATH, "-s", DEVICE] + command
    try:
        result = subprocess.run(full_command, capture_output=True, text=True, timeout=15)
        return result.returncode == 0, result.stdout.strip()
    except Exception as e:
        return False, str(e)


def main():
    print("=" * 60)
    print(f"YouTube 시뮬레이션 시작 - {DEVICE}")
    print("=" * 60)
    
    # 1. 화면 켜기
    print("\n[1/7] 화면 켜기...")
    run_adb(["shell", "input", "keyevent", "KEYCODE_WAKEUP"])
    time.sleep(0.5)
    
    # 2. 홈으로 이동
    print("[2/7] 홈 화면으로...")
    run_adb(["shell", "input", "keyevent", "KEYCODE_HOME"])
    time.sleep(1)
    
    # 3. YouTube 앱 실행
    print("[3/7] YouTube 앱 실행...")
    success, _ = run_adb([
        "shell", "am", "start", "-n", 
        "com.google.android.youtube/com.google.android.youtube.HomeActivity"
    ])
    print(f"    -> {'성공' if success else '실패'}")
    time.sleep(3)
    
    # 4. 검색 버튼 탭
    print("[4/7] 검색 버튼 탭...")
    run_adb(["shell", "input", "tap", "950", "100"])
    time.sleep(2)
    
    # 5. 검색어 입력
    print("[5/7] 검색어 입력: 'BTS'...")
    run_adb(["shell", "input", "text", "BTS"])
    time.sleep(0.5)
    
    # 엔터 키
    run_adb(["shell", "input", "keyevent", "KEYCODE_ENTER"])
    time.sleep(3)
    
    # 6. 첫 번째 영상 클릭 (대략적인 위치)
    print("[6/7] 첫 번째 검색 결과 클릭...")
    run_adb(["shell", "input", "tap", "540", "400"])
    time.sleep(3)
    
    # 7. 스크린샷
    print("[7/7] 결과 스크린샷 저장...")
    run_adb(["shell", "screencap", "-p", "/sdcard/youtube_demo.png"])
    run_adb(["pull", "/sdcard/youtube_demo.png", "D:\\exe-blue\\aifarm\\youtube_demo.png"])
    
    print("\n" + "=" * 60)
    print("YouTube 시뮬레이션 완료!")
    print("스크린샷: D:\\exe-blue\\aifarm\\youtube_demo.png")
    print("=" * 60)


if __name__ == "__main__":
    main()

