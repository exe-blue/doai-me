"""
설정 로더

환경변수 우선순위:
1. 환경변수 (DOAIME_API, DOAIME_GATEWAY, DOAIME_TIMEOUT)
2. config.yaml
3. 기본값
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

import yaml
from pydantic import BaseModel, Field


class APIConfig(BaseModel):
    """API 서버 설정"""

    server: str = Field(default="http://localhost:8001", description="API Server URL")
    gateway: str = Field(
        default="http://localhost:8000", description="Cloud Gateway URL"
    )
    timeout: int = Field(default=30, ge=1, le=300, description="HTTP 타임아웃 (초)")


class ToolsConfig(BaseModel):
    """Tool 설정"""

    confirm_required: list[str] = Field(
        default_factory=lambda: ["recovery.execute"],
        description="실행 전 확인이 필요한 Tool 목록",
    )


class LimitsConfig(BaseModel):
    """제한 설정"""

    max_results: int = Field(default=100, ge=1, le=1000, description="최대 결과 수")
    screenshot_timeout: int = Field(
        default=10, ge=1, le=60, description="스크린샷 타임아웃 (초)"
    )


class Config(BaseModel):
    """전체 설정"""

    api: APIConfig = Field(default_factory=APIConfig)
    tools: ToolsConfig = Field(default_factory=ToolsConfig)
    limits: LimitsConfig = Field(default_factory=LimitsConfig)


def _find_config_file() -> Optional[Path]:
    """config.yaml 파일 찾기"""
    # 현재 디렉토리에서 시작하여 상위로 탐색
    search_paths = [
        Path(__file__).parent.parent.parent / "config.yaml",  # src/utils -> root
        Path.cwd() / "config.yaml",
        Path.home() / ".doaime" / "config.yaml",
    ]

    for path in search_paths:
        if path.exists():
            return path
    return None


def _load_yaml_config() -> dict:
    """YAML 설정 파일 로드"""
    config_path = _find_config_file()
    if config_path is None:
        return {}

    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _apply_env_overrides(config: dict) -> dict:
    """환경변수로 설정 오버라이드"""
    # API 설정
    if "api" not in config:
        config["api"] = {}

    if api_server := os.getenv("DOAIME_API"):
        config["api"]["server"] = api_server

    if gateway := os.getenv("DOAIME_GATEWAY"):
        config["api"]["gateway"] = gateway

    if timeout := os.getenv("DOAIME_TIMEOUT"):
        try:
            config["api"]["timeout"] = int(timeout)
        except ValueError:
            pass

    # 제한 설정
    if "limits" not in config:
        config["limits"] = {}

    if max_results := os.getenv("DOAIME_MAX_RESULTS"):
        try:
            config["limits"]["max_results"] = int(max_results)
        except ValueError:
            pass

    return config


@lru_cache()
def get_config() -> Config:
    """설정 싱글톤 반환"""
    yaml_config = _load_yaml_config()
    merged_config = _apply_env_overrides(yaml_config)
    return Config(**merged_config)


# 편의를 위한 글로벌 인스턴스
config = get_config()
