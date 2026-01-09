"""
페르소나 라우터 단위 테스트

SonarQube S1192 수정 후 에러 상수 및 엔드포인트 테스트

@author Axon (DoAi.Me Tech Lead)
@created 2026-01-09
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

# 테스트 대상 모듈 임포트
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../services/api'))

from api.routers.personas import (
    router,
    ERROR_INTERNAL_SERVER,
    ERROR_PERSONA_NOT_FOUND,
    ERROR_BAD_REQUEST,
)


# ============================================================
# 테스트 앱 설정
# ============================================================

app = FastAPI()
app.include_router(router)
client = TestClient(app)


# ============================================================
# 에러 상수 테스트
# ============================================================

class TestErrorConstants:
    """에러 메시지 상수 정의 테스트"""
    
    def test_error_internal_server_defined(self):
        """ERROR_INTERNAL_SERVER 상수가 정의되어 있어야 함"""
        assert ERROR_INTERNAL_SERVER == "Internal server error"
    
    def test_error_persona_not_found_defined(self):
        """ERROR_PERSONA_NOT_FOUND 상수가 정의되어 있어야 함"""
        assert ERROR_PERSONA_NOT_FOUND == "Persona not found"
    
    def test_error_bad_request_defined(self):
        """ERROR_BAD_REQUEST 상수가 정의되어 있어야 함"""
        assert ERROR_BAD_REQUEST == "Bad request"
    
    def test_constants_are_strings(self):
        """모든 에러 상수는 문자열이어야 함"""
        assert isinstance(ERROR_INTERNAL_SERVER, str)
        assert isinstance(ERROR_PERSONA_NOT_FOUND, str)
        assert isinstance(ERROR_BAD_REQUEST, str)


# ============================================================
# 목록 조회 테스트
# ============================================================

class TestListPersonas:
    """페르소나 목록 조회 테스트"""
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_list_personas_success(self, mock_service_factory):
        """목록 조회 성공 케이스"""
        # Mock 설정
        mock_service = MagicMock()
        mock_service.list_personas = AsyncMock(return_value={
            "success": True,
            "total": 2,
            "personas": [
                {"id": "uuid-1", "name": "Persona 1"},
                {"id": "uuid-2", "name": "Persona 2"},
            ]
        })
        mock_service_factory.return_value = mock_service
        
        # 요청 실행
        response = client.get("/personas")
        
        # 검증
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total"] == 2
        assert len(data["personas"]) == 2
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_list_personas_with_state_filter(self, mock_service_factory):
        """상태 필터를 사용한 목록 조회"""
        mock_service = MagicMock()
        mock_service.list_personas = AsyncMock(return_value={
            "success": True,
            "total": 1,
            "personas": [{"id": "uuid-1", "name": "Active Persona"}]
        })
        mock_service_factory.return_value = mock_service
        
        response = client.get("/personas?state=active")
        
        assert response.status_code == 200
        mock_service.list_personas.assert_called_once()
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_list_personas_internal_error(self, mock_service_factory):
        """목록 조회 시 내부 서버 오류"""
        mock_service = MagicMock()
        mock_service.list_personas = AsyncMock(side_effect=Exception("DB connection failed"))
        mock_service_factory.return_value = mock_service
        
        response = client.get("/personas")
        
        assert response.status_code == 500
        assert response.json()["detail"] == ERROR_INTERNAL_SERVER


# ============================================================
# 상세 조회 테스트
# ============================================================

class TestGetPersona:
    """페르소나 상세 조회 테스트"""
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_get_persona_success(self, mock_service_factory):
        """상세 조회 성공 케이스"""
        mock_service = MagicMock()
        mock_service.get_persona = AsyncMock(return_value={
            "id": "uuid-123",
            "name": "Test Persona",
            "state": "active"
        })
        mock_service_factory.return_value = mock_service
        
        response = client.get("/personas/uuid-123")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == "uuid-123"
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_get_persona_not_found(self, mock_service_factory):
        """존재하지 않는 페르소나 조회 시 404 반환"""
        mock_service = MagicMock()
        mock_service.get_persona = AsyncMock(return_value=None)
        mock_service_factory.return_value = mock_service
        
        response = client.get("/personas/non-existent-uuid")
        
        assert response.status_code == 404
        assert "페르소나를 찾을 수 없습니다" in response.json()["detail"]
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_get_persona_internal_error(self, mock_service_factory):
        """상세 조회 시 내부 서버 오류"""
        mock_service = MagicMock()
        mock_service.get_persona = AsyncMock(side_effect=Exception("Unexpected error"))
        mock_service_factory.return_value = mock_service
        
        response = client.get("/personas/uuid-123")
        
        assert response.status_code == 500
        assert response.json()["detail"] == ERROR_INTERNAL_SERVER


# ============================================================
# IDLE 검색 테스트
# ============================================================

class TestIdleSearch:
    """IDLE 검색 트리거 테스트"""
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_idle_search_success(self, mock_service_factory):
        """IDLE 검색 성공 케이스"""
        mock_service = MagicMock()
        mock_service.execute_idle_search = AsyncMock(return_value={
            "success": True,
            "persona_id": "uuid-123",
            "generated_keyword": "고양이 영상",
            "search_source": "openai",
            "activity_log_id": "log-456",
            "formative_impact": 0.85,
            "message": "검색어 생성 완료"
        })
        mock_service_factory.return_value = mock_service
        
        response = client.post(
            "/personas/uuid-123/idle-search",
            json={"force": False, "category_hint": None}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["generated_keyword"] == "고양이 영상"
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_idle_search_bad_request(self, mock_service_factory):
        """IDLE 검색 시 잘못된 요청 (ValueError)"""
        mock_service = MagicMock()
        mock_service.execute_idle_search = AsyncMock(
            side_effect=ValueError("페르소나가 IDLE 상태가 아닙니다")
        )
        mock_service_factory.return_value = mock_service
        
        response = client.post(
            "/personas/uuid-123/idle-search",
            json={"force": False}
        )
        
        assert response.status_code == 400
        assert "IDLE 상태가 아닙니다" in response.json()["detail"]
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_idle_search_internal_error(self, mock_service_factory):
        """IDLE 검색 시 내부 서버 오류"""
        mock_service = MagicMock()
        mock_service.execute_idle_search = AsyncMock(
            side_effect=Exception("OpenAI API error")
        )
        mock_service_factory.return_value = mock_service
        
        response = client.post(
            "/personas/uuid-123/idle-search",
            json={"force": False}
        )
        
        assert response.status_code == 500
        assert response.json()["detail"] == ERROR_INTERNAL_SERVER


# ============================================================
# 검색 기록 테스트
# ============================================================

class TestSearchHistory:
    """검색 기록 조회 테스트"""
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_search_history_success(self, mock_service_factory):
        """검색 기록 조회 성공"""
        mock_service = MagicMock()
        mock_service.get_search_history = AsyncMock(return_value={
            "success": True,
            "persona_id": "uuid-123",
            "total": 5,
            "history": [
                {"keyword": "게임 공략", "timestamp": "2026-01-09T10:00:00Z"}
            ],
            "traits_influence": {"gaming": 0.8}
        })
        mock_service_factory.return_value = mock_service
        
        response = client.get("/personas/uuid-123/search-history")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total"] == 5
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_search_history_internal_error(self, mock_service_factory):
        """검색 기록 조회 시 내부 서버 오류"""
        mock_service = MagicMock()
        mock_service.get_search_history = AsyncMock(
            side_effect=Exception("DB timeout")
        )
        mock_service_factory.return_value = mock_service
        
        response = client.get("/personas/uuid-123/search-history")
        
        assert response.status_code == 500
        assert response.json()["detail"] == ERROR_INTERNAL_SERVER


# ============================================================
# 검색 프로필 테스트
# ============================================================

class TestSearchProfile:
    """검색 프로필 조회 테스트"""
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_search_profile_success(self, mock_service_factory):
        """검색 프로필 조회 성공"""
        mock_service = MagicMock()
        mock_service.get_search_profile = AsyncMock(return_value={
            "success": True,
            "data": {
                "total_searches": 100,
                "unique_keywords": 45,
                "formative_searches": 20,
                "avg_formative_impact": 0.72
            }
        })
        mock_service_factory.return_value = mock_service
        
        response = client.get("/personas/uuid-123/search-profile")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["total_searches"] == 100
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_search_profile_not_found(self, mock_service_factory):
        """존재하지 않는 페르소나의 검색 프로필 조회"""
        mock_service = MagicMock()
        mock_service.get_search_profile = AsyncMock(
            side_effect=ValueError("Persona not found")
        )
        mock_service_factory.return_value = mock_service
        
        response = client.get("/personas/non-existent/search-profile")
        
        assert response.status_code == 404
    
    @patch('api.routers.personas.get_persona_search_service')
    def test_search_profile_internal_error(self, mock_service_factory):
        """검색 프로필 조회 시 내부 서버 오류"""
        mock_service = MagicMock()
        mock_service.get_search_profile = AsyncMock(
            side_effect=Exception("Analysis failed")
        )
        mock_service_factory.return_value = mock_service
        
        response = client.get("/personas/uuid-123/search-profile")
        
        assert response.status_code == 500
        assert response.json()["detail"] == ERROR_INTERNAL_SERVER


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
