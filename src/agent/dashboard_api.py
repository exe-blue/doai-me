"""
실시간 대시보드 WebSocket API

600대 디바이스의 실시간 상태를 WebSocket으로 제공합니다.

기능:
- 디바이스 실시간 상태 스트리밍
- 6대 활동 현황
- 발견물 피드 (알림)
- 폰보드 건강 상태
- 요청 파이프라인 모니터링
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import weakref

try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect, APIRouter
    from fastapi.responses import JSONResponse
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False
    WebSocket = Any
    WebSocketDisconnect = Exception

from src.agent.scheduler import get_scheduler, DeviceScheduler
from src.agent.logging_system import get_activity_logger, ActivityLogger
from src.agent.rest_timing import get_rest_timing_manager

logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    """WebSocket 메시지 타입"""
    # 상태 업데이트
    DEVICE_STATUS = "device_status"
    POOL_STATUS = "pool_status"
    ACTIVITY_STATUS = "activity_status"
    
    # 이벤트
    DISCOVERY = "discovery"
    ALERT = "alert"
    ERROR = "error"
    
    # 통계
    STATS = "stats"
    LEADERBOARD = "leaderboard"
    
    # 요청 관련
    BATCH_UPDATE = "batch_update"
    REQUEST_STATUS = "request_status"


@dataclass
class DashboardMessage:
    """대시보드 메시지"""
    type: MessageType
    data: Dict[str, Any]
    timestamp: str = ""
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()
    
    def to_json(self) -> str:
        return json.dumps({
            "type": self.type.value,
            "data": self.data,
            "timestamp": self.timestamp,
        }, ensure_ascii=False)


class ConnectionManager:
    """
    WebSocket 연결 관리자
    """
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket) -> None:
        """클라이언트 연결"""
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"새 WebSocket 연결 (총 {len(self.active_connections)}개)")
    
    async def disconnect(self, websocket: WebSocket) -> None:
        """클라이언트 연결 해제"""
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"WebSocket 연결 해제 (총 {len(self.active_connections)}개)")
    
    async def broadcast(self, message: DashboardMessage) -> None:
        """모든 클라이언트에 메시지 전송"""
        if not self.active_connections:
            return
        
        json_message = message.to_json()
        disconnected = set()
        
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json_message)
            except Exception:
                disconnected.add(connection)
        
        # 끊어진 연결 정리
        async with self._lock:
            self.active_connections -= disconnected
    
    async def send_to_client(
        self,
        websocket: WebSocket,
        message: DashboardMessage
    ) -> None:
        """특정 클라이언트에 메시지 전송"""
        try:
            await websocket.send_text(message.to_json())
        except Exception:
            await self.disconnect(websocket)


class DashboardDataProvider:
    """
    대시보드 데이터 제공자
    
    각종 상태 데이터를 수집하고 제공합니다.
    """
    
    def __init__(
        self,
        scheduler: Optional[DeviceScheduler] = None,
        activity_logger: Optional[ActivityLogger] = None
    ):
        self.scheduler = scheduler or get_scheduler()
        self.activity_logger = activity_logger or get_activity_logger()
        self.rest_manager = get_rest_timing_manager()
        self.logger = logging.getLogger(__name__)
    
    def get_device_grid_data(self) -> Dict[str, Any]:
        """
        600대 디바이스 그리드 데이터
        
        30개 폰보드 x 20대 형태
        """
        devices = self.scheduler.get_all_devices()
        
        grid = {}
        for board_id in range(1, 31):
            board_devices = []
            for device in devices.values():
                if device.phone_board_id == board_id:
                    board_devices.append({
                        "id": device.device_id,
                        "slot": device.slot_in_board,
                        "status": device.status.value,
                        "activity": device.current_activity,
                        "errors": device.consecutive_errors,
                    })
            
            # 슬롯 순서로 정렬
            board_devices.sort(key=lambda x: x["slot"])
            grid[f"board_{board_id}"] = board_devices
        
        return grid
    
    def get_pool_status(self) -> Dict[str, Any]:
        """풀 상태"""
        return self.scheduler.get_pool_status()
    
    def get_activity_distribution(self) -> Dict[str, Any]:
        """
        6대 활동 현황 (파이차트 데이터)
        """
        pool_status = self.scheduler.get_pool_status()
        
        activity_counts = pool_status.get("activity_assignments", {})
        total_active = sum(activity_counts.values())
        
        distribution = []
        for activity, count in activity_counts.items():
            percent = (count / total_active * 100) if total_active > 0 else 0
            distribution.append({
                "activity": activity,
                "count": count,
                "percent": round(percent, 1),
            })
        
        return {
            "distribution": distribution,
            "total_active": total_active,
        }
    
    def get_recent_discoveries(self, limit: int = 20) -> List[Dict]:
        """최근 발견물"""
        discoveries = self.activity_logger.get_recent_discoveries(limit=limit)
        return [d.to_dict() for d in discoveries]
    
    def get_board_health(self) -> Dict[int, Dict]:
        """폰보드 건강 상태"""
        return self.scheduler.get_board_health()
    
    def get_leaderboard(self) -> Dict[str, Any]:
        """
        에이전트 리더보드
        
        - 가장 많이 발견한 디바이스
        - 가장 오래 가동 중인 디바이스
        - 에러 없이 가장 오래 가동 중인 디바이스
        """
        devices = self.scheduler.get_all_devices()
        
        # 태스크 완료 수 기준
        by_tasks = sorted(
            devices.values(),
            key=lambda d: d.tasks_completed_today,
            reverse=True
        )[:10]
        
        # 시청 시간 기준
        by_watch_time = sorted(
            devices.values(),
            key=lambda d: d.total_watch_time_today,
            reverse=True
        )[:10]
        
        # 에러 없이 가동 중인 디바이스
        error_free = [
            d for d in devices.values()
            if d.consecutive_errors == 0 and d.status.value == "active"
        ]
        
        return {
            "top_by_tasks": [
                {"device_id": d.device_id, "tasks": d.tasks_completed_today}
                for d in by_tasks
            ],
            "top_by_watch_time": [
                {"device_id": d.device_id, "watch_time": d.total_watch_time_today}
                for d in by_watch_time
            ],
            "error_free_count": len(error_free),
        }
    
    def get_time_intensity_status(self) -> Dict[str, Any]:
        """시간대별 활동 강도 상태"""
        status = self.rest_manager.get_status()
        return {
            "current_intensity": status["current_intensity"],
            "recommended_active": status["recommended_devices"],
            "hour": datetime.now().hour,
        }
    
    def get_activity_summary(self) -> Dict[str, Any]:
        """활동 요약"""
        return self.activity_logger.get_activity_summary()
    
    def get_stats(self) -> Dict[str, Any]:
        """전체 통계"""
        logger_stats = self.activity_logger.get_stats()
        pool_status = self.scheduler.get_pool_status()
        time_status = self.get_time_intensity_status()
        
        return {
            "devices": {
                "total": pool_status["total"],
                "active": pool_status["pools"]["active"],
                "reserve": pool_status["pools"]["reserve"],
                "maintenance": pool_status["pools"]["maintenance"],
            },
            "activities": logger_stats,
            "time": time_status,
            "timestamp": datetime.now().isoformat(),
        }


class DashboardBroadcaster:
    """
    대시보드 데이터 브로드캐스터
    
    주기적으로 데이터를 수집하고 WebSocket으로 전송합니다.
    """
    
    def __init__(
        self,
        connection_manager: ConnectionManager,
        data_provider: DashboardDataProvider
    ):
        self.connection_manager = connection_manager
        self.data_provider = data_provider
        self.logger = logging.getLogger(__name__)
        
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self, interval: float = 2.0) -> None:
        """브로드캐스트 시작"""
        self._running = True
        self._task = asyncio.create_task(self._broadcast_loop(interval))
        self.logger.info(f"대시보드 브로드캐스터 시작 (간격: {interval}초)")
    
    async def stop(self) -> None:
        """브로드캐스트 중지"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.logger.info("대시보드 브로드캐스터 중지")
    
    async def _broadcast_loop(self, interval: float) -> None:
        """브로드캐스트 루프"""
        while self._running:
            try:
                # 풀 상태
                await self._broadcast_pool_status()
                
                # 활동 분배
                await self._broadcast_activity_distribution()
                
                # 리더보드 (10초마다)
                if int(datetime.now().timestamp()) % 10 == 0:
                    await self._broadcast_leaderboard()
                
                await asyncio.sleep(interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"브로드캐스트 오류: {e}")
                await asyncio.sleep(interval)
    
    async def _broadcast_pool_status(self) -> None:
        """풀 상태 브로드캐스트"""
        data = self.data_provider.get_pool_status()
        await self.connection_manager.broadcast(
            DashboardMessage(type=MessageType.POOL_STATUS, data=data)
        )
    
    async def _broadcast_activity_distribution(self) -> None:
        """활동 분배 브로드캐스트"""
        data = self.data_provider.get_activity_distribution()
        await self.connection_manager.broadcast(
            DashboardMessage(type=MessageType.ACTIVITY_STATUS, data=data)
        )
    
    async def _broadcast_leaderboard(self) -> None:
        """리더보드 브로드캐스트"""
        data = self.data_provider.get_leaderboard()
        await self.connection_manager.broadcast(
            DashboardMessage(type=MessageType.LEADERBOARD, data=data)
        )
    
    async def broadcast_discovery(self, discovery_data: Dict) -> None:
        """발견 이벤트 브로드캐스트"""
        await self.connection_manager.broadcast(
            DashboardMessage(type=MessageType.DISCOVERY, data=discovery_data)
        )
    
    async def broadcast_alert(
        self,
        alert_type: str,
        message: str,
        data: Optional[Dict] = None
    ) -> None:
        """알림 브로드캐스트"""
        await self.connection_manager.broadcast(
            DashboardMessage(
                type=MessageType.ALERT,
                data={
                    "alert_type": alert_type,
                    "message": message,
                    "data": data or {},
                }
            )
        )


