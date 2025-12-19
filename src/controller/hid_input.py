"""
HID 수준 입력 모듈

xinhui의 HID Manager를 통해 하드웨어 레벨 입력을 제공합니다.
봇 감지를 우회하고 자연스러운 입력을 시뮬레이션합니다.
"""

import asyncio
import random
import time
import logging
from typing import List, Tuple, Optional
from dataclasses import dataclass

from src.controller.xinhui_controller import (
    XinhuiController, 
    XinhuiConfig,
    get_xinhui_controller
)

logger = logging.getLogger(__name__)


@dataclass
class TouchEvent:
    """터치 이벤트"""
    x: int
    y: int
    pressure: float = 1.0
    size: float = 0.1


@dataclass
class GestureConfig:
    """제스처 설정"""
    # 탭
    tap_duration_min: int = 50       # 최소 탭 지속시간 (ms)
    tap_duration_max: int = 150      # 최대 탭 지속시간 (ms)
    
    # 스와이프
    swipe_duration_min: int = 200    # 최소 스와이프 지속시간 (ms)
    swipe_duration_max: int = 500    # 최대 스와이프 지속시간 (ms)
    swipe_steps: int = 20            # 스와이프 중간 단계 수
    
    # 랜덤 오프셋
    position_jitter: int = 5         # 위치 랜덤 오프셋 (픽셀)
    
    # 타이밍
    inter_tap_delay_min: float = 0.1  # 연속 탭 사이 최소 딜레이 (초)
    inter_tap_delay_max: float = 0.3  # 연속 탭 사이 최대 딜레이 (초)


