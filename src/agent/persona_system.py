"""
페르소나 코멘터 시스템 (ACT_003)

10개의 다양한 페르소나를 관리하고 자연스러운 댓글을 생성합니다.

페르소나 유형:
- 전문가: 투자/경제 전문가 스타일
- 초보자: 배우려는 자세의 질문형
- 열정팬: 적극적인 응원과 지지
- 분석가: 데이터 기반 의견
- 회의론자: 건설적 비판
- 유머러스: 가벼운 농담 스타일
- 공감형: 감정적 공감 표현
- 조언자: 경험 기반 조언
- 관찰자: 중립적 관찰 의견
- 트렌드세터: 최신 트렌드 언급
"""

import random
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import asyncio

logger = logging.getLogger(__name__)


class PersonaType(str, Enum):
    """페르소나 타입"""
    EXPERT = "expert"              # 전문가
    BEGINNER = "beginner"          # 초보자
    ENTHUSIAST = "enthusiast"      # 열정팬
    ANALYST = "analyst"            # 분석가
    SKEPTIC = "skeptic"            # 회의론자
    HUMOROUS = "humorous"          # 유머러스
    EMPATHETIC = "empathetic"      # 공감형
    ADVISOR = "advisor"            # 조언자
    OBSERVER = "observer"          # 관찰자
    TRENDSETTER = "trendsetter"    # 트렌드세터


@dataclass
class Persona:
    """페르소나 정의"""
    id: str
    name: str
    persona_type: PersonaType
    
    # 프로필
    age_range: tuple = (25, 45)
    interests: List[str] = field(default_factory=list)
    
    # 스타일
    tone: str = "neutral"           # formal, casual, neutral
    emoji_frequency: float = 0.3     # 이모지 사용 빈도 (0-1)
    comment_length: str = "medium"   # short, medium, long
    
    # 행동
    like_probability: float = 0.7
    reply_probability: float = 0.3
    subscribe_probability: float = 0.1
    
    # 활동 시간대 선호 (0-23시)
    active_hours: List[int] = field(default_factory=lambda: list(range(9, 23)))
    
    # 댓글 템플릿
    templates: List[str] = field(default_factory=list)
    
    # 금지 키워드
    avoid_words: List[str] = field(default_factory=list)
    
    # 상태
    comments_today: int = 0
    last_comment_at: Optional[datetime] = None


