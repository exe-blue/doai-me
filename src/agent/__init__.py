"""
에이전트 모듈

600개 스마트폰 에이전트의 활동을 관리합니다.

시스템 구성:
- 스케줄러: 디바이스 할당, 로테이션, 예비풀 관리
- 활동 타입: 6대 상시 활동 + 요청 활동
- 로깅: 활동 로그, 하트비트, 발견 데이터
- 페르소나: 10개 댓글 페르소나
- 휴식 타이밍: 자연스러운 행동 패턴
- 대시보드 API: 실시간 WebSocket
"""

# 활동 타입
from src.agent.activity_types import (
    ActivityType,
    RoutineActivity,
    RoutineActivityConfig,
    RequestActivity,
    RequestBatch,
    AgentState,
    DEFAULT_ROUTINE_CONFIGS,
    ACTIVITY_DEVICE_RANGES,
)

# YouTube 시청 플로우
from src.agent.youtube_watch_flow import (
    YouTubeWatchFlow,
    BatchExecutor,
    WatchResult,
)

# 활동 관리
from src.agent.activity_manager import (
    ActivityManager,
    AgentRunner,
    MultiAgentOrchestrator,
)

# 요청 처리
from src.agent.request_handler import (
    YouTubeTaskInput,
    RequestHandler,
    create_request_router,
)

# 상시 활동 핸들러
from src.agent.routine_activities import (
    RoutineActivityHandlers,
    get_routine_handlers,
)

# 스케줄러
from src.agent.scheduler import (
    DeviceScheduler,
    DeviceStatus,
    PoolType,
    Priority,
    DeviceInfo,
    SchedulerConfig,
    get_scheduler,
    ACTIVITY_WEIGHTS,
)

# 로깅 시스템
from src.agent.logging_system import (
    ActivityLogger,
    HeartbeatManager,
    ActivityLog,
    TaskResult,
    HeartbeatRecord,
    DiscoveryData,
    get_activity_logger,
    get_heartbeat_manager,
)

# 페르소나 시스템
from src.agent.persona_system import (
    PersonaManager,
    CommentGenerator,
    Persona,
    PersonaType,
    get_persona_manager,
    get_comment_generator,
    DEFAULT_PERSONAS,
)

# 휴식 타이밍
from src.agent.rest_timing import (
    RestTimingManager,
    NaturalBehaviorSimulator,
    RestConfig,
    RestType,
    get_rest_timing_manager,
    get_behavior_simulator,
    TIME_INTENSITY,
)

# 대시보드 API
from src.agent.dashboard_api import (
    DashboardDataProvider,
    DashboardBroadcaster,
    ConnectionManager,
    DashboardMessage,
    MessageType,
    get_connection_manager,
    get_data_provider,
    get_broadcaster,
)


__all__ = [
    # 타입
    "ActivityType",
    "RoutineActivity",
    "RoutineActivityConfig",
    "RequestActivity",
    "RequestBatch",
    "AgentState",
    "DEFAULT_ROUTINE_CONFIGS",
    "ACTIVITY_DEVICE_RANGES",
    
    # YouTube 시청 플로우
    "YouTubeWatchFlow",
    "BatchExecutor",
    "WatchResult",
    
    # 활동 관리
    "ActivityManager",
    "AgentRunner",
    "MultiAgentOrchestrator",
    
    # 요청 처리
    "YouTubeTaskInput",
    "RequestHandler",
    "create_request_router",
    
    # 상시 활동
    "RoutineActivityHandlers",
    "get_routine_handlers",
    
    # 스케줄러
    "DeviceScheduler",
    "DeviceStatus",
    "PoolType",
    "Priority",
    "DeviceInfo",
    "SchedulerConfig",
    "get_scheduler",
    "ACTIVITY_WEIGHTS",
    
    # 로깅
    "ActivityLogger",
    "HeartbeatManager",
    "ActivityLog",
    "TaskResult",
    "HeartbeatRecord",
    "DiscoveryData",
    "get_activity_logger",
    "get_heartbeat_manager",
    
    # 페르소나
    "PersonaManager",
    "CommentGenerator",
    "Persona",
    "PersonaType",
    "get_persona_manager",
    "get_comment_generator",
    "DEFAULT_PERSONAS",
    
    # 휴식 타이밍
    "RestTimingManager",
    "NaturalBehaviorSimulator",
    "RestConfig",
    "RestType",
    "get_rest_timing_manager",
    "get_behavior_simulator",
    "TIME_INTENSITY",
    
    # 대시보드 API
    "DashboardDataProvider",
    "DashboardBroadcaster",
    "ConnectionManager",
    "DashboardMessage",
    "MessageType",
    "get_connection_manager",
    "get_data_provider",
    "get_broadcaster",
]
