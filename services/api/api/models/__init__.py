"""
DoAi.Me Backend API - Models Package
"""

# Docker/standalone 호환 import
try:
    from .nocturne import (
        DailyMetrics,
        MoodTone,
        NocturneLine,
        NocturneLineCreate,
        NocturneLineResponse,
        PoeticElement,
    )
    from .persona_search import (
        BatchIdleSearchRequest,
        BatchIdleSearchResponse,
        IdleSearchRequest,
        IdleSearchResponse,
        PersonaSearchProfile,
        PersonaSearchProfileResponse,
        SearchHistoryItem,
        SearchHistoryResponse,
    )
except ImportError:
    from nocturne import (
        DailyMetrics,
        MoodTone,
        NocturneLine,
        NocturneLineCreate,
        NocturneLineResponse,
        PoeticElement,
    )
    from persona_search import (
        BatchIdleSearchRequest,
        BatchIdleSearchResponse,
        IdleSearchRequest,
        IdleSearchResponse,
        PersonaSearchProfile,
        PersonaSearchProfileResponse,
        SearchHistoryItem,
        SearchHistoryResponse,
    )

__all__ = [
    # Nocturne
    "NocturneLine",
    "NocturneLineCreate",
    "NocturneLineResponse",
    "DailyMetrics",
    "PoeticElement",
    "MoodTone",
    # Persona Search (P1)
    "IdleSearchRequest",
    "IdleSearchResponse",
    "SearchHistoryItem",
    "SearchHistoryResponse",
    "PersonaSearchProfile",
    "PersonaSearchProfileResponse",
    "BatchIdleSearchRequest",
    "BatchIdleSearchResponse",
]
