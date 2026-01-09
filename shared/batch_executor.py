"""
BatchExecutor - 50% 배치 실행 로직

연결된 기기의 절반씩 2회 실행하여 안정적인 워크로드 처리를 담당합니다.

실행 방식:
1. 가용 디바이스를 A/B 그룹으로 분할 (각 50%)
2. 1차 배치: 그룹 A 디바이스에 명령 전송
3. 대기: batch_interval 만큼 휴식
4. 2차 배치: 그룹 B 디바이스에 명령 전송

이점:
- 동시 부하 감소 (Laixi 서버, 네트워크)
- 오류 발생 시 절반은 보존
- 자연스러운 트래픽 패턴 생성
"""

import asyncio
import random
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional

try:
    from loguru import logger
except ImportError:
    import logging

    logger = logging.getLogger(__name__)

from shared.device_registry import DeviceInfo, DeviceRegistry, get_device_registry
from shared.laixi_client import LaixiClient, get_laixi_client
from shared.schemas.workload import (
    BatchConfig,
    BatchResult,
    CommandStatus,
    CooldownQueueItem,
    CooldownQueueStatus,
    DeviceBatchResult,
    TemperatureConfig,
    TemperatureStatus,
    WatchConfig,
)


@dataclass
class VideoTarget:
    """시청 대상 영상 정보"""

    video_id: str
    url: str
    title: Optional[str] = None
    duration_seconds: Optional[int] = None


@dataclass
class BatchExecutionContext:
    """배치 실행 컨텍스트"""

    workload_id: Optional[str] = None
    video: Optional[VideoTarget] = None
    batch_config: BatchConfig = field(default_factory=BatchConfig)
    watch_config: WatchConfig = field(default_factory=WatchConfig)

    # 콜백 함수들
    on_device_start: Optional[Callable[[str, str], Awaitable[None]]] = None
    on_device_complete: Optional[Callable[[str, DeviceBatchResult], Awaitable[None]]] = None
    on_batch_complete: Optional[Callable[[BatchResult], Awaitable[None]]] = None


# =========================================
# 온도 관리 클래스 (PR #4)
# =========================================


@dataclass
class TemperatureCheckResult:
    """온도 체크 결과"""

    device: Any  # DeviceInfo
    temperature: Optional[float]
    status: TemperatureStatus
    can_execute: bool
    needs_cooldown: bool
    reason: Optional[str] = None