# 10개 기본 페르소나 정의
DEFAULT_PERSONAS: Dict[str, Persona] = {
    "expert_01": Persona(
        id="expert_01",
        name="투자전문가K",
        persona_type=PersonaType.EXPERT,
        age_range=(35, 50),
        interests=["투자", "경제", "재테크", "주식"],
        tone="formal",
        emoji_frequency=0.1,
        comment_length="long",
        like_probability=0.5,
        reply_probability=0.4,
        templates=[
            "전문가 관점에서 보면, {topic}에 대한 분석이 정확합니다. 특히 {detail} 부분이 인상적이네요.",
            "좋은 분석입니다. 다만 {consideration}도 고려해보시면 좋을 것 같습니다.",
            "이 영상에서 다룬 {topic} 내용은 실제 시장 동향과 일치합니다.",
            "핵심을 잘 짚어주셨네요. {topic}에 대해 더 알고 싶다면 추가 자료를 찾아보시길 권합니다.",
        ]
    ),
    "beginner_02": Persona(
        id="beginner_02",
        name="투자초보",
        persona_type=PersonaType.BEGINNER,
        age_range=(22, 30),
        interests=["재테크입문", "주식공부"],
        tone="casual",
        emoji_frequency=0.5,
        comment_length="short",
        like_probability=0.8,
        reply_probability=0.2,
        templates=[
            "우와 정말 도움이 됐어요! 감사합니다 👍",
            "{topic} 처음 배우는데 이해하기 쉽네요 ㅎㅎ",
            "혹시 {question}에 대해서도 다뤄주실 수 있나요?",
            "저같은 초보도 이해할 수 있게 설명해주셔서 감사해요!",
            "이거 저장해두고 계속 봐야겠어요 📚",
        ]
    ),
    "enthusiast_03": Persona(
        id="enthusiast_03",
        name="열정투자러",
        persona_type=PersonaType.ENTHUSIAST,
        age_range=(25, 40),
        interests=["투자", "성공", "동기부여"],
        tone="casual",
        emoji_frequency=0.7,
        comment_length="medium",
        like_probability=0.9,
        reply_probability=0.5,
        subscribe_probability=0.3,
        templates=[
            "진짜 최고의 콘텐츠입니다!! 🔥🔥",
            "항상 좋은 영상 감사합니다 구독 좋아요 알림설정 완료! 💪",
            "{topic} 덕분에 많이 배우고 있어요! 화이팅!",
            "이 채널 발견한 게 정말 행운이에요 ⭐",
            "매번 영상 기다려요! 응원합니다 👏👏",
        ]
    ),
    "analyst_04": Persona(
        id="analyst_04",
        name="데이터분석가",
        persona_type=PersonaType.ANALYST,
        age_range=(28, 45),
        interests=["데이터", "통계", "분석", "리서치"],
        tone="formal",
        emoji_frequency=0.0,
        comment_length="long",
        like_probability=0.4,
        reply_probability=0.5,
        templates=[
            "{topic}에 대한 데이터를 보면, 실제로 {data} 수준의 결과가 나타납니다.",
            "통계적으로 분석해보면 {analysis}라는 결론을 도출할 수 있겠네요.",
            "영상의 내용을 뒷받침하는 추가 데이터로는 {source}가 있습니다.",
            "정량적 관점에서 {topic}을 평가하면 {evaluation}입니다.",
        ]
    ),
    "skeptic_05": Persona(
        id="skeptic_05",
        name="비판적시청자",
        persona_type=PersonaType.SKEPTIC,
        age_range=(30, 50),
        interests=["팩트체크", "비판적사고"],
        tone="neutral",
        emoji_frequency=0.1,
        comment_length="medium",
        like_probability=0.3,
        reply_probability=0.6,
        templates=[
            "좋은 내용이지만, {counterpoint}도 고려해볼 필요가 있지 않을까요?",
            "한 가지 궁금한 점이 있는데, {question}에 대한 근거가 있나요?",
            "다른 관점에서 보면 {alternative}도 가능하지 않을까요?",
            "내용은 좋지만 {limitation}는 한계가 있어 보입니다.",
        ]
    ),
    "humorous_06": Persona(
        id="humorous_06",
        name="개그투자자",
        persona_type=PersonaType.HUMOROUS,
        age_range=(22, 35),
        interests=["유머", "밈", "재테크"],
        tone="casual",
        emoji_frequency=0.6,
        comment_length="short",
        like_probability=0.7,
        reply_probability=0.3,
        templates=[
            "ㅋㅋㅋㅋ 이건 찐이다 찐 😂",
            "주식은 예술이야... (손실 아님 주의)",
            "우리 모두 부자 됩시다 💰 (희망편)",
            "이 영상 보고 바로 실행 ㄱㄱ (아 그전에 저금부터...)",
            "설명 찰지네요 ㅋㅋ 구독!",
        ]
    ),
    "empathetic_07": Persona(
        id="empathetic_07",
        name="공감러",
        persona_type=PersonaType.EMPATHETIC,
        age_range=(25, 45),
        interests=["공감", "격려", "응원"],
        tone="casual",
        emoji_frequency=0.5,
        comment_length="medium",
        like_probability=0.8,
        reply_probability=0.4,
        templates=[
            "저도 같은 고민이 있었는데 이 영상 보고 많이 위로받았어요 💙",
            "{topic} 때문에 고민하시는 분들 많을텐데 정말 도움되는 영상이네요",
            "영상 제작 하시느라 수고 많으셨어요. 진심이 느껴집니다 ❤️",
            "댓글에 계신 분들 모두 화이팅이에요! 같이 힘내봐요 💪",
        ]
    ),
    "advisor_08": Persona(
        id="advisor_08",
        name="경험자",
        persona_type=PersonaType.ADVISOR,
        age_range=(35, 55),
        interests=["경험", "조언", "멘토링"],
        tone="neutral",
        emoji_frequency=0.2,
        comment_length="long",
        like_probability=0.5,
        reply_probability=0.5,
        templates=[
            "10년 경험으로 말씀드리면, {topic}는 정말 중요합니다. 특히 {advice}를 추천드려요.",
            "저도 예전에 {experience} 경험이 있는데, 이 영상처럼 접근하시면 됩니다.",
            "조언을 드리자면 {advice}. 이게 장기적으로 도움이 됩니다.",
            "비슷한 상황을 겪어봐서 아는데, {tip} 하시면 좋아요.",
        ]
    ),
    "observer_09": Persona(
        id="observer_09",
        name="관찰자",
        persona_type=PersonaType.OBSERVER,
        age_range=(28, 50),
        interests=["관찰", "기록"],
        tone="neutral",
        emoji_frequency=0.1,
        comment_length="short",
        like_probability=0.4,
        reply_probability=0.2,
        templates=[
            "흥미로운 관점이네요.",
            "참고할 만한 내용입니다.",
            "{topic}에 대해 새롭게 알게 됐습니다.",
            "좋은 정보 감사합니다.",
        ]
    ),
    "trendsetter_10": Persona(
        id="trendsetter_10",
        name="트렌드헌터",
        persona_type=PersonaType.TRENDSETTER,
        age_range=(20, 32),
        interests=["트렌드", "새로운것", "얼리어답터"],
        tone="casual",
        emoji_frequency=0.6,
        comment_length="medium",
        like_probability=0.7,
        reply_probability=0.3,
        templates=[
            "요즘 핫한 {trend}랑 연결되는 내용이네요! 🔥",
            "이거 곧 대세될듯 남들보다 먼저 봤다 ㅎㅎ",
            "최신 트렌드 잘 짚어주시네요 👀",
            "요즘 이런 콘텐츠가 진짜 필요한 시대!",
        ]
    ),
}


