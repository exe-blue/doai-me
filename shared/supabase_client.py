"""
🌐 DoAi.Me Shared Supabase Client
PC Agent, Worker 등에서 직접 Supabase에 접근할 때 사용

왜 이 구조인가?
- PC Agent가 중앙 서버 없이도 기기 상태를 직접 DB에 동기화
- 서버 부하 분산 및 장애 대응
- 환경 변수만 있으면 어디서든 사용 가능
"""

import asyncio
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# 로거 설정 (loguru가 없으면 기본 logging 사용)
try:
    from loguru import logger
except ImportError:
    import logging

    logger = logging.getLogger(__name__)
    logging.basicConfig(level=logging.INFO)

# Supabase 클라이언트
try:
    from supabase import Client, create_client
except ImportError:
    raise ImportError("supabase 패키지가 필요합니다. 설치: pip install supabase")


# ===========================================
# Environment Configuration
# ===========================================


def _get_env(key: str, default: Optional[str] = None, required: bool = False) -> Optional[str]:
    """환경 변수 가져오기"""
    value = os.getenv(key, default)
    if required and not value:
        raise ValueError(f"환경 변수 {key}가 필요합니다.")
    return value


# ===========================================
# Supabase Client Factory
# ===========================================

_client: Optional[Client] = None


def get_client() -> Client:
    """
    Supabase 클라이언트 싱글톤

    환경 변수:
    - SUPABASE_URL: 프로젝트 URL
    - SUPABASE_SERVICE_ROLE_KEY: Service Role Key (백엔드용)

    Returns:
        Supabase Client
    """
    global _client

    if _client is None:
        url = _get_env("SUPABASE_URL", required=True)
        key = _get_env("SUPABASE_SERVICE_ROLE_KEY", required=True)

        _client = create_client(url, key)
        logger.info(f"Supabase 연결 완료: {url[:30]}...")

    return _client


# ===========================================
# Device Sync Functions
# ===========================================


