"""
Vultr Orchestrator (The Brain)
P0: Reverse WSS Mesh Implementation

역할:
- WSS 서버: wss://doai.me:8443/node
- 5대 T5810 NodeRunner 연결 관리
- 하트비트 감시 (30초 타임아웃)
- Job 할당 및 결과 수집
- 오프라인 판정 및 자동복구 트리거

@author Axon (Builder)
@version 1.0.0 (P0)
"""

import asyncio
import time
import json
import logging
from typing import Dict, Optional, Set
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from state import StateManager
from policy import PolicyEngine

# Bug Fix 1: Supabase client (TODO: 실제 구현 필요)
try:
    from supabase import create_client
    supabase_client = None  # TODO: create_client(SUPABASE_URL, SUPABASE_KEY)
except ImportError:
    supabase_client = None

# ==================== 로깅 ====================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ==================== Dependencies (Bug Fix 1) ====================

def get_supabase_client():
    """Supabase 클라이언트 주입"""
    if supabase_client is None:
        logger.warn("Supabase client not initialized")
    return supabase_client

def get_logger():
    """Logger 주입"""
    return logger

# ==================== 초기화 ====================
app = FastAPI(title="DoAi.Me Orchestrator", version="1.0.0-P0")

# CORS (Dashboard 접속용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# 상태 관리
state = StateManager()

# 정책 엔진
policy = PolicyEngine(state, logger)

# 활성 WebSocket 연결
active_connections: Dict[str, WebSocket] = {}


# ==================== WebSocket 엔드포인트 ====================

@app.websocket("/node")
async def node_endpoint(websocket: WebSocket):
    """
    NodeRunner WSS 연결 엔드포인트
    
    프로토콜:
    1. NodeRunner → HELLO
    2. Orchestrator ← HELLO_ACK
    3. NodeRunner → HEARTBEAT (5~10초마다)
    4. Orchestrator → JOB_ASSIGN (필요시)
    5. NodeRunner → JOB_ACK
    6. NodeRunner → JOB_RESULT
    """
    await websocket.accept()
    
    node_id = None
    
    try:
        # HELLO 대기 (10초 타임아웃)
        hello_msg = await asyncio.wait_for(
            websocket.receive_json(),
            timeout=10.0
        )
        
        if hello_msg.get('type') != 'HELLO':
            logger.error(f"첫 메시지가 HELLO가 아님: {hello_msg.get('type')}")
            await websocket.close(code=1002, reason="HELLO expected")
            return
        
        node_id = hello_msg.get('node_id')
        if not node_id:
            logger.error("node_id 없음")
            await websocket.close(code=1002, reason="node_id required")
            return
        
        logger.info(f"✅ Node 연결: {node_id}")
        
        # Node 등록
        state.register_node(
            node_id=node_id,
            connection=websocket,
            hello_payload=hello_msg.get('payload', {})
        )
        active_connections[node_id] = websocket
        
        # HELLO_ACK 전송
        await websocket.send_json({
            'type': 'HELLO_ACK',
            'node_id': node_id,
            'ts': int(time.time()),
            'seq': state.get_next_seq('orchestrator'),
            'ack_seq': hello_msg.get('seq', 0),
            'payload': {
                'server': 'VULTR_ORCHESTRATOR',
                'version': '1.0.0-P0'
            }
        })
        
        # 메시지 루프
        while True:
            msg = await websocket.receive_json()
            await handle_message(node_id, msg, websocket)
            
    except WebSocketDisconnect:
        logger.warn(f"🔌 Node 연결 종료: {node_id}")
    except asyncio.TimeoutError:
        logger.error(f"⏱️ HELLO 타임아웃: {node_id}")
    except Exception as e:
        logger.error(f"❌ WSS 에러 ({node_id}): {e}")
    finally:
        # 정리
        if node_id:
            state.unregister_node(node_id)
            active_connections.pop(node_id, None)
            logger.info(f"🗑️ Node 정리: {node_id}")


