"""
DoAi.Me NodeRunner - WSS Client
Protocol v1.0 Implementation

Mission: Vultr 서버와의 안정적인 WebSocket 연결 유지
- HELLO → 인증
- HEARTBEAT → 30초 주기
- COMMAND 수신 → 실행 → RESULT 전송

"복잡한 생각은 버려라." - Orion
"""

import asyncio
import base64
import binascii
import hashlib
import hmac
import json
import logging
import os
import socket
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, List, Optional

import websockets
from websockets.exceptions import ConnectionClosed

# ============================================================
# 로깅 설정
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ============================================================
# Configuration
# ============================================================


@dataclass
class NodeConfig:
    """노드 설정"""

    node_id: str = field(default_factory=lambda: f"node_runner_{socket.gethostname()}")
    secret_key: str = ""
    vultr_url: str = "wss://api.doai.me/ws/node"
    heartbeat_interval: int = 30
    reconnect_delay: int = 5
    max_reconnect_delay: int = 60
    capabilities: List[str] = field(default_factory=lambda: ["youtube", "adb_control"])


# ============================================================
# Security: HMAC-SHA256 서명
# ============================================================


def generate_signature(payload: dict, secret_key: str) -> str:
    """HMAC-SHA256 서명 생성"""
    payload_str = json.dumps(payload, sort_keys=True, separators=(",", ":"))

    # Base64 디코딩 - 잘못된 형식일 경우 명확한 에러 발생
    try:
        key_bytes = base64.b64decode(secret_key)
    except (binascii.Error, TypeError) as e:
        raise ValueError(
            f"Invalid Base64 format for secret_key: {e}. Please check NODE_SECRET_KEY environment variable."
        )

    signature = hmac.new(key_bytes, payload_str.encode("utf-8"), hashlib.sha256).hexdigest()
    return signature


# ============================================================
# Message Builders (Protocol v1.0)
# ============================================================


def build_message(msg_type: str, payload: dict, node_id: str, secret_key: str = "") -> dict:
    """프로토콜 v1.0 메시지 빌드"""
    message = {
        "version": "1.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "message_id": str(uuid.uuid4()),
        "type": msg_type,
        "node_id": node_id,
        "payload": payload,
    }

    # 서명 추가 (secret_key가 있는 경우)
    if secret_key:
        message["signature"] = generate_signature(payload, secret_key)

    return message


def build_hello(config: NodeConfig, device_count: int = 0, resources: dict = None) -> dict:
    """HELLO 메시지 빌드"""
    payload = {
        "hostname": socket.gethostname(),
        "ip_address": get_local_ip(),
        "runner_version": "2.0.0",
        "device_count": device_count,
        "capabilities": config.capabilities,
        "resources": resources or get_system_resources(),
    }
    return build_message("HELLO", payload, config.node_id, config.secret_key)


def build_heartbeat(
    config: NodeConfig,
    status: str,
    device_snapshot: list,
    active_tasks: int = 0,
    resources: dict = None,
) -> dict:
    """HEARTBEAT 메시지 빌드"""
    payload = {
        "status": status,
        "active_tasks": active_tasks,
        "queue_depth": 0,
        "resources": resources or get_system_resources(),
        "device_snapshot": device_snapshot,
    }
    return build_message("HEARTBEAT", payload, config.node_id, config.secret_key)


def build_result(
    config: NodeConfig, command_id: str, status: str, device_results: list, error: str = None
) -> dict:
    """RESULT 메시지 빌드"""
    total = len(device_results)
    success = len([r for r in device_results if r.get("status") == "SUCCESS"])
    failed = len([r for r in device_results if r.get("status") == "FAILED"])
    skipped = total - success - failed

    payload = {
        "command_id": command_id,
        "status": status,
        "summary": {
            "total_devices": total,
            "success_count": success,
            "failed_count": failed,
            "skipped_count": skipped,
        },
        "device_results": device_results,
        "execution_time_ms": 0,
    }
    if error:
        payload["error_message"] = error

    return build_message("RESULT", payload, config.node_id, config.secret_key)


# ============================================================
# Utilities
# ============================================================


