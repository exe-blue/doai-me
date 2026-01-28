"""
REST API Handlers
명령 전송 및 노드 상태 API
"""

import asyncio
import logging
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.config import get_config
from core.connection_pool import pool
from core.database import db_enqueue_command, get_supabase
from core.protocol import build_command
from handlers.websocket import broadcast_to_dashboards, pending_commands

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================
# Pydantic Models
# ============================================================


class CommandRequest(BaseModel):
    """명령 요청"""

    node_id: str
    action: str
    device_id: str = "all"
    params: Dict[str, Any] = Field(default_factory=dict)
    priority: str = "NORMAL"
    timeout: int = 300


class CommandResponse(BaseModel):
    """명령 응답"""

    success: bool
    command_id: str
    result: Optional[dict] = None
    error: Optional[str] = None


class QueueCommandRequest(BaseModel):
    """큐에 추가할 명령"""

    command_type: str
    target_node_id: Optional[str] = None
    target_spec: Dict[str, Any] = Field(default_factory=lambda: {"type": "ALL_DEVICES"})
    params: Dict[str, Any] = Field(default_factory=dict)
    priority: str = "NORMAL"
    scheduled_at: Optional[str] = None


class QueueCommandResponse(BaseModel):
    """큐 추가 응답"""

    queued: bool
    command_id: Optional[str] = None
    error: Optional[str] = None


class BroadcastRequest(BaseModel):
    """브로드캐스트 요청 (Control Room)"""

    video_url: str
    duration_seconds: int = 60
    target_node_count: int = 0
    target_node_ids: List[str] = Field(default_factory=list)
    priority: str = "HIGH"


class BroadcastResponse(BaseModel):
    """브로드캐스트 응답"""

    success: bool
    broadcast_id: str
    target_nodes: int
    sent_nodes: int
    errors: List[str] = Field(default_factory=list)


# ============================================================
# 동기 명령 전송
# ============================================================


@router.post("/api/command", response_model=CommandResponse)
async def send_command(request: CommandRequest):
    """노드에 명령 전송 (동기 - 응답 대기)"""
    conn = await pool.get(request.node_id)
    if not conn:
        raise HTTPException(
            status_code=404, detail=f"Node not found or not connected: {request.node_id}"
        )

    command_id = str(uuid.uuid4())

    target = {"type": "ALL_DEVICES"}
    if request.device_id != "all":
        target = {
            "type": "SPECIFIC_DEVICES",
            "device_slots": [int(request.device_id)] if request.device_id.isdigit() else [],
        }

    command = build_command(
        command_id=command_id,
        command_type=request.action,
        target=target,
        params=request.params,
        priority=request.priority,
        timeout=request.timeout,
    )

    future = asyncio.get_event_loop().create_future()
    pending_commands[command_id] = future

    try:
        success = await pool.send_to_node(request.node_id, command)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send command")

        try:
            result = await asyncio.wait_for(future, timeout=float(request.timeout))
            return CommandResponse(
                success=result.get("status") in ["SUCCESS", "PARTIAL_SUCCESS"],
                command_id=command_id,
                result=result,
                error=result.get("error_message"),
            )
        except asyncio.TimeoutError:
            return CommandResponse(
                success=False, command_id=command_id, error=f"Command timeout ({request.timeout}s)"
            )
    finally:
        pending_commands.pop(command_id, None)


# ============================================================
# 비동기 명령 큐
# ============================================================


@router.post("/api/queue/command", response_model=QueueCommandResponse)
async def queue_command(request: QueueCommandRequest):
    """명령을 큐에 추가 (비동기 - Pull-based Push로 전달)"""
    node_uuid = None
    if request.target_node_id:
        conn = await pool.get(request.target_node_id)
        if conn and conn.node_uuid:
            node_uuid = conn.node_uuid

    command_id = await db_enqueue_command(
        command_type=request.command_type,
        params=request.params,
        target_node_id=node_uuid,
        target_spec=request.target_spec,
        priority=request.priority,
        scheduled_at=request.scheduled_at,
        created_by="api",
    )

    if command_id:
        logger.info(
            f"[QUEUE] 명령 추가: {request.command_type} (id={command_id}, priority={request.priority})"
        )
        return QueueCommandResponse(queued=True, command_id=command_id)
    else:
        return QueueCommandResponse(queued=False, error="Failed to enqueue command")


# ============================================================
# 노드 상태 API
# ============================================================


@router.get("/api/nodes")
async def list_nodes():
    """연결된 노드 목록"""
    nodes = pool.list_nodes()
    return {
        "nodes": nodes,
        "total": len(nodes),
        "ready": len([n for n in nodes if n["status"] == "READY"]),
        "busy": len([n for n in nodes if n["status"] == "BUSY"]),
    }