async def handle_message(node_id: str, msg: dict, websocket: WebSocket):
    """메시지 핸들러"""
    msg_type = msg.get('type')
    seq = msg.get('seq', 0)
    
    logger.debug(f"📨 {node_id} → {msg_type} (seq: {seq})")
    
    if msg_type == 'HEARTBEAT':
        # 하트비트 수신
        payload = msg.get('payload', {})
        state.update_heartbeat(
            node_id=node_id,
            device_count=payload.get('device_count'),
            status=payload.get('laixi_status'),
            metrics=payload
        )
        
        # ACK 전송 (옵션)
        await websocket.send_json({
            'type': 'HEARTBEAT_ACK',
            'node_id': node_id,
            'ts': int(time.time()),
            'seq': state.get_next_seq('orchestrator'),
            'ack_seq': seq
        })
    
    elif msg_type == 'JOB_ACK':
        # Job 수락 확인
        job_id = msg.get('payload', {}).get('job_id')
        state.mark_job_acked(job_id, node_id)
        logger.info(f"✅ Job ACK: {job_id} (node: {node_id})")
    
    elif msg_type == 'JOB_RESULT':
        # Job 결과 수신
        job_id = msg.get('payload', {}).get('job_id')
        job_state = msg.get('payload', {}).get('state')
        metrics = msg.get('payload', {}).get('metrics', {})
        error = msg.get('payload', {}).get('error')
        
        state.mark_job_completed(job_id, node_id, job_state, metrics, error)
        logger.info(f"📊 Job 완료: {job_id} (state: {job_state})")
    
    elif msg_type == 'DEVICE_SNAPSHOT':
        # 디바이스 스냅샷 수신
        devices = msg.get('payload', {}).get('devices', [])
        state.update_device_snapshot(node_id, devices)
        logger.debug(f"📸 Device 스냅샷: {node_id} ({len(devices)}대)")
    
    else:
        logger.warn(f"알 수 없는 메시지: {msg_type}")


# ==================== REST API (관리/테스트용) ====================

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "orchestrator",
        "version": "1.0.0-P0",
        "uptime": time.time() - state.start_time
    }


@app.get("/nodes")
async def get_nodes():
    """
    현재 노드 상태 조회
    
    Response:
    {
      "nodes": [
        {
          "node_id": "node-001",
          "status": "online",
          "device_count": 120,
          "last_seen": "2026-01-02T10:00:00Z",
          "uptime": 3600
        }
      ]
    }
    """
    nodes = state.get_all_nodes()
    return {"nodes": nodes}


@app.post("/jobs")
async def create_job(job_data: dict):
    """
    Job 생성 및 할당
    
    Request:
    {
      "target": "node-001" | "all",
      "action": "YOUTUBE_OPEN_URL",
      "device_ids": ["all"],
      "params": {"url": "..."}
    }
    """
    try:
        job_id = f"job-{int(time.time())}-{job_data.get('action')}"
        target = job_data.get('target')
        
        # Job 등록
        state.register_job(
            job_id=job_id,
            target=target,
            action=job_data.get('action'),
            params=job_data.get('params', {}),
            device_ids=job_data.get('device_ids', ['all'])
        )
        
        # 대상 노드에 전송
        targets = [target] if target != 'all' else list(active_connections.keys())
        
        for node_id in targets:
            if node_id in active_connections:
                ws = active_connections[node_id]
                
                await ws.send_json({
                    'type': 'JOB_ASSIGN',
                    'node_id': node_id,
                    'ts': int(time.time()),
                    'seq': state.get_next_seq('orchestrator'),
                    'ack_seq': state.get_node_seq(node_id),
                    'payload': {
                        'job_id': job_id,
                        'action': job_data.get('action'),
                        'device_ids': job_data.get('device_ids', ['all']),
                        'params': job_data.get('params', {}),
                        'idempotency_key': job_id
                    }
                })
                
                logger.info(f"📤 Job 할당: {job_id} → {node_id}")
        
        return {
            "success": True,
            "job_id": job_id,
            "targets": targets
        }
        
    except Exception as e:
        logger.error(f"Job 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 라우터 등록 (Bug Fix 1 & 3) ====================

# ops 라우터 등록
try:
    from ops import router as ops_router, execute_recovery
    from auto_recovery import AutoRecoveryEngine
    
    app.include_router(ops_router)
    
    # Bug Fix 3: execute_recovery 주입 (순환 import 방지)
    auto_recovery_engine = AutoRecoveryEngine(
        state=state,
        supabase=supabase_client,
        logger=logger,
        execute_recovery_func=execute_recovery
    )
    
except ImportError as e:
    logger.warn(f"ops/auto_recovery 모듈 로드 실패: {e}")
    auto_recovery_engine = None


# ==================== 백그라운드 태스크 ====================

@app.on_event("startup")
async def startup_event():
    """서버 시작 시 백그라운드 작업 시작"""
    logger.info("╔════════════════════════════════════════════════════════╗")
    logger.info("║  Vultr Orchestrator (The Brain)                      ║")
    logger.info("║  P0: Reverse WSS Mesh + Emergency Recovery            ║")
    logger.info("╚════════════════════════════════════════════════════════╝")
    
    # 정책 엔진 시작 (하트비트 감시)
    asyncio.create_task(policy.monitor_loop())
    
    # 자동 복구 엔진 시작 (Bug Fix 3)
    if auto_recovery_engine:
        asyncio.create_task(auto_recovery_engine.monitor_loop())


# ==================== 메인 ====================

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8443,
        ssl_keyfile="/etc/letsencrypt/live/doai.me/privkey.pem",
        ssl_certfile="/etc/letsencrypt/live/doai.me/fullchain.pem",
        log_level="info"
    )