def get_local_ip() -> str:
    """로컬 IP 주소 조회"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"


def get_system_resources() -> dict:
    """시스템 리소스 조회"""
    try:
        import psutil

        return {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage("/").percent,
        }
    except ImportError:
        return {"cpu_percent": 0, "memory_percent": 0, "disk_percent": 0}


# ============================================================
# NodeRunner WSS Client
# ============================================================


class NodeRunnerClient:
    """NodeRunner WebSocket 클라이언트"""

    def __init__(
        self,
        config: NodeConfig,
        command_handler: Callable[[dict], Any] = None,
        device_snapshot_provider: Callable[[], list] = None,
    ):
        self.config = config
        self.command_handler = command_handler or self._default_command_handler
        self.device_snapshot_provider = device_snapshot_provider or self._default_snapshot

        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.connected = False
        self.session_id: Optional[str] = None
        self.status = "READY"
        self.active_tasks = 0
        self._reconnect_delay = config.reconnect_delay
        self._running = False

    async def connect(self):
        """서버에 연결"""
        logger.info(f"🔌 Vultr 연결 시도: {self.config.vultr_url}")

        try:
            self.ws = await websockets.connect(
                self.config.vultr_url, ping_interval=20, ping_timeout=10
            )

            # HELLO 전송
            device_snapshot = self.device_snapshot_provider()
            hello = build_hello(self.config, len(device_snapshot))
            await self.ws.send(json.dumps(hello))
            logger.info(f"📤 HELLO 전송 (node_id={self.config.node_id})")

            # HELLO_ACK 대기
            response = await asyncio.wait_for(self.ws.recv(), timeout=10.0)
            ack = json.loads(response)

            if ack.get("type") == "HELLO_ACK":
                self.session_id = ack.get("session_id")
                self.connected = True
                self._reconnect_delay = self.config.reconnect_delay
                logger.info(f"✅ 연결 성공 (session={self.session_id})")
                return True
            elif ack.get("type") == "ERROR":
                logger.error(f"❌ 연결 실패: {ack.get('payload', {}).get('error_message')}")
                return False
            else:
                logger.error(f"❌ 예상치 못한 응답: {ack.get('type')}")
                return False

        except asyncio.TimeoutError:
            logger.error("❌ HELLO_ACK 타임아웃")
            return False
        except Exception as e:
            logger.error(f"❌ 연결 에러: {e}")
            return False

    async def disconnect(self):
        """연결 해제"""
        self._running = False
        self.connected = False
        if self.ws:
            await self.ws.close()
            self.ws = None
        logger.info("🔌 연결 해제됨")

    async def run(self):
        """메인 루프 (자동 재연결)"""
        self._running = True

        while self._running:
            # 연결 시도
            if not self.connected:
                success = await self.connect()
                if not success:
                    logger.info(f"⏳ {self._reconnect_delay}초 후 재연결...")
                    await asyncio.sleep(self._reconnect_delay)
                    # 지수 백오프
                    self._reconnect_delay = min(
                        self._reconnect_delay * 2, self.config.max_reconnect_delay
                    )
                    continue

            # 메시지 수신 + 하트비트 태스크 (한 쪽이 실패하면 다른 쪽도 취소)
            heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            receive_task = asyncio.create_task(self._receive_loop())

            try:
                await asyncio.gather(heartbeat_task, receive_task)
            except ConnectionClosed:
                logger.warning("⚠️ WebSocket 연결 끊김")
                self.connected = False
            except Exception as e:
                logger.error(f"❌ 루프 에러: {e}")
                self.connected = False
            finally:
                # 실행 중인 태스크 취소 및 대기
                for task in [heartbeat_task, receive_task]:
                    if not task.done():
                        task.cancel()
                        try:
                            await task
                        except asyncio.CancelledError:
                            pass

        await self.disconnect()

    async def _heartbeat_loop(self):
        """HEARTBEAT 전송 루프"""
        while self.connected and self._running:
            try:
                device_snapshot = self.device_snapshot_provider()
                heartbeat = build_heartbeat(
                    self.config, self.status, device_snapshot, self.active_tasks
                )
                await self.ws.send(json.dumps(heartbeat))
                logger.debug(f"💓 HEARTBEAT (status={self.status}, devices={len(device_snapshot)})")

                await asyncio.sleep(self.config.heartbeat_interval)
            except Exception as e:
                logger.error(f"❌ HEARTBEAT 에러: {e}")
                break

    async def _receive_loop(self):
        """메시지 수신 루프"""
        while self.connected and self._running:
            try:
                message = await self.ws.recv()
                data = json.loads(message)
                await self._handle_message(data)
            except ConnectionClosed:
                raise
            except Exception as e:
                logger.error(f"❌ 메시지 처리 에러: {e}")

    async def _handle_message(self, message: dict):
        """메시지 처리"""
        msg_type = message.get("type")
        payload = message.get("payload", {})

        if msg_type == "HEARTBEAT_ACK":
            # 서버 시간 동기화 등
            pass

        elif msg_type == "COMMAND":
            # 명령 처리
            command_id = payload.get("command_id")
            command_type = payload.get("command_type")
            logger.info(f"📥 COMMAND 수신: {command_type} (id={command_id})")

            # 상태 변경
            self.status = "BUSY"
            self.active_tasks += 1

            try:
                # 명령 실행
                result = await self.command_handler(payload)

                # RESULT 전송
                result_msg = build_result(
                    self.config,
                    command_id,
                    result.get("status", "SUCCESS"),
                    result.get("device_results", []),
                )
                await self.ws.send(json.dumps(result_msg))
                logger.info(f"📤 RESULT 전송: {result.get('status')}")

            except Exception as e:
                # 에러 결과 전송
                error_msg = build_result(self.config, command_id, "FAILED", [], str(e))
                await self.ws.send(json.dumps(error_msg))
                logger.error(f"❌ 명령 실행 실패: {e}")

            finally:
                self.active_tasks -= 1
                if self.active_tasks == 0:
                    self.status = "READY"

        elif msg_type == "ERROR":
            error_code = payload.get("error_code")
            error_message = payload.get("error_message")
            logger.error(f"❌ 서버 에러: [{error_code}] {error_message}")

        else:
            logger.warning(f"⚠️ 알 수 없는 메시지: {msg_type}")

    # ============================================================
    # Default Handlers
    # ============================================================

    async def _default_command_handler(self, payload: dict) -> dict:
        """기본 명령 핸들러 (오버라이드 필요)"""
        command_type = payload.get("command_type")
        logger.warning(f"⚠️ 기본 핸들러 사용: {command_type}")

        # TODO: 실제 Laixi 호출
        await asyncio.sleep(1)  # 시뮬레이션

        return {"status": "SUCCESS", "device_results": []}

    def _default_snapshot(self) -> list:
        """기본 디바이스 스냅샷 (오버라이드 필요)"""
        # TODO: 실제 ADB 디바이스 조회
        return []


# ============================================================
# Example Usage
# ============================================================


async def main():
    """예시 실행"""
    config = NodeConfig(
        node_id=os.getenv("NODE_ID", f"node_runner_{socket.gethostname()}"),
        secret_key=os.getenv("NODE_SECRET", ""),
        vultr_url=os.getenv("VULTR_URL", "ws://localhost:8000/ws/node"),
    )

    # 디바이스 스냅샷 프로바이더 (예시)
    def get_device_snapshot():
        # TODO: 실제 ADB 디바이스 상태 조회
        return [
            {"slot": 1, "serial": "R58M12ABC01", "status": "idle", "battery_level": 85},
            {"slot": 2, "serial": "R58M12ABC02", "status": "idle", "battery_level": 92},
        ]

    # 명령 핸들러 (예시)
    async def handle_command(payload: dict) -> dict:
        command_type = payload.get("command_type")
        payload.get("params", {})

        logger.info(f"🎬 명령 실행: {command_type}")

        # TODO: Laixi SDK 호출
        await asyncio.sleep(2)  # 시뮬레이션

        return {
            "status": "SUCCESS",
            "device_results": [
                {"slot": 1, "serial": "R58M12ABC01", "status": "SUCCESS", "duration_seconds": 2.0}
            ],
        }

    client = NodeRunnerClient(
        config=config, command_handler=handle_command, device_snapshot_provider=get_device_snapshot
    )

    try:
        await client.run()
    except KeyboardInterrupt:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
