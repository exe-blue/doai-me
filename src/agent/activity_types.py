"""
에이전트 활동 타입 정의

활동 유형:
1. 상시 활동 (Routine Activity): 6대 활동
   - ACT_001: Shorts 리믹스 (콘텐츠 아이디어)
   - ACT_002: 플레이리스트 큐레이터 (시청시간 확보)
   - ACT_003: 페르소나 코멘터 (커뮤니티 구축)
   - ACT_004: 트렌드 스카우트 (트렌드 선점)
   - ACT_005: 챌린지 헌터 (기회 발굴)
   - ACT_006: 썸네일 랩 (데이터 수집)
2. 요청 활동 (Request Activity): 인트라넷을 통한 비디오 시청 요청
"""

from enum import Enum, auto
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ActivityType(str, Enum):
    """활동 타입"""
    ROUTINE = "routine"      # 상시 활동
    REQUEST = "request"      # 요청 활동


class RoutineActivity(str, Enum):
    """상시 활동 종류 (6대 활동)"""
    SHORTS_REMIX = "shorts_remix"                # ACT_001: Shorts 리믹스
    PLAYLIST_CURATOR = "playlist_curator"        # ACT_002: 플레이리스트 큐레이터
    PERSONA_COMMENTER = "persona_commenter"      # ACT_003: 페르소나 코멘터
    TREND_SCOUT = "trend_scout"                  # ACT_004: 트렌드 스카우트
    CHALLENGE_HUNTER = "challenge_hunter"        # ACT_005: 챌린지 헌터
    THUMBNAIL_LAB = "thumbnail_lab"              # ACT_006: 썸네일 랩
    
    # Legacy (하위 호환성)
    REMIX_FACTORY = "remix_factory"
    PLAYLIST_MAKING = "playlist_making"
    SHORTS_BROWSING = "shorts_browsing"
    TRENDING_CHECK = "trending_check"
    SUBSCRIPTION_WATCH = "subscription_watch"
    EXPLORE_RANDOM = "explore_random"


@dataclass
class RoutineActivityConfig:
    """상시 활동 설정"""
    activity: RoutineActivity
    weight: float = 1.0           # 선택 가중치 (확률)
    min_duration: int = 60        # 최소 활동 시간 (초)
    max_duration: int = 300       # 최대 활동 시간 (초)
    enabled: bool = True          # 활성화 여부
    
    # 활동별 파라미터
    parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RequestActivity:
    """요청 활동 (비디오 시청 요청)"""
    id: str                           # 요청 ID
    batch_index: int                  # 배치 내 인덱스 (0-4)
    
    # 검색 정보
    keyword: str                      # 검색 키워드
    title: str                        # 영상 제목
    channel_name: Optional[str] = None  # 채널명
    video_id: Optional[str] = None    # 비디오 ID (있으면 직접 접근)
    
    # 시청 설정
    watch_percent_min: int = 20       # 최소 시청 비율 (%)
    watch_percent_max: int = 90       # 최대 시청 비율 (%)
    fast_forward_interval: int = 12   # 더블탭 간격 (10-15초 사이 랜덤)
    
    # 인게이지먼트 설정
    like_probability: int = 30        # 좋아요 확률 (%)
    comment_probability: int = 10     # 댓글 확률 (%)
    comment_text: Optional[str] = None  # 댓글 내용
    
    # 타이밍
    scheduled_at: Optional[datetime] = None  # 예약 시간 (None이면 즉시)
    created_at: datetime = field(default_factory=datetime.now)
    
    # 상태
    status: str = "pending"           # pending, in_progress, completed, error
    error_message: Optional[str] = None
    
    # 투자 키워드 (마지막 단계용)
    investment_keyword: Optional[str] = None


@dataclass
class RequestBatch:
    """요청 배치 (5개 단위)"""
    batch_id: str
    requests: List[RequestActivity] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    
    # 투자 키워드 목록 (OpenAI가 생성)
    investment_keywords: List[str] = field(default_factory=lambda: [
        "해외주식", "주식투자", "미국주식", "ETF투자", "배당주"
    ])
    
    def __post_init__(self):
        if len(self.requests) > 5:
            raise ValueError("배치는 최대 5개의 요청만 포함할 수 있습니다.")
    
    @property
    def is_complete(self) -> bool:
        """배치 완료 여부"""
        return all(r.status in ("completed", "error") for r in self.requests)
    
    @property
    def pending_count(self) -> int:
        """대기 중인 요청 수"""
        return sum(1 for r in self.requests if r.status == "pending")
    
    def get_random_order(self) -> List[RequestActivity]:
        """랜덤 순서로 요청 반환"""
        import random
        pending = [r for r in self.requests if r.status == "pending"]
        random.shuffle(pending)
        return pending


@dataclass 
class AgentState:
    """에이전트 상태"""
    agent_id: str                     # 에이전트 ID (디바이스 IP)
    current_activity: Optional[str] = None  # 현재 활동
    activity_type: Optional[ActivityType] = None  # 활동 타입
    
    # 상시 활동 관련
    completed_routines: List[str] = field(default_factory=list)  # 완료한 상시 활동
    last_routine_at: Optional[datetime] = None
    
    # 요청 활동 관련
    current_batch_id: Optional[str] = None
    current_request_id: Optional[str] = None
    completed_requests: int = 0
    
    # 통계
    total_watch_time: int = 0         # 총 시청 시간 (초)
    total_likes: int = 0              # 총 좋아요 수
    total_comments: int = 0           # 총 댓글 수
    errors: int = 0                   # 에러 횟수
    
    # 타이밍
    started_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None