class HIDInput:
    """
    HID 수준 입력 클래스
    
    자연스러운 인간 입력을 시뮬레이션합니다.
    """
    
    def __init__(
        self, 
        xinhui: Optional[XinhuiController] = None,
        gesture_config: Optional[GestureConfig] = None
    ):
        """
        Args:
            xinhui: XinhuiController 인스턴스
            gesture_config: 제스처 설정
        """
        self.xinhui = xinhui or get_xinhui_controller()
        self.config = gesture_config or GestureConfig()
        self.logger = logging.getLogger(__name__)
    
    def _add_jitter(self, x: int, y: int) -> Tuple[int, int]:
        """위치에 약간의 랜덤 오프셋 추가 (더 자연스러운 터치)"""
        jitter = self.config.position_jitter
        new_x = x + random.randint(-jitter, jitter)
        new_y = y + random.randint(-jitter, jitter)
        return max(0, new_x), max(0, new_y)
    
    def _random_duration(self, min_ms: int, max_ms: int) -> int:
        """랜덤 지속시간 생성"""
        return random.randint(min_ms, max_ms)
    
    # ==================== 기본 터치 ====================
    
    def tap(
        self, 
        device_id: str, 
        x: int, 
        y: int, 
        natural: bool = True
    ) -> bool:
        """
        HID 탭
        
        Args:
            device_id: 디바이스 ID
            x, y: 좌표
            natural: 자연스러운 입력 (랜덤 지터 추가)
            
        Returns:
            성공 여부
        """
        if natural:
            x, y = self._add_jitter(x, y)
        
        duration = self._random_duration(
            self.config.tap_duration_min,
            self.config.tap_duration_max
        )
        
        return self.xinhui.hid_tap(device_id, x, y, duration)
    
    async def tap_async(
        self, 
        device_id: str, 
        x: int, 
        y: int, 
        natural: bool = True
    ) -> bool:
        """비동기 HID 탭"""
        if natural:
            x, y = self._add_jitter(x, y)
        
        duration = self._random_duration(
            self.config.tap_duration_min,
            self.config.tap_duration_max
        )
        
        return await self.xinhui.hid_tap_async(device_id, x, y, duration)
    
    def double_tap(
        self, 
        device_id: str, 
        x: int, 
        y: int, 
        natural: bool = True
    ) -> bool:
        """
        HID 더블 탭
        
        Args:
            device_id: 디바이스 ID
            x, y: 좌표
            natural: 자연스러운 입력
            
        Returns:
            성공 여부
        """
        # 첫 번째 탭
        result1 = self.tap(device_id, x, y, natural)
        if not result1:
            return False
        
        # 짧은 딜레이
        time.sleep(random.uniform(0.05, 0.15))
        
        # 두 번째 탭 (약간 다른 위치)
        return self.tap(device_id, x, y, natural)
    
    def long_press(
        self, 
        device_id: str, 
        x: int, 
        y: int, 
        duration_ms: int = 1000,
        natural: bool = True
    ) -> bool:
        """
        HID 롱 프레스
        
        Args:
            device_id: 디바이스 ID
            x, y: 좌표
            duration_ms: 누르고 있는 시간 (밀리초)
            natural: 자연스러운 입력
            
        Returns:
            성공 여부
        """
        if natural:
            x, y = self._add_jitter(x, y)
            # 지속시간에도 약간의 변화
            duration_ms += random.randint(-50, 50)
        
        return self.xinhui.hid_tap(device_id, x, y, max(500, duration_ms))
    
    # ==================== 스와이프 ====================
    
    def swipe(
        self, 
        device_id: str, 
        x1: int, 
        y1: int, 
        x2: int, 
        y2: int,
        natural: bool = True
    ) -> bool:
        """
        HID 스와이프
        
        Args:
            device_id: 디바이스 ID
            x1, y1: 시작 좌표
            x2, y2: 종료 좌표
            natural: 자연스러운 입력
            
        Returns:
            성공 여부
        """
        if natural:
            x1, y1 = self._add_jitter(x1, y1)
            x2, y2 = self._add_jitter(x2, y2)
        
        duration = self._random_duration(
            self.config.swipe_duration_min,
            self.config.swipe_duration_max
        )
        
        return self.xinhui.hid_swipe(device_id, x1, y1, x2, y2, duration)
    
    async def swipe_async(
        self, 
        device_id: str, 
        x1: int, 
        y1: int, 
        x2: int, 
        y2: int,
        natural: bool = True
    ) -> bool:
        """비동기 HID 스와이프"""
        if natural:
            x1, y1 = self._add_jitter(x1, y1)
            x2, y2 = self._add_jitter(x2, y2)
        
        duration = self._random_duration(
            self.config.swipe_duration_min,
            self.config.swipe_duration_max
        )
        
        return await self.xinhui.hid_swipe_async(device_id, x1, y1, x2, y2, duration)
    
    def scroll_up(self, device_id: str, screen_width: int = 1080, screen_height: int = 1920) -> bool:
        """위로 스크롤"""
        cx = screen_width // 2
        return self.swipe(
            device_id,
            cx, int(screen_height * 0.7),
            cx, int(screen_height * 0.3)
        )
    
    def scroll_down(self, device_id: str, screen_width: int = 1080, screen_height: int = 1920) -> bool:
        """아래로 스크롤"""
        cx = screen_width // 2
        return self.swipe(
            device_id,
            cx, int(screen_height * 0.3),
            cx, int(screen_height * 0.7)
        )
    
    def scroll_left(self, device_id: str, screen_width: int = 1080, screen_height: int = 1920) -> bool:
        """왼쪽으로 스크롤"""
        cy = screen_height // 2
        return self.swipe(
            device_id,
            int(screen_width * 0.8), cy,
            int(screen_width * 0.2), cy
        )
    
    def scroll_right(self, device_id: str, screen_width: int = 1080, screen_height: int = 1920) -> bool:
        """오른쪽으로 스크롤"""
        cy = screen_height // 2
        return self.swipe(
            device_id,
            int(screen_width * 0.2), cy,
            int(screen_width * 0.8), cy
        )
    
    # ==================== 텍스트 입력 ====================
    
    def type_text(
        self, 
        device_id: str, 
        text: str, 
        human_like: bool = True
    ) -> bool:
        """
        HID 텍스트 입력
        
        Args:
            device_id: 디바이스 ID
            text: 입력할 텍스트 (한글 지원)
            human_like: 인간처럼 천천히 입력
            
        Returns:
            성공 여부
        """
        if human_like and len(text) > 5:
            # 긴 텍스트는 여러 번에 나눠서 입력
            chunk_size = random.randint(3, 8)
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                if not self.xinhui.hid_text(device_id, chunk):
                    return False
                # 타이핑 딜레이
                time.sleep(random.uniform(0.05, 0.2))
            return True
        else:
            return self.xinhui.hid_text(device_id, text)
    
    async def type_text_async(
        self, 
        device_id: str, 
        text: str, 
        human_like: bool = True
    ) -> bool:
        """비동기 HID 텍스트 입력"""
        if human_like and len(text) > 5:
            chunk_size = random.randint(3, 8)
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                if not await self.xinhui.hid_text_async(device_id, chunk):
                    return False
                await asyncio.sleep(random.uniform(0.05, 0.2))
            return True
        else:
            return await self.xinhui.hid_text_async(device_id, text)
    
    # ==================== 멀티터치 ====================
    
    def pinch_in(
        self, 
        device_id: str, 
        cx: int, 
        cy: int, 
        start_distance: int = 300,
        end_distance: int = 100
    ) -> bool:
        """핀치 인 (줌 아웃)"""
        return self.xinhui.hid_pinch(
            device_id, cx, cy, 
            start_distance, end_distance,
            duration_ms=random.randint(300, 500)
        )
    
    def pinch_out(
        self, 
        device_id: str, 
        cx: int, 
        cy: int, 
        start_distance: int = 100,
        end_distance: int = 300
    ) -> bool:
        """핀치 아웃 (줌 인)"""
        return self.xinhui.hid_pinch(
            device_id, cx, cy, 
            start_distance, end_distance,
            duration_ms=random.randint(300, 500)
        )
    
    # ==================== 키 입력 ====================
    
    # Android 키코드 상수
    KEYCODE_HOME = 3
    KEYCODE_BACK = 4
    KEYCODE_MENU = 82
    KEYCODE_POWER = 26
    KEYCODE_VOLUME_UP = 24
    KEYCODE_VOLUME_DOWN = 25
    KEYCODE_ENTER = 66
    KEYCODE_DEL = 67  # 백스페이스
    KEYCODE_TAB = 61
    KEYCODE_SPACE = 62
    KEYCODE_ESCAPE = 111
    
    def press_key(self, device_id: str, keycode: int) -> bool:
        """키 입력"""
        return self.xinhui.hid_key(device_id, keycode)
    
    def press_home(self, device_id: str) -> bool:
        """홈 버튼"""
        return self.press_key(device_id, self.KEYCODE_HOME)
    
    def press_back(self, device_id: str) -> bool:
        """뒤로가기"""
        return self.press_key(device_id, self.KEYCODE_BACK)
    
    def press_enter(self, device_id: str) -> bool:
        """엔터"""
        return self.press_key(device_id, self.KEYCODE_ENTER)
    
    def press_menu(self, device_id: str) -> bool:
        """메뉴"""
        return self.press_key(device_id, self.KEYCODE_MENU)
    
    # ==================== 복합 제스처 ====================
    
    def tap_and_hold_drag(
        self, 
        device_id: str, 
        x1: int, 
        y1: int, 
        x2: int, 
        y2: int,
        hold_ms: int = 500
    ) -> bool:
        """
        탭 후 홀드하고 드래그 (아이콘 이동 등)
        
        Args:
            device_id: 디바이스 ID
            x1, y1: 시작 좌표 (탭 & 홀드)
            x2, y2: 드래그 목적지
            hold_ms: 홀드 시간
            
        Returns:
            성공 여부
        """
        # 롱 프레스
        if not self.long_press(device_id, x1, y1, hold_ms):
            return False
        
        # 드래그
        return self.swipe(device_id, x1, y1, x2, y2, natural=False)
    
    def multi_tap(
        self, 
        device_id: str, 
        positions: List[Tuple[int, int]],
        delay_between: Optional[float] = None
    ) -> int:
        """
        여러 위치를 순서대로 탭
        
        Args:
            device_id: 디바이스 ID
            positions: (x, y) 좌표 리스트
            delay_between: 탭 사이 딜레이 (None이면 자동)
            
        Returns:
            성공한 탭 수
        """
        success_count = 0
        
        for x, y in positions:
            if self.tap(device_id, x, y):
                success_count += 1
            
            if delay_between is not None:
                time.sleep(delay_between)
            else:
                time.sleep(random.uniform(
                    self.config.inter_tap_delay_min,
                    self.config.inter_tap_delay_max
                ))
        
        return success_count


# 싱글톤 인스턴스
_hid_input: Optional[HIDInput] = None


def get_hid_input(
    xinhui: Optional[XinhuiController] = None,
    gesture_config: Optional[GestureConfig] = None
) -> HIDInput:
    """HIDInput 싱글톤"""
    global _hid_input
    if _hid_input is None:
        _hid_input = HIDInput(xinhui, gesture_config)
    return _hid_input

