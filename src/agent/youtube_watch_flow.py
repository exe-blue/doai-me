"""
YouTube 시청 요청 플로우

10단계 시청 프로세스:
0. 5개 중 랜덤 배정
1. 키워드로 검색
2. 필터를 "Last Hour"로 변경
3. 키워드 기준 제목 검증 -> 3페이지까지 이동
4. 없을 경우 "제목"으로 검색
5-1. 제목도 없으면 에러
5-2. 제목이 있으면 클릭하여 시청
6. 시청 시간 20~90% (10~15초마다 더블탭)
7. 좋아요 확률에 따라 좋아요 후 스크랩
8. 댓글 확률에 따라 댓글
9. 투자 키워드로 검색 1회, 1페이지 스크롤
10. 1번으로 돌아감
"""

import asyncio
import random
import logging
from typing import Optional, Tuple, Any, List
from dataclasses import dataclass
from datetime import datetime

from src.agent.activity_types import RequestActivity, RequestBatch
from src.controller.hid_input import HIDInput, get_hid_input
from src.controller.xinhui_controller import get_hybrid_controller

logger = logging.getLogger(__name__)


@dataclass
class WatchResult:
    """시청 결과"""
    success: bool
    request_id: str
    video_found: bool = False
    search_method: str = ""      # "keyword" or "title"
    watch_duration: int = 0      # 실제 시청 시간 (초)
    liked: bool = False
    commented: bool = False
    error_message: Optional[str] = None
    completed_at: datetime = None
    
    def __post_init__(self):
        if self.completed_at is None:
            self.completed_at = datetime.now()


