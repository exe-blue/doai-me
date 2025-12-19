"""
요청 활동 핸들러

인트라넷에서 등록된 YouTube 시청 요청을 처리합니다.
5개 단위 배치로 요청을 관리합니다.
"""

import asyncio
import uuid
import random
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass

from src.agent.activity_types import RequestActivity, RequestBatch
from src.agent.activity_manager import ActivityManager

logger = logging.getLogger(__name__)


@dataclass
class YouTubeTaskInput:
    """인트라넷에서 입력받는 YouTube 태스크 데이터"""
    keyword: str
    title: str
    upload_time: str              # 상대 시간 (예: "1시간뒤", "30분뒤", "즉시")
    url: Optional[str] = None     # 나중에 업데이트
    video_id: Optional[str] = None
    channel_name: Optional[str] = None
    
    # 에이전트 범위
    agent_start: int = 1
    agent_end: int = 600
    
    # 확률 설정
    like_probability: int = 30
    comment_probability: int = 10
    subscribe_probability: int = 5
    
    # 시청 설정
    watch_time_min: int = 30
    watch_time_max: int = 300
    
    # 댓글 설정
    ai_comment_enabled: bool = True
    comment_text: Optional[str] = None
    
    # 메모
    memo: Optional[str] = None


class RequestHandler:
    """
    요청 핸들러
    
    인트라넷에서 입력받은 YouTube 시청 요청을 처리합니다.
    """
    
    def __init__(self, activity_manager: ActivityManager):
        """
        Args:
            activity_manager: 활동 관리자
        """
        self.manager = activity_manager
        self.logger = logging.getLogger(__name__)
        
        # OpenAI 클라이언트 (댓글 생성용)
        self._openai_client = None
        
        # 투자 키워드 (OpenAI가 생성)
        self._investment_keywords = [
            "해외주식", "주식투자", "미국주식", "ETF투자", "배당주",
            "코스피", "나스닥", "S&P500", "테슬라주식", "애플주식"
        ]
    
    def set_openai_client(self, client):
        """OpenAI 클라이언트 설정"""
        self._openai_client = client
    
    async def refresh_investment_keywords(self):
        """OpenAI로 투자 키워드 갱신"""
        if not self._openai_client:
            return
        
        try:
            response = await self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{
                    "role": "user",
                    "content": "현재 한국에서 인기 있는 투자 관련 검색 키워드 10개를 쉼표로 구분해서 알려주세요. 예: 해외주식, 미국주식, ETF투자"
                }],
                max_tokens=200
            )
            
            keywords_text = response.choices[0].message.content
            keywords = [k.strip() for k in keywords_text.split(",")]
            
            if len(keywords) >= 5:
                self._investment_keywords = keywords[:10]
                self.logger.info(f"투자 키워드 갱신: {self._investment_keywords}")
                
        except Exception as e:
            self.logger.warning(f"투자 키워드 갱신 실패: {e}")
    
    def parse_upload_time(self, time_str: str) -> datetime:
        """
        상대 시간 문자열 파싱
        
        Args:
            time_str: "1시간뒤", "30분뒤", "즉시", "2시간후" 등
            
        Returns:
            datetime 객체
        """
        now = datetime.now()
        time_str = time_str.strip().lower()
        
        # 즉시
        if time_str in ("즉시", "now", "바로"):
            return now
        
        # 분 단위
        import re
        min_match = re.search(r"(\d+)\s*분", time_str)
        if min_match:
            minutes = int(min_match.group(1))
            return now + timedelta(minutes=minutes)
        
        # 시간 단위
        hour_match = re.search(r"(\d+)\s*시간", time_str)
        if hour_match:
            hours = int(hour_match.group(1))
            return now + timedelta(hours=hours)
        
        # 기본값: 즉시
        return now
    
    async def generate_comment(self, title: str) -> str:
        """
        OpenAI로 댓글 생성
        
        Args:
            title: 영상 제목
            
        Returns:
            생성된 댓글 (3줄 정도)
        """
        if not self._openai_client:
            # 기본 댓글
            return random.choice([
                "좋은 영상 감사합니다! 정말 유익하네요 👍",
                "최고예요! 구독하고 갑니다 ㅎㅎ",
                "와 대박... 이런 영상 찾고 있었어요!",
                "너무 잘 봤습니다! 다음 영상도 기대할게요~",
            ])
        
        try:
            response = await self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{
                    "role": "system",
                    "content": "당신은 YouTube 시청자입니다. 자연스러운 한국어 댓글을 작성해주세요. 3줄 이내로, 친근하고 긍정적인 톤으로 작성하세요. 이모지를 적절히 사용해도 됩니다."
                }, {
                    "role": "user",
                    "content": f"다음 YouTube 영상에 대한 댓글을 작성해주세요.\n\n영상 제목: {title}"
                }],
                max_tokens=150
            )
            
            comment = response.choices[0].message.content.strip()
            return comment
            
        except Exception as e:
            self.logger.warning(f"댓글 생성 실패: {e}")
            return "좋은 영상 감사합니다! 👍"
    
    def extract_video_id(self, url: str) -> Optional[str]:
        """URL에서 비디오 ID 추출"""
        if not url:
            return None
        
        import re
        
        # youtube.com/watch?v=VIDEO_ID
        match = re.search(r"[?&]v=([a-zA-Z0-9_-]{11})", url)
        if match:
            return match.group(1)
        
        # youtu.be/VIDEO_ID
        match = re.search(r"youtu\.be/([a-zA-Z0-9_-]{11})", url)
        if match:
            return match.group(1)
        
        # youtube.com/embed/VIDEO_ID
        match = re.search(r"embed/([a-zA-Z0-9_-]{11})", url)
        if match:
            return match.group(1)
        
        return None
    
    async def create_request_from_input(
        self, 
        task_input: YouTubeTaskInput,
        batch_index: int = 0
    ) -> RequestActivity:
        """
        입력 데이터에서 요청 활동 생성
        
        Args:
            task_input: 인트라넷 입력 데이터
            batch_index: 배치 내 인덱스 (0-4)
            
        Returns:
            요청 활동
        """
        # 스케줄 시간 파싱
        scheduled_at = self.parse_upload_time(task_input.upload_time)
        
        # 비디오 ID 추출
        video_id = task_input.video_id or self.extract_video_id(task_input.url)
        
        # 댓글 생성
        comment_text = task_input.comment_text
        if task_input.ai_comment_enabled and not comment_text:
            comment_text = await self.generate_comment(task_input.title)
        
        # 투자 키워드 선택
        investment_keyword = random.choice(self._investment_keywords)
        
        return RequestActivity(
            id=str(uuid.uuid4()),
            batch_index=batch_index,
            keyword=task_input.keyword,
            title=task_input.title,
            channel_name=task_input.channel_name,
            video_id=video_id,
            watch_percent_min=20,
            watch_percent_max=90,
            fast_forward_interval=random.randint(10, 15),
            like_probability=task_input.like_probability,
            comment_probability=task_input.comment_probability,
            comment_text=comment_text,
            scheduled_at=scheduled_at,
            investment_keyword=investment_keyword,
        )
    
    async def create_batch_from_inputs(
        self, 
        task_inputs: List[YouTubeTaskInput]
    ) -> RequestBatch:
        """
        입력 데이터 리스트에서 배치 생성
        
        Args:
            task_inputs: 인트라넷 입력 데이터 리스트 (최대 5개)
            
        Returns:
            요청 배치
        """
        if len(task_inputs) > 5:
            self.logger.warning("5개 초과 입력, 처음 5개만 사용")
            task_inputs = task_inputs[:5]
        
        requests = []
        for i, task_input in enumerate(task_inputs):
            request = await self.create_request_from_input(task_input, batch_index=i)
            requests.append(request)
        
        return RequestBatch(
            batch_id=str(uuid.uuid4()),
            requests=requests,
            investment_keywords=self._investment_keywords.copy()
        )
    
    async def submit_batch(self, task_inputs: List[YouTubeTaskInput]) -> str:
        """
        배치 제출
        
        Args:
            task_inputs: 입력 데이터 리스트
            
        Returns:
            배치 ID
        """
        batch = await self.create_batch_from_inputs(task_inputs)
        
        if self.manager.add_request_batch(batch):
            self.logger.info(f"배치 제출 완료: {batch.batch_id}")
            return batch.batch_id
        else:
            raise ValueError("배치 추가 실패")
    
    def get_queue_status(self) -> Dict[str, Any]:
        """큐 상태 조회"""
        return {
            "pending_batches": self.manager.get_queue_size(),
            "has_pending": self.manager.has_pending_requests(),
            "investment_keywords": self._investment_keywords,
        }


