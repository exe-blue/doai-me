"""
WebSocket Handlers
노드 및 대시보드 WebSocket 연결 처리
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.config import get_config
from core.connection_pool import NodeConnection, pool
from core.database import (
    db_complete_command,
    db_disconnect_node,
    db_get_node_secret,
    db_process_heartbeat,
    db_register_node_connection,
)
from core.protocol import (
    build_error,
    build_heartbeat_ack,
    build_hello_ack,
    verify_signature,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Pending 명령 응답 대기
pending_commands: dict = {}

# 대시보드 연결 풀
dashboard_connections: List[WebSocket] = []


async def broadcast_to_dashboards(message: dict):
    """대시보드들에 메시지 브로드캐스트"""
    disconnected = []
    for ws in dashboard_connections:
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.append(ws)

    for ws in disconnected:
        if ws in dashboard_connections:
            dashboard_connections.remove(ws)


async def forward_metrics_to_oob(node_id: str, metrics: dict):
    """OOB 시스템에 메트릭 전달"""
    config = get_config()
    if not config.oob_api_url:
        return

    try:
        import aiohttp

        async with aiohttp.ClientSession() as session:
            payload = {"node_id": node_id, **metrics}
            async with session.post(
                config.oob_api_url, json=payload, timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                if resp.status != 200:
                    logger.debug(f"[{node_id}] OOB metrics forward: {resp.status}")
    except ImportError:
        pass
    except Exception as e:
        logger.debug(f"[{node_id}] OOB forward error: {e}")


async def handle_heartbeat(node_id: str, conn: NodeConnection, websocket: WebSocket, message: dict):
    """HEARTBEAT 메시지 처리"""
    msg_payload = message.get("payload", {})

    status = msg_payload.get("status", "READY")
    device_snapshot = msg_payload.get("device_snapshot", [])
    active_tasks = msg_payload.get("active_tasks", 0)
    resources = msg_payload.get("resources", {})

    metrics = message.get("metrics", {})
    devices = message.get("devices", [])
    device_count = len(device_snapshot) or len(devices) or metrics.get("device_count", 0)

    await pool.update_heartbeat(node_id, device_count, status)
    await pool.update_status(node_id, status, active_tasks)
    conn.resources = resources

    db_result = await db_process_heartbeat(
        node_id=node_id,
        status=status,
        resources=resources,
        device_snapshot=device_snapshot or devices,
        active_tasks=active_tasks,
        session_id=conn.session_id,
    )

    pending_cmds = []
    if db_result.get("success"):
        db_commands = db_result.get("pending_commands", [])

        for cmd in db_commands or []:
            pending_cmds.append(
                {
                    "command_id": cmd.get("id"),
                    "command_type": cmd.get("command_type"),
                    "priority": cmd.get("priority", "NORMAL"),
                    "target": cmd.get("target_spec", {"type": "ALL_DEVICES"}),
                    "params": cmd.get("params", {}),
                    "timeout_seconds": cmd.get("timeout_seconds", 300),
                }
            )

    await forward_metrics_to_oob(
        node_id,
        {
            "device_count": device_count,
            "status": status,
            "active_tasks": active_tasks,
            "laixi_connected": metrics.get("laixi_connected", True),
            "unauthorized_count": metrics.get("unauthorized_count", 0),
            "uptime_sec": metrics.get("uptime_sec", 0),
            "laixi_restarts": metrics.get("laixi_restarts", 0),
            "resources": resources,
        },
    )

    await websocket.send_json(
        build_heartbeat_ack(pending_commands=pending_cmds if status == "READY" else [])
    )

    if pending_cmds:
        logger.info(f"[{node_id}] HEARTBEAT_ACK + {len(pending_cmds)}개 명령 Push")

    await broadcast_to_dashboards(
        {
            "type": "NODE_UPDATE",
            "node_id": node_id,
            "status": status,
            "device_count": device_count,
            "active_tasks": active_tasks,
            "last_heartbeat": datetime.now(timezone.utc).isoformat() + "Z",
        }
    )


async def handle_result(node_id: str, message: dict):
    """RESULT 메시지 처리"""
    msg_payload = message.get("payload", {})
    command_id = msg_payload.get("command_id")
    result_status = msg_payload.get("status", "UNKNOWN")
    summary = msg_payload.get("summary", {})
    device_results = msg_payload.get("device_results", [])
    error_message = msg_payload.get("error_message")

    logger.info(
        f"[{node_id}] RESULT: {command_id} -> {result_status} "
        f"({summary.get('success_count', 0)}/{summary.get('total_devices', 0)} devices)"
    )

    if command_id and command_id in pending_commands:
        pending_commands[command_id].set_result(msg_payload)

    if command_id:
        db_status = "COMPLETED" if result_status in ["SUCCESS", "PARTIAL_SUCCESS"] else "FAILED"

        await db_complete_command(
            command_id=command_id,
            status=db_status,
            result={"summary": summary, "device_results": device_results},
            error=error_message,
        )

    await broadcast_to_dashboards(
        {
            "type": "COMMAND_RESULT",
            "node_id": node_id,
            "command_id": command_id,
            "status": result_status,
            "summary": summary,
            "error": error_message,
        }
    )


@router.websocket("/ws/node")
async def websocket_node(websocket: WebSocket):
    """
    노드 WebSocket 연결 (Protocol v1.0)
    """
    await websocket.accept()
    node_id = None
    session_id = str(uuid.uuid4())[:8]
    config = get_config()

    try:
        # Phase 1: HELLO Handshake
        try:
            hello = await asyncio.wait_for(
                websocket.receive_json(), timeout=config.hello_timeout
            )
        except asyncio.TimeoutError:
            await websocket.send_json(build_error("AUTH_FAILED", "HELLO timeout"))
            await websocket.close(code=4001, reason="HELLO timeout")
            return

        if hello.get("type") != "HELLO":
            await websocket.send_json(build_error("INVALID_MESSAGE", "Expected HELLO"))
            await websocket.close(code=4002, reason="Expected HELLO")
            return

        node_id = hello.get("node_id")
        signature = hello.get("signature")
        payload = hello.get("payload", {})
        message_id = hello.get("message_id", "")

        if not node_id:
            await websocket.send_json(build_error("INVALID_MESSAGE", "Missing node_id"))
            await websocket.close(code=4003, reason="Missing node_id")
            return

        # HMAC-SHA256 서명 검증
        if config.verify_signature:
            secret = await db_get_node_secret(node_id)

            if not secret:
                logger.info(f"[{node_id}] 새 노드 - 시크릿 키 생성 예정")
            elif signature:
                if not verify_signature(payload, signature, secret):
                    logger.warning(f"[{node_id}] 서명 검증 실패")
                    await websocket.send_json(
                        build_error("AUTH_FAILED", "Invalid signature", message_id)
                    )
                    await websocket.close(code=4004, reason="AUTH_FAILED")
                    return
            else:
                logger.warning(f"[{node_id}] 서명 누락 (VERIFY_SIGNATURE=true)")
                await websocket.send_json(
                    build_error("AUTH_FAILED", "Signature required", message_id)
                )
                await websocket.close(code=4005, reason="Signature required")
                return

        # 연결 풀에 추가
        conn = await pool.add(node_id, websocket, session_id)
        conn.hostname = payload.get("hostname", "")
        conn.ip_address = payload.get("ip_address", "")
        conn.capabilities = payload.get("capabilities", [])
        conn.device_count = payload.get("device_count", 0)
        conn.runner_version = payload.get("runner_version", "")

        # DB에 연결 등록
        db_result = await db_register_node_connection(
            node_id=node_id,
            session_id=session_id,
            hostname=conn.hostname,
            ip_address=conn.ip_address,
            runner_version=conn.runner_version,
            capabilities=conn.capabilities,
        )

        if db_result.get("success"):
            conn.node_uuid = db_result.get("node_uuid")
            if db_result.get("is_new"):
                logger.info(f"[{node_id}] 새 노드 등록됨 (uuid={conn.node_uuid})")

        # HELLO_ACK 응답
        await websocket.send_json(build_hello_ack(session_id))

        logger.info(f"[{node_id}] HELLO 완료 (session={session_id}, devices={conn.device_count})")

        await broadcast_to_dashboards(
            {
                "type": "NODE_CONNECTED",
                "node_id": node_id,
                "session_id": session_id,
                "device_count": conn.device_count,
                "hostname": conn.hostname,
            }
        )

        # Phase 2: Message Loop
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")
            msg_id = message.get("message_id", "")
            msg_payload = message.get("payload", {})

            if msg_type == "HEARTBEAT":
                await handle_heartbeat(node_id, conn, websocket, message)
            elif msg_type == "RESULT":
                await handle_result(node_id, message)
            elif msg_type == "ACK":
                ack_msg_id = msg_payload.get("ack_message_id")
                ack_status = msg_payload.get("status")
                logger.debug(f"[{node_id}] ACK: {ack_msg_id} -> {ack_status}")
            elif msg_type == "EVENT":
                event_type = msg_payload.get("event")
                logger.info(f"[{node_id}] EVENT: {event_type}")
            else:
                logger.warning(f"[{node_id}] 알 수 없는 메시지 타입: {msg_type}")
                await websocket.send_json(
                    build_error("UNKNOWN_MESSAGE", f"Unknown message type: {msg_type}", msg_id)
                )

    except WebSocketDisconnect:
        logger.info(f"[{node_id or 'unknown'}] 연결 끊김")
    except Exception as e:
        logger.error(f"[{node_id or 'unknown'}] 에러: {e}", exc_info=True)
    finally:
        if node_id:
            await pool.remove(node_id)
            await db_disconnect_node(node_id)
            await broadcast_to_dashboards({"type": "NODE_DISCONNECTED", "node_id": node_id})


@router.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """대시보드 WebSocket 연결"""
    await websocket.accept()
    dashboard_connections.append(websocket)

    logger.info(f"[DASHBOARD] 연결됨 (총 {len(dashboard_connections)}개)")

    try:
        # 초기 상태 전송
        nodes = pool.list_nodes()
        await websocket.send_json(
            {
                "type": "INIT",
                "nodes": nodes,
                "total_nodes": len(nodes),
                "ready_nodes": len([n for n in nodes if n["status"] == "READY"]),
            }
        )

        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")

                if msg_type == "PING":
                    await websocket.send_json({"type": "PONG"})
                elif msg_type == "GET_STATUS":
                    nodes = pool.list_nodes()
                    await websocket.send_json(
                        {
                            "type": "STATUS",
                            "nodes": nodes,
                            "total_nodes": len(nodes),
                            "ready_nodes": len([n for n in nodes if n["status"] == "READY"]),
                        }
                    )
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[DASHBOARD] 에러: {e}")
    finally:
        if websocket in dashboard_connections:
            dashboard_connections.remove(websocket)
        logger.info(f"[DASHBOARD] 연결 해제 (총 {len(dashboard_connections)}개)")
