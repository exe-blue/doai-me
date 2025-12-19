"""
활동 로깅 및 하트비트 시스템

에이전트 활동을 추적하고 서버에 기록합니다.

테이블 구조:
- devices: 디바이스 기본 정보
- activity_logs: 활동 로그
- task_results: 태스크 결과
- heartbeats: 하트비트 기록
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import deque
from uuid import uuid4
import threading

logger = logging.getLogger(__name__)


class LogLevel(str, Enum):
    """로그 레벨"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class ActivityLog:
    """활동 로그"""
    id: str = field(default_factory=lambda: str(uuid4()))
    device_id: int = 0
    activity_type: str = ""
    started_at: datetime = field(default_factory=datetime.now)
    ended_at: Optional[datetime] = None
    status: str = "in_progress"   # in_progress, completed, error, cancelled
    items_processed: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "device_id": self.device_id,
            "activity_type": self.activity_type,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "status": self.status,
            "items_processed": self.items_processed,
            "metadata": self.metadata,
        }


@dataclass
class TaskResult:
    """태스크 결과"""
    id: str = field(default_factory=lambda: str(uuid4()))
    activity_log_id: str = ""
    task_type: str = ""
    success: bool = False
    result_data: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "activity_log_id": self.activity_log_id,
            "task_type": self.task_type,
            "success": self.success,
            "result_data": self.result_data,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class HeartbeatRecord:
    """하트비트 기록"""
    id: str = field(default_factory=lambda: str(uuid4()))
    device_id: int = 0
    timestamp: datetime = field(default_factory=datetime.now)
    metrics: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "device_id": self.device_id,
            "timestamp": self.timestamp.isoformat(),
            "metrics": self.metrics,
        }


@dataclass
class DiscoveryData:
    """발견 데이터 (활동 결과물)"""
    id: str = field(default_factory=lambda: str(uuid4()))
    activity_type: str = ""
    device_id: int = 0
    data_type: str = ""           # trending_video, rising_star, challenge, remix_idea, etc.
    content: Dict[str, Any] = field(default_factory=dict)
    discovered_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "activity_type": self.activity_type,
            "device_id": self.device_id,
            "data_type": self.data_type,
            "content": self.content,
            "discovered_at": self.discovered_at.isoformat(),
        }


