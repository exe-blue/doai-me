"""
Laixi API 사용 예제

Laixi 앱과 WebSocket으로 통신하여 Android 기기를 제어하는 예제입니다.

사용법:
1. Laixi 앱 실행 (touping.exe)
2. Android 기기 연결
3. python examples/laixi_example.py 실행
"""

import asyncio
import sys
from pathlib import Path

# 상위 디렉토리의 shared 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from shared.laixi_client import LaixiClient


async def example_basic_tap():
    """예제 1: 기본 탭 동작"""
    print("=" * 50)
    print("예제 1: 기본 탭 동작")
    print("=" * 50)

    client = LaixiClient()

    # 연결
    if not await client.connect():
        print("Laixi 연결 실패")
        return

    try:
        # 디바이스 목록 가져오기
        devices = await client.list_devices()
        if not devices:
            print("연결된 디바이스 없음")
            return

        device_id = devices[0].get('id', devices[0].get('serial', 'all'))
        print(f"디바이스: {device_id}")

        # 화면 중앙 탭 (50%, 50%)
        print("화면 중앙 탭...")
        await client.tap(device_id, 0.5, 0.5)
        await asyncio.sleep(1)

        print("완료!")

    finally:
        await client.disconnect()


async def example_swipe():
    """예제 2: 스와이프 (스크롤)"""
    print("\n" + "=" * 50)
    print("예제 2: 스와이프 (위로 스크롤)")
    print("=" * 50)

    client = LaixiClient()

    if not await client.connect():
        print("Laixi 연결 실패")
        return

    try:
        devices = await client.list_devices()
        if not devices:
            print("연결된 디바이스 없음")
            return

        device_id = devices[0].get('id', devices[0].get('serial', 'all'))

        # 위로 스크롤 (아래에서 위로 스와이프)
        print("위로 스크롤...")
        await client.swipe(
            device_id,
            0.5, 0.7,  # 시작: 중앙, 70%
            0.5, 0.3,  # 종료: 중앙, 30%
            duration_ms=300
        )
        await asyncio.sleep(1)

        print("완료!")

    finally:
        await client.disconnect()


async def example_text_input():
    """예제 3: 텍스트 입력 (클립보드 사용)"""
    print("\n" + "=" * 50)
    print("예제 3: 텍스트 입력")
    print("=" * 50)

    client = LaixiClient()

    if not await client.connect():
        print("Laixi 연결 실패")
        return

    try:
        devices = await client.list_devices()
        if not devices:
            print("연결된 디바이스 없음")
            return

        device_id = devices[0].get('id', devices[0].get('serial', 'all'))

        # 클립보드에 텍스트 쓰기
        text = "안녕하세요! Laixi 테스트입니다."
        print(f"클립보드에 텍스트 쓰기: {text}")
        await client.set_clipboard(device_id, text)

        # 클립보드 내용 확인
        clipboard_content = await client.get_clipboard(device_id)
        print(f"클립보드 내용: {clipboard_content}")

        print("완료!")

    finally:
        await client.disconnect()


async def example_screenshot():
    """예제 4: 스크린샷"""
    print("\n" + "=" * 50)
    print("예제 4: 스크린샷")
    print("=" * 50)

    client = LaixiClient()

    if not await client.connect():
        print("Laixi 연결 실패")
        return

    try:
        devices = await client.list_devices()
        if not devices:
            print("연결된 디바이스 없음")
            return

        device_id = devices[0].get('id', devices[0].get('serial', 'all'))

        # 스크린샷 저장
        save_path = "d:\\screenshots"
        print(f"스크린샷 저장 경로: {save_path}")
        await client.screenshot(device_id, save_path)

        print("완료! (저장 경로 확인)")

    finally:
        await client.disconnect()


async def example_youtube_open():
    """예제 5: YouTube 영상 열기"""
    print("\n" + "=" * 50)
    print("예제 5: YouTube 영상 열기")
    print("=" * 50)

    client = LaixiClient()

    if not await client.connect():
        print("Laixi 연결 실패")
        return

    try:
        devices = await client.list_devices()
        if not devices:
            print("연결된 디바이스 없음")
            return

        device_id = devices[0].get('id', devices[0].get('serial', 'all'))

        # YouTube 영상 URL
        video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        print(f"YouTube 영상 열기: {video_url}")

        # ADB 명령으로 YouTube 앱 실행
        await client.execute_adb(
            device_id,
            f"am start -a android.intent.action.VIEW -d {video_url}"
        )

        print("YouTube 앱 실행됨!")
        await asyncio.sleep(3)

        # Toast 메시지 표시
        await client.show_toast(device_id, "Laixi 테스트!")

        print("완료!")

    finally:
        await client.disconnect()


async def example_basic_operations():
    """예제 6: 기본 작업 (Home, Back, 화면 켜기/끄기)"""
    print("\n" + "=" * 50)
    print("예제 6: 기본 작업")
    print("=" * 50)

    client = LaixiClient()

    if not await client.connect():
        print("Laixi 연결 실패")
        return

    try:
        devices = await client.list_devices()
        if not devices:
            print("연결된 디바이스 없음")
            return

        device_id = devices[0].get('id', devices[0].get('serial', 'all'))

        # Home 버튼
        print("Home 버튼 누르기...")
        await client.press_home(device_id)
        await asyncio.sleep(2)

        # Back 버튼
        print("Back 버튼 누르기...")
        await client.press_back(device_id)
        await asyncio.sleep(2)

        # 화면 끄기
        print("화면 끄기...")
        await client.screen_off(device_id)
        await asyncio.sleep(2)

        # 화면 켜기
        print("화면 켜기...")
        await client.screen_on(device_id)

        print("완료!")

    finally:
        await client.disconnect()


async def main():
    """메인 함수 - 모든 예제 실행"""
    print("Laixi API 예제 프로그램")
    print("=" * 50)
    print("Laixi 앱이 실행 중이고 기기가 연결되어 있는지 확인하세요.")
    print()

    try:
        # 각 예제 실행
        await example_basic_tap()
        await example_swipe()
        await example_text_input()
        await example_screenshot()
        await example_youtube_open()
        await example_basic_operations()

        print("\n" + "=" * 50)
        print("모든 예제 완료!")
        print("=" * 50)

    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
