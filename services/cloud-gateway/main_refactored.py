"""
DoAi.Me Cloud Gateway - The Brain (Refactored)
Vultr FastAPI Server (WSS Protocol v1.0)

Mission: 단순함이 전부다.
- /ws/node: 노드 연결 관리 (HELLO/HEARTBEAT/COMMAND/RESULT)
- /api/command: 프론트엔드 -> 노드 명령 전달
- /api/queue: 비동기 명령 큐

Protocol v1.0:
- HELLO -> HELLO_ACK (연결 + 인증)
- HEARTBEAT -> HEARTBEAT_ACK + 명령 Push (Pull-based Push)
- COMMAND -> RESULT (명령 실행)

"복잡한 생각은 버려라." - Orion

Architecture:
- core/config.py: 환경 변수 기반 설정
- core/connection_pool.py: 노드 연결 풀 관리
- core/database.py: Supabase RPC 작업
- core/protocol.py: 메시지 빌더 및 보안
- handlers/websocket.py: WebSocket 핸들러
- handlers/rest.py: REST API 핸들러
"""

import asyncio
import logging
import pathlib
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from core.config import get_config
from core.connection_pool import pool
from core.database import get_supabase
from handlers.rest import router as rest_router
from handlers.websocket import router as ws_router

# ============================================================
# 로깅 설정
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ============================================================
# Background Tasks
# ============================================================


async def cleanup_stale_connections():
    """비활성 연결 정리 (Background Task)"""
    config = get_config()

    while True:
        try:
            await asyncio.sleep(60)

            now = datetime.now(timezone.utc)
            timeout = timedelta(seconds=config.heartbeat_timeout)

            nodes_snapshot = pool.get_nodes_snapshot()
            stale_nodes = []

            for node in nodes_snapshot:
                if now - node.last_heartbeat > timeout:
                    stale_nodes.append((node.node_id, node))

            for node_id, conn in stale_nodes:
                logger.warning(f"[{node_id}] HEARTBEAT 타임아웃 - 연결 해제")
                try:
                    await conn.websocket.close(code=4008, reason="Heartbeat timeout")
                except Exception:
                    pass
                await pool.remove(node_id)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Cleanup task error: {e}")


# ============================================================
# FastAPI App
# ============================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 라이프사이클"""
    config = get_config()

    logger.info("Cloud Gateway 시작 (Refactored)")
    logger.info('"복잡한 생각은 버려라." - Orion')
    logger.info(f"Protocol Version: {config.protocol_version}")
    logger.info(f"Signature Verification: {config.verify_signature}")

    sb = get_supabase()
    if sb:
        logger.info("Supabase 연결됨")
    else:
        logger.warning("Supabase 연결 없음 (Mock 모드)")

    cleanup_task = asyncio.create_task(cleanup_stale_connections())

    yield

    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

    logger.info("Cloud Gateway 종료")


config = get_config()

app = FastAPI(
    title="DoAi.Me Cloud Gateway",
    description="The Brain - Vultr-Centric WSS Hub (Protocol v1.0) - Refactored",
    version="2.1.0",
    lifespan=lifespan,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins if config.cors_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(ws_router)
app.include_router(rest_router)

# 정적 파일 서빙
STATIC_DIR = pathlib.Path(__file__).parent / "public"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root():
    """루트 -> Control Room 리다이렉트"""
    control_room = STATIC_DIR / "control-room.html"
    if control_room.exists():
        return FileResponse(str(control_room))
    return {"message": "DoAi.Me Cloud Gateway (Refactored)", "docs": "/docs"}


# ============================================================
# 메인
# ============================================================

if __name__ == "__main__":
    import os

    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    uvicorn.run("main_refactored:app", host=host, port=port, reload=False, log_level="info")
