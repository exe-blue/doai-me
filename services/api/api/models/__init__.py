"""
DoAi.Me Backend API - Models Package
"""

# Docker/standalone 호환 import
try:
    from .nocturne import (
        NocturneLine,
        NocturneLineCreate,
        NocturneLineResponse,
        DailyMetrics,
        PoeticElement,
        MoodTone,
    )
    from .persona_search import (
        IdleSearchRequest,
        IdleSearchResponse,
        SearchHistoryItem,
        SearchHistoryResponse,
        PersonaSearchProfile,
        PersonaSearchProfileResponse,
        BatchIdleSearchRequest,
        BatchIdleSearchResponse,
    )
except ImportError:
    from nocturne import (
        NocturneLine,
        NocturneLineCreate,
        NocturneLineResponse,
        DailyMetrics,
        PoeticElement,
        MoodTone,
    )
    from persona_search import (
        IdleSearchRequest,
        IdleSearchResponse,
        SearchHistoryItem,
        SearchHistoryResponse,
        PersonaSearchProfile,
        PersonaSearchProfileResponse,
        BatchIdleSearchRequest,
        BatchIdleSearchResponse,
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
