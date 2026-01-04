"""
DoAi.Me Backend API - FastAPI 메인 애플리케이션

@author Axon (DoAi.Me Tech Lead)
@created 2026-01-01
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time

# 라우터 임포트
from .routers import commissions, maintenance, personas, youtube, wifi

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("doai_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 라이프사이클 관리"""
    logger.info("🚀 DoAi.Me Backend API 시작")
    yield
    logger.info("👋 DoAi.Me Backend API 종료")


# FastAPI 앱 생성
app = FastAPI(
    title="DoAi.Me Backend API",
    description="YouTube 자동화 및 분산 제어 시스템 API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 요청 로깅 미들웨어
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} "
        f"status={response.status_code} "
        f"duration={process_time:.3f}s"
    )
    
    response.headers["X-Process-Time"] = str(process_time)
    return response


# 전역 예외 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if app.debug else "An unexpected error occurred"
        }
    )


# 라우터 등록
app.include_router(youtube.router, prefix="/api")
app.include_router(commissions.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(personas.router, prefix="/api")
app.include_router(wifi.router)  # /api/v1/wifi (prefix 내장)


# 기본 엔드포인트
@app.get("/")
async def root():
    return {
        "name": "DoAi.Me Backend API",
        "version": "2.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {
        "status": "healthy",
        "timestamp": time.time()
    }


@app.get("/api/info")
async def api_info():
    """API 정보"""
    return {
        "endpoints": {
            "youtube": {
                "GET /api/youtube/videos": "영상 목록 조회",
                "POST /api/youtube/videos": "영상 추가",
                "POST /api/youtube/results": "시청 결과 저장",
                "GET /api/youtube/stats": "통계 조회",
                "DELETE /api/youtube/videos/{id}": "영상 삭제"
            },
            "wifi": {
                "POST /api/v1/wifi/connect": "WiFi 연결",
                "GET /api/v1/wifi/status": "전체 기기 WiFi 상태",
                "GET /api/v1/wifi/status/{device_id}": "특정 기기 WiFi 상태",
                "POST /api/v1/wifi/verify": "WiFi 연결 검증",
                "POST /api/v1/wifi/disconnect": "WiFi 연결 해제"
            },
            "commissions": "작업 위임 관리",
            "maintenance": "유지보수 작업",
            "personas": "AI 페르소나 관리"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

