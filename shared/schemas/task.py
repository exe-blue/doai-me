"""
작업 관련 스키마 정의
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    """작업 상태"""

    QUEUED = "queued"  # 대기열
    ASSIGNED = "assigned"  # 기기 할당됨
    RUNNING = "running"  # 실행 중
    COMPLETED = "completed"  # 완료
    FAILED = "failed"  # 실패
    CANCELLED = "cancelled"  # 취소


class SearchType(int, Enum):
    """검색 경로 타입"""

    KEYWORD = 1  # 통합검색
    RECENT = 2  # 시간검색 (최근 1시간)
    TITLE = 3  # 제목검색
    DIRECT_URL = 4  # 주소입력


class TaskBase(BaseModel):
    """작업 기본 스키마"""

    video_id: str = Field(..., description="영상 ID")
    device_id: Optional[str] = Field(None, description="할당된 기기 ID")
    priority: int = Field(default=5, ge=1, le=10, description="우선순위")


class TaskCreate(TaskBase):
    """작업 생성 요청"""

    pattern_config: Optional[dict] = Field(None, description="휴먼 패턴 설정 오버라이드")


class TaskAssign(BaseModel):
    """작업 할당 요청"""

    device_id: str


class TaskInDB(TaskBase):
    """DB 저장 작업 스키마"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: TaskStatus = TaskStatus.QUEUED
    pattern_config: dict = Field(default_factory=dict, description="적용된 휴먼 패턴 설정")
    retry_count: int = Field(default=0, description="재시도 횟수")
    max_retries: int = Field(default=3, description="최대 재시도 횟수")
    queued_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class TaskResponse(TaskInDB):
    """작업 응답 스키마"""

    video_title: Optional[str] = None
    device_serial: Optional[str] = None
    duration_seconds: Optional[int] = None  # 작업 소요 시간


class TaskQueueResponse(BaseModel):
    """작업 대기열 응답"""

    total: int
    queued: int
    assigned: int
    running: int
    completed: int
    failed: int
    tasks: list[TaskResponse]


class TaskMessage(BaseModel):
    """Redis 작업 메시지"""

    task_id: str
    video_id: str
    video_url: Optional[str] = None
    video_title: Optional[str] = None
    video_keyword: Optional[str] = None
    pattern_config: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TaskResultMessage(BaseModel):
    """작업 결과 메시지"""

    task_id: str
    device_id: str
    status: TaskStatus
    watch_time: Optional[int] = None
    liked: bool = False
    commented: bool = False
    comment_text: Optional[str] = None
    search_type: Optional[SearchType] = None
    search_rank: Optional[int] = None
    screenshot_path: Optional[str] = None
    error_message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
