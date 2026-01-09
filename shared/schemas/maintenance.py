"""
Maintenance (유지보수) 스키마 정의

디바이스 팜 유지보수 시스템:
- 디바이스 헬스 체크
- 배터리/스토리지/온도 관리
- 유지보수 작업 스케줄링
- 비용 추적
- 이슈/인시던트 관리

@author Axon (DoAi.Me Tech Lead)
@created 2026-01-09
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
import uuid


# =========================================
# Enums
# =========================================

class MaintenanceType(str, Enum):
    """유지보수 작업 유형"""
    HEALTH_CHECK = "health_check"       # 헬스 체크
    BATTERY_CHECK = "battery_check"     # 배터리 상태 확인
    STORAGE_CLEANUP = "storage_cleanup" # 저장소 정리
    CACHE_CLEAR = "cache_clear"         # 캐시 삭제
    APP_UPDATE = "app_update"           # 앱 업데이트
    SYSTEM_REBOOT = "system_reboot"     # 시스템 재부팅
    FACTORY_RESET = "factory_reset"     # 공장 초기화
    ADB_RECONNECT = "adb_reconnect"     # ADB 재연결
    NETWORK_CHECK = "network_check"     # 네트워크 점검
    TEMPERATURE_CHECK = "temperature_check"  # 온도 점검
    SCREEN_CHECK = "screen_check"       # 화면 상태 점검
    ACCOUNT_CHECK = "account_check"     # 계정 상태 점검


class MaintenanceStatus(str, Enum):
    """유지보수 작업 상태"""
    SCHEDULED = "scheduled"     # 예약됨
    PENDING = "pending"         # 대기 중
    IN_PROGRESS = "in_progress" # 진행 중
    COMPLETED = "completed"     # 완료
    FAILED = "failed"           # 실패
    CANCELLED = "cancelled"     # 취소됨
    SKIPPED = "skipped"         # 건너뜀


class MaintenancePriority(str, Enum):
    """유지보수 우선순위"""
    CRITICAL = "critical"   # 즉시 실행
    HIGH = "high"           # 높음
    NORMAL = "normal"       # 보통
    LOW = "low"             # 낮음
    SCHEDULED = "scheduled" # 예약된 시간에 실행


class HealthStatus(str, Enum):
    """디바이스 헬스 상태"""
    HEALTHY = "healthy"         # 정상
    WARNING = "warning"         # 경고
    CRITICAL = "critical"       # 위험
    UNKNOWN = "unknown"         # 알 수 없음
    MAINTENANCE = "maintenance" # 유지보수 중


class IssueType(str, Enum):
    """이슈 유형"""
    HARDWARE = "hardware"       # 하드웨어 문제
    SOFTWARE = "software"       # 소프트웨어 문제
    NETWORK = "network"         # 네트워크 문제
    BATTERY = "battery"         # 배터리 문제
    STORAGE = "storage"         # 저장소 문제
    TEMPERATURE = "temperature" # 온도 문제
    ACCOUNT = "account"         # 계정 문제
    ADB = "adb"                 # ADB 연결 문제
    APP = "app"                 # 앱 문제
    OTHER = "other"             # 기타


class IssueSeverity(str, Enum):
    """이슈 심각도"""
    CRITICAL = "critical"   # 서비스 불가
    HIGH = "high"           # 심각한 성능 저하
    MEDIUM = "medium"       # 일부 기능 영향
    LOW = "low"             # 경미한 문제
    INFO = "info"           # 정보성


class IssueStatus(str, Enum):
    """이슈 상태"""
    OPEN = "open"               # 열림
    IN_PROGRESS = "in_progress" # 처리 중
    RESOLVED = "resolved"       # 해결됨
    CLOSED = "closed"           # 닫힘
    WONT_FIX = "wont_fix"       # 수정 안 함


class CostCategory(str, Enum):
    """비용 카테고리"""
    ELECTRICITY = "electricity"     # 전기 비용
    NETWORK = "network"             # 네트워크 비용
    HARDWARE = "hardware"           # 하드웨어 비용
    SOFTWARE = "software"           # 소프트웨어 비용
    LABOR = "labor"                 # 인건비
    MAINTENANCE = "maintenance"     # 유지보수 비용
    DEPRECIATION = "depreciation"   # 감가상각
    OTHER = "other"                 # 기타


# =========================================
# 디바이스 헬스
# =========================================

class BatteryHealth(BaseModel):
    """배터리 상태"""
    level: int = Field(..., ge=0, le=100, description="배터리 레벨 (%)")
    temperature: float = Field(default=25.0, description="배터리 온도 (°C)")
    voltage: Optional[float] = Field(None, description="전압 (mV)")
    is_charging: bool = Field(default=False, description="충전 중 여부")
    health: str = Field(default="good", description="배터리 건강 상태")
    charge_cycles: Optional[int] = Field(None, description="충전 사이클 수")


class StorageHealth(BaseModel):
    """저장소 상태"""
    total_bytes: int = Field(..., description="총 저장 공간 (bytes)")
    used_bytes: int = Field(..., description="사용 중인 공간 (bytes)")
    free_bytes: int = Field(..., description="여유 공간 (bytes)")
    usage_percent: float = Field(..., ge=0, le=100, description="사용률 (%)")
    cache_size_bytes: Optional[int] = Field(None, description="캐시 크기 (bytes)")


class NetworkHealth(BaseModel):
    """네트워크 상태"""
    is_connected: bool = Field(default=True, description="연결 상태")
    connection_type: str = Field(default="wifi", description="연결 유형 (wifi, mobile)")
    signal_strength: Optional[int] = Field(None, ge=-100, le=0, description="신호 강도 (dBm)")
    ip_address: Optional[str] = Field(None, description="IP 주소")
    latency_ms: Optional[float] = Field(None, description="지연 시간 (ms)")
    download_speed_mbps: Optional[float] = Field(None, description="다운로드 속도 (Mbps)")


class DeviceHealthRecord(BaseModel):
    """디바이스 헬스 레코드"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str = Field(..., description="디바이스 ID")

    # 전체 상태
    status: HealthStatus = Field(default=HealthStatus.UNKNOWN)
    health_score: float = Field(default=100.0, ge=0, le=100, description="헬스 점수 (0-100)")

    # 세부 상태
    battery: Optional[BatteryHealth] = None
    storage: Optional[StorageHealth] = None
    network: Optional[NetworkHealth] = None

    # 시스템 정보
    cpu_usage_percent: Optional[float] = Field(None, ge=0, le=100)
    memory_usage_percent: Optional[float] = Field(None, ge=0, le=100)
    temperature_celsius: Optional[float] = Field(None, description="기기 온도 (°C)")

    # 앱 상태
    youtube_app_version: Optional[str] = None
    youtube_logged_in: Optional[bool] = None

    # ADB 상태
    adb_connected: bool = Field(default=True)
    adb_response_time_ms: Optional[float] = None

    # 화면 상태
    screen_on: Optional[bool] = None
    screen_locked: Optional[bool] = None

    # 타임스탬프
    checked_at: datetime = Field(default_factory=datetime.utcnow)

    # 이슈/경고
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


