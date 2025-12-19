"""
xinhui를 활용한 YouTube 자동화 태스크

HID 수준 입력으로 봇 감지를 우회하고,
한글 댓글 입력을 지원합니다.
"""

import asyncio
import random
import time
import logging
from typing import Any, Optional, Dict

from src.modules.task_registry import BaseTask, TaskConfig, TaskRegistry
from src.controller.xinhui_controller import get_hybrid_controller
from src.controller.hid_input import HIDInput, get_hid_input, GestureConfig
from src.controller.screen_capture import get_screen_capture

logger = logging.getLogger(__name__)


@TaskRegistry.register(
    name="xinhui_youtube_search",
    description="xinhui HID를 사용한 YouTube 검색 및 재생 (봇 감지 우회)",
    version="1.0.0"
)
class XinhuiYouTubeSearchTask(BaseTask):
    """xinhui를 활용한 YouTube 검색 태스크"""
    
    def __init__(self, config: TaskConfig):
        super().__init__(config)
        self.hid: Optional[HIDInput] = None
        self.hybrid = None
        
    async def before_execute(self, device):
        """실행 전 초기화"""
        self.hid = get_hid_input()
        self.hybrid = get_hybrid_controller()
    
    async def execute(self, device) -> Any:
        """
        YouTube 검색 및 재생
        
        Parameters:
            keyword: 검색 키워드
            title: 찾을 영상 제목 (부분 일치)
            watch_time_min: 최소 시청 시간 (초)
            watch_time_max: 최대 시청 시간 (초)
        """
        params = self.config.parameters
        keyword = params.get("keyword", "")
        title = params.get("title", "")
        watch_time_min = params.get("watch_time_min", 30)
        watch_time_max = params.get("watch_time_max", 120)
        
        # 디바이스 ID 구성
        device_id = f"{device.serial}"
        
        # 1. YouTube 앱 실행
        self.logger.info(f"[{device_id}] YouTube 앱 실행")
        device.app_start("com.google.android.youtube")
        await asyncio.sleep(3)
        
        # 2. 검색 버튼 클릭 (HID 사용)
        self.logger.info(f"[{device_id}] 검색 버튼 클릭 (HID)")
        # 검색 아이콘 위치 (일반적인 YouTube 레이아웃)
        if self.hid:
            self.hid.tap(device_id, 980, 80, natural=True)
        else:
            device.click(980, 80)
        await asyncio.sleep(1)
        
        # 3. 검색어 입력 (HID로 한글 지원)
        self.logger.info(f"[{device_id}] 검색어 입력: {keyword}")
        if self.hid:
            self.hid.type_text(device_id, keyword, human_like=True)
            await asyncio.sleep(0.5)
            self.hid.press_enter(device_id)
        else:
            device.send_keys(keyword)
            device.press("enter")
        await asyncio.sleep(2)
        
        # 4. 검색 결과에서 영상 찾기
        self.logger.info(f"[{device_id}] 영상 검색 중: {title}")
        video_found = False
        max_scrolls = 5
        
        for scroll_idx in range(max_scrolls):
            # 화면에서 제목 찾기
            if title and device(textContains=title).exists(timeout=2):
                element = device(textContains=title)
                bounds = element.info.get("bounds", {})
                cx = (bounds.get("left", 0) + bounds.get("right", 1080)) // 2
                cy = (bounds.get("top", 0) + bounds.get("bottom", 1920)) // 2
                
                # HID로 클릭
                if self.hid:
                    self.hid.tap(device_id, cx, cy, natural=True)
                else:
                    element.click()
                
                video_found = True
                self.logger.info(f"[{device_id}] 영상 발견 및 클릭")
                break
            
            # 아래로 스크롤 (HID)
            if self.hid:
                self.hid.scroll_up(device_id)
            else:
                device.swipe(540, 1500, 540, 500, duration=0.3)
            await asyncio.sleep(1)
        
        if not video_found:
            # 제목을 못 찾으면 첫 번째 영상 클릭
            self.logger.warning(f"[{device_id}] 제목 미발견, 첫 영상 선택")
            if self.hid:
                self.hid.tap(device_id, 540, 400, natural=True)
            else:
                device.click(540, 400)
        
        await asyncio.sleep(3)
        
        # 5. 영상 시청
        watch_time = random.randint(watch_time_min, watch_time_max)
        self.logger.info(f"[{device_id}] 영상 시청 중... ({watch_time}초)")
        await asyncio.sleep(watch_time)
        
        return {
            "keyword": keyword,
            "title": title,
            "watch_time": watch_time,
            "video_found": video_found
        }


