"""
HumanSimulator 단위 테스트

테스트 대상 (HumanSimulator.js 로직 검증):
- 딜레이 생성 (idle/queue 모드)
- 시청 시간 생성
- 클릭 위치 jitter
- 확률 기반 액션 (좋아요/댓글)
- 랜덤 액션 생성
- 디바이스 순차 시작 딜레이
- 비디오 랭크 분포
"""

import math
import random
from typing import List, Tuple

import pytest


class HumanSimulatorPython:
    """HumanSimulator.js의 Python 구현 (테스트용)"""

    def __init__(self, config: dict = None):
        config = config or {}
        self.idle_config = {
            "delay_min_ms": 3000,
            "delay_max_ms": 7000,
            "click_error_px": 20,
            "watch_min_seconds": 5,
            "watch_max_seconds": 60,
            "like_probability": 0.10,
            "comment_probability": 0.05,
            **(config.get("idle", {})),
        }
        self.queue_config = {
            "delay_min_ms": 5000,
            "delay_max_ms": 10000,
            "click_error_px": 20,
            "ad_skip_wait_min_ms": 7000,
            "ad_skip_wait_max_ms": 20000,
            "watch_min_seconds": 120,
            "watch_max_seconds": 600,
            "like_probability": 0.10,
            "comment_probability": 0.05,
            "random_actions": {
                "back_double_probability": 0.01,
                "forward_double_probability": 0.01,
                "scroll_comments_probability": 0.01,
            },
            **(config.get("queue", {})),
        }
        self.screen_width = config.get("screen_width", 1440)
        self.screen_height = config.get("screen_height", 2960)

    def random_int(self, min_val: int, max_val: int) -> int:
        return random.randint(min_val, max_val)

    def should_occur(self, probability: float) -> bool:
        return random.random() < probability

    def generate_delay(self, mode: str = "idle") -> int:
        config = self.queue_config if mode == "queue" else self.idle_config
        delay_min, delay_max = config["delay_min_ms"], config["delay_max_ms"]
        mean = (delay_min + delay_max) / 2
        std_dev = (delay_max - delay_min) / 6
        u1, u2 = max(1e-10, random.random()), random.random()
        z = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
        return max(delay_min, min(delay_max, round(mean + z * std_dev)))

    def generate_ad_skip_delay(self) -> int:
        return self.random_int(
            self.queue_config["ad_skip_wait_min_ms"], self.queue_config["ad_skip_wait_max_ms"]
        )

    def generate_watch_duration(
        self, mode: str = "idle", video_duration_seconds: int = None
    ) -> int:
        config = self.queue_config if mode == "queue" else self.idle_config
        watch_min, watch_max = config["watch_min_seconds"], config["watch_max_seconds"]
        if video_duration_seconds and video_duration_seconds > 0:
            watch_max = min(watch_max, video_duration_seconds)
        return self.random_int(watch_min, watch_max)

    def generate_click_position(
        self, target_x: int, target_y: int, mode: str = "idle"
    ) -> Tuple[int, int]:
        click_error = (self.queue_config if mode == "queue" else self.idle_config)["click_error_px"]
        x = max(
            0, min(self.screen_width - 1, target_x + self.random_int(-click_error, click_error))
        )
        y = max(
            0, min(self.screen_height - 1, target_y + self.random_int(-click_error, click_error))
        )
        return (round(x), round(y))

    def should_like(self, mode: str = "idle") -> bool:
        return self.should_occur(
            (self.queue_config if mode == "queue" else self.idle_config)["like_probability"]
        )

    def should_comment(self, mode: str = "idle") -> bool:
        return self.should_occur(
            (self.queue_config if mode == "queue" else self.idle_config)["comment_probability"]
        )

    def generate_queue_random_actions(self, watch_duration_seconds: int) -> List[dict]:
        actions = []
        ra = self.queue_config["random_actions"]
        for second in range(1, watch_duration_seconds):
            if self.should_occur(ra["back_double_probability"]):
                actions.append({"type": "back_double", "timestamp_sec": second})
            if self.should_occur(ra["forward_double_probability"]):
                actions.append({"type": "forward_double", "timestamp_sec": second})
            if self.should_occur(ra["scroll_comments_probability"]):
                actions.append({"type": "scroll_comments", "timestamp_sec": second})
        return sorted(actions, key=lambda a: a["timestamp_sec"])

    def generate_staged_start_delays(self, device_count: int) -> List[int]:
        delays, cumulative = [], 0
        for i in range(device_count):
            if i == 0:
                delays.append(self.random_int(1000, 3000))
            else:
                cumulative += self.generate_delay("queue")
                delays.append(cumulative)
        return delays

    def generate_video_rank(self, max_rank: int = 10) -> int:
        weights = [1 / i for i in range(1, max_rank + 1)]
        rand = random.random() * sum(weights)
        for i, w in enumerate(weights):
            rand -= w
            if rand <= 0:
                return i + 1
        return 1


