"""
자연스러운 휴식 타이밍 시스템

봇 탐지를 회피하고 자연스러운 사용 패턴을 모방합니다.

기능:
- 시간대별 활동 강도 조절
- 태스크 간 자연스러운 딜레이
- 랜덤 휴식 (10% 확률)
- 활동 전환 딜레이
"""

import asyncio
import random
import logging
from datetime import datetime, time, timedelta
from typing import Dict, Optional, Tuple
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class RestType(str, Enum):
    """휴식 타입"""
    BETWEEN_TASKS = "between_tasks"           # 태스크 간
    BETWEEN_ACTIVITIES = "between_activities" # 활동 전환 시
    AFTER_INTERACTION = "after_interaction"   # 상호작용 후
    RANDOM_PAUSE = "random_pause"             # 랜덤 일시정지
    AFTER_ERROR = "after_error"               # 에러 후
    LONG_REST = "long_rest"                   # 장시간 휴식


@dataclass
class RestConfig:
    """휴식 설정"""
    # 태스크 간 딜레이 (초)
    between_tasks: Tuple[int, int] = (5, 30)
    
    # 활동 전환 딜레이 (초)
    between_activities: Tuple[int, int] = (30, 180)
    
    # 상호작용 후 딜레이 (댓글, 좋아요 후)
    after_interaction: Tuple[int, int] = (60, 300)
    
    # 랜덤 일시정지
    random_pause: Tuple[int, int] = (10, 60)
    random_pause_probability: float = 0.1  # 10%
    
    # 에러 후 대기
    after_error: Tuple[int, int] = (30, 120)
    
    # 장시간 휴식 (점심시간, 야간 등)
    long_rest: Tuple[int, int] = (300, 900)  # 5-15분


# 시간대별 활동 강도 (0.0 ~ 1.0)
# 낮은 값 = 적은 디바이스 활성화, 더 긴 휴식
TIME_INTENSITY = {
    # 야간 (00:00 - 06:00): 30% 가동
    (0, 6): 0.3,
    # 아침 (06:00 - 09:00): 60% 가동
    (6, 9): 0.6,
    # 오전 (09:00 - 12:00): 100% 가동
    (9, 12): 1.0,
    # 점심 (12:00 - 14:00): 80% 가동
    (12, 14): 0.8,
    # 오후 (14:00 - 18:00): 100% 가동
    (14, 18): 1.0,
    # 저녁 (18:00 - 21:00): 90% 가동
    (18, 21): 0.9,
    # 밤 (21:00 - 24:00): 50% 가동
    (21, 24): 0.5,
}


