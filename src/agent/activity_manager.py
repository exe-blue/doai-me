"""
에이전트 활동 관리자

상시 활동과 요청 활동을 관리합니다.
- 상시 활동: 확률 기반으로 다음 활동 선택 (완료한 활동 제외)
- 요청 활동: 인트라넷에서 등록된 요청을 우선 처리
"""

import asyncio
import random
import logging
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from queue import PriorityQueue
import threading

from src.agent.activity_types import (
    ActivityType,
    RoutineActivity,
    RoutineActivityConfig,
    RequestActivity,
    RequestBatch,
    AgentState,
    DEFAULT_ROUTINE_CONFIGS,
)
from src.agent.youtube_watch_flow import YouTubeWatchFlow, BatchExecutor, WatchResult

logger = logging.getLogger(__name__)


@dataclass(order=True)
class ScheduledRequest:
    """스케줄된 요청 (우선순위 큐용)"""
    priority: float  # 낮을수록 우선 (timestamp)
    request: RequestBatch = field(compare=False)


class ActivityManager:
    """
    에이전트 활동 관리자
    
    600개 에이전트의 활동을 관리합니다.
    """
    
    def __init__(
        self,
        routine_configs: Optional[Dict[RoutineActivity, RoutineActivityConfig]] = None
    ):
        """
        Args:
            routine_configs: 상시 활동 설정 (None이면 기본값 사용)
        """
        self.routine_configs = routine_configs or DEFAULT_ROUTINE_CONFIGS.copy()
        self.logger = logging.getLogger(__name__)
        
        # 요청 큐 (우선순위 기반)
        self._request_queue: PriorityQueue[ScheduledRequest] = PriorityQueue()
        self._queue_lock = threading.Lock()
        
        # 에이전트 상태
        self._agent_states: Dict[str, AgentState] = {}
        
        # 콜백
        self._on_activity_complete: Optional[Callable] = None
        self._on_request_complete: Optional[Callable] = None
    
    # ==================== 상시 활동 관리 ====================
    
    def select_next_routine(
        self, 
        agent_id: str, 
        exclude: Optional[List[RoutineActivity]] = None
    ) -> Optional[RoutineActivityConfig]:
        """
        다음 상시 활동 선택 (확률 기반)
        
        Args:
            agent_id: 에이전트 ID
            exclude: 제외할 활동 리스트
            
        Returns:
            선택된 활동 설정 또는 None
        """
        exclude = exclude or []
        
        # 사용 가능한 활동 필터링
        available = [
            config for activity, config in self.routine_configs.items()
            if config.enabled and activity not in exclude
        ]
        
        if not available:
            # 모든 활동 완료, 리셋
            self.logger.info(f"[{agent_id}] 모든 상시 활동 완료, 리셋")
            return self._select_weighted_random(list(self.routine_configs.values()))
        
        return self._select_weighted_random(available)
    
    def _select_weighted_random(
        self, 
        configs: List[RoutineActivityConfig]
    ) -> Optional[RoutineActivityConfig]:
        """가중치 기반 랜덤 선택"""
        if not configs:
            return None
        
        # 가중치 합계
        total_weight = sum(c.weight for c in configs if c.enabled)
        if total_weight == 0:
            return random.choice(configs)
        
        # 가중치 기반 선택
        r = random.uniform(0, total_weight)
        cumulative = 0
        
        for config in configs:
            if config.enabled:
                cumulative += config.weight
                if r <= cumulative:
                    return config
        
        return configs[-1]
    
    def get_routine_duration(self, config: RoutineActivityConfig) -> int:
        """상시 활동 지속 시간 계산"""
        return random.randint(config.min_duration, config.max_duration)
    
    # ==================== 요청 활동 관리 ====================
    
    def add_request_batch(self, batch: RequestBatch) -> bool:
        """
        요청 배치 추가
        
        Args:
            batch: 요청 배치 (5개)
            
        Returns:
            추가 성공 여부
        """
        if len(batch.requests) > 5:
            self.logger.error("배치는 최대 5개의 요청만 포함할 수 있습니다.")
            return False
        
        # 스케줄 시간 결정
        earliest_scheduled = min(
            (r.scheduled_at for r in batch.requests if r.scheduled_at),
            default=datetime.now()
        )
        
        priority = earliest_scheduled.timestamp()
        
        with self._queue_lock:
            self._request_queue.put(ScheduledRequest(
                priority=priority,
                request=batch
            ))
        
        self.logger.info(f"배치 추가: {batch.batch_id} ({len(batch.requests)}개 요청)")
        return True
    
    def get_pending_request(self) -> Optional[RequestBatch]:
        """
        대기 중인 요청 배치 가져오기
        
        스케줄 시간이 된 요청만 반환합니다.
        
        Returns:
            요청 배치 또는 None
        """
        with self._queue_lock:
            if self._request_queue.empty():
                return None
            
            # 가장 우선순위 높은 항목 확인
            scheduled = self._request_queue.queue[0]
            
            # 스케줄 시간 확인
            if scheduled.priority <= datetime.now().timestamp():
                return self._request_queue.get().request
            
            return None
    
    def has_pending_requests(self) -> bool:
        """대기 중인 요청 존재 여부"""
        with self._queue_lock:
            if self._request_queue.empty():
                return False
            
            scheduled = self._request_queue.queue[0]
            return scheduled.priority <= datetime.now().timestamp()
    
    def get_queue_size(self) -> int:
        """큐 크기"""
        with self._queue_lock:
            return self._request_queue.qsize()
    
    # ==================== 에이전트 상태 관리 ====================
    
    def get_agent_state(self, agent_id: str) -> AgentState:
        """에이전트 상태 가져오기 (없으면 생성)"""
        if agent_id not in self._agent_states:
            self._agent_states[agent_id] = AgentState(agent_id=agent_id)
        return self._agent_states[agent_id]
    
    def update_agent_state(self, agent_id: str, **kwargs):
        """에이전트 상태 업데이트"""
        state = self.get_agent_state(agent_id)
        for key, value in kwargs.items():
            if hasattr(state, key):
                setattr(state, key, value)
        state.last_activity_at = datetime.now()
    
    def get_all_agent_states(self) -> Dict[str, AgentState]:
        """모든 에이전트 상태"""
        return self._agent_states.copy()
    
    # ==================== 콜백 ====================
    
    def on_activity_complete(self, callback: Callable):
        """활동 완료 콜백 설정"""
        self._on_activity_complete = callback
    
    def on_request_complete(self, callback: Callable):
        """요청 완료 콜백 설정"""
        self._on_request_complete = callback
    
    def notify_activity_complete(self, agent_id: str, activity: str, result: Any):
        """활동 완료 알림"""
        if self._on_activity_complete:
            self._on_activity_complete(agent_id, activity, result)
    
    def notify_request_complete(self, agent_id: str, batch_id: str, results: List[WatchResult]):
        """요청 완료 알림"""
        if self._on_request_complete:
            self._on_request_complete(agent_id, batch_id, results)


