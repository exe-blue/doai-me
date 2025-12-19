"""YouTube 태스크 데이터 모델"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid


class TaskStatus(str, Enum):
    """태스크 상태"""
    PENDING = "pending"          # 대기중
    SCHEDULED = "scheduled"      # 예약됨
    RUNNING = "running"          # 실행중
    COMPLETED = "completed"      # 완료
    FAILED = "failed"            # 실패
    CANCELLED = "cancelled"      # 취소


class YouTubeTaskCreate(BaseModel):
    """YouTube 태스크 생성 요청"""
    
    # 기본 정보
    keyword: str = Field(..., description="검색 키워드")
    title: str = Field(..., description="영상 제목 (검색/확인용)")
    
    # 스케줄링
    scheduled_time: str = Field(
        ..., 
        description="실행 예정 시간 (상대시간: '30분뒤', '1시간뒤' 또는 절대시간)"
    )
    
    # YouTube 정보 (선택)
    video_url: Optional[str] = Field(None, description="영상 URL")
    video_id: Optional[str] = Field(None, description="YouTube 영상 ID")
    channel_id: Optional[str] = Field(None, description="채널 ID")
    channel_name: Optional[str] = Field(None, description="채널 이름")
    
    # 에이전트 설정
    agent_start: int = Field(1, ge=1, le=600, description="시작 에이전트 번호")
    agent_end: int = Field(600, ge=1, le=600, description="종료 에이전트 번호")
    
    # 행동 확률
    like_probability: float = Field(
        0.3, 
        ge=0, 
        le=1, 
        description="좋아요 확률 (0~1, 기본 0.3)"
    )
    comment_probability: float = Field(
        0.1, 
        ge=0, 
        le=1, 
        description="댓글 확률 (0~1, 기본 0.1)"
    )
    subscribe_probability: float = Field(
        0.05, 
        ge=0, 
        le=1, 
        description="구독 확률 (0~1, 기본 0.05)"
    )
    
    # 시청 설정
    watch_duration_min: int = Field(30, ge=10, description="최소 시청 시간 (초)")
    watch_duration_max: int = Field(180, ge=10, description="최대 시청 시간 (초)")
    
    # 댓글 설정
    use_ai_comment: bool = Field(True, description="AI 댓글 생성 사용 여부")
    custom_comments: Optional[List[str]] = Field(None, description="커스텀 댓글 목록")
    
    # 메모
    memo: Optional[str] = Field(None, description="메모")


class YouTubeTaskUpdate(BaseModel):
    """YouTube 태스크 수정 요청"""
    
    keyword: Optional[str] = None
    title: Optional[str] = None
    scheduled_time: Optional[str] = None
    video_url: Optional[str] = None
    video_id: Optional[str] = None
    channel_id: Optional[str] = None
    channel_name: Optional[str] = None
    agent_start: Optional[int] = Field(None, ge=1, le=600)
    agent_end: Optional[int] = Field(None, ge=1, le=600)
    like_probability: Optional[float] = Field(None, ge=0, le=1)
    comment_probability: Optional[float] = Field(None, ge=0, le=1)
    subscribe_probability: Optional[float] = Field(None, ge=0, le=1)
    watch_duration_min: Optional[int] = Field(None, ge=10)
    watch_duration_max: Optional[int] = Field(None, ge=10)
    use_ai_comment: Optional[bool] = None
    custom_comments: Optional[List[str]] = None
    memo: Optional[str] = None
    status: Optional[TaskStatus] = None


class YouTubeTaskModel(BaseModel):
    """YouTube 태스크 전체 모델"""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # 기본 정보
    keyword: str
    title: str
    
    # 스케줄링
    scheduled_time: str
    scheduled_at: Optional[datetime] = None  # 계산된 실행 시간
    
    # YouTube 정보
    video_url: Optional[str] = None
    video_id: Optional[str] = None
    channel_id: Optional[str] = None
    channel_name: Optional[str] = None
    
    # 에이전트 설정
    agent_start: int = 1
    agent_end: int = 600
    
    # 행동 확률
    like_probability: float = 0.3
    comment_probability: float = 0.1
    subscribe_probability: float = 0.05
    
    # 시청 설정
    watch_duration_min: int = 30
    watch_duration_max: int = 180
    
    # 댓글 설정
    use_ai_comment: bool = True
    custom_comments: Optional[List[str]] = None
    
    # 메타데이터
    status: TaskStatus = TaskStatus.PENDING
    memo: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # 실행 결과
    result: Optional[dict] = None
    
    class Config:
        use_enum_values = True

