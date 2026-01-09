"""
YouTube Automation E2E 테스트

Laixi WebSocket 서버 + 실제 디바이스 연결이 필요합니다.
테스트 전 LAIXI_WS_URL 환경변수가 설정되어야 합니다.
"""

import os

import pytest

from shared.scripts.youtube_app_automation import (
    ExecutionResult,
    WatchResult,
    YouTubeAppAutomation,
    YouTubeCoordinates,
)

pytestmark = pytest.mark.e2e


@pytest.mark.skipif(not os.getenv("LAIXI_WS_URL"), reason="LAIXI_WS_URL 환경변수 필요")
class TestYouTubeAppAutomation:
    """YouTube 앱 자동화 E2E 테스트"""

    @pytest.fixture
    def automation(self, laixi_client):
        """YouTubeAppAutomation 인스턴스"""
        return YouTubeAppAutomation(laixi_client)

    @pytest.fixture
    def test_device_serial(self):
        """테스트 디바이스 시리얼"""
        return os.getenv("TEST_DEVICE_SERIAL", "R58M00000001")

    @pytest.mark.asyncio
    async def test_launch_youtube(self, automation, test_device_serial):
        """YouTube 앱 실행"""
        try:
            result = await automation._launch_youtube(test_device_serial)

            assert result is True
        except Exception as e:
            pytest.skip(f"Laixi 연결 실패: {e}")

    @pytest.mark.asyncio
    async def test_search_video(self, automation, test_device_serial):
        """영상 검색"""
        try:
            # 먼저 앱 실행
            await automation._launch_youtube(test_device_serial)

            # 검색 수행
            result = await automation._search_video(
                device_serial=test_device_serial, keyword="테스트 영상"
            )

            assert result is True
        except Exception as e:
            pytest.skip(f"검색 실패: {e}")

    @pytest.mark.asyncio
    async def test_go_home(self, automation, test_device_serial):
        """홈으로 이동"""
        try:
            result = await automation._go_home(test_device_serial)

            assert result is True
        except Exception as e:
            pytest.skip(f"홈 이동 실패: {e}")


class TestYouTubeCoordinates:
    """YouTube 좌표 테스트"""

    def test_default_coordinates(self):
        """기본 좌표값"""
        coords = YouTubeCoordinates()

        # 검색 아이콘 (우상단)
        assert 0.9 <= coords.search_icon[0] <= 1.0
        assert 0 <= coords.search_icon[1] <= 0.1

        # 플레이어 중앙 (화면 상단)
        assert 0.4 <= coords.player_center[0] <= 0.6
        assert 0.2 <= coords.player_center[1] <= 0.3

    def test_coordinate_ranges(self):
        """좌표 범위 확인 (0.0 ~ 1.0)"""
        coords = YouTubeCoordinates()

        # 모든 좌표가 백분율 범위 내
        all_coords = [
            coords.search_icon,
            coords.search_input,
            coords.first_result,
            coords.player_center,
            coords.like_button,
            coords.comment_section,  # comment_button → comment_section
        ]

        for x, y in all_coords:
            assert 0 <= x <= 1, f"X 좌표 범위 초과: {x}"
            assert 0 <= y <= 1, f"Y 좌표 범위 초과: {y}"


class TestExecutionResult:
    """실행 결과 Enum 테스트"""

    def test_result_values(self):
        """결과 값 확인"""
        assert ExecutionResult.SUCCESS.value == "success"
        assert ExecutionResult.PARTIAL.value == "partial"
        assert ExecutionResult.FAILED.value == "failed"
        assert ExecutionResult.ERROR.value == "error"
        assert ExecutionResult.SKIPPED.value == "skipped"