# ==================== FastAPI 라우터 ====================

def create_request_router(request_handler: RequestHandler):
    """FastAPI 라우터 생성"""
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel
    from typing import List, Optional
    
    router = APIRouter(prefix="/api/requests", tags=["requests"])
    
    class YouTubeTaskInputModel(BaseModel):
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
        tasks: List[YouTubeTaskInputModel]
    
    class BatchSubmitResponse(BaseModel):
        batch_id: str
        task_count: int
        message: str
    
    @router.post("/submit", response_model=BatchSubmitResponse)
    async def submit_batch(request: BatchSubmitRequest):
        """배치 제출 (5개 단위)"""
        if len(request.tasks) == 0:
            raise HTTPException(400, "최소 1개의 태스크가 필요합니다.")
        
        if len(request.tasks) > 5:
            raise HTTPException(400, "배치는 최대 5개의 태스크만 포함할 수 있습니다.")
        
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
        
        try:
            batch_id = await request_handler.submit_batch(task_inputs)
            return BatchSubmitResponse(
                batch_id=batch_id,
                task_count=len(task_inputs),
                message="배치가 성공적으로 제출되었습니다."
            )
        except Exception as e:
            raise HTTPException(500, str(e))
    
    @router.get("/status")
    async def get_status():
        """큐 상태 조회"""
        return request_handler.get_queue_status()
    
    @router.post("/refresh-keywords")
    async def refresh_keywords():
        """투자 키워드 갱신"""
        await request_handler.refresh_investment_keywords()
        return {"keywords": request_handler._investment_keywords}
    
    return router