class YouTubeWatchFlow:
    """
    YouTube 시청 요청 플로우 실행기
    
    HID 입력을 사용하여 봇 감지를 우회합니다.
    """
    
    # YouTube 앱 UI 좌표 (1080x1920 기준, 조정 필요)
    COORDS = {
        # 검색
        "search_icon": (980, 80),
        "search_input": (540, 160),
        "search_clear": (980, 160),
        
        # 필터
        "filter_button": (980, 240),
        "filter_last_hour": (200, 400),  # "지난 1시간" 필터
        "filter_apply": (540, 1800),
        
        # 영상
        "first_video": (540, 500),
        "video_area": (540, 400),
        
        # 플레이어
        "player_center": (540, 350),
        "player_right": (800, 350),  # 더블탭 앞으로
        
        # 인게이지먼트
        "like_button": (100, 680),
        "save_button": (300, 680),
        "comment_button": (200, 680),
        "comment_input": (540, 1600),
        "comment_submit": (980, 160),
        
        # 네비게이션
        "back_button": (60, 80),
        "home_button": (108, 1850),
    }
    
    def __init__(self, device, hid: Optional[HIDInput] = None):
        """
        Args:
            device: uiautomator2 Device 객체
            hid: HIDInput 인스턴스 (None이면 자동 생성)
        """
        self.device = device
        self.device_id = str(device.serial)
        self.hid = hid or get_hid_input()
        self.hybrid = get_hybrid_controller()
        self.logger = logging.getLogger(f"{__name__}.{self.device_id}")
    
    async def execute_request(self, request: RequestActivity) -> WatchResult:
        """
        단일 요청 실행
        
        Args:
            request: 요청 활동
            
        Returns:
            시청 결과
        """
        self.logger.info(f"[{request.id}] 시청 요청 시작: {request.keyword} / {request.title}")
        
        try:
            # 1. 키워드로 검색
            await self._search_keyword(request.keyword)
            
            # 2. 필터 "Last Hour" 적용
            await self._apply_last_hour_filter()
            
            # 3. 제목으로 영상 찾기 (3페이지까지)
            video_found, search_method = await self._find_video_by_title(
                request.title, 
                max_pages=3
            )
            
            # 4. 키워드로 못 찾으면 제목으로 재검색
            if not video_found:
                self.logger.info(f"[{request.id}] 키워드 검색 실패, 제목으로 재검색")
                await self._search_keyword(request.title)
                await self._apply_last_hour_filter()
                video_found, _ = await self._find_video_by_title(request.title, max_pages=1)
                search_method = "title"
            
            # 5-1. 제목도 없으면 에러
            if not video_found:
                self.logger.warning(f"[{request.id}] 영상을 찾을 수 없음")
                return WatchResult(
                    success=False,
                    request_id=request.id,
                    video_found=False,
                    error_message="영상을 찾을 수 없습니다."
                )
            
            # 5-2. 영상 클릭 및 시청
            await self._click_found_video()
            await asyncio.sleep(3)  # 영상 로딩 대기
            
            # 6. 시청 (20~90%, 10~15초마다 더블탭)
            watch_percent = random.randint(request.watch_percent_min, request.watch_percent_max)
            watch_duration = await self._watch_video(watch_percent)
            
            # 7. 좋아요 확률에 따라 좋아요 & 스크랩
            liked = False
            if random.randint(1, 100) <= request.like_probability:
                liked = await self._like_and_save()
            
            # 8. 댓글 확률에 따라 댓글
            commented = False
            if random.randint(1, 100) <= request.comment_probability and request.comment_text:
                commented = await self._write_comment(request.comment_text)
            
            # 9. 투자 키워드 검색 1회
            if request.investment_keyword:
                await self._search_investment_keyword(request.investment_keyword)
            
            self.logger.info(f"[{request.id}] 시청 완료: {watch_duration}초, 좋아요={liked}, 댓글={commented}")
            
            return WatchResult(
                success=True,
                request_id=request.id,
                video_found=True,
                search_method=search_method,
                watch_duration=watch_duration,
                liked=liked,
                commented=commented
            )
            
        except Exception as e:
            self.logger.error(f"[{request.id}] 시청 실패: {e}")
            return WatchResult(
                success=False,
                request_id=request.id,
                error_message=str(e)
            )
    
    async def _search_keyword(self, keyword: str):
        """키워드 검색"""
        self.logger.debug(f"검색: {keyword}")
        
        # 검색 아이콘 클릭
        self.hid.tap(self.device_id, *self.COORDS["search_icon"], natural=True)
        await asyncio.sleep(1)
        
        # 기존 텍스트 클리어
        self.hid.tap(self.device_id, *self.COORDS["search_clear"], natural=True)
        await asyncio.sleep(0.3)
        
        # 키워드 입력 (한글 지원)
        self.hid.type_text(self.device_id, keyword, human_like=True)
        await asyncio.sleep(0.5)
        
        # 검색 실행
        self.hid.press_enter(self.device_id)
        await asyncio.sleep(2)
    
    async def _apply_last_hour_filter(self):
        """'지난 1시간' 필터 적용"""
        self.logger.debug("필터 적용: Last Hour")
        
        # 필터 버튼 클릭
        self.hid.tap(self.device_id, *self.COORDS["filter_button"], natural=True)
        await asyncio.sleep(1)
        
        # "업로드 날짜" 섹션에서 "지난 1시간" 선택
        # UI에서 텍스트로 찾기
        if self.device(textContains="지난 1시간").exists(timeout=2):
            element = self.device(textContains="지난 1시간")
            bounds = element.info.get("bounds", {})
            cx = (bounds.get("left", 0) + bounds.get("right", 1080)) // 2
            cy = (bounds.get("top", 0) + bounds.get("bottom", 1920)) // 2
            self.hid.tap(self.device_id, cx, cy, natural=True)
        elif self.device(textContains="Last hour").exists(timeout=2):
            element = self.device(textContains="Last hour")
            bounds = element.info.get("bounds", {})
            cx = (bounds.get("left", 0) + bounds.get("right", 1080)) // 2
            cy = (bounds.get("top", 0) + bounds.get("bottom", 1920)) // 2
            self.hid.tap(self.device_id, cx, cy, natural=True)
        else:
            # 기본 좌표 사용
            self.hid.tap(self.device_id, *self.COORDS["filter_last_hour"], natural=True)
        
        await asyncio.sleep(1)
        
        # 적용 버튼 (있는 경우)
        if self.device(textContains="적용").exists(timeout=1):
            self.device(textContains="적용").click()
        
        await asyncio.sleep(2)
    
    async def _find_video_by_title(self, title: str, max_pages: int = 3) -> Tuple[bool, str]:
        """
        제목으로 영상 찾기
        
        Args:
            title: 찾을 제목
            max_pages: 최대 스크롤 페이지
            
        Returns:
            (찾음 여부, 검색 방법)
        """
        self.logger.debug(f"영상 검색: {title} (최대 {max_pages}페이지)")
        
        for page in range(max_pages):
            # 제목 포함 영상 찾기
            if self.device(textContains=title).exists(timeout=2):
                self.logger.info(f"영상 발견 (페이지 {page + 1})")
                self._found_video_element = self.device(textContains=title)
                return True, "keyword"
            
            # 아래로 스크롤
            self.hid.scroll_up(self.device_id)
            await asyncio.sleep(1.5)
        
        return False, ""
    
    async def _click_found_video(self):
        """찾은 영상 클릭"""
        if hasattr(self, '_found_video_element') and self._found_video_element:
            bounds = self._found_video_element.info.get("bounds", {})
            cx = (bounds.get("left", 0) + bounds.get("right", 1080)) // 2
            cy = (bounds.get("top", 0) + bounds.get("bottom", 1920)) // 2
            self.hid.tap(self.device_id, cx, cy, natural=True)
        else:
            # 첫 번째 영상 클릭
            self.hid.tap(self.device_id, *self.COORDS["first_video"], natural=True)
    
    async def _watch_video(self, watch_percent: int) -> int:
        """
        영상 시청
        
        Args:
            watch_percent: 시청 비율 (%)
            
        Returns:
            실제 시청 시간 (초)
        """
        self.logger.debug(f"시청 시작: {watch_percent}%")
        
        # 영상 길이 추정 (실제로는 UI에서 가져와야 함)
        # 일단 평균 5분(300초)으로 가정
        estimated_duration = 300
        target_watch_time = int(estimated_duration * watch_percent / 100)
        
        # 시청 시뮬레이션
        watched_time = 0
        
        while watched_time < target_watch_time:
            # 10~15초 간격으로 더블탭 (앞으로 가기)
            wait_time = random.randint(10, 15)
            await asyncio.sleep(min(wait_time, target_watch_time - watched_time))
            watched_time += wait_time
            
            if watched_time < target_watch_time:
                # 더블탭으로 앞으로 가기 (오른쪽 영역)
                self.hid.double_tap(
                    self.device_id, 
                    *self.COORDS["player_right"], 
                    natural=True
                )
                self.logger.debug(f"더블탭 앞으로: {watched_time}초 경과")
        
        return watched_time
    
    async def _like_and_save(self) -> bool:
        """좋아요 및 스크랩"""
        self.logger.debug("좋아요 & 스크랩")
        
        try:
            # 좋아요 버튼 클릭
            if self.device(descriptionContains="like").exists(timeout=2):
                element = self.device(descriptionContains="like")
                bounds = element.info.get("bounds", {})
                cx = (bounds.get("left", 0) + bounds.get("right", 1080)) // 2
                cy = (bounds.get("top", 0) + bounds.get("bottom", 1920)) // 2
                self.hid.tap(self.device_id, cx, cy, natural=True)
            else:
                self.hid.tap(self.device_id, *self.COORDS["like_button"], natural=True)
            
            await asyncio.sleep(0.5)
            
            # 저장 버튼 클릭
            if self.device(descriptionContains="Save").exists(timeout=2):
                element = self.device(descriptionContains="Save")
                bounds = element.info.get("bounds", {})
                cx = (bounds.get("left", 0) + bounds.get("right", 1080)) // 2
                cy = (bounds.get("top", 0) + bounds.get("bottom", 1920)) // 2
                self.hid.tap(self.device_id, cx, cy, natural=True)
            else:
                self.hid.tap(self.device_id, *self.COORDS["save_button"], natural=True)
            
            await asyncio.sleep(1)
            return True
            
        except Exception as e:
            self.logger.warning(f"좋아요/스크랩 실패: {e}")
            return False
    
    async def _write_comment(self, comment: str) -> bool:
        """댓글 작성"""
        self.logger.debug(f"댓글 작성: {comment[:20]}...")
        
        try:
            # 댓글 영역으로 스크롤
            self.hid.scroll_up(self.device_id)
            await asyncio.sleep(1)
            
            # 댓글 입력창 클릭
            if self.device(textContains="댓글 추가").exists(timeout=2):
                self.device(textContains="댓글 추가").click()
            elif self.device(textContains="Add a comment").exists(timeout=2):
                self.device(textContains="Add a comment").click()
            else:
                self.hid.tap(self.device_id, *self.COORDS["comment_input"], natural=True)
            
            await asyncio.sleep(1)
            
            # 댓글 입력 (한글 지원)
            self.hid.type_text(self.device_id, comment, human_like=True)
            await asyncio.sleep(0.5)
            
            # 게시 버튼 클릭
            if self.device(textContains="게시").exists(timeout=2):
                self.device(textContains="게시").click()
            elif self.device(textContains="Post").exists(timeout=2):
                self.device(textContains="Post").click()
            else:
                self.hid.tap(self.device_id, *self.COORDS["comment_submit"], natural=True)
            
            await asyncio.sleep(2)
            return True
            
        except Exception as e:
            self.logger.warning(f"댓글 작성 실패: {e}")
            return False
    
    async def _search_investment_keyword(self, keyword: str):
        """투자 키워드 검색"""
        self.logger.debug(f"투자 키워드 검색: {keyword}")
        
        # 뒤로가기
        self.hid.press_back(self.device_id)
        await asyncio.sleep(1)
        
        # 검색
        await self._search_keyword(keyword)
        
        # 1페이지 스크롤
        for _ in range(3):
            self.hid.scroll_up(self.device_id)
            await asyncio.sleep(random.uniform(1.5, 3.0))
        
        self.logger.debug("투자 키워드 검색 완료")