# =========================================
# 유지보수 작업
# =========================================

class MaintenanceTaskCreate(BaseModel):
    """유지보수 작업 생성 요청"""
    # 작업 정의
    task_type: MaintenanceType = Field(..., description="작업 유형")
    priority: MaintenancePriority = Field(default=MaintenancePriority.NORMAL)

    # 대상
    device_id: Optional[str] = Field(None, description="대상 디바이스 ID")
    device_ids: Optional[List[str]] = Field(None, description="대상 디바이스 ID 목록")
    workstation_id: Optional[str] = Field(None, description="대상 워크스테이션")
    phoneboard_id: Optional[str] = Field(None, description="대상 폰보드")
    target_all: bool = Field(default=False, description="전체 디바이스 대상")

    # 작업 설정
    parameters: Optional[Dict[str, Any]] = Field(None, description="작업 파라미터")
    timeout_seconds: int = Field(default=300, ge=30, le=3600, description="타임아웃 (초)")
    retry_count: int = Field(default=1, ge=0, le=5, description="재시도 횟수")

    # 스케줄링
    scheduled_at: Optional[datetime] = Field(None, description="예약 실행 시간")
    recurring: bool = Field(default=False, description="반복 실행 여부")
    cron_expression: Optional[str] = Field(None, description="반복 주기 (cron)")

    # 메타데이터
    description: Optional[str] = Field(None, description="작업 설명")
    tags: Optional[List[str]] = Field(None, description="태그")
    metadata: Optional[Dict[str, Any]] = Field(None, description="추가 메타데이터")


