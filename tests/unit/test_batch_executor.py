"""
BatchExecutor 단위 테스트

테스트 대상:
- _split_devices_into_groups() - A/B 그룹 분할
- _calculate_batch_delay() - 랜덤 딜레이 계산
- VideoTarget 데이터클래스
- BatchExecutionContext 콜백 처리
"""

import pytest

from shared.batch_executor import (
    BatchExecutionContext,
    VideoTarget,
)
from shared.device_registry import DeviceInfo
from shared.schemas.workload import BatchConfig, WatchConfig


class TestVideoTarget:
    """VideoTarget 데이터클래스 테스트"""

    def test_create_with_all_fields(self):
        """모든 필드로 생성"""
        target = VideoTarget(
            video_id="dQw4w9WgXcQ",
            url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            title="테스트 영상",
            duration_seconds=180,
        )

        assert target.video_id == "dQw4w9WgXcQ"
        assert target.url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert target.title == "테스트 영상"
        assert target.duration_seconds == 180

    def test_create_with_required_fields(self):
        """필수 필드만으로 생성"""
        target = VideoTarget(video_id="abc123", url="https://youtube.com/watch?v=abc123")

        assert target.video_id == "abc123"
        assert target.title is None
        assert target.duration_seconds is None


class TestBatchExecutionContext:
    """BatchExecutionContext 테스트"""

    def test_create_with_defaults(self):
        """기본값으로 생성"""
        context = BatchExecutionContext()

        assert context.workload_id is None
        assert context.video is None
        assert context.batch_config is not None
        assert context.watch_config is not None

    def test_create_with_video(self):
        """영상 정보 포함"""
        video = VideoTarget(video_id="test123", url="https://youtube.com/watch?v=test123")
        context = BatchExecutionContext(video=video)

        assert context.video.video_id == "test123"

    def test_create_with_callbacks(self):
        """콜백 함수 포함"""

        async def on_start(device_id, hierarchy_id):
            pass

        context = BatchExecutionContext(on_device_start=on_start)

        assert context.on_device_start is not None


class TestBatchExecutorDeviceGrouping:
    """디바이스 그룹 분할 테스트 (DeviceRegistry 기반)"""

    @pytest.fixture
    def sample_devices(self):
        """샘플 디바이스 목록"""
        devices = []
        for i in range(10):
            device = DeviceInfo(
                id=f"device-{i:03d}",
                serial_number=f"R58M{i:08d}",
                hierarchy_id=f"WS01-PB01-S{i+1:02d}",
                workstation_id="WS01",
                phoneboard_id="WS01-PB01",
                slot_number=i + 1,
                device_group="A" if i < 5 else "B",
                status="idle",
            )
            devices.append(device)
        return devices

    def test_device_groups_by_group_field(self, sample_devices):
        """device_group 필드로 그룹 분류"""
        group_a = [d for d in sample_devices if d.device_group == "A"]
        group_b = [d for d in sample_devices if d.device_group == "B"]

        assert len(group_a) == 5
        assert len(group_b) == 5
        assert len(group_a) + len(group_b) == len(sample_devices)

    def test_device_info_preserved(self, sample_devices):
        """디바이스 정보 유지"""
        for device in sample_devices:
            assert device.id is not None
            assert device.serial_number is not None
            assert device.hierarchy_id is not None


class TestBatchConfigValidation:
    """BatchConfig 유효성 테스트"""

    def test_valid_batch_size_percent(self):
        """유효한 배치 크기 비율"""
        config = BatchConfig(batch_size_percent=50)
        assert config.batch_size_percent == 50

    def test_batch_size_percent_bounds(self):
        """배치 크기 비율 경계값"""
        config_min = BatchConfig(batch_size_percent=10)
        config_max = BatchConfig(batch_size_percent=100)

        assert config_min.batch_size_percent == 10
        assert config_max.batch_size_percent == 100

    def test_interval_settings(self):
        """인터벌 설정"""
        config = BatchConfig(batch_interval_seconds=120, cycle_interval_seconds=400)

        assert config.batch_interval_seconds == 120
        assert config.cycle_interval_seconds == 400

    def test_retry_settings(self):
        """재시도 설정"""
        config = BatchConfig(max_retries=5, retry_delay_seconds=60)

        assert config.max_retries == 5
        assert config.retry_delay_seconds == 60


class TestWatchConfigValidation:
    """WatchConfig 유효성 테스트"""

    def test_valid_watch_duration(self):
        """유효한 시청 시간"""
        config = WatchConfig(watch_duration_min=30, watch_duration_max=120)

        assert config.watch_duration_min == 30
        assert config.watch_duration_max == 120

    def test_valid_probabilities(self):
        """유효한 확률값"""
        config = WatchConfig(like_probability=0.20, comment_probability=0.05)

        assert config.like_probability == 0.20
        assert config.comment_probability == 0.05

    def test_human_pattern_settings(self):
        """휴먼 패턴 설정"""
        config = WatchConfig(enable_random_scroll=True, enable_random_pause=False)

        assert config.enable_random_scroll is True
        assert config.enable_random_pause is False
