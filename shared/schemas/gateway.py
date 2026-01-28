"""
Gateway Schemas
Cloud Gateway API용 Pydantic 모델
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ============================================================
# Enums
# ============================================================


class NodeStatus(str, Enum):
    """노드 상태"""

    READY = "READY"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"
    ERROR = "ERROR"


class CommandPriority(str, Enum):
    """명령 우선순위"""

    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class CommandStatus(str, Enum):
    """명령 상태"""

    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class TargetType(str, Enum):
    """대상 타입"""

    ALL_DEVICES = "ALL_DEVICES"
    SPECIFIC_DEVICES = "SPECIFIC_DEVICES"
    DEVICE_RANGE = "DEVICE_RANGE"


# ============================================================
# Node Schemas
# ============================================================


class NodeBase(BaseModel):
    """노드 기본 정보"""

    node_id: str
    hostname: str = ""
    ip_address: str = ""
    runner_version: str = ""
    capabilities: List[str] = Field(default_factory=list)


class NodeConnection(NodeBase):
    """노드 연결 정보"""

    node_uuid: Optional[str] = None
    session_id: str
    connected_at: datetime
    last_heartbeat: datetime
    device_count: int = 0
    status: NodeStatus = NodeStatus.READY
    active_tasks: int = 0


class NodeHeartbeat(BaseModel):
    """노드 하트비트 메시지"""

    status: NodeStatus = NodeStatus.READY
    device_snapshot: List[dict] = Field(default_factory=list)
    active_tasks: int = 0
    resources: Dict[str, Any] = Field(default_factory=dict)
    queue_depth: int = 0


class NodeListResponse(BaseModel):
    """노드 목록 응답"""

    nodes: List[dict]
    total: int
    ready: int
    busy: int


# ============================================================
# Command Schemas
# ============================================================


class CommandTarget(BaseModel):
    """명령 대상"""

    type: TargetType = TargetType.ALL_DEVICES
    device_slots: List[int] = Field(default_factory=list)
    device_range: Optional[Dict[str, int]] = None


class CommandRequest(BaseModel):
    """동기 명령 요청"""

    node_id: str
    action: str
    device_id: str = "all"
    params: Dict[str, Any] = Field(default_factory=dict)
    priority: CommandPriority = CommandPriority.NORMAL
    timeout: int = Field(default=300, ge=1, le=3600)


class CommandResponse(BaseModel):
    """동기 명령 응답"""

    success: bool
    command_id: str
    result: Optional[dict] = None
    error: Optional[str] = None


class QueueCommandRequest(BaseModel):
    """비동기 명령 큐 요청"""

    command_type: str
    target_node_id: Optional[str] = None
    target_spec: Dict[str, Any] = Field(default_factory=lambda: {"type": "ALL_DEVICES"})
    params: Dict[str, Any] = Field(default_factory=dict)
    priority: CommandPriority = CommandPriority.NORMAL
    scheduled_at: Optional[str] = None


class QueueCommandResponse(BaseModel):
    """비동기 명령 큐 응답"""

    queued: bool
    command_id: Optional[str] = None
    error: Optional[str] = None


# ============================================================
# Broadcast Schemas
# ============================================================


class BroadcastRequest(BaseModel):
    """브로드캐스트 요청"""

    video_url: str
    duration_seconds: int = Field(default=60, ge=1, le=3600)
    target_node_count: int = Field(default=0, ge=0)
    target_node_ids: List[str] = Field(default_factory=list)
    priority: CommandPriority = CommandPriority.HIGH


class BroadcastResponse(BaseModel):
    """브로드캐스트 응답"""

    success: bool
    broadcast_id: str
    target_nodes: int
    sent_nodes: int
    errors: List[str] = Field(default_factory=list)


# ============================================================
# Protocol Message Schemas
# ============================================================


class ProtocolMessage(BaseModel):
    """프로토콜 메시지 기본 구조"""

    version: str = "1.0"
    timestamp: str
    message_id: str
    type: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class HelloMessage(BaseModel):
    """HELLO 메시지"""

    type: str = "HELLO"
    node_id: str
    signature: Optional[str] = None
    message_id: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class HelloAckPayload(BaseModel):
    """HELLO_ACK 페이로드"""

    session_id: str
    heartbeat_interval: int
    max_tasks: int


class HeartbeatAckPayload(BaseModel):
    """HEARTBEAT_ACK 페이로드"""

    status: str = "OK"
    commands: List[dict] = Field(default_factory=list)


class ResultPayload(BaseModel):
    """RESULT 페이로드"""

    command_id: str
    status: str
    summary: Dict[str, Any] = Field(default_factory=dict)
    device_results: List[dict] = Field(default_factory=list)
    error_message: Optional[str] = None


class ErrorPayload(BaseModel):
    """ERROR 페이로드"""

    error_code: str
    error_message: str
    related_message_id: Optional[str] = None


# ============================================================
# Health & Status Schemas
# ============================================================


class HealthResponse(BaseModel):
    """헬스체크 응답"""

    status: str = "ok"
    protocol_version: str
    nodes_connected: int
    nodes_ready: int
    supabase_connected: bool
    signature_verification: bool


class SystemStatusResponse(BaseModel):
    """시스템 상태 응답"""

    gateway: Dict[str, Any]
    nodes: Dict[str, int]
    database: Dict[str, Any] = Field(default_factory=dict)


# ============================================================
# Dashboard WebSocket Schemas
# ============================================================


class DashboardInitMessage(BaseModel):
    """대시보드 초기화 메시지"""

    type: str = "INIT"
    nodes: List[dict]
    total_nodes: int
    ready_nodes: int


class DashboardNodeUpdate(BaseModel):
    """대시보드 노드 업데이트"""

    type: str = "NODE_UPDATE"
    node_id: str
    status: str
    device_count: int
    active_tasks: int
    last_heartbeat: str


class DashboardNodeConnected(BaseModel):
    """대시보드 노드 연결 알림"""

    type: str = "NODE_CONNECTED"
    node_id: str
    session_id: str
    device_count: int
    hostname: str


class DashboardNodeDisconnected(BaseModel):
    """대시보드 노드 연결 해제 알림"""

    type: str = "NODE_DISCONNECTED"
    node_id: str


class DashboardCommandResult(BaseModel):
    """대시보드 명령 결과"""

    type: str = "COMMAND_RESULT"
    node_id: str
    command_id: str
    status: str
    summary: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
