"""
결과 관련 스키마 정의
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .task import SearchType


class ResultBase(BaseModel):
    """결과 기본 스키마"""

    task_id: str = Field(..., description="작업 ID")
    watch_time: int = Field(..., ge=0, description="시청 시간 (초)")
    total_duration: int = Field(..., ge=0, description="영상 전체 길이 (초)")
    liked: bool = Field(default=False, description="좋아요 여부")
    commented: bool = Field(default=False, description="댓글 여부")
    comment_text: Optional[str] = Field(None, max_length=1000, description="댓글 내용")
    search_type: SearchType = Field(..., description="검색 경로")
    search_rank: int = Field(default=0, ge=0, description="검색 결과 순위")


class ResultCreate(ResultBase):
    """결과 생성 요청"""

    screenshot_base64: Optional[str] = Field(None, description="스크린샷 (Base64)")
    device_id: str = Field(..., description="기기 ID")


class ResultInDB(ResultBase):
    """DB 저장 결과 스키마"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    video_id: str
    screenshot_url: Optional[str] = None
    watch_percent: float = Field(default=0.0, description="시청 비율 (%)")
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(from_attributes=True)

    def __init__(self, **data):
        super().__init__(**data)
        if self.total_duration > 0:
            self.watch_percent = (self.watch_time / self.total_duration) * 100


class ResultResponse(ResultInDB):
    """결과 응답 스키마"""

    video_title: Optional[str] = None
    device_serial: Optional[str] = None


class ResultListResponse(BaseModel):
    """결과 목록 응답"""

    total: int
    results: list[ResultResponse]


class AggregatedStats(BaseModel):
    """집계 통계 스키마"""

    total_tasks: int = 0
    completed_tasks: int = 0
    failed_tasks: int = 0
    pending_tasks: int = 0

    total_watch_time: int = 0  # 총 시청 시간 (초)
    avg_watch_percent: float = 0.0  # 평균 시청 비율 (%)

    total_likes: int = 0
    like_rate: float = 0.0  # 좋아요 비율 (%)

    total_comments: int = 0
    comment_rate: float = 0.0  # 댓글 비율 (%)

    search_type_distribution: dict = Field(default_factory=dict)
    avg_search_rank: float = 0.0

    active_devices: int = 0
    total_devices: int = 0

    last_updated: datetime = Field(default_factory=datetime.utcnow)


class DailyStats(BaseModel):
    """일일 통계"""

    date: str  # YYYY-MM-DD
    tasks_completed: int = 0
    tasks_failed: int = 0
    watch_time: int = 0
    likes: int = 0
    comments: int = 0


class StatsResponse(BaseModel):
    """통계 응답"""

    aggregated: AggregatedStats
    daily: list[DailyStats]
    by_video: dict  # video_id → 개별 통계