def create_dashboard_router() -> "APIRouter":
    """
    대시보드 API 라우터 생성
    """
    if not HAS_FASTAPI:
        raise ImportError("FastAPI가 설치되어 있지 않습니다.")
    
    router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
    
    # 싱글톤 인스턴스
    connection_manager = ConnectionManager()
    data_provider = DashboardDataProvider()
    broadcaster = DashboardBroadcaster(connection_manager, data_provider)
    
    @router.on_event("startup")
    async def startup():
        await broadcaster.start()
    
    @router.on_event("shutdown")
    async def shutdown():
        await broadcaster.stop()
    
    # ==================== WebSocket ====================
    
    @router.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        """실시간 대시보드 WebSocket"""
        await connection_manager.connect(websocket)
        
        try:
            # 초기 데이터 전송
            initial_data = data_provider.get_stats()
            await connection_manager.send_to_client(
                websocket,
                DashboardMessage(type=MessageType.STATS, data=initial_data)
            )
            
            # 클라이언트 메시지 수신 대기
            while True:
                data = await websocket.receive_text()
                # 클라이언트 요청 처리
                await handle_client_message(websocket, data, data_provider, connection_manager)
                
        except WebSocketDisconnect:
            await connection_manager.disconnect(websocket)
        except Exception as e:
            logger.error(f"WebSocket 오류: {e}")
            await connection_manager.disconnect(websocket)
    
    # ==================== REST API ====================
    
    @router.get("/stats")
    async def get_stats():
        """전체 통계"""
        return data_provider.get_stats()
    
    @router.get("/devices/grid")
    async def get_device_grid():
        """디바이스 그리드 데이터"""
        return data_provider.get_device_grid_data()
    
    @router.get("/pool-status")
    async def get_pool_status():
        """풀 상태"""
        return data_provider.get_pool_status()
    
    @router.get("/activities")
    async def get_activities():
        """활동 분배 현황"""
        return data_provider.get_activity_distribution()
    
    @router.get("/discoveries")
    async def get_discoveries(limit: int = 20):
        """최근 발견물"""
        return data_provider.get_recent_discoveries(limit=limit)
    
    @router.get("/leaderboard")
    async def get_leaderboard():
        """리더보드"""
        return data_provider.get_leaderboard()
    
    @router.get("/boards/health")
    async def get_board_health():
        """폰보드 건강 상태"""
        return data_provider.get_board_health()
    
    @router.get("/activity-summary")
    async def get_activity_summary():
        """활동 요약"""
        return data_provider.get_activity_summary()
    
    return router