class RestTimingManager:
    """
    휴식 타이밍 관리자
    
    자연스러운 휴식 패턴을 생성하고 관리합니다.
    """
    
    def __init__(self, config: Optional[RestConfig] = None):
        self.config = config or RestConfig()
        self.logger = logging.getLogger(__name__)
        
        # 디바이스별 마지막 휴식 시간
        self._last_rest: Dict[int, datetime] = {}
        
        # 디바이스별 연속 활동 시간
        self._continuous_activity: Dict[int, datetime] = {}
    
    # ==================== 기본 딜레이 ====================
    
    async def wait_between_tasks(self, device_id: int = 0) -> float:
        """
        태스크 간 대기
        
        Returns:
            실제 대기한 시간 (초)
        """
        base_delay = random.uniform(*self.config.between_tasks)
        
        # 시간대별 조정
        intensity = self._get_time_intensity()
        adjusted_delay = base_delay / intensity if intensity > 0 else base_delay
        
        # 랜덤 변동 (±20%)
        final_delay = adjusted_delay * random.uniform(0.8, 1.2)
        
        self.logger.debug(f"[Device {device_id}] 태스크 간 대기: {final_delay:.1f}초")
        await asyncio.sleep(final_delay)
        
        return final_delay
    
    async def wait_between_activities(self, device_id: int = 0) -> float:
        """
        활동 전환 대기
        
        Returns:
            실제 대기한 시간 (초)
        """
        base_delay = random.uniform(*self.config.between_activities)
        
        # 시간대별 조정
        intensity = self._get_time_intensity()
        adjusted_delay = base_delay / intensity if intensity > 0 else base_delay
        
        # 긴 휴식일 경우 최대 제한
        final_delay = min(adjusted_delay, 300)  # 최대 5분
        
        self.logger.debug(f"[Device {device_id}] 활동 전환 대기: {final_delay:.1f}초")
        await asyncio.sleep(final_delay)
        
        self._last_rest[device_id] = datetime.now()
        return final_delay
    
    async def wait_after_interaction(self, device_id: int = 0) -> float:
        """
        상호작용 후 대기 (댓글, 좋아요 후)
        
        Returns:
            실제 대기한 시간 (초)
        """
        base_delay = random.uniform(*self.config.after_interaction)
        
        # 연속 상호작용 시 더 긴 대기
        interaction_count = self._get_recent_interaction_count(device_id)
        if interaction_count > 3:
            base_delay *= 1.5
        
        final_delay = base_delay * random.uniform(0.9, 1.1)
        
        self.logger.debug(f"[Device {device_id}] 상호작용 후 대기: {final_delay:.1f}초")
        await asyncio.sleep(final_delay)
        
        return final_delay
    
    async def wait_after_error(self, device_id: int = 0) -> float:
        """
        에러 후 대기
        
        Returns:
            실제 대기한 시간 (초)
        """
        delay = random.uniform(*self.config.after_error)
        
        self.logger.debug(f"[Device {device_id}] 에러 후 대기: {delay:.1f}초")
        await asyncio.sleep(delay)
        
        return delay
    
    # ==================== 랜덤 휴식 ====================
    
    async def maybe_random_pause(self, device_id: int = 0) -> float:
        """
        랜덤 휴식 (10% 확률)
        
        Returns:
            대기한 시간 (0이면 휴식 안함)
        """
        if random.random() > self.config.random_pause_probability:
            return 0.0
        
        delay = random.uniform(*self.config.random_pause)
        
        self.logger.info(f"[Device {device_id}] 🛋️ 랜덤 휴식: {delay:.1f}초")
        await asyncio.sleep(delay)
        
        return delay
    
    async def maybe_long_rest(self, device_id: int = 0) -> float:
        """
        장시간 휴식 필요 여부 확인 및 실행
        
        연속 2시간 이상 활동 시 5-15분 휴식
        
        Returns:
            대기한 시간 (0이면 휴식 안함)
        """
        if device_id not in self._continuous_activity:
            self._continuous_activity[device_id] = datetime.now()
            return 0.0
        
        start = self._continuous_activity[device_id]
        elapsed = (datetime.now() - start).total_seconds()
        
        # 2시간 이상 연속 활동
        if elapsed > 7200:
            delay = random.uniform(*self.config.long_rest)
            
            self.logger.info(f"[Device {device_id}] 😴 장시간 휴식: {delay/60:.1f}분")
            await asyncio.sleep(delay)
            
            # 리셋
            self._continuous_activity[device_id] = datetime.now()
            return delay
        
        return 0.0
    
    # ==================== 시간대별 관리 ====================
    
    def _get_time_intensity(self) -> float:
        """현재 시간대의 활동 강도"""
        hour = datetime.now().hour
        
        for (start_hour, end_hour), intensity in TIME_INTENSITY.items():
            if start_hour <= hour < end_hour:
                return intensity
        
        return 1.0  # 기본값
    
    def should_device_be_active(self, device_id: int) -> bool:
        """
        현재 시간대에 디바이스가 활성화되어야 하는지 확인
        
        시간대별 강도에 따라 일부 디바이스만 활성화
        
        Args:
            device_id: 디바이스 ID
            
        Returns:
            활성화 여부
        """
        intensity = self._get_time_intensity()
        
        # 디바이스 ID 기반 결정 (일관성 있는 분배)
        threshold = (device_id % 100) / 100.0
        
        return threshold < intensity
    
    def get_recommended_active_devices(self, total_devices: int = 600) -> int:
        """현재 시간대에 권장되는 활성 디바이스 수"""
        intensity = self._get_time_intensity()
        return int(total_devices * intensity)
    
    # ==================== 유틸리티 ====================
    
    def _get_recent_interaction_count(self, device_id: int) -> int:
        """최근 상호작용 횟수 (구현 예정)"""
        return 0  # TODO: 실제 카운트 구현
    
    def get_delay_for_type(self, rest_type: RestType) -> Tuple[int, int]:
        """휴식 타입별 딜레이 범위"""
        type_to_config = {
            RestType.BETWEEN_TASKS: self.config.between_tasks,
            RestType.BETWEEN_ACTIVITIES: self.config.between_activities,
            RestType.AFTER_INTERACTION: self.config.after_interaction,
            RestType.RANDOM_PAUSE: self.config.random_pause,
            RestType.AFTER_ERROR: self.config.after_error,
            RestType.LONG_REST: self.config.long_rest,
        }
        return type_to_config.get(rest_type, (5, 30))
    
    def reset_continuous_activity(self, device_id: int) -> None:
        """연속 활동 시간 리셋"""
        self._continuous_activity[device_id] = datetime.now()
        self._last_rest[device_id] = datetime.now()
    
    def get_status(self) -> Dict:
        """상태 조회"""
        return {
            "current_intensity": self._get_time_intensity(),
            "recommended_devices": self.get_recommended_active_devices(),
            "devices_in_continuous_activity": len(self._continuous_activity),
        }


