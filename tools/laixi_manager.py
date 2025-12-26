"""
Laixi 관리 도구

Laixi WebSocket API를 통해:
- AutoX.js 스크립트 실행/중지
- 기기 상태 확인
- 스크린샷 촬영
- 긴급 조작

사용법:
    python laixi_manager.py start     # 모든 기기에 스크립트 시작
    python laixi_manager.py stop      # 모든 기기에 스크립트 중지
    python laixi_manager.py status    # 기기 상태 확인
    python laixi_manager.py screenshot  # 스크린샷 촬영
"""

import asyncio
import json
import sys
from datetime import datetime
from typing import Optional
import websockets

# ==================== 설정 ====================
LAIXI_WS_URL = "ws://127.0.0.1:22221/"
SCRIPT_PATH = r"C:\Scripts\youtube_simple.js"
SCREENSHOT_PATH = r"D:\screenshots"

# ==================== WebSocket 통신 ====================

async def send_command(command: dict) -> dict:
    """Laixi WebSocket으로 명령 전송"""
    try:
        async with websockets.connect(LAIXI_WS_URL, ping_interval=None) as ws:
            await ws.send(json.dumps(command))
            response = await asyncio.wait_for(ws.recv(), timeout=30)
            return json.loads(response)
    except asyncio.TimeoutError:
        return {"error": "타임아웃"}
    except ConnectionRefusedError:
        return {"error": "Laixi 연결 실패 - Laixi가 실행 중인지 확인하세요"}
    except Exception as e:
        return {"error": str(e)}

# ==================== 명령어 ====================

async def get_devices():
    """모든 기기 정보 가져오기"""
    result = await send_command({"action": "List"})
    return result

async def start_script(device_ids: str = "all"):
    """AutoX.js 스크립트 시작"""
    result = await send_command({
        "action": "ExecuteAutoJs",
        "comm": {
            "deviceIds": device_ids,
            "filePath": SCRIPT_PATH
        }
    })
    return result

async def stop_script(device_ids: str = "all"):
    """AutoX.js 스크립트 중지"""
    result = await send_command({
        "action": "StopAutoJs",
        "comm": {
            "deviceIds": device_ids,
            "filePath": SCRIPT_PATH
        }
    })
    return result

async def take_screenshot(device_ids: str = "all"):
    """스크린샷 촬영"""
    result = await send_command({
        "action": "screen",
        "comm": {
            "deviceIds": device_ids,
            "savePath": SCREENSHOT_PATH
        }
    })
    return result

async def go_home(device_ids: str = "all"):
    """홈 버튼"""
    result = await send_command({
        "action": "BasisOperate",
        "comm": {
            "deviceIds": device_ids,
            "type": "4"  # home
        }
    })
    return result

async def go_back(device_ids: str = "all"):
    """뒤로가기"""
    result = await send_command({
        "action": "BasisOperate",
        "comm": {
            "deviceIds": device_ids,
            "type": "3"  # back
        }
    })
    return result

async def show_toast(device_ids: str = "all", message: str = "테스트"):
    """토스트 메시지 표시"""
    result = await send_command({
        "action": "Toast",
        "comm": {
            "deviceIds": device_ids,
            "content": message
        }
    })
    return result

async def run_adb(device_ids: str, command: str):
    """ADB 명령 실행"""
    result = await send_command({
        "action": "adb",
        "comm": {
            "command": command,
            "deviceIds": device_ids
        }
    })
    return result

async def open_youtube(device_ids: str = "all"):
    """YouTube 앱 실행"""
    result = await run_adb(
        device_ids,
        "am start -n com.google.android.youtube/com.google.android.youtube.HomeActivity"
    )
    return result

# ==================== 대화형 메뉴 ====================

def print_menu():
    """메뉴 출력"""
    print("\n" + "="*50)
    print("         Laixi 관리 도구")
    print("="*50)
    print("1. 기기 목록 보기")
    print("2. 스크립트 시작 (전체)")
    print("3. 스크립트 중지 (전체)")
    print("4. 스크린샷 촬영")
    print("5. 홈 버튼 누르기")
    print("6. 뒤로가기")
    print("7. YouTube 앱 실행")
    print("8. 토스트 메시지 보내기")
    print("9. ADB 명령 실행")
    print("0. 종료")
    print("="*50)

async def interactive_mode():
    """대화형 모드"""
    while True:
        print_menu()
        choice = input("선택: ").strip()
        
        if choice == "0":
            print("종료합니다.")
            break
        elif choice == "1":
            result = await get_devices()
            print(json.dumps(result, indent=2, ensure_ascii=False))
        elif choice == "2":
            result = await start_script()
            print(f"스크립트 시작: {result}")
        elif choice == "3":
            result = await stop_script()
            print(f"스크립트 중지: {result}")
        elif choice == "4":
            result = await take_screenshot()
            print(f"스크린샷 저장: {SCREENSHOT_PATH}")
        elif choice == "5":
            result = await go_home()
            print(f"홈 버튼: {result}")
        elif choice == "6":
            result = await go_back()
            print(f"뒤로가기: {result}")
        elif choice == "7":
            result = await open_youtube()
            print(f"YouTube 실행: {result}")
        elif choice == "8":
            msg = input("메시지: ").strip()
            result = await show_toast(message=msg)
            print(f"토스트: {result}")
        elif choice == "9":
            cmd = input("ADB 명령: ").strip()
            devices = input("기기 ID (all/특정ID): ").strip() or "all"
            result = await run_adb(devices, cmd)
            print(f"결과: {result}")
        else:
            print("잘못된 선택입니다.")

# ==================== CLI ====================

async def main():
    if len(sys.argv) < 2:
        # 대화형 모드
        await interactive_mode()
        return
    
    command = sys.argv[1].lower()
    device_ids = sys.argv[2] if len(sys.argv) > 2 else "all"
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 명령: {command}, 대상: {device_ids}")
    
    if command == "start":
        result = await start_script(device_ids)
        print(f"✅ 스크립트 시작: {result}")
        
    elif command == "stop":
        result = await stop_script(device_ids)
        print(f"✅ 스크립트 중지: {result}")
        
    elif command == "status" or command == "list":
        result = await get_devices()
        if "error" in result:
            print(f"❌ 오류: {result['error']}")
        else:
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
    elif command == "screenshot":
        result = await take_screenshot(device_ids)
        print(f"✅ 스크린샷 저장: {SCREENSHOT_PATH}")
        
    elif command == "home":
        result = await go_home(device_ids)
        print(f"✅ 홈 버튼: {result}")
        
    elif command == "back":
        result = await go_back(device_ids)
        print(f"✅ 뒤로가기: {result}")
        
    elif command == "youtube":
        result = await open_youtube(device_ids)
        print(f"✅ YouTube 실행: {result}")
        
    elif command == "toast":
        message = sys.argv[2] if len(sys.argv) > 2 else "Hello from Laixi Manager"
        result = await show_toast(message=message)
        print(f"✅ 토스트 전송: {result}")
        
    else:
        print(f"❌ 알 수 없는 명령: {command}")
        print("사용 가능한 명령: start, stop, status, screenshot, home, back, youtube, toast")

if __name__ == "__main__":
    asyncio.run(main())

