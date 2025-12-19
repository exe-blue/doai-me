"""OpenAI 기반 댓글 생성 서비스"""

import os
import logging
import random
from typing import Optional, List

logger = logging.getLogger(__name__)


# 기본 댓글 템플릿 (API 없을 때 사용)
DEFAULT_COMMENTS = [
    "좋은 영상 감사합니다! 많은 도움이 됐어요 👍",
    "정말 유익한 내용이네요. 구독하고 갑니다!",
    "이런 영상 정말 필요했는데 감사합니다 ㅎㅎ",
    "잘 봤습니다! 앞으로도 좋은 영상 부탁드려요~",
    "와 진짜 퀄리티 대박이네요... 최고입니다!",
    "오늘도 좋은 정보 감사합니다 :)",
    "이 채널 진짜 알차네요. 추천합니다!",
    "설명이 너무 쉬워서 이해가 잘 됐어요",
    "역시 믿고 보는 채널! 항상 응원합니다",
    "이런 컨텐츠 더 많이 올려주세요!",
]


class CommentGenerator:
    """댓글 생성기"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.client = None
        
        if self.api_key:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=self.api_key)
                logger.info("OpenAI client initialized")
            except ImportError:
                logger.warning("openai package not installed")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
    
    def generate(
        self, 
        video_title: str, 
        keyword: Optional[str] = None,
        style: str = "friendly"
    ) -> str:
        """
        영상 제목을 기반으로 댓글 생성
        
        Args:
            video_title: 영상 제목
            keyword: 검색 키워드 (컨텍스트용)
            style: 댓글 스타일 (friendly, professional, casual)
            
        Returns:
            생성된 댓글
        """
        if not self.client:
            return self._get_default_comment()
        
        try:
            style_guide = {
                "friendly": "친근하고 따뜻한",
                "professional": "전문적이고 정중한",
                "casual": "가볍고 캐주얼한"
            }
            
            prompt = f"""YouTube 영상에 달 댓글을 생성해주세요.

영상 제목: {video_title}
{f'관련 키워드: {keyword}' if keyword else ''}

요구사항:
- {style_guide.get(style, '친근한')} 톤으로 작성
- 한국어로 2~3줄 정도
- 자연스럽고 진정성 있게
- 이모지 1~2개 포함 가능
- 광고성 문구 절대 금지
- 구독/좋아요 요청 금지

댓글만 출력하세요:"""

            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "당신은 YouTube 시청자입니다. 자연스러운 댓글을 작성합니다."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.8
            )
            
            comment = response.choices[0].message.content.strip()
            
            # 따옴표 제거
            comment = comment.strip('"\'')
            
            logger.info(f"Generated comment for: {video_title[:30]}...")
            return comment
            
        except Exception as e:
            logger.error(f"Failed to generate comment: {e}")
            return self._get_default_comment()
    
    def generate_batch(
        self, 
        video_title: str, 
        count: int = 5,
        keyword: Optional[str] = None
    ) -> List[str]:
        """
        여러 개의 댓글 생성
        
        Args:
            video_title: 영상 제목
            count: 생성할 댓글 수
            keyword: 검색 키워드
            
        Returns:
            댓글 리스트
        """
        comments = []
        styles = ["friendly", "casual", "professional"]
        
        for i in range(count):
            style = styles[i % len(styles)]
            comment = self.generate(video_title, keyword, style)
            if comment not in comments:
                comments.append(comment)
        
        return comments
    
    def _get_default_comment(self) -> str:
        """기본 댓글 반환"""
        return random.choice(DEFAULT_COMMENTS)


# 싱글톤 인스턴스
_generator: Optional[CommentGenerator] = None


def get_comment_generator() -> CommentGenerator:
    """댓글 생성기 인스턴스 가져오기"""
    global _generator
    if _generator is None:
        _generator = CommentGenerator()
    return _generator