class TestDelayGeneration:
    @pytest.fixture
    def simulator(self):
        return HumanSimulatorPython()

    def test_generate_delay_idle_mode_in_range(self, simulator):
        for _ in range(100):
            delay = simulator.generate_delay("idle")
            assert 3000 <= delay <= 7000

    def test_generate_delay_queue_mode_in_range(self, simulator):
        for _ in range(100):
            delay = simulator.generate_delay("queue")
            assert 5000 <= delay <= 10000

    def test_generate_ad_skip_delay_in_range(self, simulator):
        for _ in range(100):
            delay = simulator.generate_ad_skip_delay()
            assert 7000 <= delay <= 20000


class TestWatchDuration:
    @pytest.fixture
    def simulator(self):
        return HumanSimulatorPython()

    def test_generate_watch_duration_idle_in_range(self, simulator):
        for _ in range(100):
            assert 5 <= simulator.generate_watch_duration("idle") <= 60

    def test_generate_watch_duration_queue_in_range(self, simulator):
        for _ in range(100):
            assert 120 <= simulator.generate_watch_duration("queue") <= 600

    def test_generate_watch_duration_capped(self, simulator):
        for _ in range(100):
            assert simulator.generate_watch_duration("idle", 30) <= 30


class TestClickPosition:
    @pytest.fixture
    def simulator(self):
        return HumanSimulatorPython()

    def test_generate_click_position_jitter(self, simulator):
        for _ in range(100):
            x, y = simulator.generate_click_position(720, 1480)
            assert abs(x - 720) <= 20 and abs(y - 1480) <= 20


class TestProbability:
    @pytest.fixture
    def simulator(self):
        return HumanSimulatorPython()

    def test_should_like_probability(self, simulator):
        rate = sum(simulator.should_like() for _ in range(10000)) / 10000
        assert 0.08 <= rate <= 0.12

    def test_should_comment_probability(self, simulator):
        rate = sum(simulator.should_comment() for _ in range(10000)) / 10000
        assert 0.03 <= rate <= 0.07


class TestRandomActions:
    @pytest.fixture
    def simulator(self):
        return HumanSimulatorPython()

    def test_generate_random_actions_valid_types(self, simulator):
        valid = {"back_double", "forward_double", "scroll_comments"}
        for action in simulator.generate_queue_random_actions(300):
            assert action["type"] in valid

    def test_generate_random_actions_sorted(self, simulator):
        actions = simulator.generate_queue_random_actions(300)
        if len(actions) > 1:
            for i in range(len(actions) - 1):
                assert actions[i]["timestamp_sec"] <= actions[i + 1]["timestamp_sec"]


class TestStagedDelays:
    @pytest.fixture
    def simulator(self):
        return HumanSimulatorPython()

    def test_staged_delays_count(self, simulator):
        for count in [1, 5, 10]:
            assert len(simulator.generate_staged_start_delays(count)) == count

    def test_first_device_shorter_delay(self, simulator):
        delays = simulator.generate_staged_start_delays(5)
        assert 1000 <= delays[0] <= 3000


class TestVideoRank:
    @pytest.fixture
    def simulator(self):
        return HumanSimulatorPython()

    def test_video_rank_in_range(self, simulator):
        for _ in range(100):
            assert 1 <= simulator.generate_video_rank() <= 10

    def test_video_rank_biased_to_top(self, simulator):
        ranks = [simulator.generate_video_rank() for _ in range(10000)]
        assert sum(1 for r in ranks if r <= 3) > sum(1 for r in ranks if r >= 8) * 2