@router.get("/api/nodes/{node_id}")
async def get_node(node_id: str):
    """특정 노드 상태"""
    conn = await pool.get(node_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Node not found")

    return conn.to_dict()


@router.post("/api/nodes/{node_id}/command")
async def send_command_to_node(node_id: str, request: dict):
    """특정 노드에 직접 명령 전송"""
    conn = await pool.get(node_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Node not found")

    command_id = str(uuid.uuid4())
    command = build_command(
        command_id=command_id,
        command_type=request.get("action", "PING"),
        target=request.get("target", {"type": "ALL_DEVICES"}),
        params=request.get("params", {}),
        priority=request.get("priority", "NORMAL"),
        timeout=request.get("timeout", 60),
    )

    success = await pool.send_to_node(node_id, command)

    return {"sent": success, "command_id": command_id, "node_id": node_id}


# ============================================================
# 브로드캐스트 API
# ============================================================


@router.post("/api/broadcast", response_model=BroadcastResponse)
async def broadcast_command(request: BroadcastRequest):
    """모든/지정 노드에 비디오 시청 명령 브로드캐스트"""
    broadcast_id = str(uuid.uuid4())[:8]
    errors = []
    sent_count = 0

    logger.info(f"[BROADCAST:{broadcast_id}] 시작: {request.video_url}")

    if request.target_node_ids:
        target_nodes = request.target_node_ids
    else:
        ready_nodes = pool.get_ready_nodes()
        target_nodes = [n.node_id for n in ready_nodes]

        if request.target_node_count > 0:
            target_nodes = target_nodes[: request.target_node_count]

    if not target_nodes:
        return BroadcastResponse(
            success=False,
            broadcast_id=broadcast_id,
            target_nodes=0,
            sent_nodes=0,
            errors=["No connected nodes available"],
        )

    command_id = str(uuid.uuid4())
    command = build_command(
        command_id=command_id,
        command_type="WATCH_VIDEO",
        target={"type": "ALL_DEVICES"},
        params={
            "video_url": request.video_url,
            "min_watch_seconds": request.duration_seconds,
            "broadcast_id": broadcast_id,
        },
        priority=request.priority,
        timeout=request.duration_seconds + 60,
    )

    for node_id in target_nodes:
        success = await pool.send_to_node(node_id, command)
        if success:
            sent_count += 1
            logger.info(f"[BROADCAST:{broadcast_id}] -> {node_id} 전송 완료")
        else:
            errors.append(f"Failed to send to {node_id}")
            logger.warning(f"[BROADCAST:{broadcast_id}] -> {node_id} 전송 실패")

    await broadcast_to_dashboards(
        {
            "type": "BROADCAST_STARTED",
            "broadcast_id": broadcast_id,
            "video_url": request.video_url,
            "target_nodes": len(target_nodes),
            "sent_nodes": sent_count,
        }
    )

    logger.info(f"[BROADCAST:{broadcast_id}] 완료: {sent_count}/{len(target_nodes)} 노드")

    return BroadcastResponse(
        success=sent_count > 0,
        broadcast_id=broadcast_id,
        target_nodes=len(target_nodes),
        sent_nodes=sent_count,
        errors=errors,
    )


# ============================================================
# 시스템 상태 API
# ============================================================


@router.get("/health")
async def health():
    """헬스체크"""
    config = get_config()
    nodes = pool.list_nodes()
    sb = get_supabase()

    return {
        "status": "ok",
        "protocol_version": config.protocol_version,
        "nodes_connected": len(nodes),
        "nodes_ready": len([n for n in nodes if n["status"] == "READY"]),
        "supabase_connected": sb is not None,
        "signature_verification": config.verify_signature,
    }


@router.get("/api/status")
async def system_status():
    """시스템 전체 상태"""
    sb = get_supabase()
    config = get_config()

    db_stats = {}
    if sb:
        try:
            result = sb.from_("system_status_overview").select("*").single().execute()
            if result.data:
                db_stats = result.data
        except Exception as e:
            logger.error(f"DB status 조회 실패: {e}")

    nodes = pool.list_nodes()

    return {
        "gateway": {
            "protocol_version": config.protocol_version,
            "uptime": "N/A",
            "memory_nodes": len(nodes),
        },
        "nodes": {
            "connected": len(nodes),
            "ready": len([n for n in nodes if n["status"] == "READY"]),
            "busy": len([n for n in nodes if n["status"] == "BUSY"]),
        },
        "database": db_stats,
    }
