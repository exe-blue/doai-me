"""
디바이스 스케줄러

600대 디바이스의 할당, 로테이션, 예비풀 관리를 담당합니다.

풀 구성:
- Active Pool (500대, 83%): 실제 활동 수행
- Reserve Pool (60대, 10%): 장애 대체용
- Maintenance Pool (40대, 7%): 앱 업데이트, 재시작 등
"""

import asyncio
import random
import logging
from enum import Enum
from typing import Optional, Dict, List, Set, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
import threading

logger = logging.getLogger(__name__)


class DeviceStatus(str, Enum):
    """디바이스 상태"""
    IDLE = "idle"                     # 대기 중
    ACTIVE = "active"                 # 활동 중
    RESTING = "resting"               # 휴식 중
    ERROR = "error"                   # 에러 발생
    MAINTENANCE = "maintenance"       # 유지보수 중
    OFFLINE = "offline"               # 오프라인


class PoolType(str, Enum):
    """풀 타입"""
    ACTIVE = "active"                 # 활성 풀 (500대)
    RESERVE = "reserve"               # 예비 풀 (60대)
    MAINTENANCE = "maintenance"       # 유지보수 풀 (40대)


class Priority(int, Enum):
    """요청 우선순위"""
    P1_URGENT = 1       # 긴급: 즉시 실행, 현재 활동 중단
    P2_NORMAL = 2       # 일반: 30분 내, 현재 태스크 완료 후
    P3_SCHEDULED = 3    # 예약: 지정 시간 대기


# 6대 활동 가중치 (기획서 기반)
ACTIVITY_WEIGHTS = {
    "shorts_remix": 2.0,          # Shorts 리믹스
    "playlist_curator": 1.5,      # 플레이리스트 큐레이터
    "persona_commenter": 2.0,     # 페르소나 코멘터
    "trend_scout": 1.5,           # 트렌드 스카우트
    "challenge_hunter": 1.0,      # 챌린지 헌터
    "thumbnail_lab": 1.0,         # 썸네일 랩
}

# 활동별 디바이스 할당 범위
ACTIVITY_DEVICE_RANGES = {
    "shorts_remix": (100, 150),
    "playlist_curator": (80, 120),
    "persona_commenter": (100, 150),
    "trend_scout": (80, 100),
    "challenge_hunter": (60, 80),
    "thumbnail_lab": (50, 80),
}