class MaintenanceTaskUpdate(BaseModel):
    """유지보수 작업 업데이트 요청"""
    status: Optional[MaintenanceStatus] = None
    priority: Optional[MaintenancePriority] = None
    scheduled_at: Optional[datetime] = None
    parameters: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class MaintenanceTaskResult(BaseModel):
    """유지보수 작업 결과"""
    task_id: str
    device_id: str
    status: MaintenanceStatus

    # 결과 상세
    success: bool = Field(default=False)
    execution_time_ms: int = Field(default=0)
    output: Optional[str] = None

    # 오류 정보
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    # 변경 사항
    changes_made: Optional[Dict[str, Any]] = Field(None, description="변경 내역")
    before_state: Optional[Dict[str, Any]] = Field(None, description="이전 상태")
    after_state: Optional[Dict[str, Any]] = Field(None, description="이후 상태")

    completed_at: datetime = Field(default_factory=datetime.utcnow)


class MaintenanceTaskInDB(BaseModel):
    """DB 저장 유지보수 작업"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    # 작업 정의
    task_type: MaintenanceType
    priority: MaintenancePriority = MaintenancePriority.NORMAL
    status: MaintenanceStatus = MaintenanceStatus.PENDING

    # 대상
    device_id: Optional[str] = None
    device_ids: Optional[List[str]] = None
    workstation_id: Optional[str] = None
    phoneboard_id: Optional[str] = None
    target_all: bool = False
    target_count: int = 0

    # 작업 설정
    parameters: Optional[Dict[str, Any]] = None
    timeout_seconds: int = 300
    retry_count: int = 1
    current_retry: int = 0

    # 스케줄링
    scheduled_at: Optional[datetime] = None
    recurring: bool = False
    cron_expression: Optional[str] = None
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None

    # 진행 상황
    total_devices: int = 0
    completed_devices: int = 0
    failed_devices: int = 0
    skipped_devices: int = 0
    progress_percent: float = 0.0

    # 결과
    results: List[MaintenanceTaskResult] = Field(default_factory=list)

    # 메타데이터
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # 타임스탬프
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class MaintenanceTaskResponse(MaintenanceTaskInDB):
    """유지보수 작업 응답"""
    # 추가 계산 필드
    duration_seconds: Optional[float] = None
    success_rate: Optional[float] = None
    device_names: Optional[List[str]] = None


# =========================================
# 유지보수 스케줄
# =========================================

class MaintenanceScheduleCreate(BaseModel):
    """유지보수 스케줄 생성"""
    name: str = Field(..., min_length=1, max_length=100, description="스케줄 이름")
    description: Optional[str] = None

    # 작업 유형
    task_type: MaintenanceType
    parameters: Optional[Dict[str, Any]] = None

    # 대상
    target_workstations: Optional[List[str]] = None
    target_device_group: Optional[str] = Field(None, description="A 또는 B")
    target_all: bool = False

    # 스케줄
    cron_expression: str = Field(..., description="Cron 표현식")
    timezone: str = Field(default="Asia/Seoul", description="시간대")

    # 활성화
    enabled: bool = Field(default=True)

    # 윈도우
    maintenance_window_start: Optional[str] = Field(None, description="유지보수 시작 시간 (HH:MM)")
    maintenance_window_end: Optional[str] = Field(None, description="유지보수 종료 시간 (HH:MM)")

    # 메타데이터
    tags: Optional[List[str]] = None


class MaintenanceScheduleResponse(BaseModel):
    """유지보수 스케줄 응답"""
    id: str
    name: str
    description: Optional[str]
    task_type: MaintenanceType
    parameters: Optional[Dict[str, Any]]

    target_workstations: Optional[List[str]]
    target_device_group: Optional[str]
    target_all: bool

    cron_expression: str
    timezone: str
    enabled: bool

    maintenance_window_start: Optional[str]
    maintenance_window_end: Optional[str]

    # 실행 이력
    last_run_at: Optional[datetime]
    next_run_at: Optional[datetime]
    run_count: int = 0
    success_count: int = 0
    failure_count: int = 0

    tags: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# =========================================
# 이슈/인시던트
# =========================================

class IssueCreate(BaseModel):
    """이슈 생성 요청"""
    # 이슈 정보
    title: str = Field(..., min_length=1, max_length=200, description="이슈 제목")
    description: Optional[str] = Field(None, description="상세 설명")
    issue_type: IssueType = Field(..., description="이슈 유형")
    severity: IssueSeverity = Field(default=IssueSeverity.MEDIUM)

    # 대상
    device_id: Optional[str] = Field(None, description="관련 디바이스")
    workstation_id: Optional[str] = Field(None, description="관련 워크스테이션")
    phoneboard_id: Optional[str] = Field(None, description="관련 폰보드")

    # 자동 감지 정보
    detected_by: str = Field(default="manual", description="감지 방법 (manual, auto, health_check)")
    health_record_id: Optional[str] = Field(None, description="관련 헬스 레코드 ID")

    # 메타데이터
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class IssueUpdate(BaseModel):
    """이슈 업데이트 요청"""
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[IssueSeverity] = None
    status: Optional[IssueStatus] = None
    assignee: Optional[str] = None
    resolution: Optional[str] = None
    tags: Optional[List[str]] = None


class IssueComment(BaseModel):
    """이슈 코멘트"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    issue_id: str
    author: str = Field(default="system")
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class IssueResponse(BaseModel):
    """이슈 응답"""
    id: str
    title: str
    description: Optional[str]
    issue_type: IssueType
    severity: IssueSeverity
    status: IssueStatus

    # 대상
    device_id: Optional[str]
    workstation_id: Optional[str]
    phoneboard_id: Optional[str]

    # 담당자/해결
    assignee: Optional[str]
    resolution: Optional[str]

    # 감지 정보
    detected_by: str
    health_record_id: Optional[str]

    # 코멘트
    comments: List[IssueComment] = Field(default_factory=list)
    comment_count: int = 0

    # 관련 작업
    related_task_ids: List[str] = Field(default_factory=list)

    # 메타데이터
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # 타임스탬프
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True