class TemperatureGate:
    """
    온도 기반 디바이스 실행 게이트

    배치 실행 전 디바이스 온도를 체크하여 과열 디바이스를 제외합니다.

    Usage:
        gate = TemperatureGate(config=TemperatureConfig())

        # 단일 디바이스 체크
        result = gate.check_device(device)

        # 배치 전체 필터링
        executable, needs_cooldown, all_results = gate.filter_devices(devices)
    """

    def __init__(self, config: Optional[TemperatureConfig] = None):
        """
        TemperatureGate 초기화

        Args:
            config: 온도 관리 설정 (None이면 기본값 사용)
        """
        self.config = config or TemperatureConfig()

    def get_temperature_status(self, temperature: Optional[float]) -> TemperatureStatus:
        """
        온도 값에 따른 상태 반환

        Args:
            temperature: 현재 온도 (섭씨), None이면 NORMAL 반환

        Returns:
            온도 상태 (NORMAL/WARNING/CRITICAL/OVERHEAT)
        """
        if temperature is None:
            return TemperatureStatus.NORMAL

        if temperature >= self.config.overheat_threshold:
            return TemperatureStatus.OVERHEAT
        elif temperature >= self.config.critical_threshold:
            return TemperatureStatus.CRITICAL
        elif temperature >= self.config.warning_threshold:
            return TemperatureStatus.WARNING
        else:
            return TemperatureStatus.NORMAL

    def check_device(self, device: DeviceInfo) -> TemperatureCheckResult:
        """
        단일 디바이스 온도 체크

        Args:
            device: 대상 디바이스 (battery_temp 속성 필요)

        Returns:
            온도 체크 결과
        """
        temperature = getattr(device, "battery_temp", None)
        status = self.get_temperature_status(temperature)

        # CRITICAL 또는 OVERHEAT 상태에서는 실행 불가
        can_execute = status not in (TemperatureStatus.CRITICAL, TemperatureStatus.OVERHEAT)
        needs_cooldown = status in (TemperatureStatus.CRITICAL, TemperatureStatus.OVERHEAT)

        reason = None
        if status == TemperatureStatus.OVERHEAT:
            reason = f"과열 상태 ({temperature}°C >= {self.config.overheat_threshold}°C)"
        elif status == TemperatureStatus.CRITICAL:
            reason = f"높은 온도 ({temperature}°C >= {self.config.critical_threshold}°C)"
        elif status == TemperatureStatus.WARNING:
            reason = f"온도 주의 ({temperature}°C)"

        return TemperatureCheckResult(
            device=device,
            temperature=temperature,
            status=status,
            can_execute=can_execute,
            needs_cooldown=needs_cooldown,
            reason=reason,
        )

    def filter_devices(
        self, devices: List[DeviceInfo]
    ) -> tuple[List[DeviceInfo], List[DeviceInfo], List[TemperatureCheckResult]]:
        """
        디바이스 목록에서 과열 디바이스 필터링

        Args:
            devices: 대상 디바이스 목록

        Returns:
            (실행 가능 디바이스 목록, 쿨다운 필요 디바이스 목록, 전체 체크 결과)
        """
        if not devices:
            return [], [], []

        all_results: List[TemperatureCheckResult] = []
        executable: List[DeviceInfo] = []
        needs_cooldown: List[DeviceInfo] = []

        for device in devices:
            result = self.check_device(device)
            all_results.append(result)

            if result.can_execute:
                executable.append(device)
            if result.needs_cooldown:
                needs_cooldown.append(device)
                hierarchy_id = getattr(device, "hierarchy_id", "unknown")
                logger.warning(f"[{hierarchy_id}] 과열로 제외: " f"{result.temperature}°C")

        if needs_cooldown:
            logger.info(
                f"온도 필터링: {len(executable)}대 실행 가능, "
                f"{len(needs_cooldown)}대 쿨다운 필요"
            )

        return executable, needs_cooldown, all_results

    def calculate_dynamic_interval(
        self, base_interval: int, check_results: List[TemperatureCheckResult]
    ) -> int:
        """
        체크 결과에 따른 동적 배치 간격 계산

        Args:
            base_interval: 기본 배치 간격 (초)
            check_results: 온도 체크 결과 목록

        Returns:
            조정된 배치 간격 (초)
        """
        if not self.config.enable_dynamic_interval:
            return base_interval

        if not check_results:
            return base_interval

        # 유효한 온도 값만 추출
        temperatures = [r.temperature for r in check_results if r.temperature is not None]

        if not temperatures:
            return base_interval

        avg_temperature = sum(temperatures) / len(temperatures)

        if avg_temperature <= self.config.warning_threshold:
            return base_interval

        # 경고 임계값 초과 시 온도당 추가 대기
        excess_temp = avg_temperature - self.config.warning_threshold
        additional_interval = int(excess_temp * self.config.interval_increase_per_degree)
        additional_interval = min(additional_interval, self.config.max_interval_increase)

        return base_interval + additional_interval


