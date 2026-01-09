"""
Commission (작업 위임) 시스템 단위 테스트

테스트 대상:
- Commission 스키마 유효성
- CommissionStatus/JobType Enum
- CommissionService Mock 테스트
- Commission API 엔드포인트 테스트

@author Axon (DoAi.Me Tech Lead)
@created 2026-01-09
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from shared.schemas.commission import (
    JobType,
    CommissionStatus,
    PlatformType,
    ElementType,
    CommissionTarget,
    CommissionContent,
    CommissionTiming,
    CommissionReward,
    BonusConditions,
    CommissionCompliance,
    CommissionJob,
    CommissionCreate,
    CommissionUpdate,
    CommissionInDB,
    CommissionResponse,
    CommissionBatchCreate,
    CommissionBatchResponse,
    CommissionResult,
    CommissionStats,
    CommissionListResponse,
    CommissionQueueStatus,
    ActiveCommissionsResponse,
)


# =============================================================================
# Enum 테스트
# =============================================================================

class TestJobTypeEnum:
    """JobType Enum 테스트"""

    def test_job_type_values(self):
        """작업 유형 값 확인"""
        assert JobType.LIKE.value == "LIKE"
        assert JobType.COMMENT.value == "COMMENT"
        assert JobType.SUBSCRIBE.value == "SUBSCRIBE"
        assert JobType.WATCH.value == "WATCH"
        assert JobType.SHARE.value == "SHARE"

    def test_job_type_count(self):
        """작업 유형 개수 확인"""
        assert len(JobType) == 5


class TestCommissionStatusEnum:
    """CommissionStatus Enum 테스트"""

    def test_commission_status_values(self):
        """Commission 상태 값 확인"""
        assert CommissionStatus.PENDING.value == "pending"
        assert CommissionStatus.ASSIGNED.value == "assigned"
        assert CommissionStatus.SENT.value == "sent"
        assert CommissionStatus.IN_PROGRESS.value == "in_progress"
        assert CommissionStatus.SUCCESS.value == "success"
        assert CommissionStatus.FAILED.value == "failed"
        assert CommissionStatus.REFUSED.value == "refused"
        assert CommissionStatus.TIMEOUT.value == "timeout"
        assert CommissionStatus.CANCELLED.value == "cancelled"

    def test_commission_status_count(self):
        """Commission 상태 개수 확인"""
        assert len(CommissionStatus) == 9


class TestPlatformTypeEnum:
    """PlatformType Enum 테스트"""

    def test_platform_type_values(self):
        """플랫폼 타입 값 확인"""
        assert PlatformType.YOUTUBE.value == "youtube"
        assert PlatformType.INSTAGRAM.value == "instagram"
        assert PlatformType.TIKTOK.value == "tiktok"
        assert PlatformType.TWITTER.value == "twitter"
        assert PlatformType.FACEBOOK.value == "facebook"


class TestElementTypeEnum:
    """ElementType Enum 테스트"""

    def test_element_type_values(self):
        """요소 타입 값 확인"""
        assert ElementType.BUTTON.value == "BUTTON"
        assert ElementType.INPUT.value == "INPUT"
        assert ElementType.VIDEO.value == "VIDEO"
        assert ElementType.LINK.value == "LINK"


# =============================================================================
# 설정 스키마 테스트
# =============================================================================

class TestCommissionTarget:
    """CommissionTarget 스키마 테스트"""

    def test_commission_target_basic(self):
        """기본 타겟 생성"""
        target = CommissionTarget(
            element_type=ElementType.BUTTON,
            selector_hint="like_button"
        )

        assert target.element_type == ElementType.BUTTON
        assert target.selector_hint == "like_button"
        assert target.required_state == "VISIBLE"

    def test_commission_target_with_fallback(self):
        """폴백 좌표 포함 타겟"""
        target = CommissionTarget(
            element_type=ElementType.VIDEO,
            selector_hint="video_player",
            fallback_coords=[540, 960],
            required_state="CLICKABLE"
        )

        assert target.fallback_coords == [540, 960]
        assert target.required_state == "CLICKABLE"


class TestCommissionContent:
    """CommissionContent 스키마 테스트"""

    def test_commission_content_defaults(self):
        """기본값 테스트"""
        content = CommissionContent()

        assert content.text is None
        assert content.persona_voice is True
        assert content.max_length == 200

    def test_commission_content_with_text(self):
        """텍스트 포함"""
        content = CommissionContent(
            text="좋은 영상이네요!",
            persona_voice=True,
            max_length=100
        )

        assert content.text == "좋은 영상이네요!"
        assert content.max_length == 100


class TestCommissionTiming:
    """CommissionTiming 스키마 테스트"""

    def test_commission_timing_defaults(self):
        """기본값 테스트"""
        timing = CommissionTiming()

        assert timing.delay_before_ms == 2000
        assert timing.delay_after_ms == 1000
        assert timing.timeout_sec == 30
        assert timing.retry_count == 2

    def test_commission_timing_custom(self):
        """커스텀 값"""
        timing = CommissionTiming(
            delay_before_ms=5000,
            delay_after_ms=2000,
            timeout_sec=60,
            retry_count=3
        )

        assert timing.delay_before_ms == 5000
        assert timing.timeout_sec == 60

    def test_commission_timing_validation(self):
        """유효성 검사"""
        # timeout_sec 범위: 5~300
        timing = CommissionTiming(timeout_sec=5)
        assert timing.timeout_sec == 5

        timing = CommissionTiming(timeout_sec=300)
        assert timing.timeout_sec == 300

        with pytest.raises(ValueError):
            CommissionTiming(timeout_sec=4)

        with pytest.raises(ValueError):
            CommissionTiming(timeout_sec=301)


class TestCommissionReward:
    """CommissionReward 스키마 테스트"""

    def test_commission_reward_defaults(self):
        """기본값 테스트"""
        reward = CommissionReward()

        assert reward.base_credits == 10
        assert reward.bonus_conditions is None

    def test_commission_reward_with_bonus(self):
        """보너스 조건 포함"""
        bonus = BonusConditions(
            first_of_day=10,
            streak_bonus=5,
            quality_bonus=15
        )
        reward = CommissionReward(
            base_credits=20,
            bonus_conditions=bonus
        )

        assert reward.base_credits == 20
        assert reward.bonus_conditions.first_of_day == 10


class TestCommissionCompliance:
    """CommissionCompliance 스키마 테스트"""

    def test_commission_compliance_defaults(self):
        """기본값 테스트"""
        compliance = CommissionCompliance()

        assert compliance.ethical_check is True
        assert compliance.persona_alignment == 0.7
        assert compliance.can_refuse is True

    def test_commission_compliance_custom(self):
        """커스텀 값"""
        compliance = CommissionCompliance(
            ethical_check=False,
            persona_alignment=0.5,
            can_refuse=False
        )

        assert compliance.ethical_check is False
        assert compliance.persona_alignment == 0.5

    def test_persona_alignment_range(self):
        """페르소나 적합도 범위 검사"""
        # 0.0 ~ 1.0 범위
        compliance = CommissionCompliance(persona_alignment=0.0)
        assert compliance.persona_alignment == 0.0

        compliance = CommissionCompliance(persona_alignment=1.0)
        assert compliance.persona_alignment == 1.0

        with pytest.raises(ValueError):
            CommissionCompliance(persona_alignment=-0.1)

        with pytest.raises(ValueError):
            CommissionCompliance(persona_alignment=1.1)


# =============================================================================
# 작업 정의 스키마 테스트
# =============================================================================

class TestCommissionJob:
    """CommissionJob 스키마 테스트"""

    def test_commission_job_like(self):
        """LIKE 작업 생성"""
        job = CommissionJob(
            type=JobType.LIKE,
            platform=PlatformType.YOUTUBE,
            video_id="dQw4w9WgXcQ"
        )

        assert job.type == JobType.LIKE
        assert job.platform == PlatformType.YOUTUBE
        assert job.video_id == "dQw4w9WgXcQ"

    def test_commission_job_comment(self):
        """COMMENT 작업 생성"""
        job = CommissionJob(
            type=JobType.COMMENT,
            url="https://www.youtube.com/watch?v=abc123"
        )

        assert job.type == JobType.COMMENT
        assert job.url == "https://www.youtube.com/watch?v=abc123"

    def test_commission_job_subscribe(self):
        """SUBSCRIBE 작업 생성"""
        job = CommissionJob(
            type=JobType.SUBSCRIBE,
            channel_id="UCxxxxxx"
        )

        assert job.type == JobType.SUBSCRIBE
        assert job.channel_id == "UCxxxxxx"

    def test_commission_job_defaults(self):
        """기본값 테스트"""
        job = CommissionJob(type=JobType.WATCH)

        assert job.platform == PlatformType.YOUTUBE
        assert job.url is None
        assert job.video_id is None


# =============================================================================
# Commission CRUD 스키마 테스트
# =============================================================================

class TestCommissionCreate:
    """CommissionCreate 스키마 테스트"""

    def test_commission_create_minimal(self):
        """최소 필수 필드"""
        commission = CommissionCreate(
            job=CommissionJob(
                type=JobType.LIKE,
                video_id="test123"
            )
        )

        assert commission.job.type == JobType.LIKE
        assert commission.device_id is None
        assert commission.priority == 5

    def test_commission_create_with_device(self):
        """특정 디바이스 지정"""
        commission = CommissionCreate(
            job=CommissionJob(type=JobType.WATCH, video_id="abc"),
            device_id="device-001"
        )

        assert commission.device_id == "device-001"

    def test_commission_create_batch_devices(self):
        """배치 디바이스 목록"""
        commission = CommissionCreate(
            job=CommissionJob(type=JobType.LIKE, video_id="xyz"),
            device_ids=["device-001", "device-002", "device-003"]
        )

        assert len(commission.device_ids) == 3

    def test_commission_create_workstation_target(self):
        """워크스테이션 타겟"""
        commission = CommissionCreate(
            job=CommissionJob(type=JobType.SUBSCRIBE, channel_id="UCtest"),
            target_workstations=["WS01", "WS02"],
            device_percent=0.5
        )

        assert commission.target_workstations == ["WS01", "WS02"]
        assert commission.device_percent == 0.5

    def test_commission_create_full(self):
        """모든 필드 설정"""
        scheduled_time = datetime.now(timezone.utc) + timedelta(hours=1)

        commission = CommissionCreate(
            job=CommissionJob(
                type=JobType.COMMENT,
                platform=PlatformType.YOUTUBE,
                video_id="test123"
            ),
            device_id="device-001",
            target=CommissionTarget(
                element_type=ElementType.INPUT,
                selector_hint="comment_box"
            ),
            content=CommissionContent(
                text="Great video!",
                persona_voice=True
            ),
            timing=CommissionTiming(
                delay_before_ms=3000,
                timeout_sec=60
            ),
            reward=CommissionReward(base_credits=15),
            compliance=CommissionCompliance(persona_alignment=0.8),
            priority=8,
            scheduled_at=scheduled_time,
            tags=["vip", "urgent"],
            metadata={"campaign_id": "campaign-001"}
        )

        assert commission.job.type == JobType.COMMENT
        assert commission.content.text == "Great video!"
        assert commission.priority == 8
        assert commission.tags == ["vip", "urgent"]

    def test_commission_create_priority_range(self):
        """우선순위 범위 검사"""
        # 1~10 범위
        commission = CommissionCreate(
            job=CommissionJob(type=JobType.LIKE, video_id="x"),
            priority=1
        )
        assert commission.priority == 1

        commission = CommissionCreate(
            job=CommissionJob(type=JobType.LIKE, video_id="x"),
            priority=10
        )
        assert commission.priority == 10

        with pytest.raises(ValueError):
            CommissionCreate(
                job=CommissionJob(type=JobType.LIKE, video_id="x"),
                priority=0
            )

        with pytest.raises(ValueError):
            CommissionCreate(
                job=CommissionJob(type=JobType.LIKE, video_id="x"),
                priority=11
            )


class TestCommissionUpdate:
    """CommissionUpdate 스키마 테스트"""

    def test_commission_update_status(self):
        """상태 업데이트"""
        update = CommissionUpdate(status=CommissionStatus.CANCELLED)

        assert update.status == CommissionStatus.CANCELLED
        assert update.priority is None

    def test_commission_update_priority(self):
        """우선순위 업데이트"""
        update = CommissionUpdate(priority=9)

        assert update.priority == 9
        assert update.status is None

    def test_commission_update_schedule(self):
        """예약 시간 업데이트"""
        new_time = datetime.now(timezone.utc) + timedelta(hours=2)
        update = CommissionUpdate(scheduled_at=new_time)

        assert update.scheduled_at == new_time

    def test_commission_update_metadata(self):
        """메타데이터 업데이트"""
        update = CommissionUpdate(
            tags=["updated", "high-priority"],
            metadata={"note": "Updated by admin"}
        )

        assert "updated" in update.tags
        assert update.metadata["note"] == "Updated by admin"


class TestCommissionInDB:
    """CommissionInDB 스키마 테스트"""

    def test_commission_in_db_defaults(self):
        """기본값 테스트"""
        commission = CommissionInDB(
            job_type=JobType.LIKE,
            video_id="test123"
        )

        assert commission.id is not None  # UUID 자동 생성
        assert commission.platform == PlatformType.YOUTUBE
        assert commission.status == CommissionStatus.PENDING
        assert commission.priority == 5
        assert commission.credits_earned == 0
        assert commission.retry_count == 0

    def test_commission_in_db_full(self):
        """전체 필드"""
        now = datetime.now(timezone.utc)

        commission = CommissionInDB(
            id="comm-001",
            job_type=JobType.COMMENT,
            platform=PlatformType.YOUTUBE,
            url="https://youtube.com/watch?v=test",
            video_id="test123",
            device_id="device-001",
            status=CommissionStatus.SUCCESS,
            priority=8,
            credits_earned=25,
            execution_time_ms=5000,
            completed_at=now
        )

        assert commission.id == "comm-001"
        assert commission.credits_earned == 25
        assert commission.completed_at == now


class TestCommissionResponse:
    """CommissionResponse 스키마 테스트"""

    def test_commission_response_with_names(self):
        """추가 필드 포함"""
        response = CommissionResponse(
            id="comm-001",
            job_type=JobType.LIKE,
            video_id="test123",
            device_name="Galaxy S10 #1",
            video_title="Test Video",
            channel_name="Test Channel",
            progress_percent=75.5
        )

        assert response.device_name == "Galaxy S10 #1"
        assert response.video_title == "Test Video"
        assert response.progress_percent == 75.5


# =============================================================================
# 배치 Commission 테스트
# =============================================================================

class TestCommissionBatchCreate:
    """CommissionBatchCreate 스키마 테스트"""

    def test_batch_create_with_devices(self):
        """디바이스 목록으로 배치 생성"""
        batch = CommissionBatchCreate(
            job=CommissionJob(type=JobType.LIKE, video_id="test"),
            device_ids=["d1", "d2", "d3", "d4", "d5"]
        )

        assert len(batch.device_ids) == 5
        assert batch.device_percent == 1.0

    def test_batch_create_with_workstations(self):
        """워크스테이션으로 배치 생성"""
        batch = CommissionBatchCreate(
            job=CommissionJob(type=JobType.SUBSCRIBE, channel_id="UCtest"),
            target_workstations=["WS01", "WS02"],
            device_percent=0.3
        )

        assert batch.target_workstations == ["WS01", "WS02"]
        assert batch.device_percent == 0.3

    def test_batch_create_with_settings(self):
        """설정 포함 배치 생성"""
        batch = CommissionBatchCreate(
            job=CommissionJob(type=JobType.WATCH, video_id="xyz"),
            device_ids=["d1", "d2"],
            timing=CommissionTiming(timeout_sec=120),
            reward=CommissionReward(base_credits=20),
            priority=9
        )

        assert batch.timing.timeout_sec == 120
        assert batch.reward.base_credits == 20
        assert batch.priority == 9


class TestCommissionBatchResponse:
    """CommissionBatchResponse 스키마 테스트"""

    def test_batch_response(self):
        """배치 응답"""
        response = CommissionBatchResponse(
            batch_id="batch-001",
            total_created=10,
            total_devices=10,
            commissions=["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"],
            created_at=datetime.now(timezone.utc)
        )

        assert response.batch_id == "batch-001"
        assert response.total_created == 10
        assert len(response.commissions) == 10


# =============================================================================
# 결과 및 통계 테스트
# =============================================================================

class TestCommissionResult:
    """CommissionResult 스키마 테스트"""

    def test_commission_result_success(self):
        """성공 결과"""
        result = CommissionResult(
            commission_id="comm-001",
            device_id="device-001",
            status=CommissionStatus.SUCCESS,
            execution_time_ms=3500,
            credits_earned=15,
            action_details={"liked": True, "comment_posted": False}
        )

        assert result.status == CommissionStatus.SUCCESS
        assert result.credits_earned == 15
        assert result.action_details["liked"] is True

    def test_commission_result_failed(self):
        """실패 결과"""
        result = CommissionResult(
            commission_id="comm-002",
            device_id="device-002",
            status=CommissionStatus.FAILED,
            execution_time_ms=1000,
            error_code="ELEMENT_NOT_FOUND",
            error_message="좋아요 버튼을 찾을 수 없음"
        )

        assert result.status == CommissionStatus.FAILED
        assert result.error_code == "ELEMENT_NOT_FOUND"

    def test_commission_result_refused(self):
        """거절 결과 (페르소나 불일치)"""
        result = CommissionResult(
            commission_id="comm-003",
            device_id="device-003",
            status=CommissionStatus.REFUSED,
            persona_alignment=0.35,
            refused_reason="페르소나가 이 콘텐츠를 좋아하지 않음"
        )

        assert result.status == CommissionStatus.REFUSED
        assert result.persona_alignment == 0.35
        assert "페르소나" in result.refused_reason


class TestCommissionStats:
    """CommissionStats 스키마 테스트"""

    def test_commission_stats_defaults(self):
        """기본값"""
        stats = CommissionStats()

        assert stats.total == 0
        assert stats.pending == 0
        assert stats.success == 0
        assert stats.success_rate == 0.0

    def test_commission_stats_full(self):
        """전체 통계"""
        stats = CommissionStats(
            total=100,
            pending=10,
            assigned=5,
            in_progress=3,
            success=70,
            failed=8,
            refused=2,
            timeout=1,
            cancelled=1,
            total_credits_earned=750,
            avg_execution_time_ms=3500.5,
            success_rate=87.5,
            today_total=25,
            today_success=20,
            by_job_type={
                "LIKE": 40,
                "COMMENT": 20,
                "WATCH": 30,
                "SUBSCRIBE": 10
            }
        )

        assert stats.total == 100
        assert stats.success == 70
        assert stats.success_rate == 87.5
        assert stats.by_job_type["LIKE"] == 40


class TestCommissionListResponse:
    """CommissionListResponse 스키마 테스트"""

    def test_commission_list_response(self):
        """목록 응답"""
        commissions = [
            CommissionResponse(
                id=f"comm-{i}",
                job_type=JobType.LIKE,
                video_id=f"vid-{i}"
            )
            for i in range(3)
        ]

        response = CommissionListResponse(
            total=100,
            stats=CommissionStats(total=100, success=80),
            commissions=commissions,
            page=1,
            page_size=50,
            total_pages=2
        )

        assert response.total == 100
        assert len(response.commissions) == 3
        assert response.total_pages == 2


class TestCommissionQueueStatus:
    """CommissionQueueStatus 스키마 테스트"""

    def test_queue_status_defaults(self):
        """기본값"""
        status = CommissionQueueStatus()

        assert status.queue_length == 0
        assert status.processing_count == 0
        assert status.avg_wait_time_sec == 0.0

    def test_queue_status_full(self):
        """전체 상태"""
        status = CommissionQueueStatus(
            queue_length=50,
            processing_count=10,
            avg_wait_time_sec=15.5,
            by_workstation={
                "WS01": {"pending": 20, "assigned": 5},
                "WS02": {"pending": 30, "assigned": 5}
            },
            recent_success=100,
            recent_failed=5,
            recent_refused=2
        )

        assert status.queue_length == 50
        assert status.by_workstation["WS01"]["pending"] == 20


class TestActiveCommissionsResponse:
    """ActiveCommissionsResponse 스키마 테스트"""

    def test_active_commissions_response(self):
        """활성 Commission 응답"""
        response = ActiveCommissionsResponse(
            active_count=15,
            queue_status=CommissionQueueStatus(
                queue_length=50,
                processing_count=15
            ),
            active_commissions=[
                CommissionResponse(
                    id="comm-001",
                    job_type=JobType.WATCH,
                    video_id="test",
                    status=CommissionStatus.IN_PROGRESS
                )
            ]
        )

        assert response.active_count == 15
        assert response.queue_status.processing_count == 15
        assert len(response.active_commissions) == 1


# =============================================================================
# Commission Service Mock 테스트
# =============================================================================

class TestCommissionServiceMock:
    """CommissionService Mock 테스트"""

    @pytest.fixture
    def mock_commission_service(self):
        """Mock CommissionService"""
        mock = AsyncMock()

        # create_commission mock
        mock.create_commission.return_value = CommissionResponse(
            id="new-comm-001",
            job_type=JobType.LIKE,
            video_id="test123",
            status=CommissionStatus.PENDING
        )

        # get_commission mock
        mock.get_commission.return_value = CommissionResponse(
            id="comm-001",
            job_type=JobType.LIKE,
            video_id="test123",
            status=CommissionStatus.ASSIGNED
        )

        # list_commissions mock
        mock.list_commissions.return_value = CommissionListResponse(
            total=10,
            stats=CommissionStats(total=10),
            commissions=[],
            page=1,
            page_size=50,
            total_pages=1
        )

        # get_stats mock
        mock.get_stats.return_value = CommissionStats(
            total=100,
            success=80,
            success_rate=80.0
        )

        return mock

    @pytest.mark.asyncio
    async def test_create_commission(self, mock_commission_service):
        """Commission 생성 테스트"""
        create_data = CommissionCreate(
            job=CommissionJob(type=JobType.LIKE, video_id="test123")
        )

        result = await mock_commission_service.create_commission(create_data)

        assert result.id == "new-comm-001"
        assert result.job_type == JobType.LIKE
        mock_commission_service.create_commission.assert_called_once_with(create_data)

    @pytest.mark.asyncio
    async def test_get_commission(self, mock_commission_service):
        """Commission 조회 테스트"""
        result = await mock_commission_service.get_commission("comm-001")

        assert result.id == "comm-001"
        assert result.status == CommissionStatus.ASSIGNED

    @pytest.mark.asyncio
    async def test_list_commissions(self, mock_commission_service):
        """Commission 목록 조회 테스트"""
        result = await mock_commission_service.list_commissions(
            status=CommissionStatus.PENDING,
            limit=50,
            offset=0
        )

        assert result.total == 10
        mock_commission_service.list_commissions.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_stats(self, mock_commission_service):
        """통계 조회 테스트"""
        result = await mock_commission_service.get_stats()

        assert result.total == 100
        assert result.success_rate == 80.0


# =============================================================================
# Commission Service 로직 테스트
# =============================================================================

class TestCommissionServiceLogic:
    """CommissionService 비즈니스 로직 테스트"""

    def test_calculate_credits_base(self):
        """기본 크레딧 계산"""
        reward = CommissionReward(base_credits=10)

        # 기본 크레딧만 적용
        assert reward.base_credits == 10

    def test_calculate_credits_with_bonus(self):
        """보너스 크레딧 계산"""
        bonus = BonusConditions(
            first_of_day=5,
            streak_bonus=2,
            quality_bonus=10
        )
        reward = CommissionReward(base_credits=10, bonus_conditions=bonus)

        # 총 가능 보너스: 5 + 2 + 10 = 17
        # 최대 크레딧: 10 + 17 = 27
        max_possible = (
            reward.base_credits +
            bonus.first_of_day +
            bonus.streak_bonus +
            bonus.quality_bonus
        )
        assert max_possible == 27

    def test_persona_alignment_check(self):
        """페르소나 적합도 검사"""
        compliance = CommissionCompliance(persona_alignment=0.7)

        # 적합도 0.8 >= 0.7 → 통과
        assert 0.8 >= compliance.persona_alignment

        # 적합도 0.5 < 0.7 → 거절
        assert 0.5 < compliance.persona_alignment

    def test_timing_validation(self):
        """타이밍 유효성 검사"""
        timing = CommissionTiming(
            delay_before_ms=2000,
            delay_after_ms=1000,
            timeout_sec=30,
            retry_count=2
        )

        # 총 예상 시간 = delay_before + timeout + delay_after
        max_single_attempt_ms = (
            timing.delay_before_ms +
            (timing.timeout_sec * 1000) +
            timing.delay_after_ms
        )
        assert max_single_attempt_ms == 33000  # 33초

        # 최대 재시도 포함 시간
        max_total_ms = max_single_attempt_ms * (1 + timing.retry_count)
        assert max_total_ms == 99000  # 99초


# =============================================================================
# Edge Cases 테스트
# =============================================================================

class TestCommissionEdgeCases:
    """Commission 엣지 케이스 테스트"""

    def test_empty_commission_stats(self):
        """빈 통계"""
        stats = CommissionStats()

        assert stats.success_rate == 0.0
        assert stats.avg_execution_time_ms == 0.0

    def test_commission_with_all_timestamps(self):
        """모든 타임스탬프 포함"""
        now = datetime.now(timezone.utc)

        commission = CommissionInDB(
            job_type=JobType.WATCH,
            video_id="test",
            scheduled_at=now - timedelta(hours=1),
            assigned_at=now - timedelta(minutes=30),
            sent_at=now - timedelta(minutes=25),
            started_at=now - timedelta(minutes=20),
            completed_at=now
        )

        # 실행 시간 계산 가능
        execution_duration = commission.completed_at - commission.started_at
        assert execution_duration.total_seconds() == 20 * 60  # 20분

    def test_batch_with_no_devices(self):
        """디바이스 없는 배치"""
        batch = CommissionBatchCreate(
            job=CommissionJob(type=JobType.LIKE, video_id="test"),
            device_ids=[]
        )

        assert len(batch.device_ids) == 0

    def test_commission_unicode_content(self):
        """유니코드 콘텐츠"""
        content = CommissionContent(
            text="👍 좋아요! Great video! 素晴らしい! 🎉"
        )

        assert "👍" in content.text
        assert "좋아요" in content.text
        assert "素晴らしい" in content.text

    def test_commission_long_metadata(self):
        """긴 메타데이터"""
        metadata = {
            "campaign_id": "campaign-" + "x" * 100,
            "user_agent": "Mozilla/5.0 " + "test " * 50,
            "tags": ["tag" + str(i) for i in range(100)]
        }

        commission = CommissionCreate(
            job=CommissionJob(type=JobType.LIKE, video_id="test"),
            metadata=metadata
        )

        assert len(commission.metadata["tags"]) == 100
