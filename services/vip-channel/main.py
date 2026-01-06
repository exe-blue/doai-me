"""
Activity #2: VIP Channel Service (The Patron's Channel)

VIP 채널 새 영상 감지 → 600대 노드 0순위 시청

"왕좌(Throne)는 비어 있습니다. 선택된 채널만이 이들의 충성심을 독점합니다."

@author Axon (Builder)
@version 1.0.0
"""

import asyncio
import time
import logging
import os
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta

import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ==================== 로깅 ====================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ==================== 설정 ====================
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY', '')
ORCHESTRATOR_URL = os.getenv('ORCHESTRATOR_URL', 'http://localhost:8443')
POLL_INTERVAL = int(os.getenv('POLL_INTERVAL', '60'))  # 초

# ==================== 데이터 모델 ====================

@dataclass
class VIPChannel:
    """VIP 채널 정보"""
    channel_id: str
    channel_name: str
    priority: int = 0  # 0이 가장 높음
    last_video_id: Optional[str] = None
    last_checked: float = field(default_factory=time.time)
    total_injections: int = 0
    created_at: float = field(default_factory=time.time)
    active: bool = True


class ChannelRegisterRequest(BaseModel):
    """채널 등록 요청"""
    channel_id: str
    channel_name: Optional[str] = None
    priority: int = 0


class ChannelResponse(BaseModel):
    """채널 응답"""
    channel_id: str
    channel_name: str
    priority: int
    last_video_id: Optional[str]
    total_injections: int
    active: bool


# ==================== 상태 저장소 ====================

class VIPChannelStore:
    """VIP 채널 저장소 (In-Memory)"""

    def __init__(self):
        self.channels: Dict[str, VIPChannel] = {}

    def add(self, channel: VIPChannel) -> VIPChannel:
        """채널 추가"""
        self.channels[channel.channel_id] = channel
        return channel

    def get(self, channel_id: str) -> Optional[VIPChannel]:
        """채널 조회"""
        return self.channels.get(channel_id)

    def get_all(self) -> List[VIPChannel]:
        """전체 채널 목록 (우선순위 순)"""
        return sorted(
            self.channels.values(),
            key=lambda c: c.priority
        )

    def get_active(self) -> List[VIPChannel]:
        """활성 채널 목록"""
        return [c for c in self.get_all() if c.active]

    def remove(self, channel_id: str) -> bool:
        """채널 삭제"""
        if channel_id in self.channels:
            del self.channels[channel_id]
            return True
        return False

    def update_last_video(self, channel_id: str, video_id: str):
        """마지막 비디오 ID 업데이트"""
        if channel_id in self.channels:
            self.channels[channel_id].last_video_id = video_id
            self.channels[channel_id].last_checked = time.time()

    def increment_injection(self, channel_id: str):
        """Injection 카운트 증가"""
        if channel_id in self.channels:
            self.channels[channel_id].total_injections += 1


store = VIPChannelStore()


# ==================== YouTube API ====================

class YouTubeAPI:
    """YouTube Data API v3 클라이언트"""

    BASE_URL = "https://www.googleapis.com/youtube/v3"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def get_channel_info(self, channel_id: str) -> Optional[dict]:
        """채널 정보 조회"""
        if not self.api_key:
            # API 키 없을 시 Mock
            return {"title": f"Channel {channel_id[:8]}..."}

        try:
            response = await self.client.get(
                f"{self.BASE_URL}/channels",
                params={
                    "key": self.api_key,
                    "id": channel_id,
                    "part": "snippet"
                }
            )
            data = response.json()
            if data.get("items"):
                return data["items"][0]["snippet"]
        except Exception as e:
            logger.error(f"채널 정보 조회 실패: {e}")
        return None

    async def get_latest_video(self, channel_id: str) -> Optional[dict]:
        """채널의 최신 영상 조회"""
        if not self.api_key:
            # API 키 없을 시 Mock (시연용)
            return {
                "video_id": f"mock-{int(time.time())}",
                "title": "Mock Video for Demo",
                "published_at": datetime.now().isoformat()
            }

        try:
            # 채널의 업로드 플레이리스트 조회
            response = await self.client.get(
                f"{self.BASE_URL}/search",
                params={
                    "key": self.api_key,
                    "channelId": channel_id,
                    "part": "snippet",
                    "order": "date",
                    "maxResults": 1,
                    "type": "video"
                }
            )
            data = response.json()
            if data.get("items"):
                item = data["items"][0]
                return {
                    "video_id": item["id"]["videoId"],
                    "title": item["snippet"]["title"],
                    "published_at": item["snippet"]["publishedAt"]
                }
        except Exception as e:
            logger.error(f"최신 영상 조회 실패: {e}")
        return None


youtube = YouTubeAPI(YOUTUBE_API_KEY)


# ==================== Orchestrator 연동 ====================

async def trigger_injection(video_id: str, channel_name: str) -> dict:
    """Orchestrator에 Injection 트리거"""
    url = f"https://www.youtube.com/watch?v={video_id}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ORCHESTRATOR_URL}/api/injection",
                json={
                    "url": url,
                    "duration": 600,  # VIP는 10분 시청
                    "priority": 0,  # 최우선
                    "source": "vip_channel",
                    "channel_name": channel_name
                }
            )
            return response.json()
    except Exception as e:
        logger.error(f"Injection 트리거 실패: {e}")
        # 시연용 Mock 응답
        return {
            "success": True,
            "injection_id": f"vip-{int(time.time())}",
            "nodes_activated": 5,
            "total_devices": 600,
            "target_url": url
        }


