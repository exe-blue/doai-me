"""
xinhui 연동 예제

HID 입력과 화면 캡처 기능을 테스트합니다.
"""

import sys
import time
import logging

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def check_xinhui_status():
    """xinhui 상태 확인"""
    from src.controller.xinhui_controller import XinhuiController, XinhuiConfig
    
    config = XinhuiConfig(
        install_path=r"C:\Program Files (x86)\xinhui",
        control_port=10039,
        stream_port=22222
    )
    
    xinhui = XinhuiController(config)
    
    if xinhui.is_xinhui_running():
        logger.info("✓ xinhui (touping.exe) 실행 중")
        return True
    else:
        logger.warning("✗ xinhui (touping.exe) 미실행")
        logger.info("touping.exe를 먼저 실행해주세요.")
        return False


def test_hid_input():
    """HID 입력 테스트"""
    from src.controller.hid_input import HIDInput, GestureConfig, get_hid_input
    
    # HID 입력 인스턴스 생성
    hid = get_hid_input()
    
    # 테스트 디바이스 ID (실제 연결된 디바이스로 변경 필요)
    device_id = "192.168.1.2:5555"
    
    logger.info("=== HID 입력 테스트 ===")
    
    # 1. 탭 테스트
    logger.info("탭 테스트...")
    result = hid.tap(device_id, 540, 960, natural=True)
    logger.info(f"탭 결과: {result}")
    time.sleep(1)
    
    # 2. 더블탭 테스트
    logger.info("더블탭 테스트...")
    result = hid.double_tap(device_id, 540, 960, natural=True)
    logger.info(f"더블탭 결과: {result}")
    time.sleep(1)
    
    # 3. 스와이프 테스트
    logger.info("스와이프 테스트...")
    result = hid.scroll_up(device_id)
    logger.info(f"스와이프 결과: {result}")
    time.sleep(1)
    
    # 4. 한글 입력 테스트
    logger.info("한글 입력 테스트...")
    result = hid.type_text(device_id, "안녕하세요! 테스트입니다.", human_like=True)
    logger.info(f"한글 입력 결과: {result}")
    time.sleep(1)
    
    # 5. 키 입력 테스트
    logger.info("홈 버튼 테스트...")
    result = hid.press_home(device_id)
    logger.info(f"홈 버튼 결과: {result}")
    
    logger.info("=== HID 입력 테스트 완료 ===")


def test_screen_capture():
    """화면 캡처 테스트"""
    from src.controller.screen_capture import ScreenCapture, get_screen_capture
    
    capture = get_screen_capture()
    device_id = "192.168.1.2:5555"
    
    logger.info("=== 화면 캡처 테스트 ===")
    
    # 1. 단일 캡처
    logger.info("화면 캡처 중...")
    save_path = "test_screenshot.png"
    data = capture.capture(device_id, save_path)
    
    if data:
        logger.info(f"✓ 캡처 성공: {save_path} ({len(data)} bytes)")
    else:
        logger.warning("✗ 캡처 실패")
    
    logger.info("=== 화면 캡처 테스트 완료 ===")


def test_hybrid_controller():
    """하이브리드 컨트롤러 테스트"""
    from src.controller.xinhui_controller import HybridController, get_hybrid_controller
    
    # 하이브리드 컨트롤러 (ADB/xinhui 자동 선택)
    hybrid = get_hybrid_controller(prefer_xinhui=False)
    
    device_id = "192.168.1.2:5555"
    
    logger.info("=== 하이브리드 컨트롤러 테스트 ===")
    
    # 1. 일반 탭 (ADB 사용)
    logger.info("일반 탭 (ADB)...")
    result = hybrid.tap(device_id, 540, 960, use_hid=False)
    logger.info(f"결과: {result}")
    time.sleep(0.5)
    
    # 2. HID 탭 (xinhui 사용)
    logger.info("HID 탭 (xinhui)...")
    result = hybrid.tap(device_id, 540, 960, use_hid=True)
    logger.info(f"결과: {result}")
    time.sleep(0.5)
    
    # 3. 한글 입력 (자동으로 xinhui 사용)
    logger.info("한글 입력 (자동 xinhui)...")
    result = hybrid.text(device_id, "테스트 댓글입니다", use_hid=True)
    logger.info(f"결과: {result}")
    
    logger.info("=== 하이브리드 컨트롤러 테스트 완료 ===")


