"""
Emergency Recovery API
OOB (Out-of-Band) Recovery System

오리온의 지시:
\"개발자가 실수해도 시스템을 살릴 수 있는 뒷문(OOB)\"
\"임의 커맨드 실행은 금지한다. Allowlist only.\"

@author Axon (Builder)
@version 1.0.0
"""

import asyncio
import subprocess
import uuid
import time
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# ==================== 라우터 ====================
router = APIRouter(prefix="/ops/emergency", tags=["ops"])

# ==================== 요청 모델 ====================

class EmergencyRequest(BaseModel):
    node_id: str
    level: str  # 'soft', 'service', 'power'
    reason: str
    requested_by: str = "admin"

class ConfirmRequest(BaseModel):
    event_id: str
    confirmation_token: str
    confirmed_by: str

# ==================== Allowlist (화이트리스트) ====================

ALLOWED_LEVELS = ['soft', 'service', 'power']

# Tailscale 노드 정보 (NODE_ID → Tailscale IP)
TAILSCALE_NODES = {
    'node-001': '100.64.0.1',
    'node-002': '100.64.0.2',
    'node-003': '100.64.0.3',
    'node-004': '100.64.0.4',
    'node-005': '100.64.0.5',
}

# recover.ps1 경로 (고정)
RECOVER_SCRIPT_PATH = r'C:\doai\bin\recover.ps1'


# ==================== Endpoints ====================

@router.post("/request")
async def request_recovery(request: EmergencyRequest, supabase=None, logger=None):
    """
    긴급 복구 요청
    
    POST /ops/emergency/request
    {
      "node_id": "node-001",
      "level": "soft",
      "reason": "Laixi not responding"
    }
    
    Response:
    {
      "success": true,
      "event_id": "uuid",
      "status": "pending" | "awaiting_confirm"
    }
    """
    # 검증
    if request.level not in ALLOWED_LEVELS:
        raise HTTPException(400, f"Invalid level: {request.level}")
    
    if request.node_id not in TAILSCALE_NODES:
        raise HTTPException(400, f"Unknown node_id: {request.node_id}")
    
    logger.info(f"🚨 긴급 복구 요청", {
        'node_id': request.node_id,
        'level': request.level,
        'reason': request.reason
    })
    
    try:
        # Supabase RPC 호출
        result = supabase.rpc('request_emergency_recovery', {
            'p_node_id': request.node_id,
            'p_recovery_level': request.level,
            'p_reason': request.reason,
            'p_trigger_type': 'manual',
            'p_requested_by': request.requested_by
        }).execute()
        
        event_id = result.data
        
        # power는 awaiting_confirm, 나머지는 즉시 실행
        if request.level == 'power':
            # 승인 대기
            event = supabase.table('ops_events').select('*').eq('event_id', event_id).single().execute()
            
            return {
                'success': True,
                'event_id': event_id,
                'status': 'awaiting_confirm',
                'confirmation_token': event.data['confirmation_token'],
                'expires_at': event.data['confirmation_expires_at'],
                'message': '⚠️  Power 복구는 2단 승인 필요 (TTL: 120초)'
            }
        else:
            # 즉시 실행 (백그라운드)
            asyncio.create_task(execute_recovery(event_id, request.node_id, request.level, supabase, logger))
            
            return {
                'success': True,
                'event_id': event_id,
                'status': 'executing',
                'message': f'{request.level} 복구 실행 중...'
            }
    
    except Exception as e:
        logger.error(f"복구 요청 실패: {e}")
        raise HTTPException(500, str(e))


@router.post("/confirm")
async def confirm_recovery(request: ConfirmRequest, supabase=None, logger=None):
    """
    복구 승인 (power만)
    
    POST /ops/emergency/confirm
    {
      "event_id": "uuid",
      "confirmation_token": "...",
      "confirmed_by": "admin"
    }
    """
    logger.info(f"✅ 복구 승인 시도", {'event_id': request.event_id})
    
    try:
        # Supabase RPC 호출
        result = supabase.rpc('confirm_emergency_recovery', {
            'p_event_id': request.event_id,
            'p_confirmation_token': request.confirmation_token,
            'p_confirmed_by': request.confirmed_by
        }).execute()
        
        if not result.data:
            raise HTTPException(400, "Confirmation failed")
        
        # 승인 완료 → 실행
        event = supabase.table('ops_events').select('*').eq('event_id', request.event_id).single().execute()
        
        asyncio.create_task(
            execute_recovery(
                request.event_id,
                event.data['node_id'],
                event.data['recovery_level'],
                supabase,
                logger
            )
        )
        
        return {
            'success': True,
            'event_id': request.event_id,
            'status': 'executing',
            'message': 'Power 복구 승인 완료, 실행 중...'
        }
    
    except Exception as e:
        logger.error(f"복구 승인 실패: {e}")
        raise HTTPException(500, str(e))


