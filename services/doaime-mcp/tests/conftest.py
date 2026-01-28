"""
pytest fixtures for DoAi.Me MCP Server tests

Mock HTTP 클라이언트를 제공하여 실제 서버 없이 테스트 가능
"""

import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

# src 디렉토리를 path에 추가
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@pytest.fixture
def mock_config():
    """Mock 설정"""
    from src.utils.config import Config, APIConfig, ToolsConfig, LimitsConfig

    return Config(
        api=APIConfig(
            server="http://test-api:8001",
            gateway="http://test-gateway:8000",
            timeout=5,
        ),
        tools=ToolsConfig(confirm_required=["recovery.execute"]),
        limits=LimitsConfig(max_results=100, screenshot_timeout=10),
    )


@pytest.fixture
def mock_client(mock_config):
    """Mock HTTP 클라이언트"""
    from src.utils.client import DoAiMeClient

    client = DoAiMeClient(
        api_base=mock_config.api.server,
        gateway_base=mock_config.api.gateway,
        timeout=mock_config.api.timeout,
    )

    # HTTP 메서드를 mock
    client.get = AsyncMock()
    client.post = AsyncMock()

    return client


@pytest.fixture
def patch_get_client(mock_client):
    """get_client를 mock으로 대체"""
    with patch("src.utils.client.get_client", return_value=mock_client):
        yield mock_client


@pytest.fixture
def patch_get_config(mock_config):
    """get_config를 mock으로 대체"""
    with patch("src.utils.config.get_config", return_value=mock_config):
        yield mock_config


# =============================================================================
# 샘플 API 응답 데이터
# =============================================================================


@pytest.fixture
def sample_nodes_response():
    """샘플 노드 목록 응답"""
    return {
        "nodes": [
            {
                "id": "node-1",
                "status": "healthy",
                "last_seen": "2025-01-11T10:00:00Z",
                "device_count": 5,
            },
            {
                "id": "node-2",
                "status": "unhealthy",
                "last_seen": "2025-01-11T09:00:00Z",
                "device_count": 3,
            },
        ]
    }


@pytest.fixture
def sample_devices_response():
    """샘플 디바이스 목록 응답"""
    return {
        "devices": [
            {"id": "dev-1", "status": "online", "node_id": "node-1"},
            {"id": "dev-2", "status": "online", "node_id": "node-1"},
            {"id": "dev-3", "status": "offline", "node_id": "node-2"},
        ]
    }


@pytest.fixture
def sample_monitoring_response():
    """샘플 모니터링 응답"""
    return {
        "cpu_percent": 45.5,
        "memory_percent": 60.0,
        "uptime": "5 days, 3:20:15",
    }


@pytest.fixture
def sample_unhealthy_response():
    """샘플 비정상 노드 응답"""
    return {
        "nodes": [
            {
                "id": "node-2",
                "status": "offline",
                "issue": "Connection timeout",
                "last_healthy": "2025-01-11T08:00:00Z",
            }
        ]
    }


@pytest.fixture
def sample_youtube_queue_response():
    """샘플 YouTube 대기열 응답"""
    return {
        "videos": [
            {
                "video_id": "abc123",
                "title": "Test Video 1",
                "channel": "Test Channel",
                "priority": 1,
                "queued_at": "2025-01-11T10:00:00Z",
            },
            {
                "video_id": "def456",
                "title": "Test Video 2",
                "channel": "Test Channel",
                "priority": 2,
                "queued_at": "2025-01-11T10:05:00Z",
            },
        ]
    }


@pytest.fixture
def sample_personas_response():
    """샘플 페르소나 목록 응답"""
    return {
        "personas": [
            {
                "id": "persona-1",
                "name": "Alice",
                "status": "active",
                "device_id": "dev-1",
                "relevance_score": 0.85,
            },
            {
                "id": "persona-2",
                "name": "Bob",
                "status": "idle",
                "device_id": "dev-2",
                "relevance_score": 0.72,
            },
        ]
    }


@pytest.fixture
def sample_error_response():
    """샘플 에러 응답"""
    return {
        "success": False,
        "error": {
            "type": "connection",
            "message": "서버 연결 실패: http://test-api:8001",
            "timestamp": "2025-01-11T10:00:00Z",
        },
    }


@pytest.fixture
def sample_timeout_response():
    """샘플 타임아웃 응답"""
    return {
        "success": False,
        "error": {
            "type": "timeout",
            "message": "요청 시간 초과: /api/oob/nodes",
            "timestamp": "2025-01-11T10:00:00Z",
        },
    }