class CooldownQueue:
    """
    쿨다운 대기열 관리자

    과열된 디바이스를 대기열에 넣고 온도가 내려가면 다시 활성화합니다.

    Usage:
        queue = CooldownQueue(config=TemperatureConfig())

        # 과열 디바이스 추가
        queue.add(device, temperature=52.5)

        # 온도 업데이트
        queue.update_temperature("device-001", 35.0)

        # 준비된 디바이스 꺼내기
        ready = queue.pop_ready_devices()
    """

    def __init__(self, config: Optional[TemperatureConfig] = None):
        """
        CooldownQueue 초기화

        Args:
            config: 온도 관리 설정
        """
        self.config = config or TemperatureConfig()
        self._items: Dict[str, CooldownQueueItem] = {}

    def __len__(self) -> int:
        """대기열 크기 반환"""
        return len(self._items)

    def __contains__(self, device_id: str) -> bool:
        """디바이스가 대기열에 있는지 확인"""
        return device_id in self._items

    def add(self, device: DeviceInfo, temperature: float) -> CooldownQueueItem:
        """
        디바이스를 쿨다운 대기열에 추가

        Args:
            device: 디바이스 정보
            temperature: 현재 온도

        Returns:
            생성된 대기열 항목
        """
        item = CooldownQueueItem(
            device_id=device.id,
            device_hierarchy_id=getattr(device, "hierarchy_id", "") or "",
            serial_number=getattr(device, "serial_number", ""),
            temperature_at_entry=temperature,
            current_temperature=temperature,
            entered_at=datetime.now(timezone.utc),
            is_ready=False,
        )

        self._items[device.id] = item

        logger.info(f"[{item.device_hierarchy_id}] 쿨다운 대기열 추가: " f"{temperature}°C")

        return item

    def remove(self, device_id: str) -> Optional[CooldownQueueItem]:
        """
        대기열에서 디바이스 제거

        Args:
            device_id: 디바이스 ID

        Returns:
            제거된 항목 (없으면 None)
        """
        return self._items.pop(device_id, None)

    def get(self, device_id: str) -> Optional[CooldownQueueItem]:
        """
        대기열 항목 조회

        Args:
            device_id: 디바이스 ID

        Returns:
            대기열 항목 (없으면 None)
        """
        return self._items.get(device_id)

    def contains(self, device_id: str) -> bool:
        """디바이스가 대기열에 있는지 확인"""
        return device_id in self._items

    def update_temperature(self, device_id: str, temperature: float) -> Optional[CooldownQueueItem]:
        """
        대기열 항목의 온도 업데이트

        Args:
            device_id: 디바이스 ID
            temperature: 현재 온도

        Returns:
            업데이트된 항목 (없으면 None)
        """
        item = self._items.get(device_id)
        if not item:
            return None

        item.current_temperature = temperature
        item.last_checked_at = datetime.now(timezone.utc)
        item.check_count += 1

        # 목표 온도 이하면 준비 상태로 변경
        if temperature <= self.config.cooldown_target_temp:
            item.is_ready = True
            logger.info(
                f"[{item.device_hierarchy_id}] 쿨다운 완료: "
                f"{temperature}°C <= {self.config.cooldown_target_temp}°C"
            )

        return item

    def get_ready_devices(self) -> List[CooldownQueueItem]:
        """
        쿨다운 완료된 디바이스 목록 조회

        Returns:
            준비된 디바이스 항목 목록
        """
        return [item for item in self._items.values() if item.is_ready]

    def get_cooling_devices(self) -> List[CooldownQueueItem]:
        """
        아직 쿨링 중인 디바이스 목록 조회

        Returns:
            쿨링 중인 디바이스 항목 목록
        """
        return [item for item in self._items.values() if not item.is_ready]

    def pop_ready_devices(self) -> List[CooldownQueueItem]:
        """
        준비된 디바이스를 대기열에서 제거하고 반환

        Returns:
            제거된 디바이스 항목 목록
        """
        ready = [item for item in self._items.values() if item.is_ready]

        for item in ready:
            del self._items[item.device_id]

        return ready

    def get_expired_devices(self) -> List[CooldownQueueItem]:
        """
        최대 대기 시간 초과 디바이스 목록 반환

        Returns:
            만료된 디바이스 항목 목록
        """
        now = datetime.now(timezone.utc)
        max_wait = self.config.max_cooldown_time_seconds

        expired = []
        for item in self._items.values():
            elapsed = (now - item.entered_at).total_seconds()
            if elapsed >= max_wait:
                expired.append(item)

        return expired

    def get_status(self) -> CooldownQueueStatus:
        """
        대기열 상태 조회

        Returns:
            대기열 상태 요약
        """
        items = list(self._items.values())

        ready_count = sum(1 for item in items if item.is_ready)
        cooling_count = sum(1 for item in items if not item.is_ready)

        temperatures = [
            item.current_temperature for item in items if item.current_temperature is not None
        ]

        avg_temp = sum(temperatures) / len(temperatures) if temperatures else None
        max_temp = max(temperatures) if temperatures else None

        return CooldownQueueStatus(
            total_devices=len(items),
            ready_devices=ready_count,
            cooling_devices=cooling_count,
            avg_temperature=avg_temp,
            max_temperature=max_temp,
            items=items,
        )

    def clear(self) -> int:
        """
        대기열 초기화

        Returns:
            제거된 항목 수
        """
        count = len(self._items)
        self._items.clear()
        return count