# =========================================
# 비용 추적
# =========================================

class CostRecordCreate(BaseModel):
    """비용 기록 생성"""
    category: CostCategory = Field(..., description="비용 카테고리")
    amount: float = Field(..., ge=0, description="금액")
    currency: str = Field(default="KRW", description="통화")

    # 대상
    device_id: Optional[str] = None
    workstation_id: Optional[str] = None

    # 기간
    period_start: datetime = Field(..., description="비용 발생 시작")
    period_end: datetime = Field(..., description="비용 발생 종료")

    # 상세
    description: Optional[str] = None
    unit_cost: Optional[float] = Field(None, description="단위 비용")
    quantity: Optional[float] = Field(None, description="수량")

    # 메타데이터
    invoice_id: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class CostRecordResponse(BaseModel):
    """비용 기록 응답"""
    id: str
    category: CostCategory
    amount: float
    currency: str

    device_id: Optional[str]
    workstation_id: Optional[str]

    period_start: datetime
    period_end: datetime

    description: Optional[str]
    unit_cost: Optional[float]
    quantity: Optional[float]

    invoice_id: Optional[str]
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime
    updated_at: datetime


class CostSummary(BaseModel):
    """비용 요약"""
    period_start: datetime
    period_end: datetime

    total_cost: float = 0.0
    currency: str = "KRW"

    # 카테고리별
    by_category: Dict[str, float] = Field(default_factory=dict)

    # 워크스테이션별
    by_workstation: Dict[str, float] = Field(default_factory=dict)

    # 일별 추이
    daily_costs: List[Dict[str, Any]] = Field(default_factory=list)

    # 비교
    previous_period_cost: Optional[float] = None
    cost_change_percent: Optional[float] = None


