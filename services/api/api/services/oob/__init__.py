# DoAi.Me OOB (Out-of-Band) Services
# Strategos Security Design v1 구현
#
# 구성요소:
# - HealthCollector: 노드 상태 메트릭 수집
# - RuleEngine: Threshold 기반 장애 판단
# - RecoveryDispatcher: Tailscale SSH를 통한 복구 실행
# - BoxClient: TCP를 통한 박스 전원 제어

from .box_client import BoxClient, BoxCommand
from .health_collector import HealthCollector, NodeHealth, NodeMetrics
from .recovery_dispatcher import RecoveryDispatcher, RecoveryResult
from .rule_engine import FailureLevel, RecoveryAction, RuleEngine

__all__ = [
    "HealthCollector",
    "NodeHealth",
    "NodeMetrics",
    "RuleEngine",
    "FailureLevel",
    "RecoveryAction",
    "RecoveryDispatcher",
    "RecoveryResult",
    "BoxClient",
    "BoxCommand",
]