@dataclass
class DeviceInfo:
    """디바이스 정보"""
    device_id: int
    phone_board_id: int                    # 폰보드 번호 (1-30)
    slot_in_board: int                     # 보드 내 슬롯 (1-20)
    ip_address: str                        # IP 주소
    
    # 상태
    status: DeviceStatus = DeviceStatus.IDLE
    pool: PoolType = PoolType.ACTIVE
    
    # 현재 활동
    current_activity: Optional[str] = None
    activity_started_at: Optional[datetime] = None
    
    # 통계
    tasks_completed_today: int = 0
    total_watch_time_today: int = 0        # 초
    total_interactions_today: int = 0      # 좋아요+댓글+구독
    
    # 페르소나 (ACT_003용)
    assigned_persona_id: Optional[str] = None
    
    # 에러 관리
    last_error: Optional[str] = None
    consecutive_errors: int = 0
    errors_today: int = 0
    
    # 타이밍
    last_heartbeat: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    continuous_activity_start: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리로 변환"""
        return {
            "device_id": self.device_id,
            "phone_board_id": self.phone_board_id,
            "slot_in_board": self.slot_in_board,
            "ip_address": self.ip_address,
            "status": self.status.value,
            "pool": self.pool.value,
            "current_activity": self.current_activity,
            "activity_started_at": self.activity_started_at.isoformat() if self.activity_started_at else None,
            "tasks_completed_today": self.tasks_completed_today,
            "consecutive_errors": self.consecutive_errors,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
        }


@dataclass
class SchedulerConfig:
    """스케줄러 설정"""
    # 풀 크기
    total_devices: int = 600
    active_pool_size: int = 500           # 83%
    reserve_pool_size: int = 60           # 10%
    maintenance_pool_size: int = 40       # 7%
    
    # 로테이션
    rotation_interval: int = 7200         # 2시간 (초)
    max_continuous_activity: int = 14400  # 4시간 (초)
    
    # 에러 관리
    max_consecutive_errors: int = 3       # 연속 에러 시 유지보수 풀로 이동
    error_cooldown: int = 300             # 에러 후 대기 시간 (초)
    
    # 요청 처리
    p1_max_devices: int = 100             # P1 긴급 요청 최대 디바이스
    p2_batch_size: int = 50               # P2 배치당 디바이스
    
    # 헬스체크
    heartbeat_interval: int = 300         # 5분
    heartbeat_timeout: int = 600          # 10분 후 오프라인 처리


class DeviceScheduler:
    """
    디바이스 스케줄러
    
    600대 디바이스의 할당, 로테이션, 예비풀 관리
    """
    
    def __init__(self, config: Optional[SchedulerConfig] = None):
        self.config = config or SchedulerConfig()
        self.logger = logging.getLogger(__name__)
        
        # 디바이스 관리
        self._devices: Dict[int, DeviceInfo] = {}
        self._lock = threading.RLock()
        
        # 풀 관리
        self._active_pool: Set[int] = set()
        self._reserve_pool: Set[int] = set()
        self._maintenance_pool: Set[int] = set()
        
        # 활동별 할당
        self._activity_assignments: Dict[str, Set[int]] = defaultdict(set)
        
        # 콜백
        self._on_device_error: Optional[Callable] = None
        self._on_pool_change: Optional[Callable] = None
        
        # 초기화 플래그
        self._initialized = False
    
    def initialize_devices(self, ip_base: str = "192.168.1") -> None:
        """
        600대 디바이스 초기화
        
        Args:
            ip_base: IP 기본 주소 (예: "192.168.1")
        """
        with self._lock:
            device_id = 1
            
            for board_id in range(1, 31):  # 30개 폰보드
                for slot in range(1, 21):   # 보드당 20개 슬롯
                    # IP 계산 (예: 192.168.1.101 ~ 192.168.1.200, 192.168.2.101 ~ ...)
                    ip_third = 1 + (device_id - 1) // 100
                    ip_fourth = 101 + (device_id - 1) % 100
                    ip_address = f"{ip_base}.{ip_third}.{ip_fourth}"
                    
                    device = DeviceInfo(
                        device_id=device_id,
                        phone_board_id=board_id,
                        slot_in_board=slot,
                        ip_address=ip_address,
                    )
                    
                    self._devices[device_id] = device
                    device_id += 1
            
            # 풀 초기화
            self._distribute_to_pools()
            self._initialized = True
            
            self.logger.info(f"디바이스 초기화 완료: {len(self._devices)}대")
            self.logger.info(f"  - Active: {len(self._active_pool)}대")
            self.logger.info(f"  - Reserve: {len(self._reserve_pool)}대")
            self.logger.info(f"  - Maintenance: {len(self._maintenance_pool)}대")
    
    def _distribute_to_pools(self) -> None:
        """디바이스를 풀에 분배"""
        device_ids = list(self._devices.keys())
        random.shuffle(device_ids)
        
        # Active 풀 (500대)
        active_ids = device_ids[:self.config.active_pool_size]
        for did in active_ids:
            self._active_pool.add(did)
            self._devices[did].pool = PoolType.ACTIVE
        
        # Reserve 풀 (60대)
        reserve_ids = device_ids[
            self.config.active_pool_size:
            self.config.active_pool_size + self.config.reserve_pool_size
        ]
        for did in reserve_ids:
            self._reserve_pool.add(did)
            self._devices[did].pool = PoolType.RESERVE
        
        # Maintenance 풀 (40대)
        maintenance_ids = device_ids[
            self.config.active_pool_size + self.config.reserve_pool_size:
        ]
        for did in maintenance_ids:
            self._maintenance_pool.add(did)
            self._devices[did].pool = PoolType.MAINTENANCE
    
    # ==================== 디바이스 할당 ====================
    
    def allocate_devices_for_activity(
        self,
        activity: str,
        count: Optional[int] = None
    ) -> List[DeviceInfo]:
        """
        활동에 디바이스 할당
        
        Args:
            activity: 활동 이름
            count: 할당할 디바이스 수 (None이면 범위 내 랜덤)
            
        Returns:
            할당된 디바이스 목록
        """
        with self._lock:
            # 할당 수 결정
            if count is None:
                min_count, max_count = ACTIVITY_DEVICE_RANGES.get(
                    activity, (50, 100)
                )
                count = random.randint(min_count, max_count)
            
            # 사용 가능한 디바이스 필터링
            available = [
                self._devices[did] for did in self._active_pool
                if self._devices[did].status == DeviceStatus.IDLE
            ]
            
            if len(available) < count:
                # 예비 풀에서 보충
                reserve_available = [
                    self._devices[did] for did in self._reserve_pool
                    if self._devices[did].status == DeviceStatus.IDLE
                ]
                needed = count - len(available)
                available.extend(reserve_available[:needed])
            
            # 할당
            allocated = available[:count]
            for device in allocated:
                device.status = DeviceStatus.ACTIVE
                device.current_activity = activity
                device.activity_started_at = datetime.now()
                self._activity_assignments[activity].add(device.device_id)
            
            self.logger.info(f"활동 '{activity}'에 {len(allocated)}대 할당")
            return allocated
    
    def release_device(self, device_id: int) -> None:
        """디바이스 해제"""
        with self._lock:
            if device_id not in self._devices:
                return
            
            device = self._devices[device_id]
            activity = device.current_activity
            
            device.status = DeviceStatus.IDLE
            device.current_activity = None
            device.last_activity_at = datetime.now()
            
            # 활동 할당에서 제거
            if activity and device_id in self._activity_assignments.get(activity, set()):
                self._activity_assignments[activity].discard(device_id)
    
    def allocate_for_request(
        self,
        priority: Priority,
        count: int
    ) -> List[DeviceInfo]:
        """
        요청 처리를 위한 디바이스 할당
        
        Args:
            priority: 요청 우선순위
            count: 필요한 디바이스 수
            
        Returns:
            할당된 디바이스 목록
        """
        with self._lock:
            if priority == Priority.P1_URGENT:
                # P1: 최대 100대 즉시 할당 (현재 활동 중단 가능)
                max_count = min(count, self.config.p1_max_devices)
                
                # 먼저 IDLE 디바이스
                idle_devices = [
                    self._devices[did] for did in self._active_pool
                    if self._devices[did].status == DeviceStatus.IDLE
                ]
                
                # 부족하면 ACTIVE 디바이스도 가져옴 (활동 중단)
                if len(idle_devices) < max_count:
                    active_devices = [
                        self._devices[did] for did in self._active_pool
                        if self._devices[did].status == DeviceStatus.ACTIVE
                    ]
                    needed = max_count - len(idle_devices)
                    idle_devices.extend(active_devices[:needed])
                
                allocated = idle_devices[:max_count]
                
            elif priority == Priority.P2_NORMAL:
                # P2: IDLE 디바이스만 배치 단위로
                batch_size = min(count, self.config.p2_batch_size)
                idle_devices = [
                    self._devices[did] for did in self._active_pool
                    if self._devices[did].status == DeviceStatus.IDLE
                ]
                allocated = idle_devices[:batch_size]
                
            else:  # P3_SCHEDULED
                # P3: IDLE 디바이스 자동 할당
                idle_devices = [
                    self._devices[did] for did in self._active_pool
                    if self._devices[did].status == DeviceStatus.IDLE
                ]
                allocated = idle_devices[:count]
            
            # 할당 처리
            for device in allocated:
                device.status = DeviceStatus.ACTIVE
                device.current_activity = "request"
                device.activity_started_at = datetime.now()
            
            self.logger.info(
                f"요청 처리용 {len(allocated)}대 할당 "
                f"(Priority: {priority.name})"
            )
            return allocated
    
    # ==================== 풀 관리 ====================
    
    def move_to_maintenance(self, device_id: int, reason: str = "") -> bool:
        """디바이스를 유지보수 풀로 이동"""
        with self._lock:
            if device_id not in self._devices:
                return False
            
            device = self._devices[device_id]
            
            # 현재 풀에서 제거
            if device.pool == PoolType.ACTIVE:
                self._active_pool.discard(device_id)
            elif device.pool == PoolType.RESERVE:
                self._reserve_pool.discard(device_id)
            
            # 유지보수 풀로 이동
            self._maintenance_pool.add(device_id)
            device.pool = PoolType.MAINTENANCE
            device.status = DeviceStatus.MAINTENANCE
            device.current_activity = None
            
            self.logger.warning(
                f"디바이스 {device_id} 유지보수 풀 이동: {reason}"
            )
            
            # 콜백 호출
            if self._on_pool_change:
                self._on_pool_change(device_id, PoolType.MAINTENANCE, reason)
            
            # 예비 풀에서 대체 디바이스 활성화
            self._activate_reserve_device()
            
            return True
    
    def _activate_reserve_device(self) -> Optional[int]:
        """예비 풀에서 디바이스 활성화"""
        if not self._reserve_pool:
            self.logger.warning("예비 풀이 비어있음")
            return None
        
        # 예비 풀에서 하나 선택
        reserve_id = next(iter(self._reserve_pool))
        
        self._reserve_pool.discard(reserve_id)
        self._active_pool.add(reserve_id)
        
        device = self._devices[reserve_id]
        device.pool = PoolType.ACTIVE
        device.status = DeviceStatus.IDLE
        
        self.logger.info(f"예비 디바이스 {reserve_id} 활성화")
        return reserve_id
    
    def restore_from_maintenance(self, device_id: int) -> bool:
        """유지보수 풀에서 복구"""
        with self._lock:
            if device_id not in self._maintenance_pool:
                return False
            
            device = self._devices[device_id]
            
            self._maintenance_pool.discard(device_id)
            
            # 예비 풀로 복구 (바로 활성화하지 않음)
            self._reserve_pool.add(device_id)
            device.pool = PoolType.RESERVE
            device.status = DeviceStatus.IDLE
            device.consecutive_errors = 0
            
            self.logger.info(f"디바이스 {device_id} 복구 (예비 풀)")
            return True
    
    # ==================== 에러 처리 ====================
    
    def report_device_error(
        self,
        device_id: int,
        error_message: str
    ) -> None:
        """디바이스 에러 보고"""
        with self._lock:
            if device_id not in self._devices:
                return
            
            device = self._devices[device_id]
            device.status = DeviceStatus.ERROR
            device.last_error = error_message
            device.consecutive_errors += 1
            device.errors_today += 1
            
            self.logger.error(
                f"디바이스 {device_id} 에러: {error_message} "
                f"(연속: {device.consecutive_errors}회)"
            )
            
            # 연속 에러 한계 초과 시 유지보수 풀로 이동
            if device.consecutive_errors >= self.config.max_consecutive_errors:
                self.move_to_maintenance(
                    device_id,
                    f"연속 에러 {device.consecutive_errors}회"
                )
            
            # 콜백 호출
            if self._on_device_error:
                self._on_device_error(device_id, error_message)
    
    def clear_device_error(self, device_id: int) -> None:
        """디바이스 에러 해제"""
        with self._lock:
            if device_id not in self._devices:
                return
            
            device = self._devices[device_id]
            device.status = DeviceStatus.IDLE
            device.consecutive_errors = 0
    
    # ==================== 로테이션 ====================
    
    async def run_rotation_check(self) -> None:
        """
        로테이션 체크 (2시간마다)
        
        - 최대 연속 활동 시간 초과 디바이스 휴식
        - 활동별 디바이스 재분배
        """
        while True:
            await asyncio.sleep(self.config.rotation_interval)
            
            with self._lock:
                now = datetime.now()
                rotated_count = 0
                
                for device in self._devices.values():
                    if device.status != DeviceStatus.ACTIVE:
                        continue
                    
                    if device.continuous_activity_start:
                        elapsed = (now - device.continuous_activity_start).total_seconds()
                        
                        if elapsed > self.config.max_continuous_activity:
                            # 4시간 초과 - 휴식 필요
                            device.status = DeviceStatus.RESTING
                            device.current_activity = None
                            device.continuous_activity_start = None
                            rotated_count += 1
                
                if rotated_count > 0:
                    self.logger.info(f"로테이션: {rotated_count}대 휴식 전환")
    
    # ==================== 상태 조회 ====================
    
    def get_device(self, device_id: int) -> Optional[DeviceInfo]:
        """디바이스 정보 조회"""
        return self._devices.get(device_id)
    
    def get_all_devices(self) -> Dict[int, DeviceInfo]:
        """모든 디바이스 조회"""
        return self._devices.copy()
    
    def get_pool_status(self) -> Dict[str, Any]:
        """풀 상태 조회"""
        with self._lock:
            status_counts = defaultdict(int)
            for device in self._devices.values():
                status_counts[device.status.value] += 1
            
            return {
                "total": len(self._devices),
                "pools": {
                    "active": len(self._active_pool),
                    "reserve": len(self._reserve_pool),
                    "maintenance": len(self._maintenance_pool),
                },
                "status": dict(status_counts),
                "activity_assignments": {
                    activity: len(devices)
                    for activity, devices in self._activity_assignments.items()
                },
            }
    
    def get_devices_by_board(self, board_id: int) -> List[DeviceInfo]:
        """폰보드별 디바이스 조회"""
        return [
            d for d in self._devices.values()
            if d.phone_board_id == board_id
        ]
    
    def get_board_health(self) -> Dict[int, Dict[str, Any]]:
        """
        폰보드 건강 상태
        
        Returns:
            {board_id: {error_rate, active_count, ...}}
        """
        board_stats = defaultdict(lambda: {
            "total": 0,
            "active": 0,
            "error": 0,
            "maintenance": 0,
        })
        
        with self._lock:
            for device in self._devices.values():
                board_id = device.phone_board_id
                board_stats[board_id]["total"] += 1
                
                if device.status == DeviceStatus.ACTIVE:
                    board_stats[board_id]["active"] += 1
                elif device.status == DeviceStatus.ERROR:
                    board_stats[board_id]["error"] += 1
                elif device.status == DeviceStatus.MAINTENANCE:
                    board_stats[board_id]["maintenance"] += 1
        
        # 에러율 계산
        result = {}
        for board_id, stats in board_stats.items():
            total = stats["total"]
            error_rate = stats["error"] / total if total > 0 else 0
            active_rate = stats["active"] / total if total > 0 else 0
            
            result[board_id] = {
                **stats,
                "error_rate": round(error_rate * 100, 1),
                "active_rate": round(active_rate * 100, 1),
                "health": "good" if error_rate < 0.1 else "warning" if error_rate < 0.3 else "critical",
            }
        
        return result
    
    # ==================== 헬스체크 ====================
    
    def update_heartbeat(self, device_id: int, metrics: Optional[Dict] = None) -> None:
        """하트비트 업데이트"""
        with self._lock:
            if device_id not in self._devices:
                return
            
            device = self._devices[device_id]
            device.last_heartbeat = datetime.now()
            
            # 오프라인이었다면 복구
            if device.status == DeviceStatus.OFFLINE:
                device.status = DeviceStatus.IDLE
                self.logger.info(f"디바이스 {device_id} 온라인 복구")
    
    async def run_heartbeat_check(self) -> None:
        """하트비트 체크 루프"""
        while True:
            await asyncio.sleep(60)  # 1분마다 체크
            
            with self._lock:
                now = datetime.now()
                timeout = timedelta(seconds=self.config.heartbeat_timeout)
                
                for device in self._devices.values():
                    if device.last_heartbeat:
                        if now - device.last_heartbeat > timeout:
                            if device.status != DeviceStatus.OFFLINE:
                                device.status = DeviceStatus.OFFLINE
                                self.logger.warning(
                                    f"디바이스 {device.device_id} 오프라인 "
                                    f"(마지막 하트비트: {device.last_heartbeat})"
                                )
    
    # ==================== 콜백 ====================
    
    def on_device_error(self, callback: Callable) -> None:
        """디바이스 에러 콜백 설정"""
        self._on_device_error = callback
    
    def on_pool_change(self, callback: Callable) -> None:
        """풀 변경 콜백 설정"""
        self._on_pool_change = callback


# 싱글톤 인스턴스
_scheduler_instance: Optional[DeviceScheduler] = None


def get_scheduler() -> DeviceScheduler:
    """스케줄러 싱글톤 인스턴스"""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = DeviceScheduler()
    return _scheduler_instance