class PersonaManager:
    """
    페르소나 관리자
    
    600대 디바이스에 페르소나를 할당하고 관리합니다.
    """
    
    def __init__(self, personas: Optional[Dict[str, Persona]] = None):
        self.personas = personas or DEFAULT_PERSONAS.copy()
        self.logger = logging.getLogger(__name__)
        
        # 디바이스-페르소나 매핑
        self._device_assignments: Dict[int, str] = {}
        
        # 댓글 쿨다운 (디바이스별)
        self._cooldowns: Dict[int, datetime] = {}
        self._min_cooldown = timedelta(minutes=5)
    
    def assign_persona_to_device(
        self,
        device_id: int,
        persona_id: Optional[str] = None
    ) -> Persona:
        """
        디바이스에 페르소나 할당
        
        Args:
            device_id: 디바이스 ID
            persona_id: 특정 페르소나 (None이면 랜덤)
            
        Returns:
            할당된 페르소나
        """
        if persona_id and persona_id in self.personas:
            pid = persona_id
        else:
            # 균등 분배를 위해 디바이스 ID 기반 할당
            persona_ids = list(self.personas.keys())
            pid = persona_ids[device_id % len(persona_ids)]
        
        self._device_assignments[device_id] = pid
        self.logger.debug(f"디바이스 {device_id}에 페르소나 '{pid}' 할당")
        
        return self.personas[pid]
    
    def get_device_persona(self, device_id: int) -> Optional[Persona]:
        """디바이스의 현재 페르소나"""
        if device_id not in self._device_assignments:
            return self.assign_persona_to_device(device_id)
        
        pid = self._device_assignments[device_id]
        return self.personas.get(pid)
    
    def rotate_persona(self, device_id: int) -> Persona:
        """
        디바이스의 페르소나 로테이션
        
        현재 페르소나를 제외하고 다른 페르소나로 변경
        """
        current_pid = self._device_assignments.get(device_id)
        available = [pid for pid in self.personas.keys() if pid != current_pid]
        
        if not available:
            available = list(self.personas.keys())
        
        new_pid = random.choice(available)
        self._device_assignments[device_id] = new_pid
        
        self.logger.info(f"디바이스 {device_id} 페르소나 변경: {current_pid} -> {new_pid}")
        return self.personas[new_pid]
    
    def can_comment(self, device_id: int) -> bool:
        """댓글 가능 여부 확인 (쿨다운)"""
        if device_id not in self._cooldowns:
            return True
        
        return datetime.now() - self._cooldowns[device_id] > self._min_cooldown
    
    def record_comment(self, device_id: int) -> None:
        """댓글 기록"""
        self._cooldowns[device_id] = datetime.now()
        
        # 페르소나 통계 업데이트
        persona = self.get_device_persona(device_id)
        if persona:
            persona.comments_today += 1
            persona.last_comment_at = datetime.now()
    
    def get_assignment_stats(self) -> Dict[str, int]:
        """페르소나별 할당 통계"""
        stats = {pid: 0 for pid in self.personas.keys()}
        
        for pid in self._device_assignments.values():
            if pid in stats:
                stats[pid] += 1
        
        return stats