class NaturalBehaviorSimulator:
    """
    자연스러운 행동 시뮬레이터
    
    인간과 유사한 행동 패턴을 시뮬레이션합니다.
    """
    
    def __init__(self, rest_manager: Optional[RestTimingManager] = None):
        self.rest_manager = rest_manager or RestTimingManager()
        self.logger = logging.getLogger(__name__)
    
    async def simulate_video_watch(
        self,
        device_id: int,
        video_duration: int,
        min_watch_percent: int = 20,
        max_watch_percent: int = 90
    ) -> int:
        """
        자연스러운 영상 시청 시뮬레이션
        
        Args:
            device_id: 디바이스 ID
            video_duration: 영상 길이 (초)
            min_watch_percent: 최소 시청 비율
            max_watch_percent: 최대 시청 비율
            
        Returns:
            실제 시청 시간 (초)
        """
        # 시청 비율 결정
        watch_percent = random.randint(min_watch_percent, max_watch_percent)
        watch_time = int(video_duration * watch_percent / 100)
        
        self.logger.debug(
            f"[Device {device_id}] 영상 시청: {watch_time}초 "
            f"({watch_percent}%)"
        )
        
        # 실제 시청 (중간에 랜덤 휴식 포함)
        remaining = watch_time
        while remaining > 0:
            # 10-15초마다 잠시 멈춤 (스크롤, 탐색 등 시뮬레이션)
            chunk = min(random.randint(10, 15), remaining)
            await asyncio.sleep(chunk)
            remaining -= chunk
            
            # 간헐적 상호작용 시뮬레이션
            if random.random() < 0.1:  # 10% 확률
                await asyncio.sleep(random.uniform(0.5, 2))
        
        return watch_time
    
    async def simulate_scroll_behavior(
        self,
        device_id: int,
        scroll_count: int = 5
    ) -> None:
        """
        자연스러운 스크롤 시뮬레이션
        
        Args:
            device_id: 디바이스 ID
            scroll_count: 스크롤 횟수
        """
        for i in range(scroll_count):
            # 스크롤 후 콘텐츠 확인 시간
            view_time = random.uniform(1, 5)
            await asyncio.sleep(view_time)
            
            # 가끔 더 오래 머무름 (관심 콘텐츠)
            if random.random() < 0.2:  # 20% 확률
                await asyncio.sleep(random.uniform(3, 8))
            
            self.logger.debug(f"[Device {device_id}] 스크롤 {i+1}/{scroll_count}")
    
    async def simulate_typing(
        self,
        text: str,
        device_id: int = 0
    ) -> float:
        """
        자연스러운 타이핑 시뮬레이션
        
        Args:
            text: 입력할 텍스트
            device_id: 디바이스 ID
            
        Returns:
            총 타이핑 시간 (초)
        """
        total_time = 0.0
        
        for char in text:
            # 문자당 80-200ms
            delay = random.uniform(0.08, 0.2)
            
            # 띄어쓰기 후 잠시 멈춤
            if char == " ":
                delay += random.uniform(0.1, 0.3)
            
            # 마침표 후 더 긴 멈춤
            if char in ".!?":
                delay += random.uniform(0.3, 0.8)
            
            await asyncio.sleep(delay)
            total_time += delay
        
        # 타이핑 후 검토 시간
        review_time = random.uniform(0.5, 2)
        await asyncio.sleep(review_time)
        total_time += review_time
        
        return total_time


# 싱글톤 인스턴스
_rest_manager: Optional[RestTimingManager] = None
_behavior_simulator: Optional[NaturalBehaviorSimulator] = None


def get_rest_timing_manager() -> RestTimingManager:
    """휴식 타이밍 관리자 싱글톤"""
    global _rest_manager
    if _rest_manager is None:
        _rest_manager = RestTimingManager()
    return _rest_manager


def get_behavior_simulator() -> NaturalBehaviorSimulator:
    """행동 시뮬레이터 싱글톤"""
    global _behavior_simulator
    if _behavior_simulator is None:
        _behavior_simulator = NaturalBehaviorSimulator()
    return _behavior_simulator