class BatchExecutor:
    """
    배치 실행기
    
    5개 단위 배치를 랜덤 순서로 실행합니다.
    """
    
    def __init__(self, device, hid: Optional[HIDInput] = None):
        """
        Args:
            device: uiautomator2 Device 객체
            hid: HIDInput 인스턴스
        """
        self.device = device
        self.device_id = str(device.serial)
        self.flow = YouTubeWatchFlow(device, hid)
        self.logger = logging.getLogger(f"{__name__}.BatchExecutor.{self.device_id}")
    
    async def execute_batch(self, batch: RequestBatch) -> List[WatchResult]:
        """
        배치 실행
        
        Args:
            batch: 요청 배치
            
        Returns:
            시청 결과 리스트
        """
        self.logger.info(f"배치 실행 시작: {batch.batch_id} ({len(batch.requests)}개 요청)")
        
        results = []
        
        # 랜덤 순서로 요청 가져오기
        requests = batch.get_random_order()
        
        for i, request in enumerate(requests):
            self.logger.info(f"[{i+1}/{len(requests)}] 요청 처리: {request.id}")
            
            # 투자 키워드 할당
            request.investment_keyword = random.choice(batch.investment_keywords)
            
            # 요청 실행
            request.status = "in_progress"
            result = await self.flow.execute_request(request)
            
            # 상태 업데이트
            if result.success:
                request.status = "completed"
            else:
                request.status = "error"
                request.error_message = result.error_message
            
            results.append(result)
            
            # 다음 요청 전 잠시 대기
            if i < len(requests) - 1:
                delay = random.uniform(3, 8)
                self.logger.debug(f"다음 요청까지 {delay:.1f}초 대기")
                await asyncio.sleep(delay)
        
        self.logger.info(f"배치 완료: {sum(1 for r in results if r.success)}/{len(results)} 성공")
        return results

