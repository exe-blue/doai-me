"""
Monitoring & Observability API
관측/로그 시스템

Strategos의 요구사항:
\"디바이스 수, 실패율, 평균 작업시간, 허브/포트 라벨링\"
\"디바이스 수 급감 이벤트 감지 → Vultr에 즉시 알림\"

@author Axon (Builder)
@version 1.0.0
"""

from datetime import datetime, timedelta
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


# ==================== 응답 모델 ====================

class NodeMetrics(BaseModel):
    node_id: str
    node_name: str
    status: str
    connected_devices: int
    max_devices: int
    device_utilization: float
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    pending_jobs: int
    active_jobs: int
    completed_jobs_1h: int
    failed_jobs_1h: int
    success_rate_1h: float
    avg_processing_time_1h: float
    last_heartbeat: str
    seconds_since_heartbeat: float


# ==================== Endpoints ====================

@router.get("/nodes")
async def get_node_metrics(supabase=None):
    """
    노드별 상세 메트릭
    
    GET /monitoring/nodes
    
    Response:
    {
      "nodes": [
        {
          "node_id": "TITAN-01",
          "node_name": "Genesis",
          "status": "ONLINE",
          "connected_devices": 118,
          "device_utilization": 98.33,
          ...
        }
      ]
    }
    """
    # TODO: Supabase Depends() 추가
    from app import get_supabase_client
    supabase = get_supabase_client() if supabase is None else supabase
    
    try:
        # view_node_details 조회
        result = supabase.from_('view_node_details').select('*').execute()
        
        nodes = []
        for node in result.data:
            # 성공률 계산
            completed = node.get('completed_jobs_1h', 0)
            failed = node.get('failed_jobs_1h', 0)
            total = completed + failed
            success_rate = (completed / total * 100) if total > 0 else 100.0
            
            nodes.append({
                'node_id': node['node_id'],
                'node_name': node['node_name'],
                'status': node['status'],
                'connected_devices': node['connected_devices'] or 0,
                'max_devices': node['max_devices'],
                'device_utilization': node['device_utilization_percent'] or 0,
                'cpu_percent': float(node['cpu_percent'] or 0),
                'memory_percent': float(node['memory_percent'] or 0),
                'disk_percent': float(node['disk_percent'] or 0),
                'pending_jobs': node['pending_jobs'] or 0,
                'active_jobs': node['active_jobs'] or 0,
                'completed_jobs_1h': completed,
                'failed_jobs_1h': failed,
                'success_rate_1h': round(success_rate, 2),
                'avg_processing_time_1h': 0.0,  # TODO: 계산
                'last_heartbeat': node['last_heartbeat'],
                'seconds_since_heartbeat': node['seconds_since_heartbeat'] or 0
            })
        
        return {'success': True, 'nodes': nodes}
    
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/network")
async def get_network_mesh(supabase=None):
    """
    전체 네트워크 상태 집계
    
    GET /monitoring/network
    
    Response:
    {
      "total_nodes": 5,
      "online_nodes": 4,
      "online_percentage": 80.00,
      "total_connected_devices": 456,
      "total_device_capacity": 600,
      ...
    }
    """
    from app import get_supabase_client
    supabase = get_supabase_client() if supabase is None else supabase
    
    try:
        # view_network_mesh 조회
        result = supabase.from_('view_network_mesh').select('*').single().execute()
        
        return {
            'success': True,
            'network': result.data
        }
    
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/jobs")
async def get_job_metrics(supabase=None):
    """
    작업 큐 메트릭
    
    GET /monitoring/jobs
    
    Response:
    {
      "total_jobs": 1523,
      "pending": 45,
      "running": 12,
      "completed": 1421,
      "success_rate_1h": 98.50,
      "avg_processing_sec_1h": 12.5
    }
    """
    from app import get_supabase_client
    supabase = get_supabase_client() if supabase is None else supabase
    
    try:
        # view_job_summary 조회
        result = supabase.from_('view_job_summary').select('*').single().execute()
        
        return {
            'success': True,
            'jobs': result.data
        }
    
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/devices")
async def get_device_distribution(supabase=None):
    """
    디바이스 분포 및 허브/포트 라벨링
    
    GET /monitoring/devices
    
    Response:
    {
      "total_devices": 456,
      "by_node": {
        "TITAN-01": {"connected": 118, "capacity": 120, "utilization": 98.33},
        ...
      },
      "by_hub": {
        "USB_HUB_1": 30,
        "USB_HUB_2": 28,
        ...
      }
    }
    """
    from app import get_supabase_client
    supabase = get_supabase_client() if supabase is None else supabase
    
    try:
        # 노드별 디바이스 수
        nodes_result = supabase.from_('view_node_details')\
            .select('node_id, node_name, connected_devices, max_devices, device_utilization_percent')\
            .execute()
        
        by_node = {}
        total_devices = 0
        
        for node in nodes_result.data:
            node_id = node['node_id']
            connected = node['connected_devices'] or 0
            
            by_node[node_id] = {
                'node_name': node['node_name'],
                'connected': connected,
                'capacity': node['max_devices'],
                'utilization': node['device_utilization_percent'] or 0
            }
            
            total_devices += connected
        
        # TODO: 허브/포트 라벨링 (ADB 상세 정보 필요)
        by_hub = {}
        
        return {
            'success': True,
            'total_devices': total_devices,
            'by_node': by_node,
            'by_hub': by_hub
        }
    
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/alerts")
async def get_recent_alerts(supabase=None, hours: int = 24):
    """
    최근 알림 조회
    
    GET /monitoring/alerts?hours=24
    
    Response:
    {
      "alerts": [
        {
          "timestamp": "2026-01-02T10:00:00Z",
          "severity": "CRITICAL",
          "type": "device_drop",
          "node_id": "TITAN-01",
          "message": "디바이스 급감: 120 → 78 (-35%)",
          "auto_recovery_triggered": true
        }
      ]
    }
    """
    from app import get_supabase_client
    supabase = get_supabase_client() if supabase is None else supabase
    
    try:
        # auto_recovery_log에서 최근 알림 조회
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        result = supabase.table('auto_recovery_log')\
            .select('*, auto_recovery_rules!inner(rule_name, recovery_level)')\
            .gte('triggered_at', cutoff.isoformat())\
            .order('triggered_at', desc=True)\
            .execute()
        
        alerts = []
        for log in result.data:
            condition = log.get('trigger_condition', {})
            
            alerts.append({
                'timestamp': log['triggered_at'],
                'severity': 'CRITICAL' if log['auto_recovery_rules']['recovery_level'] == 'service' else 'WARNING',
                'type': log['auto_recovery_rules']['rule_name'],
                'node_id': log['node_id'],
                'message': f"디바이스 변화: {condition.get('device_count_before')} → {condition.get('device_count_after')}",
                'auto_recovery_triggered': log['executed'],
                'skipped_reason': log.get('skipped_reason')
            })
        
        return {
            'success': True,
            'alerts': alerts
        }
    
    except Exception as e:
        raise HTTPException(500, str(e))
