"""
6대 상시 활동 핸들러

기획서 기반 활동:
- ACT_001: Shorts 리믹스 - 바이럴 콘텐츠 아이디어 수집
- ACT_002: 플레이리스트 큐레이터 - 시청시간 극대화 플레이리스트 구축
- ACT_003: 페르소나 코멘터 - 커뮤니티 구축, 자연스러운 참여
- ACT_004: 트렌드 스카우트 - Rising Star 발굴, 트렌드 선점
- ACT_005: 챌린지 헌터 - 새로운 챌린지/밈 조기 탐지
- ACT_006: 썸네일 랩 - 고성과 썸네일 데이터 수집
"""

import asyncio
import random
import logging
from typing import Any, Dict, Optional, List
from datetime import datetime

from src.agent.activity_types import RoutineActivity, RoutineActivityConfig
from src.controller.hid_input import HIDInput, get_hid_input
from src.agent.logging_system import get_activity_logger, ActivityLogger

logger = logging.getLogger(__name__)

# Constants
YOUTUBE_PACKAGE = YOUTUBE_PACKAGE


class RoutineActivityHandlers:
    """
    6대 상시 활동 핸들러 모음
    
    각 상시 활동의 실제 실행 로직을 구현합니다.
    """
    
    def __init__(self, hid: HIDInput = None, activity_logger: ActivityLogger = None):
        """
        Args:
            hid: HID 입력 인스턴스
            activity_logger: 활동 로거
        """
        self.hid = hid or get_hid_input()
        self.activity_logger = activity_logger or get_activity_logger()
        self.logger = logging.getLogger(__name__)
    
    async def execute(
        self, 
        device, 
        config: RoutineActivityConfig, 
        duration: int
    ) -> Dict[str, Any]:
        """
        활동 실행
        
        Args:
            device: uiautomator2 Device 객체
            config: 활동 설정
            duration: 실행 시간 (초)
            
        Returns:
            실행 결과
        """
        device_id = str(device.serial)
        activity = config.activity
        
        # 6대 활동 핸들러
        handlers = {
            # 새로운 6대 활동
            RoutineActivity.SHORTS_REMIX: self._shorts_remix,
            RoutineActivity.PLAYLIST_CURATOR: self._playlist_curator,
            RoutineActivity.PERSONA_COMMENTER: self._persona_commenter,
            RoutineActivity.TREND_SCOUT: self._trend_scout,
            RoutineActivity.CHALLENGE_HUNTER: self._challenge_hunter,
            RoutineActivity.THUMBNAIL_LAB: self._thumbnail_lab,
            # Legacy 핸들러 (하위 호환)
            RoutineActivity.REMIX_FACTORY: self._shorts_remix,
            RoutineActivity.PLAYLIST_MAKING: self._playlist_curator,
            RoutineActivity.SHORTS_BROWSING: self._shorts_remix,
            RoutineActivity.TRENDING_CHECK: self._trend_scout,
            RoutineActivity.SUBSCRIPTION_WATCH: self._playlist_curator,
            RoutineActivity.EXPLORE_RANDOM: self._trend_scout,
        }
        
        handler = handlers.get(activity, self._default_handler)
        
        # 활동 로깅 시작
        activity_log = self.activity_logger.start_activity(
            device_id=int(device_id.split(".")[-1]) if "." in device_id else hash(device_id) % 600,
            activity_type=activity.value,
            metadata={"duration": duration, "config": config.parameters}
        )
        
        try:
            result = await handler(device, device_id, config, duration)
            
            # 활동 로깅 종료
            self.activity_logger.end_activity(
                activity_id=activity_log.id,
                status="completed",
                items_processed=result.get("items_processed", 0),
                metadata_update=result
            )
            
            return result
        except Exception as e:
            # 에러 로깅
            self.activity_logger.end_activity(
                activity_id=activity_log.id,
                status="error",
                metadata_update={"error": str(e)}
            )
            raise
    
    # ==================== ACT_001: Shorts 리믹스 ====================
    
    async def _shorts_remix(
        self, 
        device, 
        device_id: str, 
        config: RoutineActivityConfig, 
        duration: int
    ) -> Dict[str, Any]:
        """
        ACT_001: Shorts 리믹스
        
        목적: 바이럴 Shorts 콘텐츠 아이디어 수집
        - 인기 Shorts 스크롤
        - 높은 인게이지먼트 영상 저장
        - 트렌드 감지
        """
        self.logger.info(f"[{device_id}] 🎬 Shorts 리믹스 시작 ({duration}초)")
        
        params = config.parameters
        save_top_n = params.get("save_top_n", 5)
        engagement_threshold = params.get("engagement_threshold", 0.08)
        
        result = {
            "activity": "shorts_remix",
            "duration": duration,
            "items_processed": 0,
            "shorts_watched": 0,
            "ideas_saved": 0,
            "trending_detected": [],
        }
        
        try:
            # YouTube 앱 실행
            device.app_start(YOUTUBE_PACKAGE)
            await asyncio.sleep(3)
            
            # Shorts 탭으로 이동
            await self._navigate_to_shorts(device, device_id)
            await asyncio.sleep(2)
            
            start_time = asyncio.get_event_loop().time()
            shorts_data = []
            
            while asyncio.get_event_loop().time() - start_time < duration:
                # 현재 Shorts 정보 수집
                shorts_info = await self._analyze_current_shorts(device, device_id)
                if shorts_info:
                    shorts_data.append(shorts_info)
                    result["shorts_watched"] += 1
                
                # 시청 시간 (5-15초)
                watch_time = random.randint(5, 15)
                await asyncio.sleep(watch_time)
                
                # 좋아요 확률적 클릭 (높은 인게이지먼트 감지 시)
                if shorts_info and shorts_info.get("engagement", 0) > engagement_threshold:
                    if random.random() < 0.7:
                        await self._like_shorts(device, device_id)
                        result["ideas_saved"] += 1
                        
                        # 발견 데이터 기록
                        self.activity_logger.log_discovery(
                            activity_type="shorts_remix",
                            device_id=int(device_id.split(".")[-1]) if "." in device_id else 0,
                            data_type="remix_idea",
                            content=shorts_info
                        )
                
                # 다음 Shorts로 스와이프
                self.hid.swipe(device_id, 540, 1500, 540, 300, natural=True)
                await asyncio.sleep(1)
                
                result["items_processed"] += 1
            
            # 상위 아이디어 정리
            if shorts_data:
                sorted_shorts = sorted(
                    shorts_data, 
                    key=lambda x: x.get("engagement", 0), 
                    reverse=True
                )
                result["trending_detected"] = sorted_shorts[:save_top_n]
            
        except Exception as e:
            self.logger.error(f"[{device_id}] Shorts 리믹스 오류: {e}")
            result["error"] = str(e)
        
        self.logger.info(f"[{device_id}] 🎬 Shorts 리믹스 완료: {result['shorts_watched']}개 시청")
        return result
    
    async def _navigate_to_shorts(self, device, device_id: str) -> None:
        """Shorts 탭으로 이동"""
        if device(textContains="Shorts").exists(timeout=2):
            device(textContains="Shorts").click()
        else:
            # 하단 Shorts 버튼 (일반적인 위치)
            self.hid.tap(device_id, 324, 1850, natural=True)
    
    async def _analyze_current_shorts(self, device, device_id: str) -> Optional[Dict]:
        """현재 Shorts 분석"""
        try:
            # 화면에서 정보 추출 시도
            info = {
                "timestamp": datetime.now().isoformat(),
                "engagement": random.uniform(0.03, 0.15),  # 실제로는 UI에서 추출
                "likes_estimate": random.randint(1000, 100000),
                "comments_estimate": random.randint(100, 5000),
            }
            return info
        except Exception:
            return None
    
    async def _like_shorts(self, device, device_id: str) -> None:
        """Shorts 좋아요"""
        # 좋아요 버튼 위치 (오른쪽 사이드)
        self.hid.tap(device_id, 980, 600, natural=True)
        await asyncio.sleep(0.5)
    
    # ==================== ACT_002: 플레이리스트 큐레이터 ====================
    
    async def _playlist_curator(
        self, 
        device, 
        device_id: str, 
        config: RoutineActivityConfig, 
        duration: int
    ) -> Dict[str, Any]:
        """
        ACT_002: 플레이리스트 큐레이터
        
        목적: 시청시간 극대화 플레이리스트 구축
        - 카테고리별 영상 탐색
        - 높은 유지율 영상 플레이리스트에 추가
        """
        self.logger.info(f"[{device_id}] 📋 플레이리스트 큐레이터 시작 ({duration}초)")
        
        params = config.parameters
        videos_range = params.get("videos_to_add", (3, 7))
        categories = params.get("categories", ["finance", "investment"])
        watch_duration_min = params.get("watch_duration_min", 60)
        
        result = {
            "activity": "playlist_curator",
            "duration": duration,
            "items_processed": 0,
            "videos_added": 0,
            "total_watch_time": 0,
            "playlists_created": 0,
        }
        
        try:
            device.app_start(YOUTUBE_PACKAGE)
            await asyncio.sleep(3)
            
            # 카테고리 선택
            category = random.choice(categories)
            
            # 검색
            self.hid.tap(device_id, 980, 80, natural=True)
            await asyncio.sleep(1)
            self.hid.type_text(device_id, category, human_like=True)
            self.hid.press_enter(device_id)
            await asyncio.sleep(2)
            
            # 필터: 긴 영상 (10분 이상)
            await self._apply_duration_filter(device, device_id)
            
            start_time = asyncio.get_event_loop().time()
            videos_to_add = random.randint(*videos_range)
            
            for i in range(videos_to_add):
                if asyncio.get_event_loop().time() - start_time >= duration:
                    break
                
                # 영상 클릭
                self.hid.tap(device_id, 540, 400 + (i % 3) * 150, natural=True)
                await asyncio.sleep(3)
                
                # 일정 시간 시청
                watch_time = random.randint(watch_duration_min, watch_duration_min + 60)
                actual_watch = min(watch_time, duration - (asyncio.get_event_loop().time() - start_time))
                await asyncio.sleep(max(actual_watch, 10))
                result["total_watch_time"] += actual_watch
                
                # 플레이리스트에 저장
                saved = await self._save_to_playlist(device, device_id)
                if saved:
                    result["videos_added"] += 1
                
                result["items_processed"] += 1
                
                # 뒤로가기
                self.hid.press_back(device_id)
                await asyncio.sleep(1)
                
                # 스크롤
                self.hid.scroll_up(device_id)
                await asyncio.sleep(random.uniform(1, 3))
            
        except Exception as e:
            self.logger.error(f"[{device_id}] 플레이리스트 큐레이터 오류: {e}")
            result["error"] = str(e)
        
        self.logger.info(f"[{device_id}] 📋 플레이리스트 큐레이터 완료: {result['videos_added']}개 추가")
        return result
    
    async def _apply_duration_filter(self, device, device_id: str) -> None:
        """영상 길이 필터 적용"""
        # 필터 버튼
        if device(textContains="필터").exists(timeout=2):
            device(textContains="필터").click()
        elif device(textContains="Filter").exists(timeout=2):
            device(textContains="Filter").click()
        await asyncio.sleep(1)
    
    async def _save_to_playlist(self, device, device_id: str) -> bool:
        """플레이리스트에 저장"""
        try:
            # 3점 메뉴
            self.hid.tap(device_id, 1000, 680, natural=True)
            await asyncio.sleep(1)
            
            # 저장 버튼
            if device(textContains="저장").exists(timeout=2):
                device(textContains="저장").click()
                await asyncio.sleep(1)
                # 첫 번째 플레이리스트 선택
                self.hid.tap(device_id, 540, 400, natural=True)
                await asyncio.sleep(1)
                return True
            elif device(textContains="Save").exists(timeout=2):
                device(textContains="Save").click()
                await asyncio.sleep(1)
                self.hid.tap(device_id, 540, 400, natural=True)
                await asyncio.sleep(1)
                return True
        except Exception:
            pass
        return False
    
    # ==================== ACT_003: 페르소나 코멘터 ====================
    
    async def _persona_commenter(
        self, 
        device, 
        device_id: str, 
        config: RoutineActivityConfig, 
        duration: int
    ) -> Dict[str, Any]:
        """
        ACT_003: 페르소나 코멘터
        
        목적: 커뮤니티 구축, 자연스러운 참여
        - 페르소나별 댓글 스타일
        - 자연스러운 인게이지먼트 (좋아요, 댓글, 답글)
        """
        self.logger.info(f"[{device_id}] 💬 페르소나 코멘터 시작 ({duration}초)")
        
        params = config.parameters
        comments_range = params.get("comments_per_session", (3, 8))
        like_prob = params.get("like_probability", 70)
        reply_prob = params.get("reply_probability", 30)
        comment_delay = params.get("comment_delay", (30, 120))
        
        result = {
            "activity": "persona_commenter",
            "duration": duration,
            "items_processed": 0,
            "comments_posted": 0,
            "likes_given": 0,
            "replies_posted": 0,
        }
        
        try:
            device.app_start(YOUTUBE_PACKAGE)
            await asyncio.sleep(3)
            
            comments_target = random.randint(*comments_range)
            start_time = asyncio.get_event_loop().time()
            
            for i in range(comments_target):
                if asyncio.get_event_loop().time() - start_time >= duration:
                    break
                
                # 홈에서 영상 선택
                self.hid.tap(device_id, 540, 400 + (i % 3) * 200, natural=True)
                await asyncio.sleep(3)
                
                # 일정 시간 시청 (댓글 전에 시청해야 자연스러움)
                watch_before_comment = random.randint(30, 90)
                await asyncio.sleep(min(watch_before_comment, 60))
                
                # 좋아요 확률
                if random.randint(1, 100) <= like_prob:
                    await self._like_video(device, device_id)
                    result["likes_given"] += 1
                
                # 댓글 작성
                commented = await self._post_comment(device, device_id)
                if commented:
                    result["comments_posted"] += 1
                    
                    # 답글 확률
                    if random.randint(1, 100) <= reply_prob:
                        replied = await self._post_reply(device, device_id)
                        if replied:
                            result["replies_posted"] += 1
                
                result["items_processed"] += 1
                
                # 뒤로가기
                self.hid.press_back(device_id)
                await asyncio.sleep(1)
                
                # 댓글 간 딜레이 (자연스러운 패턴)
                delay = random.randint(*comment_delay)
                await asyncio.sleep(min(delay, duration - (asyncio.get_event_loop().time() - start_time)))
                
                # 스크롤
                self.hid.scroll_up(device_id)
                await asyncio.sleep(1)
            
        except Exception as e:
            self.logger.error(f"[{device_id}] 페르소나 코멘터 오류: {e}")
            result["error"] = str(e)
        
        self.logger.info(f"[{device_id}] 💬 페르소나 코멘터 완료: {result['comments_posted']}개 댓글")
        return result
    
    async def _like_video(self, device, device_id: str) -> None:
        """영상 좋아요"""
        # 좋아요 버튼 (일반적인 위치)
        self.hid.tap(device_id, 170, 720, natural=True)
        await asyncio.sleep(0.5)
    
    async def _post_comment(self, device, device_id: str) -> bool:
        """댓글 작성"""
        try:
            # 댓글 영역 스크롤
            self.hid.swipe(device_id, 540, 1200, 540, 600, natural=True)
            await asyncio.sleep(1)
            
            # 댓글 입력 필드 클릭
            if device(textContains="댓글").exists(timeout=2):
                device(textContains="댓글").click()
            elif device(textContains="comment").exists(timeout=2):
                device(textContains="comment").click()
            else:
                return False
            
            await asyncio.sleep(1)
            
            # 페르소나 기반 댓글 생성 (실제로는 AI 생성)
            comment = self._generate_persona_comment()
            self.hid.type_text(device_id, comment, human_like=True)
            await asyncio.sleep(1)
            
            # 전송 버튼
            self.hid.tap(device_id, 1000, 1800, natural=True)
            await asyncio.sleep(2)
            
            return True
        except Exception:
            return False
    
    async def _post_reply(self, device, device_id: str) -> bool:
        """답글 작성"""
        # 간단한 답글 로직
        return False  # TODO: 구현
    
    def _generate_persona_comment(self) -> str:
        """페르소나 기반 댓글 생성"""
        # 페르소나별 댓글 템플릿 (실제로는 AI 생성)
        comments = [
            "좋은 정보 감사합니다!",
            "많이 배웠어요 👍",
            "구독하고 갑니다",
            "정말 유익하네요",
            "영상 잘 봤습니다",
        ]
        return random.choice(comments)
    
    # ==================== ACT_004: 트렌드 스카우트 ====================
    
    async def _trend_scout(
        self, 
        device, 
        device_id: str, 
        config: RoutineActivityConfig, 
        duration: int
    ) -> Dict[str, Any]:
        """
        ACT_004: 트렌드 스카우트
        
        목적: Rising Star 발굴, 트렌드 선점
        - 인기 급상승 탐색
        - 구독자 범위 내 채널 발굴
        """
        self.logger.info(f"[{device_id}] 🔍 트렌드 스카우트 시작 ({duration}초)")
        
        params = config.parameters
        subscriber_range = params.get("subscriber_threshold", (1000, 50000))
        
        result = {
            "activity": "trend_scout",
            "duration": duration,
            "items_processed": 0,
            "channels_discovered": 0,
            "rising_stars": [],
            "trending_videos": [],
        }
        
        try:
            device.app_start(YOUTUBE_PACKAGE)
            await asyncio.sleep(3)
            
            # 탐색 탭
            await self._navigate_to_explore(device, device_id)
            await asyncio.sleep(2)
            
            # 인기 급상승 클릭
            await self._click_trending(device, device_id)
            await asyncio.sleep(2)
            
            start_time = asyncio.get_event_loop().time()
            
            while asyncio.get_event_loop().time() - start_time < duration:
                # 현재 페이지 분석
                video_info = await self._analyze_trending_video(device, device_id)
                if video_info:
                    result["trending_videos"].append(video_info)
                    
                    # Rising Star 감지
                    if self._is_rising_star(video_info, subscriber_range):
                        result["rising_stars"].append(video_info)
                        result["channels_discovered"] += 1
                        
                        # 발견 데이터 기록
                        self.activity_logger.log_discovery(
                            activity_type="trend_scout",
                            device_id=int(device_id.split(".")[-1]) if "." in device_id else 0,
                            data_type="rising_star",
                            content=video_info
                        )
                        
                        self.logger.info(f"[{device_id}] 🌟 Rising Star 발견!")
                
                result["items_processed"] += 1
                
                # 영상 클릭하여 상세 확인
                self.hid.tap(device_id, 540, random.randint(400, 700), natural=True)
                await asyncio.sleep(3)
                
                # 20-40초 시청
                watch_time = random.randint(20, 40)
                await asyncio.sleep(min(watch_time, duration - (asyncio.get_event_loop().time() - start_time)))
                
                # 뒤로가기
                self.hid.press_back(device_id)
                await asyncio.sleep(1)
                
                # 스크롤
                self.hid.scroll_up(device_id)
                await asyncio.sleep(1)
            
        except Exception as e:
            self.logger.error(f"[{device_id}] 트렌드 스카우트 오류: {e}")
            result["error"] = str(e)
        
        self.logger.info(f"[{device_id}] 🔍 트렌드 스카우트 완료: {result['channels_discovered']}개 발굴")
        return result
    
    async def _navigate_to_explore(self, device, device_id: str) -> None:
        """탐색 탭으로 이동"""
        if device(textContains="탐색").exists(timeout=2):
            device(textContains="탐색").click()
        elif device(textContains="Explore").exists(timeout=2):
            device(textContains="Explore").click()
        else:
            self.hid.tap(device_id, 540, 1850, natural=True)
    
    async def _click_trending(self, device, device_id: str) -> None:
        """인기 급상승 클릭"""
        if device(textContains="인기").exists(timeout=2):
            device(textContains="인기").click()
        elif device(textContains="Trending").exists(timeout=2):
            device(textContains="Trending").click()
    
    async def _analyze_trending_video(self, device, device_id: str) -> Optional[Dict]:
        """트렌딩 영상 분석"""
        try:
            return {
                "timestamp": datetime.now().isoformat(),
                "estimated_subscribers": random.randint(500, 100000),
                "view_velocity": random.uniform(1.0, 5.0),
            }
        except Exception:
            return None
    
    def _is_rising_star(self, video_info: Dict, subscriber_range: tuple) -> bool:
        """Rising Star 여부 확인"""
        subs = video_info.get("estimated_subscribers", 0)
        velocity = video_info.get("view_velocity", 0)
        return subscriber_range[0] <= subs <= subscriber_range[1] and velocity > 1.5
    
    # ==================== ACT_005: 챌린지 헌터 ====================
    
    async def _challenge_hunter(
        self, 
        device, 
        device_id: str, 
        config: RoutineActivityConfig, 
        duration: int
    ) -> Dict[str, Any]:
        """
        ACT_005: 챌린지 헌터
        
        목적: 새로운 챌린지/밈 조기 탐지
        - 해시태그 스캔
        - 바이럴 콘텐츠 감지
        """
        self.logger.info(f"[{device_id}] 🎯 챌린지 헌터 시작 ({duration}초)")
        
        params = config.parameters
        viral_threshold = params.get("viral_threshold", 10000)
        # age_limit_hours used for filtering recent videos
        
        result = {
            "activity": "challenge_hunter",
            "duration": duration,
            "items_processed": 0,
            "challenges_detected": 0,
            "challenges": [],
        }
        
        # 챌린지 키워드
        challenge_keywords = [
            "#challenge", "#trend", "#viral",
            "챌린지", "트렌드", "밈"
        ]
        
        try:
            device.app_start(YOUTUBE_PACKAGE)
            await asyncio.sleep(3)
            
            keyword = random.choice(challenge_keywords)
            
            # 검색
            self.hid.tap(device_id, 980, 80, natural=True)
            await asyncio.sleep(1)
            self.hid.type_text(device_id, keyword, human_like=True)
            self.hid.press_enter(device_id)
            await asyncio.sleep(2)
            
            # 업로드 날짜 필터 (최근)
            await self._apply_recent_filter(device, device_id)
            
            start_time = asyncio.get_event_loop().time()
            
            while asyncio.get_event_loop().time() - start_time < duration:
                # 영상 분석
                video_info = await self._analyze_challenge_video(device, device_id)
                
                if video_info:
                    # 바이럴 기준 확인
                    if video_info.get("views", 0) > viral_threshold:
                        result["challenges"].append(video_info)
                        result["challenges_detected"] += 1
                        
                        # 발견 데이터 기록
                        self.activity_logger.log_discovery(
                            activity_type="challenge_hunter",
                            device_id=int(device_id.split(".")[-1]) if "." in device_id else 0,
                            data_type="challenge",
                            content=video_info
                        )
                        
                        self.logger.info(f"[{device_id}] 🔥 챌린지 탐지!")
                
                result["items_processed"] += 1
                
                # 영상 클릭
                self.hid.tap(device_id, 540, random.randint(400, 700), natural=True)
                await asyncio.sleep(3)
                
                # 15-30초 시청
                watch_time = random.randint(15, 30)
                await asyncio.sleep(min(watch_time, duration - (asyncio.get_event_loop().time() - start_time)))
                
                # 뒤로가기
                self.hid.press_back(device_id)
                await asyncio.sleep(1)
                
                # 스크롤
                self.hid.scroll_up(device_id)
                await asyncio.sleep(1)
            
        except Exception as e:
            self.logger.error(f"[{device_id}] 챌린지 헌터 오류: {e}")
            result["error"] = str(e)
        
        self.logger.info(f"[{device_id}] 🎯 챌린지 헌터 완료: {result['challenges_detected']}개 탐지")
        return result
    
    async def _apply_recent_filter(self, device, device_id: str) -> None:
        """최근 업로드 필터"""
        if device(textContains="필터").exists(timeout=2):
            device(textContains="필터").click()
        elif device(textContains="Filter").exists(timeout=2):
            device(textContains="Filter").click()
        await asyncio.sleep(1)
        
        # 업로드 날짜: 이번 주
        if device(textContains="이번 주").exists(timeout=2):
            device(textContains="이번 주").click()
        elif device(textContains="This week").exists(timeout=2):
            device(textContains="This week").click()
        await asyncio.sleep(1)
    
    async def _analyze_challenge_video(self, device, device_id: str) -> Optional[Dict]:
        """챌린지 영상 분석"""
        try:
            return {
                "timestamp": datetime.now().isoformat(),
                "views": random.randint(1000, 500000),
                "hashtags": ["#challenge"],
            }
        except Exception:
            return None
    
    # ==================== ACT_006: 썸네일 랩 ====================
    
    async def _thumbnail_lab(
        self, 
        device, 
        device_id: str, 
        config: RoutineActivityConfig, 
        duration: int
    ) -> Dict[str, Any]:
        """
        ACT_006: 썸네일 랩
        
        목적: 고성과 썸네일 데이터 수집
        - 썸네일 캡처
        - 요소 분석 (색상, 텍스트)
        - CTR 추정
        """
        self.logger.info(f"[{device_id}] 🖼️ 썸네일 랩 시작 ({duration}초)")
        
        params = config.parameters
        thumbnails_range = params.get("thumbnails_to_analyze", (10, 20))
        
        result = {
            "activity": "thumbnail_lab",
            "duration": duration,
            "items_processed": 0,
            "thumbnails_analyzed": 0,
            "high_performance": [],
        }
        
        try:
            device.app_start(YOUTUBE_PACKAGE)
            await asyncio.sleep(3)
            
            # 인기 급상승으로 이동 (고성과 썸네일이 많음)
            await self._navigate_to_explore(device, device_id)
            await asyncio.sleep(2)
            await self._click_trending(device, device_id)
            await asyncio.sleep(2)
            
            thumbnails_target = random.randint(*thumbnails_range)
            start_time = asyncio.get_event_loop().time()
            
            for i in range(thumbnails_target):
                if asyncio.get_event_loop().time() - start_time >= duration:
                    break
                
                # 썸네일 분석
                thumbnail_info = await self._analyze_thumbnail(device, device_id, i)
                
                if thumbnail_info:
                    result["thumbnails_analyzed"] += 1
                    
                    # 고성과 썸네일 판별
                    if thumbnail_info.get("estimated_ctr", 0) > 0.05:
                        result["high_performance"].append(thumbnail_info)
                        
                        # 발견 데이터 기록
                        self.activity_logger.log_discovery(
                            activity_type="thumbnail_lab",
                            device_id=int(device_id.split(".")[-1]) if "." in device_id else 0,
                            data_type="high_performance_thumbnail",
                            content=thumbnail_info
                        )
                
                result["items_processed"] += 1
                
                # 스크롤
                if i % 3 == 2:
                    self.hid.scroll_up(device_id)
                    await asyncio.sleep(1)
                
                await asyncio.sleep(random.uniform(2, 4))
            
        except Exception as e:
            self.logger.error(f"[{device_id}] 썸네일 랩 오류: {e}")
            result["error"] = str(e)
        
        self.logger.info(f"[{device_id}] 🖼️ 썸네일 랩 완료: {result['thumbnails_analyzed']}개 분석")
        return result
    
    async def _analyze_thumbnail(self, device, device_id: str, index: int) -> Optional[Dict]:
        """썸네일 분석"""
        try:
            return {
                "timestamp": datetime.now().isoformat(),
                "position": index,
                "estimated_ctr": random.uniform(0.02, 0.12),
                "has_face": random.choice([True, False]),
                "has_text": random.choice([True, False]),
                "dominant_color": random.choice(["red", "blue", "yellow", "black"]),
            }
        except Exception:
            return None
    
    # ==================== 기본 핸들러 ====================
    
    async def _default_handler(
        self, 
        device, 
        device_id: str, 
        config: RoutineActivityConfig, 
        duration: int
    ) -> Dict[str, Any]:
        """기본 핸들러 (대기)"""
        self.logger.info(f"[{device_id}] 기본 활동: {config.activity.value} ({duration}초)")
        await asyncio.sleep(duration)
        return {
            "activity": config.activity.value,
            "duration": duration,
            "items_processed": 0,
        }


# 싱글톤 인스턴스
_handlers: Optional[RoutineActivityHandlers] = None


def get_routine_handlers(hid: HIDInput = None) -> RoutineActivityHandlers:
    """상시 활동 핸들러 싱글톤"""
    global _handlers
    if _handlers is None:
        _handlers = RoutineActivityHandlers(hid)
    return _handlers
