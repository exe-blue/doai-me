"""
DoAi.Me MCP Tools

15개의 Tool을 제공:
- farm: overview, unhealthy
- monitoring: summary, alerts
- nodes: list, detail
- tasks: create, status
- youtube: queue, stats
- personas: list, drift
- recovery: execute, history
- devices: screenshot
"""

from .farm import register_farm_tools
from .monitoring import register_monitoring_tools
from .nodes import register_nodes_tools
from .tasks import register_tasks_tools
from .youtube import register_youtube_tools
from .personas import register_personas_tools
from .recovery import register_recovery_tools
from .devices import register_devices_tools


def register_all_tools(mcp):
    """모든 Tool을 MCP 서버에 등록"""
    register_farm_tools(mcp)
    register_monitoring_tools(mcp)
    register_nodes_tools(mcp)
    register_tasks_tools(mcp)
    register_youtube_tools(mcp)
    register_personas_tools(mcp)
    register_recovery_tools(mcp)
    register_devices_tools(mcp)


__all__ = ["register_all_tools"]