# =========================================
# 통계 및 리포트
# =========================================

class MaintenanceStats(BaseModel):
    """유지보수 통계"""
    # 작업 통계
    total_tasks: int = 0
    scheduled_tasks: int = 0
    pending_tasks: int = 0
    in_progress_tasks: int = 0
    completed_tasks: int = 0
    failed_tasks: int = 0

    # 성공률
    success_rate: float = 0.0
    avg_execution_time_ms: float = 0.0

    # 작업 유형별
    by_task_type: Dict[str, int] = Field(default_factory=dict)

    # 오늘 통계
    today_total: int = 0
    today_completed: int = 0
    today_failed: int = 0


class DeviceHealthStats(BaseModel):
    """디바이스 헬스 통계"""
    total_devices: int = 0

    # 상태별
    healthy_count: int = 0
    warning_count: int = 0
    critical_count: int = 0
    unknown_count: int = 0
    maintenance_count: int = 0

    # 평균 점수
    avg_health_score: float = 0.0

    # 배터리
    avg_battery_level: float = 0.0
    low_battery_count: int = 0  # < 20%

    # 저장소
    avg_storage_usage: float = 0.0
    low_storage_count: int = 0  # > 90% used

    # 연결
    adb_connected_count: int = 0
    network_connected_count: int = 0

    # 온도
    avg_temperature: float = 0.0
    overheat_count: int = 0  # > 45°C


class IssueStats(BaseModel):
    """이슈 통계"""
    total_issues: int = 0
    open_issues: int = 0
    in_progress_issues: int = 0
    resolved_issues: int = 0
    closed_issues: int = 0

    # 심각도별
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0

    # 유형별
    by_type: Dict[str, int] = Field(default_factory=dict)

    # 평균 해결 시간
    avg_resolution_time_hours: float = 0.0

    # 오늘 통계
    today_created: int = 0
    today_resolved: int = 0


class MaintenanceDashboard(BaseModel):
    """유지보수 대시보드"""
    # 전체 상태
    system_health: HealthStatus = HealthStatus.HEALTHY

    # 통계
    maintenance_stats: MaintenanceStats
    device_health_stats: DeviceHealthStats
    issue_stats: IssueStats

    # 비용
    monthly_cost: Optional[CostSummary] = None

    # 최근 활동
    recent_tasks: List[MaintenanceTaskResponse] = Field(default_factory=list)
    recent_issues: List[IssueResponse] = Field(default_factory=list)

    # 알림
    active_alerts: List[Dict[str, Any]] = Field(default_factory=list)

    # 업데이트 시간
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# =========================================
# 목록 응답
# =========================================

class MaintenanceTaskListResponse(BaseModel):
    """유지보수 작업 목록 응답"""
    total: int
    stats: MaintenanceStats
    tasks: List[MaintenanceTaskResponse]
    page: int = 1
    page_size: int = 50
    total_pages: int = 1


class DeviceHealthListResponse(BaseModel):
    """디바이스 헬스 목록 응답"""
    total: int
    stats: DeviceHealthStats
    records: List[DeviceHealthRecord]
    page: int = 1
    page_size: int = 50
    total_pages: int = 1


class IssueListResponse(BaseModel):
    """이슈 목록 응답"""
    total: int
    stats: IssueStats
    issues: List[IssueResponse]
    page: int = 1
    page_size: int = 50
    total_pages: int = 1


class CostListResponse(BaseModel):
    """비용 목록 응답"""
    total: int
    summary: CostSummary
    records: List[CostRecordResponse]
    page: int = 1
    page_size: int = 50
    total_pages: int = 1
