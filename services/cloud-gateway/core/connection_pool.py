"""
Connection Pool
노드 연결 풀 관리
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import WebSocket

from .config import get_config

logger = logging.getLogger(__name__)


class NodeConnection:
    """노드 연결 정보"""

    def __init__(self, node_id: str, websocket: WebSocket, session_id: str):
        self.node_id = node_id
        self.websocket = websocket
        self.session_id = session_id
        self.node_uuid: Optional[str] = None
        self.connected_at = datetime.now(timezone.utc)
        self.last_heartbeat = datetime.now(timezone.utc)
        self.device_count = 0
        self.status = "READY"
        self.active_tasks = 0
        self.hostname = ""
        self.ip_address = ""
        self.capabilities: List[str] = []
        self.resources: Dict = {}
        self.runner_version = ""
        self.secret_key: Optional[str] = None

    def to_dict(self) -> dict:
        """노드 정보를 딕셔너리로 반환"""
        return {
            "node_id": self.node_id,
            "node_uuid": self.node_uuid,
            "session_id": self.session_id,
            "connected_at": self.connected_at.isoformat(),
            "last_heartbeat": self.last_heartbeat.isoformat(),
            "device_count": self.device_count,
            "status": self.status,
            "active_tasks": self.active_tasks,
            "hostname": self.hostname,
            "ip_address": self.ip_address,
            "capabilities": self.capabilities,
            "runner_version": self.runner_version,
        }


class ConnectionPool:
    """노드 연결 풀 관리"""

    def __init__(self):
        self._nodes: Dict[str, NodeConnection] = {}
        self._lock = asyncio.Lock()
        self._on_disconnect_callbacks: List = []

    def on_disconnect(self, callback):
        """연결 해제 시 콜백 등록"""
        self._on_disconnect_callbacks.append(callback)

    async def add(self, node_id: str, websocket: WebSocket, session_id: str) -> NodeConnection:
        """노드 연결 추가"""
        async with self._lock:
            if node_id in self._nodes:
                old = self._nodes[node_id]
                try:
                    await old.websocket.close()
                except Exception:
                    pass
                logger.warning(f"[{node_id}] 기존 연결 대체")

            conn = NodeConnection(node_id, websocket, session_id)
            self._nodes[node_id] = conn
            logger.info(f"[{node_id}] 연결됨 (총 {len(self._nodes)}개 노드)")
            return conn

    async def remove(self, node_id: str):
        """노드 연결 제거"""
        async with self._lock:
            if node_id in self._nodes:
                del self._nodes[node_id]
                logger.info(f"[{node_id}] 연결 해제 (총 {len(self._nodes)}개 노드)")

        for callback in self._on_disconnect_callbacks:
            try:
                await callback(node_id)
            except Exception as e:
                logger.error(f"Disconnect callback error: {e}")

    async def get(self, node_id: str) -> Optional[NodeConnection]:
        """노드 연결 조회"""
        async with self._lock:
            return self._nodes.get(node_id)

    async def update_heartbeat(self, node_id: str, device_count: int = 0, status: str = "READY"):
        """하트비트 업데이트"""
        async with self._lock:
            if node_id in self._nodes:
                self._nodes[node_id].last_heartbeat = datetime.now(timezone.utc)
                self._nodes[node_id].device_count = device_count
                self._nodes[node_id].status = status

    async def update_status(self, node_id: str, status: str, active_tasks: int = 0):
        """상태 업데이트"""
        async with self._lock:
            if node_id in self._nodes:
                self._nodes[node_id].status = status
                self._nodes[node_id].active_tasks = active_tasks

    async def send_to_node(self, node_id: str, message: dict) -> bool:
        """특정 노드에 메시지 전송"""
        async with self._lock:
            conn = self._nodes.get(node_id)

        if not conn:
            return False

        try:
            await conn.websocket.send_json(message)
            return True
        except Exception as e:
            logger.error(f"[{node_id}] 전송 실패: {e}")
            return False

    async def broadcast(self, message: dict):
        """모든 노드에 브로드캐스트"""
        async with self._lock:
            node_ids = list(self._nodes.keys())

        for node_id in node_ids:
            await self.send_to_node(node_id, message)

    def list_nodes(self) -> List[dict]:
        """연결된 노드 목록"""
        return [conn.to_dict() for conn in self._nodes.values()]

    def get_ready_nodes(self) -> List[NodeConnection]:
        """READY 상태의 노드들 반환"""
        config = get_config()
        return [
            conn
            for conn in self._nodes.values()
            if conn.status == "READY" and conn.active_tasks < config.max_tasks_per_node
        ]

    @property
    def node_count(self) -> int:
        """연결된 노드 수"""
        return len(self._nodes)

    def get_nodes_snapshot(self) -> List[NodeConnection]:
        """노드 스냅샷 (순회용)"""
        return list(self._nodes.values())


# 싱글톤 인스턴스
pool = ConnectionPool()