@router.get("/{event_id}")
async def get_event_status(event_id: str, supabase=None):
    """
    이벤트 상태 조회
    
    GET /ops/emergency/{event_id}
    """
    try:
        event = supabase.table('ops_events').select('*').eq('event_id', event_id).single().execute()
        
        if not event.data:
            raise HTTPException(404, "Event not found")
        
        return {
            'success': True,
            'event': event.data
        }
    
    except Exception as e:
        raise HTTPException(500, str(e))


# ==================== 실행 로직 ====================

async def execute_recovery(event_id: str, node_id: str, level: str, supabase, logger):
    """
    복구 실행 (Tailscale SSH)
    
    1. Node lock 획득
    2. SSH로 recover.ps1 실행
    3. 결과 기록
    4. Lock 해제
    """
    logger.info(f"🔧 복구 실행 시작", {'event_id': event_id, 'node_id': node_id, 'level': level})
    
    # 1. Lock 획득
    lock_acquired = supabase.rpc('acquire_node_lock', {
        'p_node_id': node_id,
        'p_event_id': event_id
    }).execute()
    
    if not lock_acquired.data:
        logger.error(f"❌ Lock 획득 실패 (다른 작업 진행 중): {node_id}")
        
        # Event 실패 처리
        supabase.table('ops_events').update({
            'status': 'failed',
            'error_message': 'Lock acquisition failed (concurrent execution)',
            'updated_at': 'now()'
        }).eq('event_id', event_id).execute()
        
        return
    
    # 2. Event 상태 업데이트 (executing)
    supabase.table('ops_events').update({
        'status': 'executing',
        'started_at': 'now()',
        'updated_at': 'now()'
    }).eq('event_id', event_id).execute()
    
    try:
        # 3. SSH로 recover.ps1 실행
        tailscale_ip = TAILSCALE_NODES.get(node_id)
        
        if not tailscale_ip:
            raise Exception(f"Unknown node: {node_id}")
        
        # SSH 명령 (Allowlist)
        ssh_command = [
            'ssh',
            f'doai@{tailscale_ip}',
            'powershell',
            '-ExecutionPolicy', 'Bypass',
            '-File', RECOVER_SCRIPT_PATH,
            '-Level', level
        ]
        
        logger.info(f"📡 SSH 실행: {' '.join(ssh_command)}")
        
        start_time = time.time()
        
        # 실행 (타임아웃 10분)
        result = subprocess.run(
            ssh_command,
            capture_output=True,
            text=True,
            timeout=600,
            encoding='utf-8',
            errors='replace'
        )
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        # stdout/stderr 프리뷰 (최대 1000자)
        stdout_preview = result.stdout[:1000] if result.stdout else ""
        stderr_preview = result.stderr[:1000] if result.stderr else ""
        
        # 4. 결과 기록
        supabase.table('ops_events').update({
            'status': 'success' if result.returncode == 0 else 'failed',
            'completed_at': 'now()',
            'duration_ms': duration_ms,
            'exit_code': result.returncode,
            'stdout_preview': stdout_preview,
            'stderr_preview': stderr_preview,
            'error_message': stderr_preview if result.returncode != 0 else None,
            'updated_at': 'now()'
        }).eq('event_id', event_id).execute()
        
        if result.returncode == 0:
            logger.info(f"✅ 복구 성공: {node_id} ({duration_ms}ms)")
        else:
            logger.error(f"❌ 복구 실패: {node_id} (exit: {result.returncode})")
    
    except subprocess.TimeoutExpired:
        logger.error(f"⏱️ 복구 타임아웃: {node_id}")
        
        supabase.table('ops_events').update({
            'status': 'timeout',
            'error_message': 'Execution timeout (600s)',
            'updated_at': 'now()'
        }).eq('event_id', event_id).execute()
    
    except Exception as e:
        logger.error(f"❌ 복구 예외: {e}")
        
        supabase.table('ops_events').update({
            'status': 'failed',
            'error_message': str(e),
            'updated_at': 'now()'
        }).eq('event_id', event_id).execute()
    
    finally:
        # 5. Lock 해제
        supabase.rpc('release_node_lock', {'p_node_id': node_id}).execute()
        logger.info(f"🔓 Lock 해제: {node_id}")