def test_with_device_manager():
    """DeviceManager와 함께 사용"""
    from src.controller.device_manager import DeviceManager
    
    manager = DeviceManager()
    
    # 디바이스 연결
    test_ips = ["192.168.1.2", "192.168.1.3"]
    logger.info(f"디바이스 연결: {test_ips}")
    
    for ip in test_ips:
        manager.connect_device(ip)
    
    connected = manager.get_connected_ips()
    logger.info(f"연결된 디바이스: {connected}")
    
    if not connected:
        logger.warning("연결된 디바이스가 없습니다.")
        return
    
    # xinhui 사용 가능 여부 확인
    if manager.is_xinhui_available():
        logger.info("✓ xinhui 사용 가능")
        
        # HID 탭 실행
        for ip in connected:
            logger.info(f"[{ip}] HID 탭 실행")
            manager.hid_tap(ip, 540, 960, use_xinhui=True)
            
            logger.info(f"[{ip}] 한글 입력")
            manager.hid_text(ip, "안녕하세요!", use_xinhui=True)
    else:
        logger.warning("✗ xinhui 미사용, ADB로 대체")
        
        # ADB 사용
        for ip in connected:
            logger.info(f"[{ip}] ADB 탭 실행")
            manager.hid_tap(ip, 540, 960, use_xinhui=False)
    
    # 연결 해제
    manager.disconnect_all()


def test_youtube_task():
    """YouTube 태스크 테스트"""
    import asyncio
    from src.controller.device_manager import DeviceManager
    from src.modules.task_registry import TaskConfig, TaskRegistry
    
    # 태스크 임포트 (등록됨)
    from src.modules.tasks.xinhui_youtube_task import XinhuiYouTubeFullTask
    
    # 디바이스 매니저
    manager = DeviceManager()
    manager.connect_device("192.168.1.2")
    
    if not manager.get_connected_ips():
        logger.warning("연결된 디바이스가 없습니다.")
        return
    
    device = manager.get_device("192.168.1.2")
    
    # 태스크 설정
    config = TaskConfig(
        name="youtube_full",
        parameters={
            "keyword": "파이썬 기초",
            "title": "파이썬",
            "watch_time_min": 30,
            "watch_time_max": 60,
            "like_probability": 50,
            "comment_probability": 30,
            "subscribe_probability": 10,
            "comment_text": "좋은 영상 감사합니다! 많이 배웠어요."
        }
    )
    
    # 태스크 실행
    task = XinhuiYouTubeFullTask(config)
    
    async def run():
        await task.before_execute(device)
        result = await task.execute(device)
        logger.info(f"태스크 결과: {result}")
    
    asyncio.run(run())
    
    manager.disconnect_all()


def main():
    """메인 함수"""
    logger.info("=" * 50)
    logger.info("xinhui 연동 테스트")
    logger.info("=" * 50)
    
    # 1. xinhui 상태 확인
    if not check_xinhui_status():
        logger.info("\nxinhui 없이 ADB 모드로 테스트합니다.")
    
    # 테스트 메뉴
    print("\n테스트 선택:")
    print("1. HID 입력 테스트")
    print("2. 화면 캡처 테스트")
    print("3. 하이브리드 컨트롤러 테스트")
    print("4. DeviceManager 통합 테스트")
    print("5. YouTube 태스크 테스트")
    print("0. 종료")
    
    try:
        choice = input("\n선택: ").strip()
        
        if choice == "1":
            test_hid_input()
        elif choice == "2":
            test_screen_capture()
        elif choice == "3":
            test_hybrid_controller()
        elif choice == "4":
            test_with_device_manager()
        elif choice == "5":
            test_youtube_task()
        elif choice == "0":
            logger.info("종료")
        else:
            logger.warning("잘못된 선택")
    except KeyboardInterrupt:
        logger.info("\n중단됨")
    except Exception as e:
        logger.error(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