class AgentRunner:
    """
    에이전트 실행기
    
    단일 에이전트의 활동을 실행합니다.
    """
    
    def __init__(
        self,
        agent_id: str,
        device,
        activity_manager: ActivityManager
    ):
        """
        Args:
            agent_id: 에이전트 ID
            device: uiautomator2 Device 객체
            activity_manager: 활동 관리자
        """
        self.agent_id = agent_id
        self.device = device
        self.manager = activity_manager
        self.logger = logging.getLogger(f"{__name__}.Agent.{agent_id}")
        
        self._running = False
        self._current_activity: Optional[str] = None
        
        # 실행기들
        self._batch_executor = BatchExecutor(device)
        self._routine_handlers: Dict[RoutineActivity, Callable] = {}
    
    def register_routine_handler(
        self, 
        activity: RoutineActivity, 
        handler: Callable
    ):
        """상시 활동 핸들러 등록"""
        self._routine_handlers[activity] = handler
    
    async def run(self):
        """에이전트 실행 (메인 루프)"""
        self._running = True
        state = self.manager.get_agent_state(self.agent_id)
        state.started_at = datetime.now()
        
        self.logger.info(f"에이전트 시작: {self.agent_id}")
        
        while self._running:
            try:
                # 1. 요청 활동 확인 (우선순위 높음)
                if self.manager.has_pending_requests():
                    batch = self.manager.get_pending_request()
                    if batch:
                        await self._execute_request_batch(batch)
                        continue
                
                # 2. 상시 활동 실행
                await self._execute_routine_activity()
                
            except Exception as e:
                self.logger.error(f"에이전트 오류: {e}")
                state.errors += 1
                await asyncio.sleep(5)
        
        self.logger.info(f"에이전트 종료: {self.agent_id}")
    
    async def _execute_request_batch(self, batch: RequestBatch):
        """요청 배치 실행"""
        state = self.manager.get_agent_state(self.agent_id)
        state.activity_type = ActivityType.REQUEST
        state.current_batch_id = batch.batch_id
        state.current_activity = "YouTube 시청 요청"
        
        self.logger.info(f"요청 배치 실행: {batch.batch_id}")
        
        # 배치 실행
        results = await self._batch_executor.execute_batch(batch)
        
        # 상태 업데이트
        for result in results:
            if result.success:
                state.completed_requests += 1
                state.total_watch_time += result.watch_duration
                if result.liked:
                    state.total_likes += 1
                if result.commented:
                    state.total_comments += 1
        
        # 완료 알림
        self.manager.notify_request_complete(self.agent_id, batch.batch_id, results)
        
        state.current_batch_id = None
        state.current_activity = None
    
    async def _execute_routine_activity(self):
        """상시 활동 실행"""
        state = self.manager.get_agent_state(self.agent_id)
        
        # 다음 활동 선택 (완료한 활동 제외)
        exclude = [
            RoutineActivity(a) for a in state.completed_routines
            if a in [r.value for r in RoutineActivity]
        ]
        
        config = self.manager.select_next_routine(self.agent_id, exclude)
        if not config:
            # 모든 활동 완료, 리셋
            state.completed_routines = []
            config = self.manager.select_next_routine(self.agent_id)
        
        if not config:
            self.logger.warning("실행할 상시 활동이 없습니다.")
            await asyncio.sleep(10)
            return
        
        # 상태 업데이트
        state.activity_type = ActivityType.ROUTINE
        state.current_activity = config.activity.value
        
        self.logger.info(f"상시 활동 시작: {config.activity.value}")
        
        # 활동 실행
        duration = self.manager.get_routine_duration(config)
        
        if config.activity in self._routine_handlers:
            # 커스텀 핸들러 실행
            handler = self._routine_handlers[config.activity]
            result = await handler(self.device, config, duration)
        else:
            # 기본 핸들러 (대기)
            self.logger.debug(f"기본 핸들러 실행: {duration}초")
            await asyncio.sleep(duration)
            result = {"duration": duration}
        
        # 완료 처리
        state.completed_routines.append(config.activity.value)
        state.last_routine_at = datetime.now()
        state.current_activity = None
        
        # 완료 알림
        self.manager.notify_activity_complete(self.agent_id, config.activity.value, result)
    
    def stop(self):
        """에이전트 중지"""
        self._running = False


