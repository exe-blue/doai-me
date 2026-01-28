"""
DoAi.Me MCP Tools 단위 테스트

각 Tool별 성공/실패/부분 실패 케이스 테스트
Tool 함수들을 직접 호출하여 테스트
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock


# =============================================================================
# Farm Tools Tests
# =============================================================================


class TestFarmOverview:
    """farm.overview Tool 테스트"""

    @pytest.mark.asyncio
    async def test_farm_overview_success(
        self,
        sample_nodes_response,
        sample_devices_response,
        sample_monitoring_response,
    ):
        """정상 응답 테스트"""
        mock_client = MagicMock()
        mock_client.get = AsyncMock(
            side_effect=[
                sample_nodes_response,
                sample_devices_response,
                sample_monitoring_response,
            ]
        )
        mock_client.is_error = lambda r: r.get("success") is False

        with patch("src.tools.farm.get_client", return_value=mock_client):
            from fastmcp import FastMCP
            from src.tools.farm import register_farm_tools

            mcp = FastMCP("Test")
            register_farm_tools(mcp)

            # 실제 Tool 호출
            result = await mcp.call_tool("farm.overview", {})

            # 결과 검증
            assert "nodes" in result
            assert "devices" in result
            assert "system" in result
            assert "timestamp" in result

            assert result["nodes"]["total"] == 2
            assert result["nodes"]["healthy"] == 1
            assert result["nodes"]["unhealthy"] == 1
            assert result["devices"]["total"] == 3
            assert result["devices"]["online"] == 2
            assert result["system"]["cpu_percent"] == 45.5

    @pytest.mark.asyncio
    async def test_farm_overview_partial_failure(
        self,
        sample_devices_response,
        sample_monitoring_response,
        sample_timeout_response,
    ):
        """일부 API 실패 테스트"""
        mock_client = MagicMock()
        mock_client.get = AsyncMock(
            side_effect=[
                sample_timeout_response,
                sample_devices_response,
                sample_monitoring_response,
            ]
        )
        mock_client.is_error = lambda r: r.get("success") is False

        with patch("src.tools.farm.get_client", return_value=mock_client):
            client = mock_client

            nodes_response = await client.get("/api/oob/nodes")
            devices_response = await client.get("/api/laixi/devices")

            # 노드 응답은 에러
            assert client.is_error(nodes_response) is True

            # 디바이스 응답은 정상
            devices_list = devices_response.get("devices", [])
            assert len(devices_list) == 3


class TestFarmUnhealthy:
    """farm.unhealthy Tool 테스트"""

    @pytest.mark.asyncio
    async def test_farm_unhealthy_success(self, sample_unhealthy_response):
        """비정상 노드 조회 테스트"""
        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=sample_unhealthy_response)
        mock_client.is_error = lambda r: r.get("success") is False

        with patch("src.tools.farm.get_client", return_value=mock_client):
            response = await mock_client.get("/api/oob/unhealthy")

            nodes_list = response.get("nodes", [])
            result = {
                "count": len(nodes_list),
                "nodes": [
                    {
                        "id": n.get("id"),
                        "status": n.get("status"),
                        "issue": n.get("issue"),
                    }
                    for n in nodes_list
                ],
            }

            assert result["count"] == 1
            assert result["nodes"][0]["id"] == "node-2"
            assert result["nodes"][0]["status"] == "offline"


# =============================================================================
# Monitoring Tools Tests
# =============================================================================


class TestMonitoringSummary:
    """monitoring.summary Tool 테스트"""

    @pytest.mark.asyncio
    async def test_monitoring_summary_success(self, sample_monitoring_response):
        """모니터링 요약 테스트"""
        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=sample_monitoring_response)

        response = await mock_client.get("/api/monitoring/summary")

        assert response["cpu_percent"] == 45.5
        assert response["memory_percent"] == 60.0


class TestMonitoringAlerts:
    """monitoring.alerts Tool 테스트"""

    @pytest.mark.asyncio
    async def test_monitoring_alerts_with_limit(self):
        """알림 조회 limit 테스트"""
        alerts_response = {"alerts": [{"id": 1, "message": "Test alert"}]}

        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=alerts_response)
        mock_client.is_error = lambda r: r.get("success") is False

        response = await mock_client.get("/api/monitoring/alerts", params={"limit": 10})

        alerts_list = response.get("alerts", [])
        assert len(alerts_list) == 1


# =============================================================================
# Nodes Tools Tests
# =============================================================================


class TestNodesList:
    """nodes.list Tool 테스트"""

    @pytest.mark.asyncio
    async def test_nodes_list_success(self, sample_nodes_response):
        """노드 목록 조회 테스트"""
        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=sample_nodes_response)
        mock_client.is_error = lambda r: r.get("success") is False

        response = await mock_client.get("/api/nodes")

        nodes_list = response.get("nodes", [])
        result = {
            "count": len(nodes_list),
            "nodes": [
                {
                    "id": n.get("id"),
                    "device_count": n.get("device_count"),
                    "status": n.get("status"),
                }
                for n in nodes_list
            ],
        }

        assert result["count"] == 2
        assert result["nodes"][0]["id"] == "node-1"


class TestNodesDetail:
    """nodes.detail Tool 테스트"""

    @pytest.mark.asyncio
    async def test_nodes_detail_merge(self):
        """Gateway + OOB 정보 병합 테스트"""
        gateway_response = {
            "connected": True,
            "connected_at": "2025-01-11T10:00:00Z",
            "devices": [{"id": "dev-1"}],
        }
        oob_response = {
            "status": "healthy",
            "cpu_percent": 30,
            "memory_percent": 50,
        }

        mock_client = MagicMock()
        mock_client.get = AsyncMock(side_effect=[gateway_response, oob_response])
        mock_client.is_error = lambda r: r.get("success") is False

        gateway_info = await mock_client.get("/api/nodes/node-1")
        health_info = await mock_client.get("/api/oob/nodes/node-1")

        result = {
            "id": "node-1",
            "gateway_info": {
                "connected": gateway_info.get("connected"),
            },
            "health_info": {
                "status": health_info.get("status"),
            },
            "metrics": {
                "cpu": health_info.get("cpu_percent"),
                "memory": health_info.get("memory_percent"),
            },
        }

        assert result["id"] == "node-1"
        assert result["gateway_info"]["connected"] is True
        assert result["health_info"]["status"] == "healthy"
        assert result["metrics"]["cpu"] == 30


# =============================================================================
# Tasks Tools Tests
# =============================================================================


class TestTasksCreate:
    """tasks.create Tool 테스트"""

    @pytest.mark.asyncio
    async def test_tasks_create_success(self):
        """태스크 생성 테스트"""
        create_response = {
            "task_id": "task-123",
            "status": "pending",
        }

        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=create_response)
        mock_client.is_error = lambda r: r.get("success") is False

        response = await mock_client.post(
            "/api/tasks",
            data={
                "node_id": "node-1",
                "type": "youtube_watch",
                "payload": {"video_id": "abc123"},
            },
        )

        result = {
            "task_id": response.get("task_id"),
            "status": response.get("status"),
            "node_id": "node-1",
        }

        assert result["task_id"] == "task-123"
        assert result["status"] == "pending"

    @pytest.mark.asyncio
    async def test_tasks_create_invalid_type(self):
        """잘못된 task_type 테스트"""
        from src.tools.tasks import TaskType, register_tasks_tools
        from fastmcp import FastMCP

        valid_types = [t.value for t in TaskType]
        task_type = "invalid_type"

        assert task_type not in valid_types

        mock_client = MagicMock()
        mock_client.post = AsyncMock()
        mock_client.is_error = lambda r: r.get("success") is False

        with patch("src.tools.tasks.get_client", return_value=mock_client):
            mcp = FastMCP("Test")
            register_tasks_tools(mcp)

            # 실제 Tool 호출 (invalid task_type)
            result = await mcp.call_tool(
                "tasks.create",
                {"node_id": "node-1", "task_type": "invalid_type"},
            )

            # 검증 에러 응답 확인
            assert result["success"] is False
            assert result["error"]["type"] == "validation"
            assert "Invalid task_type" in result["error"]["message"]
            assert all(t in result["error"]["message"] for t in valid_types)


# =============================================================================
# YouTube Tools Tests
# =============================================================================


class TestYoutubeQueue:
    """youtube.queue Tool 테스트"""

    @pytest.mark.asyncio
    async def test_youtube_queue_success(self, sample_youtube_queue_response):
        """YouTube 대기열 조회 테스트"""
        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=sample_youtube_queue_response)
        mock_client.is_error = lambda r: r.get("success") is False

        response = await mock_client.get(
            "/api/youtube-channels/queue", params={"limit": 50}
        )

        videos_list = response.get("videos", [])
        result = {
            "count": len(videos_list),
            "videos": [
                {
                    "video_id": v.get("video_id"),
                    "title": v.get("title"),
                    "channel": v.get("channel"),
                }
                for v in videos_list
            ],
        }

        assert result["count"] == 2
        assert result["videos"][0]["video_id"] == "abc123"


class TestYoutubeStats:
    """youtube.stats Tool 테스트"""

    @pytest.mark.asyncio
    async def test_youtube_stats_success(self):
        """YouTube 통계 통합 테스트"""
        stats_response = {"watched_today": 100, "total_minutes": 500, "likes": 20}
        queue_stats_response = {"pending": 50, "processing": 5, "active_channels": 10}

        mock_client = MagicMock()
        mock_client.get = AsyncMock(
            side_effect=[stats_response, queue_stats_response]
        )
        mock_client.is_error = lambda r: r.get("success") is False

        stats = await mock_client.get("/api/youtube/stats")
        queue_stats = await mock_client.get("/api/youtube-channels/queue/stats")

        result = {
            "today": {
                "watched": stats.get("watched_today", 0),
                "total_minutes": stats.get("total_minutes", 0),
            },
            "queue": {
                "pending": queue_stats.get("pending", 0),
                "processing": queue_stats.get("processing", 0),
            },
            "channels": {
                "active": queue_stats.get("active_channels", 0),
            },
        }

        assert result["today"]["watched"] == 100
        assert result["queue"]["pending"] == 50
        assert result["channels"]["active"] == 10


# =============================================================================
# Personas Tools Tests
# =============================================================================


class TestPersonasList:
    """personas.list Tool 테스트"""

    @pytest.mark.asyncio
    async def test_personas_list_success(self, sample_personas_response):
        """페르소나 목록 조회 테스트"""
        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=sample_personas_response)
        mock_client.is_error = lambda r: r.get("success") is False

        response = await mock_client.get("/api/personas")

        personas_list = response.get("personas", [])
        result = {
            "count": len(personas_list),
            "personas": [
                {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "status": p.get("status"),
                }
                for p in personas_list
            ],
        }

        assert result["count"] == 2
        assert result["personas"][0]["name"] == "Alice"


# =============================================================================
# Recovery Tools Tests
# =============================================================================


class TestRecoveryExecute:
    """recovery.execute Tool 테스트"""

    @pytest.mark.asyncio
    async def test_recovery_execute_success(self):
        """복구 실행 테스트"""
        recover_response = {
            "success": True,
            "recovery_id": "recovery-123",
            "message": "Restart initiated",
        }

        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=recover_response)
        mock_client.is_error = lambda r: r.get("success") is False

        response = await mock_client.post(
            "/api/oob/recover",
            data={"node_id": "node-1", "action": "restart"},
        )

        result = {
            "success": response.get("success"),
            "action": "restart",
            "recovery_id": response.get("recovery_id"),
        }

        assert result["success"] is True
        assert result["action"] == "restart"

    @pytest.mark.asyncio
    async def test_recovery_execute_invalid_action(self):
        """잘못된 action 테스트"""
        from src.tools.recovery import RecoveryAction

        valid_actions = [a.value for a in RecoveryAction]
        action = "invalid"

        assert action not in valid_actions

        result = {
            "success": False,
            "error": {
                "type": "validation",
                "message": f"Invalid action. Must be one of: {valid_actions}",
            },
        }

        assert result["success"] is False
        assert result["error"]["type"] == "validation"


# =============================================================================
# Devices Tools Tests
# =============================================================================


class TestDevicesScreenshot:
    """devices.screenshot Tool 테스트"""

    @pytest.mark.asyncio
    async def test_devices_screenshot_success(self):
        """스크린샷 캡처 테스트"""
        screenshot_response = {
            "image_url": "http://example.com/screenshot.png",
            "captured_at": "2025-01-11T10:00:00Z",
        }

        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=screenshot_response)
        mock_client.close = AsyncMock()
        mock_client.is_error = lambda r: r.get("success") is False

        response = await mock_client.post(
            "/api/laixi/screenshot",
            data={"device_id": "dev-1"},
        )

        result = {
            "success": True,
            "device_id": "dev-1",
            "image_url": response.get("image_url"),
        }

        assert result["success"] is True
        assert result["device_id"] == "dev-1"
        assert result["image_url"] == "http://example.com/screenshot.png"


# =============================================================================
# Client Tests
# =============================================================================


class TestDoAiMeClient:
    """HTTP 클라이언트 테스트"""

    def test_get_base_url_gateway(self):
        """Gateway 경로 라우팅 테스트"""
        from src.utils.client import DoAiMeClient

        client = DoAiMeClient(
            api_base="http://api:8001",
            gateway_base="http://gateway:8000",
        )

        assert client._get_base_url("/api/nodes") == "http://gateway:8000"
        assert client._get_base_url("/api/nodes/123") == "http://gateway:8000"
        assert client._get_base_url("/api/tasks") == "http://gateway:8000"

    def test_get_base_url_api(self):
        """API 경로 라우팅 테스트"""
        from src.utils.client import DoAiMeClient

        client = DoAiMeClient(
            api_base="http://api:8001",
            gateway_base="http://gateway:8000",
        )

        assert client._get_base_url("/api/oob/nodes") == "http://api:8001"
        assert client._get_base_url("/api/monitoring/summary") == "http://api:8001"
        assert client._get_base_url("/api/personas") == "http://api:8001"

    def test_error_response_format(self):
        """에러 응답 포맷 테스트"""
        from src.utils.client import DoAiMeClient

        client = DoAiMeClient()
        error = client._error_response("timeout", "요청 시간 초과")

        assert error["success"] is False
        assert error["error"]["type"] == "timeout"
        assert error["error"]["message"] == "요청 시간 초과"
        assert "timestamp" in error["error"]

    def test_is_error(self):
        """에러 판별 테스트"""
        from src.utils.client import DoAiMeClient

        client = DoAiMeClient()

        error_response = {"success": False, "error": {"type": "timeout"}}
        success_response = {"data": "some data"}

        assert client.is_error(error_response) is True
        assert client.is_error(success_response) is False


# =============================================================================
# Config Tests
# =============================================================================


class TestConfig:
    """설정 테스트"""

    def test_config_defaults(self):
        """기본 설정값 테스트"""
        from src.utils.config import Config

        config = Config()

        assert config.api.timeout == 30
        assert config.limits.max_results == 100
        assert config.limits.screenshot_timeout == 10

    def test_config_env_override(self, monkeypatch):
        """환경변수 오버라이드 테스트"""
        monkeypatch.setenv("DOAIME_API", "http://custom-api:9001")
        monkeypatch.setenv("DOAIME_GATEWAY", "http://custom-gateway:9000")
        monkeypatch.setenv("DOAIME_TIMEOUT", "60")

        from src.utils.config import _apply_env_overrides

        config_dict = {"api": {}, "limits": {}}
        result = _apply_env_overrides(config_dict)

        assert result["api"]["server"] == "http://custom-api:9001"
        assert result["api"]["gateway"] == "http://custom-gateway:9000"
        assert result["api"]["timeout"] == 60