class DeviceSync:
    """
    기기 상태 Supabase 동기화

    PC Agent에서 직접 호출하여 devices 테이블 업데이트
    """

    def __init__(self, pc_id: int):
        """
        Args:
            pc_id: 워크스테이션 ID (1, 2, 3...)
        """
        self.pc_id = pc_id
        self.client = get_client()
        self.table = "devices"

    async def upsert_device(
        self, serial_number: str, status: str = "idle", model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        기기 Upsert (등록 또는 업데이트)

        PC Agent 시작 시 연결된 모든 기기를 등록/업데이트

        Args:
            serial_number: ADB 시리얼 번호
            status: 기기 상태 (idle, busy, offline)
            model: 기기 모델명

        Returns:
            Upsert된 기기 데이터
        """
        try:
            now = datetime.now(timezone.utc).isoformat()

            data = {
                "serial_number": serial_number,
                "pc_id": self.pc_id,
                "status": status,
                "last_seen": now,
            }

            if model:
                data["model"] = model

            # Supabase upsert - serial_number 충돌 시 UPDATE
            result = (
                self.client.table(self.table).upsert(data, on_conflict="serial_number").execute()
            )

            if result.data and len(result.data) > 0:
                device = result.data[0]
                logger.info(
                    f"[PC{self.pc_id}] 기기 동기화: {serial_number} "
                    f"(id={device.get('id')}, status={status})"
                )
                return device

            logger.warning(f"[PC{self.pc_id}] 기기 동기화 결과 없음: {serial_number}")
            return {}

        except Exception as e:
            logger.error(f"[PC{self.pc_id}] 기기 동기화 실패: {serial_number} - {e}")
            raise

    async def bulk_upsert(self, devices: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        여러 기기 일괄 Upsert

        Args:
            devices: [{"serial_number": "xxx", "model": "Galaxy S9"}, ...]

        Returns:
            Upsert된 기기 목록
        """
        results = []

        for device in devices:
            serial = device.get("serial_number")
            model = device.get("model")
            status = device.get("status", "idle")

            if serial:
                result = await self.upsert_device(serial, status, model)
                if result:
                    results.append(result)

        logger.info(f"[PC{self.pc_id}] {len(results)}대 기기 일괄 동기화 완료")
        return results

    async def heartbeat(self, serial_number: str, health_data: Optional[Dict] = None) -> bool:
        """
        기기 하트비트 전송

        주기적으로 호출하여 last_seen 업데이트

        왜 이렇게 작성했는가?
        - last_seen은 항상 갱신 (기기가 살아있음을 표시)
        - status가 "busy"인 경우 그대로 유지 (작업 중 상태 보존)
        - status가 "busy"가 아닌 경우에만 "idle"로 설정
        - 조건부 업데이트로 상태 덮어쓰기 방지

        Args:
            serial_number: 시리얼 번호
            health_data: 선택적 헬스 정보

        Returns:
            성공 여부
        """
        try:
            now = datetime.now(timezone.utc).isoformat()

            # 먼저 현재 기기 상태 조회
            current = (
                self.client.table(self.table)
                .select("status")
                .eq("serial_number", serial_number)
                .single()
                .execute()
            )

            current_status = current.data.get("status") if current.data else None

            # 업데이트 데이터 구성
            # status가 "busy"이면 유지, 그 외에는 "idle"로 설정
            update_data = {"last_seen": now}

            if current_status != "busy":
                # busy가 아닌 경우에만 idle로 변경
                update_data["status"] = "idle"
            # else: busy 상태는 그대로 유지 (status 필드 업데이트 안함)

            result = (
                self.client.table(self.table)
                .update(update_data)
                .eq("serial_number", serial_number)
                .execute()
            )

            success = result.data is not None and len(result.data) > 0

            if not success:
                # 존재하지 않으면 새로 등록
                await self.upsert_device(serial_number)

            return True

        except Exception as e:
            # single() 조회 실패 시 (기기 없음) - 새로 등록 시도
            if "PGRST116" in str(e):  # Supabase "not found" 에러 코드
                try:
                    await self.upsert_device(serial_number)
                    return True
                except Exception as upsert_err:
                    logger.error(
                        f"[PC{self.pc_id}] 하트비트 등록 실패: {serial_number} - {upsert_err}"
                    )
                    return False

            logger.error(f"[PC{self.pc_id}] 하트비트 실패: {serial_number} - {e}")
            return False

    async def set_status(self, serial_number: str, status: str) -> bool:
        """
        기기 상태 변경

        Args:
            serial_number: 시리얼 번호
            status: 새 상태 (idle, busy, offline, error)

        Returns:
            성공 여부
        """
        try:
            now = datetime.now(timezone.utc).isoformat()

            result = (
                self.client.table(self.table)
                .update({"status": status, "last_seen": now})
                .eq("serial_number", serial_number)
                .execute()
            )

            success = result.data is not None and len(result.data) > 0

            if success:
                logger.debug(f"[PC{self.pc_id}] 상태 변경: {serial_number} → {status}")

            return success

        except Exception as e:
            logger.error(f"[PC{self.pc_id}] 상태 변경 실패: {serial_number} - {e}")
            return False

    async def set_offline_all(self) -> int:
        """
        이 PC의 모든 기기를 offline으로 설정

        PC Agent 종료 시 호출

        Returns:
            업데이트된 기기 수
        """
        try:
            result = (
                self.client.table(self.table)
                .update({"status": "offline"})
                .eq("pc_id", self.pc_id)
                .execute()
            )

            count = len(result.data) if result.data else 0
            logger.info(f"[PC{self.pc_id}] {count}대 기기 offline 처리")

            return count

        except Exception as e:
            logger.error(f"[PC{self.pc_id}] offline 처리 실패: {e}")
            return 0

    async def get_my_devices(self) -> List[Dict]:
        """
        이 PC에 연결된 기기 목록 조회

        Returns:
            기기 목록
        """
        try:
            result = self.client.table(self.table).select("*").eq("pc_id", self.pc_id).execute()

            return result.data or []

        except Exception as e:
            logger.error(f"[PC{self.pc_id}] 기기 목록 조회 실패: {e}")
            return []


# ===========================================
# Job Sync Functions
# ===========================================


class JobSync:
    """
    작업(Job) Supabase 동기화

    PC Agent에서 작업 상태 업데이트
    """

    def __init__(self, pc_id: int):
        self.pc_id = pc_id
        self.client = get_client()
        self.table = "jobs"

    async def get_pending_job(self, device_id: int) -> Optional[Dict]:
        """
        해당 기기의 대기 중인 작업 조회

        Args:
            device_id: 기기 ID (DB primary key)

        Returns:
            작업 데이터 또는 None
        """
        try:
            result = (
                self.client.table(self.table)
                .select("*, videos(*)")
                .eq("device_id", device_id)
                .eq("status", "pending")
                .order("created_at", desc=False)
                .limit(1)
                .execute()
            )

            if result.data and len(result.data) > 0:
                return result.data[0]

            return None

        except Exception as e:
            logger.error(f"[PC{self.pc_id}] 작업 조회 실패: device={device_id} - {e}")
            return None

    async def start_job(self, job_id: int) -> bool:
        """작업 시작 처리"""
        try:
            now = datetime.now(timezone.utc).isoformat()

            result = (
                self.client.table(self.table)
                .update({"status": "running", "started_at": now})
                .eq("id", job_id)
                .execute()
            )

            success = result.data is not None and len(result.data) > 0

            if success:
                logger.info(f"[PC{self.pc_id}] 작업 시작: job={job_id}")

            return success

        except Exception as e:
            logger.error(f"[PC{self.pc_id}] 작업 시작 실패: {job_id} - {e}")
            return False

    async def complete_job(
        self, job_id: int, watch_time: int, screenshot_url: Optional[str] = None
    ) -> bool:
        """작업 완료 처리"""
        try:
            now = datetime.now(timezone.utc).isoformat()

            update_data = {"status": "completed", "completed_at": now, "watch_time": watch_time}

            if screenshot_url:
                update_data["screenshot_url"] = screenshot_url

            result = self.client.table(self.table).update(update_data).eq("id", job_id).execute()

            success = result.data is not None and len(result.data) > 0

            if success:
                logger.info(f"[PC{self.pc_id}] 작업 완료: job={job_id}, watch={watch_time}s")

            return success

        except Exception as e:
            logger.error(f"[PC{self.pc_id}] 작업 완료 실패: {job_id} - {e}")
            return False

    async def fail_job(self, job_id: int, error_message: str) -> bool:
        """작업 실패 처리"""
        try:
            now = datetime.now(timezone.utc).isoformat()

            result = (
                self.client.table(self.table)
                .update({"status": "failed", "completed_at": now, "error_message": error_message})
                .eq("id", job_id)
                .execute()
            )

            success = result.data is not None and len(result.data) > 0

            if success:
                logger.warning(f"[PC{self.pc_id}] 작업 실패: job={job_id} - {error_message}")

            return success

        except Exception as e:
            logger.error(f"[PC{self.pc_id}] 작업 실패 처리 오류: {job_id} - {e}")
            return False


# ===========================================
# Convenience Functions
# ===========================================


async def sync_devices_from_adb(pc_id: int) -> List[Dict]:
    """
    ADB 연결된 기기를 Supabase에 동기화

    편의 함수: PC Agent 시작 시 호출

    Args:
        pc_id: 워크스테이션 ID

    Returns:
        동기화된 기기 목록
    """
    import subprocess

    try:
        # ADB 기기 목록 가져오기
        result = subprocess.run(["adb", "devices"], capture_output=True, text=True, timeout=10)

        lines = result.stdout.strip().split("\n")[1:]  # 헤더 제외
        devices = []

        for line in lines:
            if "\tdevice" in line:
                serial = line.split("\t")[0]

                # 모델명 가져오기
                model_result = subprocess.run(
                    ["adb", "-s", serial, "shell", "getprop", "ro.product.model"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                model = model_result.stdout.strip() or "Unknown"

                devices.append({"serial_number": serial, "model": model})

        if not devices:
            logger.warning(f"[PC{pc_id}] ADB 연결된 기기 없음")
            return []

        # Supabase에 동기화
        sync = DeviceSync(pc_id)
        return await sync.bulk_upsert(devices)

    except Exception as e:
        logger.error(f"[PC{pc_id}] ADB 동기화 실패: {e}")
        return []


# ===========================================
# Example Usage
# ===========================================

if __name__ == "__main__":
    """테스트용 메인"""
    import asyncio

    async def test():
        # 환경 변수 설정 필요
        # export SUPABASE_URL=https://xxx.supabase.co
        # export SUPABASE_SERVICE_ROLE_KEY=xxx

        pc_id = 1

        # 기기 동기화
        sync = DeviceSync(pc_id)

        # 테스트 기기 등록
        result = await sync.upsert_device(
            serial_number="test-device-001", status="idle", model="Galaxy S9"
        )
        print(f"등록 결과: {result}")

        # 내 기기 목록
        devices = await sync.get_my_devices()
        print(f"PC{pc_id} 기기: {len(devices)}대")

    asyncio.run(test())