async def handle_client_message(
    websocket: WebSocket,
    message: str,
    data_provider: DashboardDataProvider,
    connection_manager: ConnectionManager
) -> None:
    """클라이언트 메시지 처리"""
    try:
        data = json.loads(message)
        action = data.get("action")
        
        if action == "get_device_detail":
            device_id = data.get("device_id")
            device = get_scheduler().get_device(device_id)
            if device:
                await connection_manager.send_to_client(
                    websocket,
                    DashboardMessage(
                        type=MessageType.DEVICE_STATUS,
                        data=device.to_dict()
                    )
                )
        
        elif action == "get_board_detail":
            board_id = data.get("board_id")
            devices = get_scheduler().get_devices_by_board(board_id)
            await connection_manager.send_to_client(
                websocket,
                DashboardMessage(
                    type=MessageType.DEVICE_STATUS,
                    data={
                        "board_id": board_id,
                        "devices": [d.to_dict() for d in devices]
                    }
                )
            )
        
        elif action == "refresh_stats":
            await connection_manager.send_to_client(
                websocket,
                DashboardMessage(
                    type=MessageType.STATS,
                    data=data_provider.get_stats()
                )
            )
    
    except json.JSONDecodeError:
        logger.warning(f"잘못된 JSON 메시지: {message}")
    except Exception as e:
        logger.error(f"메시지 처리 오류: {e}")


# 싱글톤 인스턴스
_connection_manager: Optional[ConnectionManager] = None
_data_provider: Optional[DashboardDataProvider] = None
_broadcaster: Optional[DashboardBroadcaster] = None


def get_connection_manager() -> ConnectionManager:
    """연결 관리자 싱글톤"""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = ConnectionManager()
    return _connection_manager


def get_data_provider() -> DashboardDataProvider:
    """데이터 제공자 싱글톤"""
    global _data_provider
    if _data_provider is None:
        _data_provider = DashboardDataProvider()
    return _data_provider


def get_broadcaster() -> DashboardBroadcaster:
    """브로드캐스터 싱글톤"""
    global _broadcaster
    if _broadcaster is None:
        _broadcaster = DashboardBroadcaster(
            get_connection_manager(),
            get_data_provider()
        )
    return _broadcaster

