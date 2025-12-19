"""인트라넷 웹 서버"""

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os

from src.models.youtube_task import (
    YouTubeTaskModel, 
    YouTubeTaskCreate, 
    YouTubeTaskUpdate,
    TaskStatus
)
from src.services.task_storage import get_storage
from src.services.comment_generator import get_comment_generator

# 에이전트 시스템 (지연 로딩)
_activity_manager = None
_request_handler = None
_dashboard_broadcaster = None

# Constants
INDEX_TEMPLATE = "index.html"
DASHBOARD_TEMPLATE = "dashboard.html"
TASK_NOT_FOUND = "Task not found"


def get_activity_manager():
    """ActivityManager 싱글톤"""
    global _activity_manager
    if _activity_manager is None:
        from src.agent.activity_manager import ActivityManager
        _activity_manager = ActivityManager()
    return _activity_manager


def get_request_handler():
    """RequestHandler 싱글톤"""
    global _request_handler
    if _request_handler is None:
        from src.agent.request_handler import RequestHandler
        _request_handler = RequestHandler(get_activity_manager())
    return _request_handler

# App 생성
app = FastAPI(
    title="AIFarm Intranet",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# 정적 파일 및 템플릿 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


# ==================== 웹 페이지 라우트 ====================

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """메인 페이지 (YouTube 태스크)"""
    return templates.TemplateResponse(INDEX_TEMPLATE, {"request": request})


@app.get("/youtube", response_class=HTMLResponse)
async def youtube_page(request: Request):
    """YouTube 태스크 페이지"""
    return templates.TemplateResponse(INDEX_TEMPLATE, {"request": request})


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    """실시간 대시보드 페이지"""
    return templates.TemplateResponse(DASHBOARD_TEMPLATE, {"request": request})


@app.get("/devices", response_class=HTMLResponse)
async def devices_page(request: Request):
    """디바이스 관리 페이지"""
    return templates.TemplateResponse(DASHBOARD_TEMPLATE, {"request": request})


@app.get("/discoveries", response_class=HTMLResponse)
async def discoveries_page(request: Request):
    """발견물 피드 페이지"""
    return templates.TemplateResponse(DASHBOARD_TEMPLATE, {"request": request})


@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    """설정 페이지"""
    return templates.TemplateResponse(INDEX_TEMPLATE, {"request": request})


# ==================== API 엔드포인트 ====================

@app.get("/api/health")
async def health():
    """헬스 체크"""
    return {"status": "healthy", "service": "aifarm-intranet"}


# ==================== YouTube 태스크 API ====================

@app.get("/api/youtube-tasks")
async def get_youtube_tasks(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """YouTube 태스크 목록 조회"""
    storage = get_storage()
    
    task_status = TaskStatus(status) if status else None
    tasks = storage.get_all(status=task_status, limit=limit, offset=offset)
    
    return {
        "tasks": [task.model_dump() for task in tasks],
        "count": len(tasks)
    }


@app.get("/api/youtube-tasks/{task_id}")
async def get_youtube_task(task_id: str):
    """YouTube 태스크 상세 조회"""
    storage = get_storage()
    task = storage.get(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail=TASK_NOT_FOUND)
    
    return task.model_dump()


@app.post("/api/youtube-tasks")
async def create_youtube_task(task_create: YouTubeTaskCreate):
    """YouTube 태스크 생성"""
    storage = get_storage()
    task = storage.create(task_create)
    
    return {
        "message": "Task created",
        "task": task.model_dump()
    }


@app.put("/api/youtube-tasks/{task_id}")
async def update_youtube_task(task_id: str, task_update: YouTubeTaskUpdate):
    """YouTube 태스크 수정"""
    storage = get_storage()
    task = storage.update(task_id, task_update)
    
    if not task:
        raise HTTPException(status_code=404, detail=TASK_NOT_FOUND)
    
    return {
        "message": "Task updated",
        "task": task.model_dump()
    }


@app.delete("/api/youtube-tasks/{task_id}")
async def delete_youtube_task(task_id: str):
    """YouTube 태스크 삭제"""
    storage = get_storage()
    success = storage.delete(task_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted"}


@app.post("/api/youtube-tasks/{task_id}/status")
async def update_task_status(task_id: str, status: str, result: Optional[dict] = None):
    """태스크 상태 업데이트"""
    storage = get_storage()
    
    try:
        task_status = TaskStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    task = storage.update_status(task_id, task_status, result)
    
    if not task:
        raise HTTPException(status_code=404, detail=TASK_NOT_FOUND)
    
    return {
        "message": "Status updated",
        "task": task.model_dump()
    }


@app.get("/api/youtube-tasks/pending/list")
async def get_pending_tasks():
    """실행 대기중인 태스크 조회"""
    storage = get_storage()
    tasks = storage.get_pending_tasks()
    
    return {
        "tasks": [task.model_dump() for task in tasks],
        "count": len(tasks)
    }


# ==================== 댓글 생성 API ====================

class CommentRequest(BaseModel):
    video_title: str
    keyword: Optional[str] = None
    count: int = 1


@app.post("/api/generate-comment")
async def generate_comment(request: CommentRequest):
    """AI 댓글 생성"""
    generator = get_comment_generator()
    
    if request.count == 1:
        comment = generator.generate(request.video_title, request.keyword)
        return {"comment": comment}
    else:
        comments = generator.generate_batch(
            request.video_title, 
            request.count, 
            request.keyword
        )
        return {"comments": comments}


# ==================== 통계 API ====================

@app.get("/api/stats")
async def get_stats():
    """대시보드 통계"""
    storage = get_storage()
    all_tasks = storage.get_all(limit=10000)
    
    stats = {
        "total": len(all_tasks),
        "pending": sum(1 for t in all_tasks if t.status in (TaskStatus.PENDING, TaskStatus.SCHEDULED)),
        "running": sum(1 for t in all_tasks if t.status == TaskStatus.RUNNING),
        "completed": sum(1 for t in all_tasks if t.status == TaskStatus.COMPLETED),
        "failed": sum(1 for t in all_tasks if t.status == TaskStatus.FAILED),
    }
    
    return stats


# ==================== 배치 제출 API (5개 단위) ====================

class BatchTaskInput(BaseModel):
    """배치 태스크 입력"""
    keyword: str
    title: str
    upload_time: str = "즉시"
    url: Optional[str] = None
    video_id: Optional[str] = None
    channel_name: Optional[str] = None
    agent_start: int = 1
    agent_end: int = 600
    like_probability: int = 30
    comment_probability: int = 10
    subscribe_probability: int = 5
    watch_time_min: int = 30
    watch_time_max: int = 300
    ai_comment_enabled: bool = True
    comment_text: Optional[str] = None
    memo: Optional[str] = None


class BatchSubmitRequest(BaseModel):
    """배치 제출 요청 (5개 단위)"""
    tasks: List[BatchTaskInput]


@app.post("/api/batch/submit")
async def submit_batch(request: BatchSubmitRequest):
    """
    배치 제출 (5개 단위)
    
    병목 현상 방지를 위해 반드시 5개 단위로 데이터를 작성해야 합니다.
    """
    if len(request.tasks) == 0:
        raise HTTPException(400, "최소 1개의 태스크가 필요합니다.")
    
    if len(request.tasks) > 5:
        raise HTTPException(400, "배치는 최대 5개의 태스크만 포함할 수 있습니다.")
    
    try:
        from src.agent.request_handler import YouTubeTaskInput
        
        handler = get_request_handler()
        
        # 입력 변환
        task_inputs = [
            YouTubeTaskInput(
                keyword=t.keyword,
                title=t.title,
                upload_time=t.upload_time,
                url=t.url,
                video_id=t.video_id,
                channel_name=t.channel_name,
                agent_start=t.agent_start,
                agent_end=t.agent_end,
                like_probability=t.like_probability,
                comment_probability=t.comment_probability,
                subscribe_probability=t.subscribe_probability,
                watch_time_min=t.watch_time_min,
                watch_time_max=t.watch_time_max,
                ai_comment_enabled=t.ai_comment_enabled,
                comment_text=t.comment_text,
                memo=t.memo,
            )
            for t in request.tasks
        ]
        
        batch_id = await handler.submit_batch(task_inputs)
        
        return {
            "success": True,
            "batch_id": batch_id,
            "task_count": len(task_inputs),
            "message": f"배치가 성공적으로 제출되었습니다. ({len(task_inputs)}개 태스크)"
        }
        
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/batch/status")
async def get_batch_status():
    """배치 큐 상태 조회"""
    handler = get_request_handler()
    return handler.get_queue_status()


@app.post("/api/batch/refresh-keywords")
async def refresh_investment_keywords():
    """투자 키워드 갱신 (OpenAI)"""
    handler = get_request_handler()
    await handler.refresh_investment_keywords()
    return {"keywords": handler._investment_keywords}


# ==================== 에이전트 상태 API ====================

@app.get("/api/agents/status")
async def get_agents_status():
    """에이전트 상태 조회"""
    manager = get_activity_manager()
    states = manager.get_all_agent_states()
    
    return {
        "total_agents": len(states),
        "pending_requests": manager.get_queue_size(),
        "has_pending": manager.has_pending_requests(),
        "agents": {
            agent_id: {
                "current_activity": state.current_activity,
                "activity_type": state.activity_type.value if state.activity_type else None,
                "completed_requests": state.completed_requests,
                "total_watch_time": state.total_watch_time,
                "total_likes": state.total_likes,
                "total_comments": state.total_comments,
                "errors": state.errors,
            }
            for agent_id, state in states.items()
        }
    }


# ==================== 대시보드 API ====================

def get_dashboard_components():
    """대시보드 컴포넌트 로딩"""
    from src.agent.dashboard_api import (
        get_connection_manager,
        get_data_provider,
        get_broadcaster
    )
    return get_connection_manager(), get_data_provider(), get_broadcaster()


@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    """대시보드 통계"""
    _, data_provider, _ = get_dashboard_components()
    return data_provider.get_stats()


@app.get("/api/dashboard/devices/grid")
async def get_device_grid():
    """디바이스 그리드 데이터"""
    _, data_provider, _ = get_dashboard_components()
    return data_provider.get_device_grid_data()


@app.get("/api/dashboard/pool-status")
async def get_pool_status():
    """풀 상태"""
    _, data_provider, _ = get_dashboard_components()
    return data_provider.get_pool_status()


@app.get("/api/dashboard/activities")
async def get_activities():
    """활동 분배 현황"""
    _, data_provider, _ = get_dashboard_components()
    return data_provider.get_activity_distribution()


@app.get("/api/dashboard/discoveries")
async def get_discoveries(limit: int = 20):
    """최근 발견물"""
    _, data_provider, _ = get_dashboard_components()
    return data_provider.get_recent_discoveries(limit=limit)


@app.get("/api/dashboard/leaderboard")
async def get_leaderboard():
    """리더보드"""
    _, data_provider, _ = get_dashboard_components()
    return data_provider.get_leaderboard()


@app.get("/api/dashboard/boards/health")
async def get_board_health():
    """폰보드 건강 상태"""
    _, data_provider, _ = get_dashboard_components()
    return data_provider.get_board_health()


@app.get("/api/dashboard/activity-summary")
async def get_activity_summary():
    """활동 요약"""
    _, data_provider, _ = get_dashboard_components()
    return data_provider.get_activity_summary()


@app.websocket("/api/dashboard/ws")
async def websocket_endpoint(websocket: WebSocket):
    """실시간 대시보드 WebSocket"""
    connection_manager, data_provider, _ = get_dashboard_components()
    
    await connection_manager.connect(websocket)
    
    try:
        # 초기 데이터 전송
        from src.agent.dashboard_api import DashboardMessage, MessageType
        
        initial_data = data_provider.get_stats()
        await connection_manager.send_to_client(
            websocket,
            DashboardMessage(type=MessageType.STATS, data=initial_data)
        )
        
        # 클라이언트 메시지 수신 대기
        while True:
            data = await websocket.receive_text()
            import json
            msg = json.loads(data)
            action = msg.get("action")
            
            if action == "refresh_stats":
                await connection_manager.send_to_client(
                    websocket,
                    DashboardMessage(type=MessageType.STATS, data=data_provider.get_stats())
                )
            elif action == "get_board_detail":
                from src.agent.scheduler import get_scheduler
                board_id = msg.get("board_id")
                devices = get_scheduler().get_devices_by_board(board_id)
                await connection_manager.send_to_client(
                    websocket,
                    DashboardMessage(
                        type=MessageType.DEVICE_STATUS,
                        data={"board_id": board_id, "devices": [d.to_dict() for d in devices]}
                    )
                )
                
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket)
    except Exception:
        await connection_manager.disconnect(websocket)


# ==================== 서버 실행 ====================

def run_server(host: str = "0.0.0.0", port: int = 8080):
    """서버 실행"""
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()