class ActivityLogger:
    """
    활동 로거
    
    에이전트 활동을 추적하고 로그를 관리합니다.
    """
    
    def __init__(self, max_buffer_size: int = 1000):
        """
        Args:
            max_buffer_size: 버퍼 최대 크기 (이후 Supabase에 저장)
        """
        self.max_buffer_size = max_buffer_size
        self.logger = logging.getLogger(__name__)
        self._lock = threading.Lock()
        
        # 버퍼 (메모리 저장, 추후 Supabase 연동)
        self._activity_logs: Dict[str, ActivityLog] = {}
        self._task_results: deque = deque(maxlen=max_buffer_size)
        self._heartbeats: deque = deque(maxlen=max_buffer_size)
        self._discoveries: deque = deque(maxlen=max_buffer_size)
        
        # 디바이스별 현재 활동
        self._current_activities: Dict[int, str] = {}
        
        # 통계
        self._stats = {
            "total_activities": 0,
            "total_tasks": 0,
            "total_heartbeats": 0,
            "total_discoveries": 0,
            "success_count": 0,
            "error_count": 0,
        }
    
    # ==================== 활동 로깅 ====================
    
    def start_activity(
        self,
        device_id: int,
        activity_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ActivityLog:
        """
        활동 시작 기록
        
        Args:
            device_id: 디바이스 ID
            activity_type: 활동 타입
            metadata: 추가 메타데이터
            
        Returns:
            생성된 ActivityLog
        """
        with self._lock:
            log = ActivityLog(
                device_id=device_id,
                activity_type=activity_type,
                metadata=metadata or {},
            )
            
            self._activity_logs[log.id] = log
            self._current_activities[device_id] = log.id
            self._stats["total_activities"] += 1
            
            self.logger.debug(
                f"[Device {device_id}] 활동 시작: {activity_type}"
            )
            
            return log
    
    def end_activity(
        self,
        activity_id: str,
        status: str = "completed",
        items_processed: int = 0,
        metadata_update: Optional[Dict[str, Any]] = None
    ) -> Optional[ActivityLog]:
        """
        활동 종료 기록
        
        Args:
            activity_id: 활동 로그 ID
            status: 종료 상태 (completed, error, cancelled)
            items_processed: 처리된 항목 수
            metadata_update: 추가할 메타데이터
            
        Returns:
            업데이트된 ActivityLog
        """
        with self._lock:
            if activity_id not in self._activity_logs:
                self.logger.warning(f"활동 로그 없음: {activity_id}")
                return None
            
            log = self._activity_logs[activity_id]
            log.ended_at = datetime.now()
            log.status = status
            log.items_processed = items_processed
            
            if metadata_update:
                log.metadata.update(metadata_update)
            
            # 디바이스 현재 활동 해제
            if log.device_id in self._current_activities:
                if self._current_activities[log.device_id] == activity_id:
                    del self._current_activities[log.device_id]
            
            if status == "completed":
                self._stats["success_count"] += 1
            elif status == "error":
                self._stats["error_count"] += 1
            
            duration = (log.ended_at - log.started_at).total_seconds()
            self.logger.debug(
                f"[Device {log.device_id}] 활동 종료: {log.activity_type} "
                f"({status}, {duration:.1f}초, {items_processed}개 처리)"
            )
            
            return log
    
    def get_current_activity(self, device_id: int) -> Optional[ActivityLog]:
        """디바이스의 현재 활동 조회"""
        with self._lock:
            if device_id not in self._current_activities:
                return None
            
            activity_id = self._current_activities[device_id]
            return self._activity_logs.get(activity_id)
    
    # ==================== 태스크 결과 로깅 ====================
    
    def log_task_result(
        self,
        activity_log_id: str,
        task_type: str,
        success: bool,
        result_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> TaskResult:
        """
        태스크 결과 기록
        
        Args:
            activity_log_id: 활동 로그 ID
            task_type: 태스크 타입
            success: 성공 여부
            result_data: 결과 데이터
            error_message: 에러 메시지
            
        Returns:
            생성된 TaskResult
        """
        with self._lock:
            result = TaskResult(
                activity_log_id=activity_log_id,
                task_type=task_type,
                success=success,
                result_data=result_data or {},
                error_message=error_message,
            )
            
            self._task_results.append(result)
            self._stats["total_tasks"] += 1
            
            return result
    
    # ==================== 하트비트 ====================
    
    def record_heartbeat(
        self,
        device_id: int,
        metrics: Optional[Dict[str, Any]] = None
    ) -> HeartbeatRecord:
        """
        하트비트 기록
        
        Args:
            device_id: 디바이스 ID
            metrics: 디바이스 메트릭 (CPU, 메모리 등)
            
        Returns:
            생성된 HeartbeatRecord
        """
        with self._lock:
            record = HeartbeatRecord(
                device_id=device_id,
                metrics=metrics or {},
            )
            
            self._heartbeats.append(record)
            self._stats["total_heartbeats"] += 1
            
            return record
    
    # ==================== 발견 데이터 ====================
    
    def log_discovery(
        self,
        activity_type: str,
        device_id: int,
        data_type: str,
        content: Dict[str, Any]
    ) -> DiscoveryData:
        """
        발견 데이터 기록
        
        Args:
            activity_type: 활동 타입
            device_id: 디바이스 ID
            data_type: 데이터 타입 (trending_video, rising_star, etc.)
            content: 발견 내용
            
        Returns:
            생성된 DiscoveryData
        """
        with self._lock:
            discovery = DiscoveryData(
                activity_type=activity_type,
                device_id=device_id,
                data_type=data_type,
                content=content,
            )
            
            self._discoveries.append(discovery)
            self._stats["total_discoveries"] += 1
            
            self.logger.info(
                f"🌟 발견: {data_type} by Device {device_id}"
            )
            
            return discovery
    
    # ==================== 조회 ====================
    
    def get_activity_logs(
        self,
        device_id: Optional[int] = None,
        activity_type: Optional[str] = None,
        status: Optional[str] = None,
        since: Optional[datetime] = None,
        limit: int = 100
    ) -> List[ActivityLog]:
        """활동 로그 조회"""
        with self._lock:
            logs = list(self._activity_logs.values())
            
            if device_id is not None:
                logs = [l for l in logs if l.device_id == device_id]
            
            if activity_type:
                logs = [l for l in logs if l.activity_type == activity_type]
            
            if status:
                logs = [l for l in logs if l.status == status]
            
            if since:
                logs = [l for l in logs if l.started_at >= since]
            
            # 최신순 정렬
            logs.sort(key=lambda x: x.started_at, reverse=True)
            
            return logs[:limit]
    
    def get_recent_discoveries(
        self,
        data_type: Optional[str] = None,
        limit: int = 50
    ) -> List[DiscoveryData]:
        """최근 발견 데이터 조회"""
        with self._lock:
            discoveries = list(self._discoveries)
            
            if data_type:
                discoveries = [d for d in discoveries if d.data_type == data_type]
            
            # 최신순 정렬
            discoveries.sort(key=lambda x: x.discovered_at, reverse=True)
            
            return discoveries[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        with self._lock:
            return {
                **self._stats,
                "active_activities": len(self._current_activities),
                "buffer_sizes": {
                    "activity_logs": len(self._activity_logs),
                    "task_results": len(self._task_results),
                    "heartbeats": len(self._heartbeats),
                    "discoveries": len(self._discoveries),
                },
            }
    
    def get_activity_summary(
        self,
        since: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """활동 요약 조회"""
        if since is None:
            since = datetime.now() - timedelta(hours=24)
        
        with self._lock:
            logs = [
                l for l in self._activity_logs.values()
                if l.started_at >= since
            ]
            
            summary = {
                "total": len(logs),
                "completed": len([l for l in logs if l.status == "completed"]),
                "errors": len([l for l in logs if l.status == "error"]),
                "in_progress": len([l for l in logs if l.status == "in_progress"]),
                "by_activity": {},
                "by_device": {},
            }
            
            for log in logs:
                # 활동별
                if log.activity_type not in summary["by_activity"]:
                    summary["by_activity"][log.activity_type] = 0
                summary["by_activity"][log.activity_type] += 1
                
                # 디바이스별
                if log.device_id not in summary["by_device"]:
                    summary["by_device"][log.device_id] = 0
                summary["by_device"][log.device_id] += 1
            
            return summary
    
    # ==================== 데이터 내보내기 ====================
    
    def export_to_json(self, filepath: str) -> None:
        """JSON 파일로 내보내기"""
        with self._lock:
            data = {
                "exported_at": datetime.now().isoformat(),
                "stats": self._stats,
                "activity_logs": [l.to_dict() for l in self._activity_logs.values()],
                "task_results": [r.to_dict() for r in self._task_results],
                "discoveries": [d.to_dict() for d in self._discoveries],
            }
            
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"데이터 내보내기 완료: {filepath}")
    
    def clear_old_data(self, days: int = 7) -> int:
        """오래된 데이터 정리"""
        cutoff = datetime.now() - timedelta(days=days)
        cleared = 0
        
        with self._lock:
            # 활동 로그 정리
            old_ids = [
                log_id for log_id, log in self._activity_logs.items()
                if log.ended_at and log.ended_at < cutoff
            ]
            
            for log_id in old_ids:
                del self._activity_logs[log_id]
                cleared += 1
            
            self.logger.info(f"{cleared}개 오래된 활동 로그 정리됨")
            
        return cleared


class HeartbeatManager:
    """
    하트비트 관리자
    
    600대 디바이스의 하트비트를 관리합니다.
    """
    
    def __init__(
        self,
        activity_logger: ActivityLogger,
        interval: int = 300  # 5분
    ):
        self.logger_instance = activity_logger
        self.interval = interval
        self.logger = logging.getLogger(__name__)
        
        self._device_heartbeats: Dict[int, datetime] = {}
        self._lock = threading.Lock()
    
    def receive_heartbeat(
        self,
        device_id: int,
        metrics: Optional[Dict[str, Any]] = None
    ) -> None:
        """하트비트 수신"""
        with self._lock:
            self._device_heartbeats[device_id] = datetime.now()
        
        # 로거에 기록
        self.logger_instance.record_heartbeat(device_id, metrics)
    
    def get_offline_devices(
        self,
        timeout_seconds: int = 600  # 10분
    ) -> List[int]:
        """오프라인 디바이스 목록"""
        cutoff = datetime.now() - timedelta(seconds=timeout_seconds)
        
        with self._lock:
            return [
                device_id for device_id, last_heartbeat
                in self._device_heartbeats.items()
                if last_heartbeat < cutoff
            ]
    
    def get_heartbeat_status(self) -> Dict[str, Any]:
        """하트비트 상태"""
        with self._lock:
            now = datetime.now()
            timeout_10min = now - timedelta(minutes=10)
            timeout_5min = now - timedelta(minutes=5)
            
            online = 0
            warning = 0
            offline = 0
            
            for device_id, last_heartbeat in self._device_heartbeats.items():
                if last_heartbeat >= timeout_5min:
                    online += 1
                elif last_heartbeat >= timeout_10min:
                    warning += 1
                else:
                    offline += 1
            
            return {
                "total_registered": len(self._device_heartbeats),
                "online": online,
                "warning": warning,
                "offline": offline,
            }


# 싱글톤 인스턴스
_logger_instance: Optional[ActivityLogger] = None
_heartbeat_manager: Optional[HeartbeatManager] = None


def get_activity_logger() -> ActivityLogger:
    """활동 로거 싱글톤 인스턴스"""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = ActivityLogger()
    return _logger_instance


def get_heartbeat_manager() -> HeartbeatManager:
    """하트비트 관리자 싱글톤 인스턴스"""
    global _heartbeat_manager
    if _heartbeat_manager is None:
        _heartbeat_manager = HeartbeatManager(get_activity_logger())
    return _heartbeat_manager