class CommentGenerator:
    """
    페르소나 기반 댓글 생성기
    """
    
    def __init__(self, persona_manager: PersonaManager):
        self.persona_manager = persona_manager
        self.logger = logging.getLogger(__name__)
        
        # 공통 변수
        self._topics = [
            "투자", "재테크", "주식", "경제", "금융",
            "ETF", "배당", "성장주", "가치투자"
        ]
        
        self._details = [
            "시장 분석", "리스크 관리", "포트폴리오", "분산투자",
            "장기 투자", "복리 효과"
        ]
        
        self._considerations = [
            "리스크 요소", "시장 변동성", "세금 이슈", "환율 영향"
        ]
        
        self._trends = [
            "AI 투자", "ESG", "메타버스", "친환경", "2차전지"
        ]
    
    def generate_comment(
        self,
        device_id: int,
        video_context: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        페르소나 기반 댓글 생성
        
        Args:
            device_id: 디바이스 ID
            video_context: 영상 컨텍스트 (제목, 채널 등)
            
        Returns:
            생성된 댓글 또는 None
        """
        persona = self.persona_manager.get_device_persona(device_id)
        if not persona:
            return None
        
        # 쿨다운 확인
        if not self.persona_manager.can_comment(device_id):
            return None
        
        # 활동 시간대 확인
        current_hour = datetime.now().hour
        if current_hour not in persona.active_hours:
            return None
        
        # 템플릿 선택
        if not persona.templates:
            return None
        
        template = random.choice(persona.templates)
        
        # 변수 대체
        comment = self._fill_template(template, video_context)
        
        # 이모지 추가
        if random.random() < persona.emoji_frequency:
            comment = self._add_emoji(comment, persona.persona_type)
        
        # 댓글 기록
        self.persona_manager.record_comment(device_id)
        
        return comment
    
    def _fill_template(
        self,
        template: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """템플릿 변수 채우기"""
        replacements = {
            "{topic}": random.choice(self._topics),
            "{detail}": random.choice(self._details),
            "{consideration}": random.choice(self._considerations),
            "{trend}": random.choice(self._trends),
            "{question}": "초보자가 시작하기 좋은 방법",
            "{counterpoint}": "다른 시각",
            "{alternative}": "대안적 접근",
            "{limitation}": "일부 제한 사항",
            "{data}": "유의미한",
            "{analysis}": "긍정적인 전망",
            "{source}": "최신 연구 자료",
            "{evaluation}": "긍정적",
            "{advice}": "꾸준히 공부하는 것",
            "{experience}": "비슷한",
            "{tip}": "기본기를 탄탄히",
        }
        
        # 컨텍스트에서 추가 정보
        if context:
            if "title" in context:
                replacements["{title}"] = context["title"]
            if "channel" in context:
                replacements["{channel}"] = context["channel"]
        
        result = template
        for key, value in replacements.items():
            result = result.replace(key, value)
        
        return result
    
    def _add_emoji(self, text: str, persona_type: PersonaType) -> str:
        """페르소나 타입에 맞는 이모지 추가"""
        emojis_by_type = {
            PersonaType.EXPERT: ["📊", "💡", "📈"],
            PersonaType.BEGINNER: ["🤔", "📚", "👍"],
            PersonaType.ENTHUSIAST: ["🔥", "💪", "⭐", "👏"],
            PersonaType.ANALYST: ["📉", "🔍", "📋"],
            PersonaType.SKEPTIC: ["🤨", "❓"],
            PersonaType.HUMOROUS: ["😂", "🤣", "😆", "💰"],
            PersonaType.EMPATHETIC: ["❤️", "💙", "🤗", "💪"],
            PersonaType.ADVISOR: ["👨‍💼", "💬", "✅"],
            PersonaType.OBSERVER: ["👀", "📝"],
            PersonaType.TRENDSETTER: ["🔥", "⚡", "🚀", "👀"],
        }
        
        emojis = emojis_by_type.get(persona_type, ["👍"])
        
        # 끝에 이모지 추가
        if not text.endswith(tuple(["!", "?", "."])):
            text += " "
        
        text += random.choice(emojis)
        
        return text
    
    def should_like(self, device_id: int) -> bool:
        """좋아요 여부 결정"""
        persona = self.persona_manager.get_device_persona(device_id)
        if not persona:
            return random.random() < 0.5
        
        return random.random() < persona.like_probability
    
    def should_subscribe(self, device_id: int) -> bool:
        """구독 여부 결정"""
        persona = self.persona_manager.get_device_persona(device_id)
        if not persona:
            return random.random() < 0.05
        
        return random.random() < persona.subscribe_probability


# 싱글톤 인스턴스
_persona_manager: Optional[PersonaManager] = None
_comment_generator: Optional[CommentGenerator] = None


def get_persona_manager() -> PersonaManager:
    """페르소나 관리자 싱글톤"""
    global _persona_manager
    if _persona_manager is None:
        _persona_manager = PersonaManager()
    return _persona_manager


def get_comment_generator() -> CommentGenerator:
    """댓글 생성기 싱글톤"""
    global _comment_generator
    if _comment_generator is None:
        _comment_generator = CommentGenerator(get_persona_manager())
    return _comment_generator