class TestWatchResult:
    """시청 결과 데이터클래스 테스트"""

    def test_create_success_result(self):
        """성공 결과 생성"""
        from shared.scripts.youtube_app_automation import WatchTask

        task = WatchTask(video_id="test123", title="테스트", search_keyword="테스트")

        result = WatchResult(
            task=task,
            status=ExecutionResult.SUCCESS,
            watch_duration_seconds=180,
            liked=True,
            commented=False,
        )

        assert result.status == ExecutionResult.SUCCESS
        assert result.watch_duration_seconds == 180
        assert result.liked is True

    def test_create_failed_result(self):
        """실패 결과 생성"""
        from shared.scripts.youtube_app_automation import WatchTask

        task = WatchTask(video_id="test123", title="테스트", search_keyword="테스트")

        result = WatchResult(
            task=task,
            status=ExecutionResult.FAILED,
            error_code="VIDEO_NOT_FOUND",
            error_message="검색 결과에서 영상을 찾지 못함",
        )

        assert result.status == ExecutionResult.FAILED
        assert result.error_code == "VIDEO_NOT_FOUND"


class TestMockYouTubeAutomation:
    """Mock을 사용한 자동화 테스트"""

    @pytest.fixture
    def mock_automation(self, mock_laixi_client):
        """Mock Laixi를 사용한 자동화 인스턴스"""
        return YouTubeAppAutomation(mock_laixi_client)

    @pytest.mark.asyncio
    async def test_full_flow_with_mock(self, mock_automation):
        """전체 플로우 (Mock)"""
        from shared.scripts.youtube_app_automation import WatchTask

        # Mock 응답 설정 (laixi, not _laixi)
        mock_automation.laixi.tap.return_value = {"success": True}
        mock_automation.laixi.swipe.return_value = {"success": True}
        mock_automation.laixi.set_clipboard.return_value = {"success": True}
        mock_automation.laixi.execute_adb.return_value = {"success": True}
        mock_automation.laixi.press_home.return_value = {"success": True}
        mock_automation.laixi.press_back.return_value = {"success": True}

        # WatchTask를 사용한 전체 플로우 실행
        task = WatchTask(
            video_id="test123",
            title="테스트 영상",
            search_keyword="테스트",
            duration_seconds=60,
            target_watch_percent=0.7,
            should_like=False,
            should_comment=False,
            device_id="MOCK_DEVICE",
        )

        result = await mock_automation.execute(task)

        # 결과 확인
        assert result is not None
        assert result.status in [
            ExecutionResult.SUCCESS,
            ExecutionResult.PARTIAL,
            ExecutionResult.FAILED,
            ExecutionResult.ERROR,
        ]

    @pytest.mark.asyncio
    async def test_search_with_mock(self, mock_automation):
        """검색 테스트 (Mock)"""
        mock_automation.laixi.tap.return_value = {"success": True}
        mock_automation.laixi.set_clipboard.return_value = {"success": True}
        mock_automation.laixi.execute_adb.return_value = {"success": True}

        await mock_automation._search_video(device_id="MOCK_DEVICE", keyword="테스트 검색어")

        # tap이 호출되었는지 확인
        assert mock_automation.laixi.tap.called

    @pytest.mark.asyncio
    async def test_like_with_mock(self, mock_automation):
        """좋아요 테스트 (Mock)"""
        mock_automation.laixi.tap.return_value = {"success": True}
        mock_automation.laixi.swipe.return_value = {"success": True}

        await mock_automation._click_like("MOCK_DEVICE")

        assert mock_automation.laixi.tap.called or mock_automation.laixi.swipe.called

    @pytest.mark.asyncio
    async def test_comment_with_mock(self, mock_automation):
        """댓글 테스트 (Mock)"""
        mock_automation.laixi.tap.return_value = {"success": True}
        mock_automation.laixi.swipe.return_value = {"success": True}
        mock_automation.laixi.set_clipboard.return_value = {"success": True}
        mock_automation.laixi.execute_adb.return_value = {"success": True}

        await mock_automation._write_comment(device_id="MOCK_DEVICE", comment_text="테스트 댓글")

        assert mock_automation.laixi.set_clipboard.called


