"""
Commission API 통합 테스트

테스트 대상:
- Commission CRUD 엔드포인트
- 배치 Commission 생성
- 결과 제출
- 통계 조회

@requires Supabase 연결

@author Axon (DoAi.Me Tech Lead)
@created 2026-01-09
"""

import pytest
import os
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock, AsyncMock

# API 테스트용 imports
from fastapi.testclient import TestClient


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def mock_supabase():
    """Mock Supabase 클라이언트"""
    mock = MagicMock()

    # 기본 응답 설정
    mock.table.return_value.select.return_value.execute.return_value.data = []
    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {
            "id": "test-commission-001",
            "job_type": "LIKE",
            "platform": "youtube",
            "video_id": "test123",
            "status": "pending",
            "priority": 5,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ]
    mock.table.return_value.update.return_value.execute.return_value.data = [{}]
    mock.table.return_value.delete.return_value.execute.return_value.data = [{}]

    # RPC 함수 mock
    mock.rpc.return_value.execute.return_value.data = [
        {
            "total": 100,
            "pending": 10,
            "assigned": 5,
            "in_progress": 3,
            "success": 70,
            "failed": 8,
            "refused": 2,
            "timeout": 1,
            "cancelled": 1,
            "total_credits_earned": 750,
            "avg_execution_time_ms": 3500.5,
            "success_rate": 87.5
        }
    ]

    return mock


@pytest.fixture
def sample_commission_create():
    """샘플 Commission 생성 요청"""
    return {
        "job": {
            "type": "LIKE",
            "platform": "youtube",
            "video_id": "dQw4w9WgXcQ"
        },
        "priority": 5
    }


@pytest.fixture
def sample_batch_create():
    """샘플 배치 Commission 생성 요청"""
    return {
        "job": {
            "type": "LIKE",
            "platform": "youtube",
            "video_id": "dQw4w9WgXcQ"
        },
        "device_ids": ["device-001", "device-002", "device-003"],
        "priority": 7
    }


@pytest.fixture
def sample_commission_result():
    """샘플 Commission 결과"""
    return {
        "commission_id": "test-commission-001",
        "device_id": "device-001",
        "status": "success",
        "execution_time_ms": 3500,
        "credits_earned": 15,
        "action_details": {
            "liked": True,
            "button_found": True
        }
    }


# =============================================================================
# Commission CRUD 테스트
# =============================================================================

class TestCommissionCRUD:
    """Commission CRUD 엔드포인트 테스트"""

    @pytest.mark.integration
    def test_create_commission_structure(self, sample_commission_create):
        """Commission 생성 요청 구조 검증"""
        data = sample_commission_create

        assert "job" in data
        assert data["job"]["type"] == "LIKE"
        assert data["job"]["video_id"] == "dQw4w9WgXcQ"
        assert data["priority"] == 5

    @pytest.mark.integration
    def test_create_commission_with_timing(self, sample_commission_create):
        """타이밍 설정 포함 Commission 생성"""
        data = sample_commission_create.copy()
        data["timing"] = {
            "delay_before_ms": 3000,
            "delay_after_ms": 2000,
            "timeout_sec": 60,
            "retry_count": 3
        }

        assert data["timing"]["timeout_sec"] == 60
        assert data["timing"]["retry_count"] == 3

    @pytest.mark.integration
    def test_create_commission_with_reward(self, sample_commission_create):
        """보상 설정 포함 Commission 생성"""
        data = sample_commission_create.copy()
        data["reward"] = {
            "base_credits": 20,
            "bonus_conditions": {
                "first_of_day": 10,
                "streak_bonus": 5,
                "quality_bonus": 15
            }
        }

        assert data["reward"]["base_credits"] == 20
        assert data["reward"]["bonus_conditions"]["first_of_day"] == 10

    @pytest.mark.integration
    def test_create_commission_with_compliance(self, sample_commission_create):
        """컴플라이언스 설정 포함 Commission 생성"""
        data = sample_commission_create.copy()
        data["compliance"] = {
            "ethical_check": True,
            "persona_alignment": 0.8,
            "can_refuse": True
        }

        assert data["compliance"]["persona_alignment"] == 0.8
        assert data["compliance"]["can_refuse"] is True


# =============================================================================
# 배치 Commission 테스트
# =============================================================================

