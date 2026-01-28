"""
Database Operations
Supabase RPC 작업
"""

import logging
import uuid
from typing import Any, List, Optional

from .config import get_config

logger = logging.getLogger(__name__)

# Supabase 클라이언트 (Lazy Init)
_supabase_client: Optional[Any] = None
_supabase_available = False

try:
    from supabase import create_client

    _supabase_available = True
except ImportError:
    create_client = None
    logger.warning("supabase-py not installed. DB operations will be mocked.")


def get_supabase() -> Optional[Any]:
    """Supabase 클라이언트 (Lazy Init)"""
    global _supabase_client
    config = get_config()

    if _supabase_client is None and _supabase_available and config.supabase_url:
        try:
            _supabase_client = create_client(config.supabase_url, config.supabase_service_key)
            logger.info("Supabase 클라이언트 초기화 완료")
        except Exception as e:
            logger.error(f"Supabase 초기화 실패: {e}")
    return _supabase_client


async def db_get_node_secret(node_id: str) -> Optional[str]:
    """노드의 시크릿 키 조회 (DB)"""
    sb = get_supabase()
    config = get_config()

    if not sb:
        return config.node_shared_secret

    try:
        result = sb.rpc("get_node_secret", {"p_node_id": node_id}).execute()
        if result.data:
            return result.data
        return None
    except Exception as e:
        logger.error(f"[{node_id}] DB secret 조회 실패: {e}")
        return config.node_shared_secret


async def db_register_node_connection(
    node_id: str,
    session_id: str,
    hostname: str = None,
    ip_address: str = None,
    runner_version: str = None,
    capabilities: List[str] = None,
) -> dict:
    """노드 연결 등록 (DB)"""
    sb = get_supabase()
    if not sb:
        return {"success": True, "node_uuid": None, "is_new": False}

    try:
        result = sb.rpc(
            "register_node_connection",
            {
                "p_node_id": node_id,
                "p_ws_session_id": session_id,
                "p_hostname": hostname,
                "p_ip_address": ip_address,
                "p_runner_version": runner_version,
                "p_capabilities": capabilities or [],
            },
        ).execute()

        if result.data:
            return result.data
        return {"success": False, "error": "No response from DB"}
    except Exception as e:
        logger.error(f"[{node_id}] DB 연결 등록 실패: {e}")
        return {"success": False, "error": str(e)}


async def db_disconnect_node(node_id: str):
    """노드 연결 해제 (DB)"""
    sb = get_supabase()
    if not sb:
        return

    try:
        sb.rpc("disconnect_node", {"p_node_id": node_id}).execute()
    except Exception as e:
        logger.error(f"[{node_id}] DB 연결 해제 실패: {e}")


async def db_process_heartbeat(
    node_id: str,
    status: str,
    resources: dict,
    device_snapshot: list,
    active_tasks: int = 0,
    session_id: str = None,
) -> dict:
    """HEARTBEAT 처리 + Pull-based Push (DB)"""
    sb = get_supabase()
    if not sb:
        return {"success": True, "pending_commands": []}

    try:
        result = sb.rpc(
            "process_heartbeat",
            {
                "p_node_id": node_id,
                "p_status": status,
                "p_resources": resources,
                "p_device_snapshot": device_snapshot,
                "p_active_tasks": active_tasks,
                "p_ws_session_id": session_id,
            },
        ).execute()

        if result.data:
            return result.data
        return {"success": False, "pending_commands": []}
    except Exception as e:
        logger.error(f"[{node_id}] DB heartbeat 처리 실패: {e}")
        return {"success": False, "error": str(e), "pending_commands": []}


async def db_start_command(command_id: str) -> bool:
    """명령 시작 표시 (DB)"""
    sb = get_supabase()
    if not sb:
        return True

    try:
        result = sb.rpc("start_command", {"p_command_id": command_id}).execute()
        return result.data is True
    except Exception as e:
        logger.error(f"[{command_id}] DB 명령 시작 표시 실패: {e}")
        return False


async def db_complete_command(
    command_id: str, status: str, result: dict = None, error: str = None
) -> bool:
    """명령 완료 처리 (DB)"""
    sb = get_supabase()
    if not sb:
        return True

    try:
        sb.rpc(
            "complete_command",
            {"p_command_id": command_id, "p_status": status, "p_result": result, "p_error": error},
        ).execute()
        return True
    except Exception as e:
        logger.error(f"[{command_id}] DB 명령 완료 처리 실패: {e}")
        return False


async def db_enqueue_command(
    command_type: str,
    params: dict,
    target_node_id: str = None,
    target_spec: dict = None,
    priority: str = "NORMAL",
    scheduled_at: str = None,
    source_request_id: str = None,
    created_by: str = "api",
) -> Optional[str]:
    """명령 큐에 추가 (DB)"""
    sb = get_supabase()
    if not sb:
        return str(uuid.uuid4())

    try:
        result = sb.rpc(
            "enqueue_command",
            {
                "p_command_type": command_type,
                "p_params": params,
                "p_target_node_id": target_node_id,
                "p_target_spec": target_spec or {"type": "ALL_DEVICES"},
                "p_priority": priority,
                "p_scheduled_at": scheduled_at,
                "p_source_request_id": source_request_id,
                "p_created_by": created_by,
            },
        ).execute()

        return result.data
    except Exception as e:
        logger.error(f"DB 명령 추가 실패: {e}")
        return None
