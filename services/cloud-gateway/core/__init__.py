"""
Cloud Gateway Core Module
모듈화된 게이트웨이 핵심 컴포넌트
"""

from .config import Config, get_config
from .connection_pool import ConnectionPool, NodeConnection, pool
from .database import (
    db_complete_command,
    db_disconnect_node,
    db_enqueue_command,
    db_get_node_secret,
    db_process_heartbeat,
    db_register_node_connection,
    db_start_command,
    get_supabase,
)
from .protocol import (
    build_ack,
    build_command,
    build_error,
    build_heartbeat_ack,
    build_hello_ack,
    build_message,
    generate_signature,
    verify_signature,
)

__all__ = [
    # Config
    "Config",
    "get_config",
    # Connection Pool
    "ConnectionPool",
    "NodeConnection",
    "pool",
    # Database
    "get_supabase",
    "db_get_node_secret",
    "db_register_node_connection",
    "db_disconnect_node",
    "db_process_heartbeat",
    "db_start_command",
    "db_complete_command",
    "db_enqueue_command",
    # Protocol
    "build_message",
    "build_hello_ack",
    "build_heartbeat_ack",
    "build_ack",
    "build_error",
    "build_command",
    "generate_signature",
    "verify_signature",
]