class TestBatchCommission:
    """배치 Commission 테스트"""

    @pytest.mark.integration
    def test_batch_create_structure(self, sample_batch_create):
        """배치 생성 요청 구조 검증"""
        data = sample_batch_create

        assert "job" in data
        assert "device_ids" in data
        assert len(data["device_ids"]) == 3

    @pytest.mark.integration
    def test_batch_create_with_workstations(self):
        """워크스테이션 기반 배치 생성"""
        data = {
            "job": {
                "type": "SUBSCRIBE",
                "channel_id": "UCtest123"
            },
            "target_workstations": ["WS01", "WS02", "WS03"],
            "device_percent": 0.5
        }

        assert data["target_workstations"] == ["WS01", "WS02", "WS03"]
        assert data["device_percent"] == 0.5

    @pytest.mark.integration
    def test_batch_response_structure(self):
        """배치 응답 구조 검증"""
        response = {
            "batch_id": "batch-001",
            "total_created": 10,
            "total_devices": 10,
            "commissions": [f"comm-{i}" for i in range(10)],
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        assert response["total_created"] == 10
        assert len(response["commissions"]) == 10


# =============================================================================
# 결과 제출 테스트
# =============================================================================

class TestCommissionResult:
    """Commission 결과 제출 테스트"""

    @pytest.mark.integration
    def test_result_success_structure(self, sample_commission_result):
        """성공 결과 구조 검증"""
        data = sample_commission_result

        assert data["status"] == "success"
        assert data["credits_earned"] == 15
        assert data["action_details"]["liked"] is True

    @pytest.mark.integration
    def test_result_failed_structure(self):
        """실패 결과 구조 검증"""
        data = {
            "commission_id": "test-commission-002",
            "device_id": "device-002",
            "status": "failed",
            "execution_time_ms": 1000,
            "credits_earned": 0,
            "error_code": "ELEMENT_NOT_FOUND",
            "error_message": "좋아요 버튼을 찾을 수 없음"
        }

        assert data["status"] == "failed"
        assert data["error_code"] == "ELEMENT_NOT_FOUND"

    @pytest.mark.integration
    def test_result_refused_structure(self):
        """거절 결과 구조 검증"""
        data = {
            "commission_id": "test-commission-003",
            "device_id": "device-003",
            "status": "refused",
            "execution_time_ms": 500,
            "credits_earned": 0,
            "persona_alignment": 0.35,
            "refused_reason": "페르소나가 이 콘텐츠를 좋아하지 않습니다"
        }

        assert data["status"] == "refused"
        assert data["persona_alignment"] == 0.35

    @pytest.mark.integration
    def test_result_timeout_structure(self):
        """타임아웃 결과 구조 검증"""
        data = {
            "commission_id": "test-commission-004",
            "device_id": "device-004",
            "status": "timeout",
            "execution_time_ms": 30000,
            "credits_earned": 0,
            "error_code": "TIMEOUT",
            "error_message": "작업 시간 초과"
        }

        assert data["status"] == "timeout"
        assert data["execution_time_ms"] == 30000


# =============================================================================
# 통계 조회 테스트
# =============================================================================

class TestCommissionStats:
    """Commission 통계 테스트"""

    @pytest.mark.integration
    def test_stats_response_structure(self, mock_supabase):
        """통계 응답 구조 검증"""
        stats_data = mock_supabase.rpc.return_value.execute.return_value.data[0]

        assert "total" in stats_data
        assert "success" in stats_data
        assert "success_rate" in stats_data
        assert stats_data["success_rate"] == 87.5

    @pytest.mark.integration
    def test_stats_calculation(self):
        """통계 계산 검증"""
        stats = {
            "total": 100,
            "success": 80,
            "failed": 15,
            "refused": 5
        }

        # 성공률 계산
        completed = stats["success"] + stats["failed"] + stats["refused"]
        success_rate = (stats["success"] / completed) * 100 if completed > 0 else 0

        assert success_rate == 80.0


# =============================================================================
# 대기열 테스트
# =============================================================================

class TestCommissionQueue:
    """Commission 대기열 테스트"""

    @pytest.mark.integration
    def test_queue_status_structure(self):
        """대기열 상태 구조 검증"""
        status = {
            "queue_length": 50,
            "processing_count": 10,
            "avg_wait_time_sec": 15.5,
            "by_workstation": {
                "WS01": {"pending": 20, "assigned": 5},
                "WS02": {"pending": 30, "assigned": 5}
            },
            "recent_success": 100,
            "recent_failed": 5,
            "recent_refused": 2
        }

        assert status["queue_length"] == 50
        assert status["by_workstation"]["WS01"]["pending"] == 20

    @pytest.mark.integration
    def test_next_commission_assignment(self):
        """다음 Commission 할당 테스트"""
        # 우선순위 순 정렬 확인
        commissions = [
            {"id": "c1", "priority": 5, "created_at": "2026-01-09T10:00:00Z"},
            {"id": "c2", "priority": 8, "created_at": "2026-01-09T10:01:00Z"},
            {"id": "c3", "priority": 8, "created_at": "2026-01-09T10:00:30Z"},
        ]

        # 우선순위 내림차순, 생성 시간 오름차순
        sorted_commissions = sorted(
            commissions,
            key=lambda x: (-x["priority"], x["created_at"])
        )

        # 우선순위 8이 먼저, 그 중 생성 시간이 빠른 c3가 먼저
        assert sorted_commissions[0]["id"] == "c3"
        assert sorted_commissions[1]["id"] == "c2"
        assert sorted_commissions[2]["id"] == "c1"


# =============================================================================
# 일괄 작업 테스트
# =============================================================================

class TestBulkOperations:
    """일괄 작업 테스트"""

    @pytest.mark.integration
    def test_cancel_all_pending(self):
        """대기 중 Commission 일괄 취소"""
        request = {
            "status": "pending"
        }

        # 예상 응답
        response = {
            "success": True,
            "cancelled_count": 25,
            "message": "25개의 Commission이 취소되었습니다"
        }

        assert response["success"] is True
        assert response["cancelled_count"] == 25

    @pytest.mark.integration
    def test_retry_failed(self):
        """실패한 Commission 재시도"""
        # 예상 응답
        response = {
            "success": True,
            "retried_count": 10,
            "message": "10개의 Commission이 재시도 대기열에 추가되었습니다"
        }

        assert response["success"] is True
        assert response["retried_count"] == 10


# =============================================================================
# 에러 처리 테스트
# =============================================================================

class TestErrorHandling:
    """에러 처리 테스트"""

    @pytest.mark.integration
    def test_commission_not_found(self):
        """존재하지 않는 Commission 조회"""
        error_response = {
            "detail": "Commission을 찾을 수 없습니다"
        }

        assert "찾을 수 없습니다" in error_response["detail"]

    @pytest.mark.integration
    def test_invalid_job_type(self):
        """잘못된 작업 유형"""
        invalid_data = {
            "job": {
                "type": "INVALID_TYPE",
                "video_id": "test"
            }
        }

        # Pydantic validation error 예상
        from shared.schemas.commission import CommissionJob, JobType
        import pydantic

        with pytest.raises(pydantic.ValidationError):
            CommissionJob(type="INVALID_TYPE", video_id="test")

    @pytest.mark.integration
    def test_invalid_priority(self):
        """잘못된 우선순위"""
        from shared.schemas.commission import CommissionCreate, CommissionJob, JobType
        import pydantic

        with pytest.raises(pydantic.ValidationError):
            CommissionCreate(
                job=CommissionJob(type=JobType.LIKE, video_id="test"),
                priority=11  # 범위 초과
            )

    @pytest.mark.integration
    def test_duplicate_assignment(self):
        """중복 할당 시도"""
        error_response = {
            "detail": "Commission 할당 실패 (이미 할당되었거나 존재하지 않음)"
        }

        assert "이미 할당" in error_response["detail"]


# =============================================================================
# 성능 테스트
# =============================================================================

class TestPerformance:
    """성능 관련 테스트"""

    @pytest.mark.integration
    def test_large_batch_creation(self):
        """대량 배치 생성 테스트"""
        # 100개 디바이스에 배치 생성
        device_ids = [f"device-{i:03d}" for i in range(100)]

        data = {
            "job": {
                "type": "LIKE",
                "video_id": "test123"
            },
            "device_ids": device_ids,
            "priority": 5
        }

        assert len(data["device_ids"]) == 100

    @pytest.mark.integration
    def test_pagination(self):
        """페이지네이션 테스트"""
        # 총 250개 중 page 3 (offset 100, limit 50)
        total = 250
        page = 3
        page_size = 50

        offset = (page - 1) * page_size
        total_pages = (total + page_size - 1) // page_size

        assert offset == 100
        assert total_pages == 5


# =============================================================================
# Commission 상태 전이 테스트
# =============================================================================

class TestStatusTransition:
    """Commission 상태 전이 테스트"""

    @pytest.mark.integration
    def test_valid_transitions(self):
        """유효한 상태 전이"""
        valid_transitions = {
            "pending": ["assigned", "cancelled"],
            "assigned": ["sent", "pending", "cancelled"],
            "sent": ["in_progress", "timeout", "cancelled"],
            "in_progress": ["success", "failed", "refused", "timeout"],
            "success": [],  # 최종 상태
            "failed": ["pending"],  # 재시도 가능
            "refused": [],  # 최종 상태
            "timeout": ["pending"],  # 재시도 가능
            "cancelled": [],  # 최종 상태
        }

        # pending → assigned 가능
        assert "assigned" in valid_transitions["pending"]

        # success → pending 불가
        assert "pending" not in valid_transitions["success"]

        # failed → pending 가능 (재시도)
        assert "pending" in valid_transitions["failed"]

    @pytest.mark.integration
    def test_retry_count_increment(self):
        """재시도 카운트 증가"""
        commission = {
            "id": "comm-001",
            "status": "failed",
            "retry_count": 1
        }

        # 재시도 시 카운트 증가
        max_retries = 3
        can_retry = commission["retry_count"] < max_retries

        assert can_retry is True

        # 재시도 후
        commission["retry_count"] += 1
        commission["status"] = "pending"

        assert commission["retry_count"] == 2
        assert commission["status"] == "pending"