@TaskRegistry.register(
    name="xinhui_youtube_engagement",
    description="xinhui HID를 사용한 YouTube 좋아요/댓글/구독",
    version="1.0.0"
)
class XinhuiYouTubeEngagementTask(BaseTask):
    """xinhui를 활용한 YouTube 인게이지먼트 태스크"""
    
    def __init__(self, config: TaskConfig):
        super().__init__(config)
        self.hid: Optional[HIDInput] = None
    
    async def before_execute(self, device):
        """실행 전 초기화"""
        self.hid = get_hid_input()
    
    async def execute(self, device) -> Any:
        """
        YouTube 좋아요/댓글/구독 실행
        
        Parameters:
            like_probability: 좋아요 확률 (0-100)
            comment_probability: 댓글 확률 (0-100)
            subscribe_probability: 구독 확률 (0-100)
            comment_text: 댓글 내용 (한글 지원)
        """
        params = self.config.parameters
        like_prob = params.get("like_probability", 30)
        comment_prob = params.get("comment_probability", 10)
        subscribe_prob = params.get("subscribe_probability", 5)
        comment_text = params.get("comment_text", "")
        
        device_id = f"{device.serial}"
        
        results = {
            "liked": False,
            "commented": False,
            "subscribed": False
        }
        
        # 1. 좋아요
        if random.randint(1, 100) <= like_prob:
            self.logger.info(f"[{device_id}] 좋아요 클릭")
            await self._click_like(device, device_id)
            results["liked"] = True
            await asyncio.sleep(random.uniform(0.5, 1.5))
        
        # 2. 구독
        if random.randint(1, 100) <= subscribe_prob:
            self.logger.info(f"[{device_id}] 구독 클릭")
            await self._click_subscribe(device, device_id)
            results["subscribed"] = True
            await asyncio.sleep(random.uniform(0.5, 1.5))
        
        # 3. 댓글
        if random.randint(1, 100) <= comment_prob and comment_text:
            self.logger.info(f"[{device_id}] 댓글 작성: {comment_text[:20]}...")
            await self._write_comment(device, device_id, comment_text)
            results["commented"] = True
        
        return results
    
    async def _click_like(self, device, device_id: str):
        """좋아요 버튼 클릭"""
        # 좋아요 버튼 위치 (영상 아래)
        like_x, like_y = 100, 680
        
        if self.hid:
            self.hid.tap(device_id, like_x, like_y, natural=True)
        else:
            device.click(like_x, like_y)
    
    async def _click_subscribe(self, device, device_id: str):
        """구독 버튼 클릭"""
        # 구독 버튼 찾기
        if device(textContains="구독").exists(timeout=2):
            element = device(textContains="구독")
            bounds = element.info.get("bounds", {})
            cx = (bounds.get("left", 0) + bounds.get("right", 1080)) // 2
            cy = (bounds.get("top", 0) + bounds.get("bottom", 1920)) // 2
            
            if self.hid:
                self.hid.tap(device_id, cx, cy, natural=True)
            else:
                element.click()
        else:
            # 기본 구독 버튼 위치
            subscribe_x, subscribe_y = 900, 750
            if self.hid:
                self.hid.tap(device_id, subscribe_x, subscribe_y, natural=True)
            else:
                device.click(subscribe_x, subscribe_y)
    
    async def _write_comment(self, device, device_id: str, comment: str):
        """댓글 작성 (한글 지원)"""
        # 1. 댓글 영역으로 스크롤
        if self.hid:
            self.hid.scroll_up(device_id)
        else:
            device.swipe(540, 1500, 540, 800, duration=0.3)
        await asyncio.sleep(1)
        
        # 2. 댓글 입력창 클릭
        if device(textContains="댓글 추가").exists(timeout=2):
            if self.hid:
                element = device(textContains="댓글 추가")
                bounds = element.info.get("bounds", {})
                cx = (bounds.get("left", 0) + bounds.get("right", 1080)) // 2
                cy = (bounds.get("top", 0) + bounds.get("bottom", 1920)) // 2
                self.hid.tap(device_id, cx, cy, natural=True)
            else:
                device(textContains="댓글 추가").click()
            await asyncio.sleep(1)
        
        # 3. 댓글 입력 (HID로 한글 입력)
        if self.hid:
            self.hid.type_text(device_id, comment, human_like=True)
        else:
            device.send_keys(comment)
        await asyncio.sleep(0.5)
        
        # 4. 게시 버튼 클릭
        if device(textContains="게시").exists(timeout=2):
            if self.hid:
                element = device(textContains="게시")
                bounds = element.info.get("bounds", {})
                cx = (bounds.get("left", 0) + bounds.get("right", 1080)) // 2
                cy = (bounds.get("top", 0) + bounds.get("bottom", 1920)) // 2
                self.hid.tap(device_id, cx, cy, natural=True)
            else:
                device(textContains="게시").click()