# 6대 상시 활동 설정 (기획서 기반)
DEFAULT_ROUTINE_CONFIGS: Dict[RoutineActivity, RoutineActivityConfig] = {
    # ACT_001: Shorts 리믹스 (100-150대)
    # 목적: 바이럴 Shorts 콘텐츠 아이디어 수집
    RoutineActivity.SHORTS_REMIX: RoutineActivityConfig(
        activity=RoutineActivity.SHORTS_REMIX,
        weight=2.0,  # 높은 가중치 (콘텐츠 아이디어 중요)
        min_duration=120,
        max_duration=300,
        parameters={
            "scroll_count": (10, 20),      # 스크롤할 Shorts 수
            "save_top_n": 5,               # 상위 N개 저장
            "engagement_threshold": 0.08,  # 인게이지먼트 기준
            "collect_comments": True,      # 댓글 수집 여부
            "detect_trends": True,         # 트렌드 감지
        }
    ),
    
    # ACT_002: 플레이리스트 큐레이터 (80-120대)
    # 목적: 시청시간 극대화 플레이리스트 구축
    RoutineActivity.PLAYLIST_CURATOR: RoutineActivityConfig(
        activity=RoutineActivity.PLAYLIST_CURATOR,
        weight=1.5,
        min_duration=180,
        max_duration=420,
        parameters={
            "videos_to_add": (3, 7),        # 추가할 영상 수
            "watch_duration_min": 60,       # 최소 시청 시간 (초)
            "categories": ["finance", "investment", "economy"],
            "retention_threshold": 0.6,     # 시청 유지율 기준
            "create_new_probability": 20,   # 새 플레이리스트 생성 확률
        }
    ),
    
    # ACT_003: 페르소나 코멘터 (100-150대)
    # 목적: 커뮤니티 구축, 자연스러운 참여
    RoutineActivity.PERSONA_COMMENTER: RoutineActivityConfig(
        activity=RoutineActivity.PERSONA_COMMENTER,
        weight=2.0,  # 높은 가중치 (커뮤니티 구축 중요)
        min_duration=120,
        max_duration=300,
        parameters={
            "comments_per_session": (3, 8),  # 세션당 댓글 수
            "reply_probability": 30,         # 댓글 답글 확률
            "like_probability": 70,          # 좋아요 확률
            "persona_rotation": True,        # 페르소나 로테이션
            "comment_delay": (30, 120),      # 댓글 간 딜레이 (초)
        }
    ),
    
    # ACT_004: 트렌드 스카우트 (80-100대)
    # 목적: Rising Star 발굴, 트렌드 선점
    RoutineActivity.TREND_SCOUT: RoutineActivityConfig(
        activity=RoutineActivity.TREND_SCOUT,
        weight=1.5,
        min_duration=150,
        max_duration=300,
        parameters={
            "check_trending": True,          # 인기 급상승 체크
            "check_rising": True,            # Rising Star 체크
            "subscriber_threshold": (1000, 50000),  # 구독자 범위
            "view_velocity_min": 1.5,        # 조회수 속도 배수
            "save_channels": True,           # 채널 저장
        }
    ),
    
    # ACT_005: 챌린지 헌터 (60-80대)
    # 목적: 새로운 챌린지/밈 조기 탐지
    RoutineActivity.CHALLENGE_HUNTER: RoutineActivityConfig(
        activity=RoutineActivity.CHALLENGE_HUNTER,
        weight=1.0,
        min_duration=120,
        max_duration=240,
        parameters={
            "hashtag_scan": True,            # 해시태그 스캔
            "music_trends": True,            # 음악 트렌드 체크
            "viral_threshold": 10000,        # 바이럴 기준 조회수
            "age_limit_hours": 72,           # 신규 기준 시간
            "report_immediately": True,      # 즉시 보고
        }
    ),
    
    # ACT_006: 썸네일 랩 (50-80대)
    # 목적: 고성과 썸네일 데이터 수집
    RoutineActivity.THUMBNAIL_LAB: RoutineActivityConfig(
        activity=RoutineActivity.THUMBNAIL_LAB,
        weight=1.0,
        min_duration=90,
        max_duration=180,
        parameters={
            "thumbnails_to_analyze": (10, 20),  # 분석할 썸네일 수
            "capture_thumbnails": True,      # 썸네일 캡처
            "analyze_elements": True,        # 요소 분석 (색상, 텍스트 등)
            "ctr_estimation": True,          # CTR 추정
            "a_b_comparison": True,          # A/B 비교
        }
    ),
}

# 활동별 디바이스 할당 범위 (기획서 기반)
ACTIVITY_DEVICE_RANGES: Dict[RoutineActivity, tuple] = {
    RoutineActivity.SHORTS_REMIX: (100, 150),
    RoutineActivity.PLAYLIST_CURATOR: (80, 120),
    RoutineActivity.PERSONA_COMMENTER: (100, 150),
    RoutineActivity.TREND_SCOUT: (80, 100),
    RoutineActivity.CHALLENGE_HUNTER: (60, 80),
    RoutineActivity.THUMBNAIL_LAB: (50, 80),
}