class MultiAgentOrchestrator:
    """
    다중 에이전트 오케스트레이터
    
    600개 에이전트를 관리합니다.
    """
    
    def __init__(self, activity_manager: ActivityManager):
        """
        Args:
            activity_manager: 활동 관리자
        """
        self.manager = activity_manager
        self.logger = logging.getLogger(__name__)
        
        self._agents: Dict[str, AgentRunner] = {}
        self._tasks: Dict[str, asyncio.Task] = {}
    
    def add_agent(self, agent_id: str, device) -> AgentRunner:
        """에이전트 추가"""
        runner = AgentRunner(agent_id, device, self.manager)
        self._agents[agent_id] = runner
        return runner
    
    def remove_agent(self, agent_id: str):
        """에이전트 제거"""
        if agent_id in self._agents:
            self._agents[agent_id].stop()
            del self._agents[agent_id]
        
        if agent_id in self._tasks:
            self._tasks[agent_id].cancel()
            del self._tasks[agent_id]
    
    async def start_agent(self, agent_id: str):
        """단일 에이전트 시작"""
        if agent_id not in self._agents:
            self.logger.error(f"에이전트 없음: {agent_id}")
            return
        
        runner = self._agents[agent_id]
        task = asyncio.create_task(runner.run())
        self._tasks[agent_id] = task
    
    async def start_all(self, batch_size: int = 50, delay: float = 0.5):
        """
        모든 에이전트 시작 (배치 단위)
        
        Args:
            batch_size: 동시 시작 배치 크기
            delay: 배치 간 딜레이
        """
        agent_ids = list(self._agents.keys())
        
        for i in range(0, len(agent_ids), batch_size):
            batch = agent_ids[i:i+batch_size]
            self.logger.info(f"에이전트 배치 시작: {i+1}-{i+len(batch)}/{len(agent_ids)}")
            
            for agent_id in batch:
                await self.start_agent(agent_id)
            
            await asyncio.sleep(delay)
        
        self.logger.info(f"총 {len(agent_ids)}개 에이전트 시작 완료")
    
    async def stop_all(self):
        """모든 에이전트 중지"""
        for agent_id in list(self._agents.keys()):
            self._agents[agent_id].stop()
        
        # 모든 태스크 완료 대기
        if self._tasks:
            await asyncio.gather(*self._tasks.values(), return_exceptions=True)
        
        self._tasks.clear()
        self.logger.info("모든 에이전트 중지 완료")
    
    def get_status(self) -> Dict[str, Any]:
        """전체 상태 조회"""
        states = self.manager.get_all_agent_states()
        
        return {
            "total_agents": len(self._agents),
            "active_tasks": len(self._tasks),
            "pending_requests": self.manager.get_queue_size(),
            "agents": {
                agent_id: {
                    "current_activity": state.current_activity,
                    "activity_type": state.activity_type.value if state.activity_type else None,
                    "completed_requests": state.completed_requests,
                    "total_watch_time": state.total_watch_time,
                    "errors": state.errors,
                }
                for agent_id, state in states.items()
            }
        }

