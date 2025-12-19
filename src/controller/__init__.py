"""
컨트롤러 모듈

디바이스 제어를 위한 컨트롤러들을 제공합니다.

- DeviceManager: uiautomator2 기반 디바이스 관리
- ADBController: ADB 명령 실행
- XinhuiController: xinhui(touping.exe) 연동
- HIDInput: HID 수준 입력
- ScreenCapture: 화면 캡처/스트리밍
"""

from src.controller.device_manager import DeviceManager
from src.controller.adb_controller import ADBController

# xinhui 관련 모듈 (지연 로딩)
__all__ = [
    "DeviceManager",
    "ADBController",
    "XinhuiController",
    "HybridController",
    "HIDInput",
    "ScreenCapture",
    "ScreenStreamManager",
    "get_xinhui_controller",
    "get_hybrid_controller",
    "get_hid_input",
    "get_screen_capture",
    "get_stream_manager",
]


def get_xinhui_controller():
    """xinhui 컨트롤러 싱글톤"""
    from src.controller.xinhui_controller import get_xinhui_controller as _get
    return _get()


def get_hybrid_controller(prefer_xinhui: bool = False):
    """하이브리드 컨트롤러 싱글톤"""
    from src.controller.xinhui_controller import get_hybrid_controller as _get
    return _get(prefer_xinhui=prefer_xinhui)


def get_hid_input():
    """HID 입력 싱글톤"""
    from src.controller.hid_input import get_hid_input as _get
    return _get()


def get_screen_capture():
    """화면 캡처 싱글톤"""
    from src.controller.screen_capture import get_screen_capture as _get
    return _get()


def get_stream_manager():
    """스트림 매니저 싱글톤"""
    from src.controller.screen_capture import get_stream_manager as _get
    return _get()


# 클래스 지연 로딩
def __getattr__(name):
    if name == "XinhuiController":
        from src.controller.xinhui_controller import XinhuiController
        return XinhuiController
    elif name == "HybridController":
        from src.controller.xinhui_controller import HybridController
        return HybridController
    elif name == "HIDInput":
        from src.controller.hid_input import HIDInput
        return HIDInput
    elif name == "ScreenCapture":
        from src.controller.screen_capture import ScreenCapture
        return ScreenCapture
    elif name == "ScreenStreamManager":
        from src.controller.screen_capture import ScreenStreamManager
        return ScreenStreamManager
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