class BatchExecutor:
    """
    50% 배치 실행기

    연결된 기기를 A/B 그룹으로 나누어 절반씩 실행합니다.

    Usage:
        executor = BatchExecutor()

        video = VideoTarget(
            video_id="abc123",
            url="https://youtube.com/watch?v=abc123",
            title="테스트 영상"
        )

        context = BatchExecutionContext(
            workload_id="workload-001",
            video=video,
            batch_config=BatchConfig(batch_size_percent=50)
        )

        results = await executor.execute_half_batches(context)
    """

    def __init__(
        self, registry: Optional[DeviceRegistry] = None, laixi: Optional[LaixiClient] = None
    ):
        """
        BatchExecutor 초기화

        Args:
            registry: DeviceRegistry 인스턴스 (None이면 싱글톤 사용)
            laixi: LaixiClient 인스턴스 (None이면 싱글톤 사용)
        """
        self.registry = registry or get_device_registry()
        self.laixi = laixi
        self._laixi_connected = False

    async def _ensure_laixi(self) -> LaixiClient:
        """Laixi 클라이언트 연결 확인"""
        if self.laixi is None:
            self.laixi = get_laixi_client()

        if not self._laixi_connected:
            connected = await self.laixi.connect()
            if not connected:
                raise ConnectionError("Laixi 연결 실패")
            self._laixi_connected = True

        return self.laixi

    async def execute_half_batches(
        self, context: BatchExecutionContext, workstation_id: Optional[str] = None
    ) -> List[BatchResult]:
        """
        50% 배치 실행 (A/B 그룹 순차 실행)

        Args:
            context: 실행 컨텍스트 (영상, 설정, 콜백)
            workstation_id: 특정 워크스테이션만 대상 (None = 전체)

        Returns:
            [그룹 A 결과, 그룹 B 결과]
        """
        # 디바이스 그룹 가져오기
        group_a, group_b = await self.registry.get_batch_groups(workstation_id)

        total_devices = len(group_a) + len(group_b)
        if total_devices == 0:
            logger.warning("실행 가능한 디바이스 없음")
            return []

        logger.info(f"배치 실행 시작: {total_devices}대 " f"(A={len(group_a)}, B={len(group_b)})")

        results: List[BatchResult] = []

        # 1차 배치: 그룹 A
        if group_a:
            batch_1 = await self._execute_batch(
                devices=group_a, batch_number=1, batch_group="A", context=context
            )
            results.append(batch_1)

            if context.on_batch_complete:
                await context.on_batch_complete(batch_1)

            logger.info(f"1차 배치(A) 완료: {batch_1.success_count}/{batch_1.total_devices} 성공")

        # 배치 간 대기
        if group_a and group_b:
            interval = context.batch_config.batch_interval_seconds
            logger.info(f"배치 간 대기: {interval}초")
            await asyncio.sleep(interval)

        # 2차 배치: 그룹 B
        if group_b:
            batch_2 = await self._execute_batch(
                devices=group_b, batch_number=2, batch_group="B", context=context
            )
            results.append(batch_2)

            if context.on_batch_complete:
                await context.on_batch_complete(batch_2)

            logger.info(f"2차 배치(B) 완료: {batch_2.success_count}/{batch_2.total_devices} 성공")

        # 전체 집계
        total_success = sum(r.success_count for r in results)
        total_failed = sum(r.failed_count for r in results)

        logger.info(
            f"배치 실행 완료: {total_success}/{total_devices} 성공, " f"{total_failed} 실패"
        )

        return results

    async def _execute_batch(
        self,
        devices: List[DeviceInfo],
        batch_number: int,
        batch_group: str,
        context: BatchExecutionContext,
    ) -> BatchResult:
        """
        단일 배치 실행

        Args:
            devices: 대상 디바이스 목록
            batch_number: 배치 번호 (1 또는 2)
            batch_group: 그룹 (A 또는 B)
            context: 실행 컨텍스트

        Returns:
            배치 실행 결과
        """
        started_at = datetime.now(timezone.utc)

        result = BatchResult(
            batch_number=batch_number,
            batch_group=batch_group,
            total_devices=len(devices),
            started_at=started_at,
        )

        # 디바이스들을 busy 상태로 변경
        device_ids = [d.hierarchy_id or d.serial_number for d in devices]
        await self.registry.set_devices_busy(device_ids)

        try:
            # 병렬 실행 (동시성 제한)
            semaphore = asyncio.Semaphore(10)  # 동시 10개 제한

            async def execute_with_limit(device: DeviceInfo) -> DeviceBatchResult:
                async with semaphore:
                    return await self._execute_on_device(device, context)

            tasks = [execute_with_limit(device) for device in devices]
            device_results = await asyncio.gather(*tasks, return_exceptions=True)

            # 결과 처리
            for i, res in enumerate(device_results):
                if isinstance(res, Exception):
                    # 예외 발생 시 실패 결과 생성
                    device = devices[i]
                    device_result = DeviceBatchResult(
                        device_id=device.id,
                        device_hierarchy_id=device.hierarchy_id,
                        status=CommandStatus.FAILED,
                        error_message=str(res),
                        started_at=started_at,
                    )
                    result.failed_count += 1
                else:
                    device_result = res
                    if device_result.status == CommandStatus.SUCCESS:
                        result.success_count += 1
                    else:
                        result.failed_count += 1

                result.device_results.append(device_result)

                # 디바이스 완료 콜백
                if context.on_device_complete:
                    await context.on_device_complete(device_result.device_id, device_result)

        finally:
            # 디바이스들을 idle 상태로 복원
            await self.registry.set_devices_idle(device_ids)

        # 완료 시간 기록
        result.completed_at = datetime.now(timezone.utc)
        result.duration_seconds = (result.completed_at - result.started_at).total_seconds()

        return result

    async def _execute_on_device(
        self, device: DeviceInfo, context: BatchExecutionContext
    ) -> DeviceBatchResult:
        """
        단일 디바이스에서 시청 명령 실행

        Args:
            device: 대상 디바이스
            context: 실행 컨텍스트

        Returns:
            디바이스 실행 결과
        """
        started_at = datetime.now(timezone.utc)

        result = DeviceBatchResult(
            device_id=device.id,
            device_hierarchy_id=device.hierarchy_id,
            status=CommandStatus.PENDING,
            started_at=started_at,
        )

        # 시작 콜백
        if context.on_device_start:
            await context.on_device_start(device.id, device.hierarchy_id)

        try:
            laixi = await self._ensure_laixi()

            video = context.video
            if not video:
                raise ValueError("시청 대상 영상이 없음")

            watch_config = context.watch_config

            # 시청 시간 결정 (랜덤 범위)
            watch_duration = random.randint(
                watch_config.watch_duration_min, watch_config.watch_duration_max
            )

            # YouTube 영상 열기 (ADB 명령)
            device_id = device.serial_number

            # 1. YouTube 앱으로 영상 열기
            await laixi.execute_adb(
                device_id, f"am start -a android.intent.action.VIEW -d {video.url}"
            )

            logger.debug(f"[{device.hierarchy_id}] YouTube 열기: {video.title}")

            # 2. 영상 로드 대기
            await asyncio.sleep(3)

            # 3. 시청 (대기)
            if watch_config.enable_random_pause:
                # 랜덤 구간으로 나누어 시청
                remaining = watch_duration
                while remaining > 0:
                    segment = min(remaining, random.randint(10, 30))
                    await asyncio.sleep(segment)
                    remaining -= segment

                    # 랜덤 스크롤 (휴먼 패턴)
                    if watch_config.enable_random_scroll and random.random() < 0.3:
                        await laixi.swipe(device_id, 0.5, 0.6, 0.5, 0.4, duration_ms=300)
            else:
                await asyncio.sleep(watch_duration)

            result.watch_time_seconds = watch_duration

            # 4. 좋아요 (확률적)
            if random.random() < watch_config.like_probability:
                # 좋아요 버튼 위치 탭 (대략적 위치)
                await laixi.tap(device_id, 0.15, 0.85)
                await asyncio.sleep(0.5)
                result.liked = True
                logger.debug(f"[{device.hierarchy_id}] 좋아요 클릭")

            # 5. 홈으로 나가기
            await laixi.press_home(device_id)

            # 성공 처리
            result.status = CommandStatus.SUCCESS
            result.completed_at = datetime.now(timezone.utc)
            result.duration_ms = int(
                (result.completed_at - result.started_at).total_seconds() * 1000
            )

            logger.info(
                f"[{device.hierarchy_id}] 시청 완료: "
                f"{result.watch_time_seconds}초, liked={result.liked}"
            )

            # 디바이스 명령 기록 업데이트
            await self.registry.update_device_command(device_id, command="watch", result="success")

        except asyncio.TimeoutError:
            result.status = CommandStatus.TIMEOUT
            result.error_message = "명령 타임아웃"
            logger.warning(f"[{device.hierarchy_id}] 타임아웃")

            await self.registry.update_device_command(
                device.serial_number, command="watch", result="timeout"
            )

        except Exception as e:
            result.status = CommandStatus.FAILED
            result.error_message = str(e)
            logger.error(f"[{device.hierarchy_id}] 실행 오류: {e}")

            await self.registry.update_device_command(
                device.serial_number, command="watch", result="failed"
            )

        return result

    async def execute_custom_command(
        self,
        devices: List[DeviceInfo],
        command_fn: Callable[[LaixiClient, str], Awaitable[bool]],
        batch_size_percent: int = 50,
        batch_interval: int = 30,
    ) -> List[BatchResult]:
        """
        커스텀 명령 배치 실행

        Args:
            devices: 대상 디바이스 목록
            command_fn: 실행할 명령 함수 (laixi, device_serial) -> success
            batch_size_percent: 배치 크기 (%)
            batch_interval: 배치 간 대기 (초)

        Returns:
            배치 결과 목록
        """
        if not devices:
            return []

        # 배치 크기 계산
        batch_size = max(1, len(devices) * batch_size_percent // 100)
        batches = [devices[i : i + batch_size] for i in range(0, len(devices), batch_size)]

        results: List[BatchResult] = []
        laixi = await self._ensure_laixi()

        for batch_num, batch_devices in enumerate(batches, 1):
            started_at = datetime.now(timezone.utc)

            result = BatchResult(
                batch_number=batch_num,
                batch_group="A" if batch_num % 2 == 1 else "B",
                total_devices=len(batch_devices),
                started_at=started_at,
            )

            for device in batch_devices:
                device_started = datetime.now(timezone.utc)

                try:
                    success = await command_fn(laixi, device.serial_number)

                    device_result = DeviceBatchResult(
                        device_id=device.id,
                        device_hierarchy_id=device.hierarchy_id,
                        status=CommandStatus.SUCCESS if success else CommandStatus.FAILED,
                        started_at=device_started,
                        completed_at=datetime.now(timezone.utc),
                    )

                    if success:
                        result.success_count += 1
                    else:
                        result.failed_count += 1

                except Exception as e:
                    device_result = DeviceBatchResult(
                        device_id=device.id,
                        device_hierarchy_id=device.hierarchy_id,
                        status=CommandStatus.FAILED,
                        error_message=str(e),
                        started_at=device_started,
                    )
                    result.failed_count += 1

                result.device_results.append(device_result)

            result.completed_at = datetime.now(timezone.utc)
            result.duration_seconds = (result.completed_at - result.started_at).total_seconds()

            results.append(result)

            # 배치 간 대기
            if batch_num < len(batches):
                await asyncio.sleep(batch_interval)

        return results


# 싱글톤 인스턴스
_executor: Optional[BatchExecutor] = None


def get_batch_executor() -> BatchExecutor:
    """BatchExecutor 싱글톤 반환"""
    global _executor
    if _executor is None:
        _executor = BatchExecutor()
    return _executor


def reset_batch_executor() -> None:
    """BatchExecutor 싱글톤 리셋 (테스트용)"""
    global _executor
    _executor = None
