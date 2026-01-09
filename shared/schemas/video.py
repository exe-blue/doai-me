"""
영상 관련 스키마 정의
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


class VideoStatus(str, Enum):
    """영상 처리 상태"""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"


class VideoBase(BaseModel):
    """영상 기본 스키마"""

    url: Optional[HttpUrl] = Field(None, description="YouTube 영상 URL")
    title: Optional[str] = Field(None, max_length=500, description="영상 제목")
    keyword: Optional[str] = Field(None, max_length=255, description="검색 키워드")
    duration: Optional[int] = Field(None, ge=0, description="영상 길이 (초)")
    priority: int = Field(default=5, ge=1, le=10, description="우선순위 (1-10)")


class VideoCreate(VideoBase):
    """영상 생성 요청"""

    pass


class VideoUpdate(BaseModel):
    """영상 업데이트 요청"""

    url: Optional[HttpUrl] = None
    title: Optional[str] = None
    keyword: Optional[str] = None
    duration: Optional[int] = None
    priority: Optional[int] = None
    status: Optional[VideoStatus] = None


class VideoInDB(VideoBase):
    """DB 저장 영상 스키마"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: VideoStatus = VideoStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class VideoResponse(VideoInDB):
    """영상 응답 스키마"""

    completed_count: int = Field(default=0, description="완료된 시청 횟수")
    error_count: int = Field(default=0, description="에러 횟수")


class VideoListResponse(BaseModel):
    """영상 목록 응답"""

    total: int
    pending: int
    processing: int
    completed: int
    error: int
    videos: list[VideoResponse]