@TaskRegistry.register(
    name="xinhui_youtube_full",
    description="YouTube 검색 + 시청 + 인게이지먼트 전체 자동화",
    version="1.0.0"
)
class XinhuiYouTubeFullTask(BaseTask):
    """YouTube 전체 자동화 태스크"""
    
    async def execute(self, device) -> Any:
        """
        YouTube 전체 자동화 실행
        
        Parameters:
            keyword: 검색 키워드
            title: 영상 제목
            watch_time_min: 최소 시청 시간
            watch_time_max: 최대 시청 시간
            like_probability: 좋아요 확률
            comment_probability: 댓글 확률
            subscribe_probability: 구독 확률
            comment_text: 댓글 내용
        """
        params = self.config.parameters
        
        # 1. 검색 태스크 실행
        search_config = TaskConfig(
            name="search",
            parameters={
                "keyword": params.get("keyword", ""),
                "title": params.get("title", ""),
                "watch_time_min": params.get("watch_time_min", 30),
                "watch_time_max": params.get("watch_time_max", 120)
            }
        )
        search_task = XinhuiYouTubeSearchTask(search_config)
        await search_task.before_execute(device)
        search_result = await search_task.execute(device)
        
        # 2. 인게이지먼트 태스크 실행
        engagement_config = TaskConfig(
            name="engagement",
            parameters={
                "like_probability": params.get("like_probability", 30),
                "comment_probability": params.get("comment_probability", 10),
                "subscribe_probability": params.get("subscribe_probability", 5),
                "comment_text": params.get("comment_text", "")
            }
        )
        engagement_task = XinhuiYouTubeEngagementTask(engagement_config)
        await engagement_task.before_execute(device)
        engagement_result = await engagement_task.execute(device)
        
        # 3. 결과 병합
        return {
            **search_result,
            **engagement_result
        }


@TaskRegistry.register(
    name="xinhui_screenshot",
    description="xinhui를 사용한 빠른 화면 캡처",
    version="1.0.0"
)
class XinhuiScreenshotTask(BaseTask):
    """빠른 화면 캡처 태스크"""
    
    async def execute(self, device) -> Any:
        """
        화면 캡처
        
        Parameters:
            save_path: 저장 경로
            use_xinhui: xinhui 사용 여부 (더 빠름)
        """
        params = self.config.parameters
        save_path = params.get("save_path", "screenshot.png")
        use_xinhui = params.get("use_xinhui", True)
        
        device_id = f"{device.serial}"
        
        if use_xinhui:
            capture = get_screen_capture()
            data = capture.capture(device_id, save_path)
            success = data is not None
        else:
            device.screenshot(save_path)
            success = True
        
        return {
            "path": save_path,
            "success": success,
            "method": "xinhui" if use_xinhui else "adb"
        }

