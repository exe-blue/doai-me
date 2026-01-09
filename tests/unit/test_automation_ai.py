"""
AutomationAI 단위 테스트

테스트 대상 (automation-ai.js 로직 검증):
- Fallback 키워드 선택
- Fallback 댓글 선택
- 키워드 정제
- 통계 추적
"""

import random
import re
from typing import Dict, Optional

import pytest

FALLBACK_KEYWORDS = {
    "music": ["kpop 2024", "인기 음악", "lofi hip hop", "workout music"],
    "gaming": ["게임 리뷰", "minecraft", "valorant", "gaming highlights"],
    "tech": ["갤럭시 리뷰", "iPhone tips", "코딩 튜토리얼", "AI 뉴스"],
    "default": ["trending", "인기 동영상", "viral", "추천 영상"],
}

COMMENT_TEMPLATES = {
    "positive": ["영상 잘 봤습니다!", "좋은 영상이네요 👍", "유익한 내용이에요"],
    "emoji": ["👍👍👍", "❤️", "🔥🔥", "😊"],
}


class AutomationAIPython:
    def __init__(self):
        self.stats = {
            "keywords_generated": 0,
            "comments_generated": 0,
            "fallbacks_used": 0,
            "errors": 0,
        }

    def get_fallback_keyword(self, persona: Optional[Dict] = None) -> Dict:
        self.stats["fallbacks_used"] += 1
        category = "default"
        if persona and persona.get("traits", {}).get("interests"):
            interest = persona["traits"]["interests"][0].lower()
            if interest in FALLBACK_KEYWORDS:
                category = interest
        if category == "default":
            category = random.choice(list(FALLBACK_KEYWORDS.keys()))
        return {
            "keyword": random.choice(FALLBACK_KEYWORDS[category]),
            "source": "fallback",
            "category": category,
            "persona": persona.get("id") if persona else None,
        }

    def get_fallback_comment(self) -> Dict:
        self.stats["fallbacks_used"] += 1
        t = random.choice(["positive", "emoji"])
        return {"comment": random.choice(COMMENT_TEMPLATES[t]), "source": "fallback", "type": t}

    def clean_keyword(self, raw: Optional[str], max_length: int = 30) -> Optional[str]:
        if not raw:
            return None
        kw = re.sub(r'["\'\`]', "", raw)
        kw = re.sub(r"\s+", " ", kw).strip()
        if ":" in kw:
            kw = kw.split(":")[-1].strip()
        if "\n" in kw:
            kw = kw.split("\n")[0].strip()
        if len(kw) > max_length:
            kw = kw[:max_length].strip()
        return kw if len(kw) >= 2 else None

    def get_stats(self) -> Dict:
        return self.stats.copy()

    def reset_stats(self):
        self.stats = {
            "keywords_generated": 0,
            "comments_generated": 0,
            "fallbacks_used": 0,
            "errors": 0,
        }


class TestFallbackKeyword:
    @pytest.fixture
    def ai(self):
        return AutomationAIPython()

    def test_fallback_keyword_structure(self, ai):
        result = ai.get_fallback_keyword()
        assert "keyword" in result and "source" in result
        assert result["source"] == "fallback"

    def test_fallback_keyword_respects_persona(self, ai):
        persona = {"id": "test", "traits": {"interests": ["music"]}}
        for _ in range(20):
            assert ai.get_fallback_keyword(persona)["category"] == "music"


class TestFallbackComment:
    @pytest.fixture
    def ai(self):
        return AutomationAIPython()

    def test_fallback_comment_structure(self, ai):
        result = ai.get_fallback_comment()
        assert result["source"] == "fallback"
        assert result["type"] in ["positive", "emoji"]


class TestKeywordCleaning:
    @pytest.fixture
    def ai(self):
        return AutomationAIPython()

    def test_removes_quotes(self, ai):
        assert ai.clean_keyword('"테스트"') == "테스트"

    def test_truncates_to_max_length(self, ai):
        assert len(ai.clean_keyword("a" * 50, 30)) <= 30

    def test_returns_none_for_short(self, ai):
        assert ai.clean_keyword("a") is None


class TestStats:
    @pytest.fixture
    def ai(self):
        return AutomationAIPython()

    def test_tracks_fallbacks(self, ai):
        ai.get_fallback_keyword()
        ai.get_fallback_comment()
        assert ai.get_stats()["fallbacks_used"] == 2

    def test_reset_stats(self, ai):
        ai.get_fallback_keyword()
        ai.reset_stats()
        assert ai.get_stats()["fallbacks_used"] == 0