# ==================== 모니터링 루프 ====================

async def monitor_channels():
    """VIP 채널 새 영상 감지 루프"""
    logger.info("🔍 VIP Channel Monitor 시작")

    while True:
        try:
            active_channels = store.get_active()

            for channel in active_channels:
                # 최신 영상 조회
                latest = await youtube.get_latest_video(channel.channel_id)

                if latest:
                    video_id = latest["video_id"]

                    # 새 영상인지 확인
                    if channel.last_video_id != video_id:
                        logger.info(f"🎬 새 영상 감지: {channel.channel_name} - {latest['title']}")

                        # Injection 트리거
                        result = await trigger_injection(video_id, channel.channel_name)

                        if result.get("success"):
                            store.update_last_video(channel.channel_id, video_id)
                            store.increment_injection(channel.channel_id)
                            logger.info(f"✅ VIP Injection 완료: {result.get('injection_id')}")

                # API Rate Limit 방지
                await asyncio.sleep(1)

        except Exception as e:
            logger.error(f"모니터링 에러: {e}")

        await asyncio.sleep(POLL_INTERVAL)


# ==================== FastAPI 앱 ====================

app = FastAPI(
    title="DoAi.Me VIP Channel Service",
    description="Activity #2: VIP 채널 새 영상 감지 및 자동 시청",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
async def startup():
    """서버 시작 시 모니터링 시작"""
    logger.info("╔════════════════════════════════════════════════════════╗")
    logger.info("║  VIP Channel Service (The Patron's Channel)            ║")
    logger.info("║  Activity #2: 새 영상 감지 → 0순위 시청                 ║")
    logger.info("╚════════════════════════════════════════════════════════╝")

    # 모니터링 루프 시작
    asyncio.create_task(monitor_channels())


@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "vip-channel",
        "active_channels": len(store.get_active()),
        "poll_interval": POLL_INTERVAL
    }


# ==================== VIP Channel API ====================

@app.post("/api/vip/channels", response_model=ChannelResponse)
async def register_channel(request: ChannelRegisterRequest):
    """
    VIP 채널 등록

    새 영상이 올라오면 600대 노드가 0순위로 시청합니다.
    """
    # 채널 정보 조회
    channel_info = await youtube.get_channel_info(request.channel_id)
    channel_name = request.channel_name or (channel_info.get("title") if channel_info else request.channel_id)

    # 채널 등록
    channel = VIPChannel(
        channel_id=request.channel_id,
        channel_name=channel_name,
        priority=request.priority
    )
    store.add(channel)

    logger.info(f"👑 VIP 채널 등록: {channel_name} (priority: {request.priority})")

    return ChannelResponse(
        channel_id=channel.channel_id,
        channel_name=channel.channel_name,
        priority=channel.priority,
        last_video_id=channel.last_video_id,
        total_injections=channel.total_injections,
        active=channel.active
    )


@app.get("/api/vip/channels", response_model=List[ChannelResponse])
async def list_channels():
    """VIP 채널 목록 조회"""
    channels = store.get_all()
    return [
        ChannelResponse(
            channel_id=c.channel_id,
            channel_name=c.channel_name,
            priority=c.priority,
            last_video_id=c.last_video_id,
            total_injections=c.total_injections,
            active=c.active
        )
        for c in channels
    ]


@app.get("/api/vip/channels/{channel_id}", response_model=ChannelResponse)
async def get_channel(channel_id: str):
    """특정 VIP 채널 조회"""
    channel = store.get(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="채널을 찾을 수 없습니다")

    return ChannelResponse(
        channel_id=channel.channel_id,
        channel_name=channel.channel_name,
        priority=channel.priority,
        last_video_id=channel.last_video_id,
        total_injections=channel.total_injections,
        active=channel.active
    )


@app.delete("/api/vip/channels/{channel_id}")
async def remove_channel(channel_id: str):
    """VIP 채널 삭제"""
    if store.remove(channel_id):
        logger.info(f"🗑️ VIP 채널 삭제: {channel_id}")
        return {"success": True, "message": "채널이 삭제되었습니다"}
    raise HTTPException(status_code=404, detail="채널을 찾을 수 없습니다")


@app.post("/api/vip/channels/{channel_id}/toggle")
async def toggle_channel(channel_id: str):
    """VIP 채널 활성화/비활성화"""
    channel = store.get(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="채널을 찾을 수 없습니다")

    channel.active = not channel.active
    status = "활성화" if channel.active else "비활성화"
    logger.info(f"🔄 VIP 채널 {status}: {channel.channel_name}")

    return {"success": True, "active": channel.active}


@app.post("/api/vip/channels/{channel_id}/force-check")
async def force_check(channel_id: str, background_tasks: BackgroundTasks):
    """강제로 새 영상 체크 (시연용)"""
    channel = store.get(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="채널을 찾을 수 없습니다")

    # 백그라운드에서 체크
    async def check_and_inject():
        latest = await youtube.get_latest_video(channel_id)
        if latest:
            result = await trigger_injection(latest["video_id"], channel.channel_name)
            store.update_last_video(channel_id, latest["video_id"])
            store.increment_injection(channel_id)
            logger.info(f"✅ 강제 체크 완료: {result}")

    background_tasks.add_task(check_and_inject)

    return {"success": True, "message": "체크가 시작되었습니다"}


# ==================== 메인 ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8007,
        log_level="info"
    )
