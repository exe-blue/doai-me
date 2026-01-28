"""
Cloud Gateway Configuration
환경 변수 기반 설정 관리 (Pydantic Settings)
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class GatewayConfig(BaseSettings):
    """게이트웨이 서버 설정"""

    # ===========================================
    # Protocol Settings
    # ===========================================
    protocol_version: str = "1.0"
    heartbeat_timeout: int = Field(default=90, description="HEARTBEAT 타임아웃 (초)")
    heartbeat_interval: int = Field(default=30, description="HEARTBEAT 간격 (초)")
    max_tasks_per_node: int = Field(default=5, description="노드당 최대 동시 태스크")
    command_timeout: int = Field(default=300, description="명령 응답 대기 시간 (초)")
    hello_timeout: int = Field(default=10, description="HELLO 대기 시간 (초)")

    # ===========================================
    # Server Settings
    # ===========================================
    host: str = Field(default="0.0.0.0", description="서버 호스트")
    port: int = Field(default=8000, description="서버 포트")

    # ===========================================
    # Supabase Configuration
    # ===========================================
    supabase_url: Optional[str] = Field(default=None, alias="SUPABASE_URL")
    supabase_service_key: Optional[str] = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")

    # ===========================================
    # Security
    # ===========================================
    verify_signature: bool = Field(default=True, alias="VERIFY_SIGNATURE")
    node_shared_secret: Optional[str] = Field(default=None, alias="NODE_SHARED_SECRET")

    # ===========================================
    # CORS
    # ===========================================
    cors_origins: List[str] = Field(default=["*"])

    # ===========================================
    # OOB Integration
    # ===========================================
    oob_api_url: Optional[str] = Field(default=None, alias="OOB_API_URL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"
        populate_by_name = True

    def is_supabase_configured(self) -> bool:
        """Supabase 설정 여부"""
        return bool(self.supabase_url and self.supabase_service_key)


# Legacy Config class for backward compatibility
class Config:
    """레거시 호환용 설정 (점진적 마이그레이션)"""

    _instance: Optional[GatewayConfig] = None

    @classmethod
    def _get_config(cls) -> GatewayConfig:
        if cls._instance is None:
            cls._instance = GatewayConfig()
        return cls._instance

    @classmethod
    @property
    def HEARTBEAT_TIMEOUT(cls) -> int:
        return cls._get_config().heartbeat_timeout

    @classmethod
    @property
    def HEARTBEAT_INTERVAL(cls) -> int:
        return cls._get_config().heartbeat_interval

    @classmethod
    @property
    def MAX_TASKS_PER_NODE(cls) -> int:
        return cls._get_config().max_tasks_per_node

    @classmethod
    @property
    def COMMAND_TIMEOUT(cls) -> int:
        return cls._get_config().command_timeout

    @classmethod
    @property
    def HELLO_TIMEOUT(cls) -> int:
        return cls._get_config().hello_timeout

    @classmethod
    @property
    def PROTOCOL_VERSION(cls) -> str:
        return cls._get_config().protocol_version

    @classmethod
    @property
    def SUPABASE_URL(cls) -> str:
        return cls._get_config().supabase_url or ""

    @classmethod
    @property
    def SUPABASE_SERVICE_KEY(cls) -> str:
        return cls._get_config().supabase_service_key or ""

    @classmethod
    @property
    def VERIFY_SIGNATURE(cls) -> bool:
        return cls._get_config().verify_signature

    @classmethod
    @property
    def CORS_ORIGINS(cls) -> List[str]:
        return cls._get_config().cors_origins


@lru_cache()
def get_config() -> GatewayConfig:
    """설정 싱글톤 반환"""
    return GatewayConfig()
