"""
Protocol v1.0
메시지 빌더 및 보안 함수
"""

import base64
import binascii
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone

from .config import get_config


def generate_signature(payload: dict, secret_key: str) -> str:
    """HMAC-SHA256 서명 생성"""
    payload_str = json.dumps(payload, sort_keys=True, separators=(",", ":"))

    try:
        key_bytes = base64.b64decode(secret_key)
    except (binascii.Error, ValueError):
        key_bytes = secret_key.encode("utf-8")

    signature = hmac.new(key_bytes, payload_str.encode("utf-8"), hashlib.sha256).hexdigest()
    return signature


def verify_signature(payload: dict, signature: str, secret_key: str) -> bool:
    """서명 검증"""
    expected = generate_signature(payload, secret_key)
    return hmac.compare_digest(expected, signature)


def build_message(msg_type: str, payload: dict) -> dict:
    """프로토콜 v1.0 메시지 빌드"""
    config = get_config()
    return {
        "version": config.protocol_version,
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
        "message_id": str(uuid.uuid4()),
        "type": msg_type,
        "payload": payload,
    }


def build_hello_ack(session_id: str, server_time: str = None) -> dict:
    """HELLO_ACK 메시지 빌드"""
    config = get_config()
    return {
        "type": "HELLO_ACK",
        "version": config.protocol_version,
        "timestamp": server_time or (datetime.now(timezone.utc).isoformat() + "Z"),
        "message_id": str(uuid.uuid4()),
        "payload": {
            "session_id": session_id,
            "heartbeat_interval": config.heartbeat_interval,
            "max_tasks": config.max_tasks_per_node,
        },
    }


def build_heartbeat_ack(server_time: str = None, pending_commands: list = None) -> dict:
    """HEARTBEAT_ACK 메시지 빌드 (Pull-based Push 포함)"""
    config = get_config()
    return {
        "type": "HEARTBEAT_ACK",
        "version": config.protocol_version,
        "timestamp": server_time or (datetime.now(timezone.utc).isoformat() + "Z"),
        "message_id": str(uuid.uuid4()),
        "payload": {"status": "OK", "commands": pending_commands or []},
    }


def build_ack(ack_message_id: str, status: str, reason: str = None) -> dict:
    """ACK 메시지 빌드"""
    payload = {"ack_message_id": ack_message_id, "status": status}
    if reason:
        payload["reason"] = reason
    return build_message("ACK", payload)


def build_error(error_code: str, error_message: str, related_id: str = None) -> dict:
    """ERROR 메시지 빌드"""
    payload = {"error_code": error_code, "error_message": error_message}
    if related_id:
        payload["related_message_id"] = related_id
    return build_message("ERROR", payload)


def build_command(
    command_id: str,
    command_type: str,
    target: dict,
    params: dict,
    priority: str = "NORMAL",
    timeout: int = 300,
) -> dict:
    """COMMAND 메시지 빌드"""
    return build_message(
        "COMMAND",
        {
            "command_id": command_id,
            "command_type": command_type,
            "priority": priority,
            "target": target,
            "params": params,
            "timeout_seconds": timeout,
            "retry_count": 1,
        },
    )