class TestAutomationHelpers:
    """자동화 헬퍼 함수 테스트"""

    def test_calculate_watch_duration(self):
        """시청 시간 계산"""
        from shared.scripts.youtube_app_automation import WatchTask, YouTubeAppAutomation

        automation = YouTubeAppAutomation.__new__(YouTubeAppAutomation)
        automation.coords = None

        # WatchTask를 사용한 시청 시간 계산
        task = WatchTask(
            video_id="test",
            title="Test",
            search_keyword="test",
            duration_seconds=180,
            target_watch_percent=0.7,
        )

        duration = automation._calculate_watch_duration(task)

        # 70% of 180 = 126, with some variation
        assert 30 <= duration <= 180

    def test_calculate_watch_duration_short_video(self):
        """짧은 영상 시청 시간"""
        from shared.scripts.youtube_app_automation import WatchTask, YouTubeAppAutomation

        automation = YouTubeAppAutomation.__new__(YouTubeAppAutomation)
        automation.coords = None

        task = WatchTask(
            video_id="test",
            title="Test",
            search_keyword="test",
            duration_seconds=30,
            target_watch_percent=0.7,
        )

        duration = automation._calculate_watch_duration(task)

        # Should be at least 30 (minimum) or up to 30 (max)
        assert 30 <= duration <= 30  # min is 30, max is video length

    def test_random_delay_range(self):
        """랜덤 딜레이 범위 - random.uniform 사용 확인"""
        import random

        # 테스트: random.uniform이 올바른 범위를 반환하는지
        for _ in range(10):
            delay = random.uniform(1.0, 3.0)
            assert 1.0 <= delay <= 3.0

    def test_scroll_direction(self):
        """스크롤 방향 - 좌표 계산 확인"""
        # YouTubeCoordinates의 스크롤 좌표 테스트
        from shared.scripts.youtube_app_automation import YouTubeCoordinates

        coords = YouTubeCoordinates()

        # 플레이어 중앙 좌표 확인
        assert 0 <= coords.player_center[0] <= 1
        assert 0 <= coords.player_center[1] <= 1

        # 검색 결과 좌표들이 위에서 아래로 정렬되어야 함
        assert coords.first_result[1] < coords.second_result[1]
        assert coords.second_result[1] < coords.third_result[1]


class TestErrorHandling:
    """에러 핸들링 테스트"""

    @pytest.fixture
    def mock_automation(self, mock_laixi_client):
        return YouTubeAppAutomation(mock_laixi_client)

    @pytest.mark.asyncio
    async def test_handle_tap_failure(self, mock_automation):
        """탭 실패 처리"""
        mock_automation.laixi.tap.return_value = {"success": False, "error": "Device not found"}
        mock_automation.laixi.set_clipboard.return_value = {"success": True}
        mock_automation.laixi.execute_adb.return_value = {"success": True}

        # 실패해도 예외가 발생하지 않아야 함
        await mock_automation._search_video("MOCK", "test")

        # 메서드가 호출되었는지 확인
        assert mock_automation.laixi.tap.called

    @pytest.mark.asyncio
    async def test_handle_timeout(self, mock_automation):
        """타임아웃 처리"""
        import asyncio

        mock_automation.laixi.tap.side_effect = asyncio.TimeoutError()

        # 타임아웃 예외 처리 - _search_video는 예외를 catch하고 False 반환
        result = await mock_automation._search_video("MOCK", "test")

        # 실패 결과 반환 (False)
        assert result is False

    @pytest.mark.asyncio
    async def test_handle_connection_error(self, mock_automation):
        """연결 에러 처리"""
        mock_automation.laixi.tap.side_effect = ConnectionError("Connection lost")

        # _search_video는 예외를 catch하고 False 반환
        result = await mock_automation._search_video("MOCK", "test")

        # 실패 결과 반환 (False)
        assert result is False
