"""
Tests for shared/cache.py - M4 Scaling Cache Layer

Tests the Redis/Memory caching layer used for node health caching,
rate limiting, and system stats.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.cache import (
    Cache,
    CacheBackend,
    CacheKey,
    MemoryBackend,
    RateLimiter,
    RedisBackend,
    get_cache,
    reset_cache,
)


class TestCacheKey:
    """Test CacheKey enum"""

    def test_cache_key_values(self):
        """Verify cache key prefix values"""
        assert CacheKey.NODE_HEALTH.value == "node:health"
        assert CacheKey.NODE_METRICS.value == "node:metrics"
        assert CacheKey.DEVICE_STATUS.value == "device:status"
        assert CacheKey.JOB_STATS.value == "stats:jobs"
        assert CacheKey.RATE_LIMIT.value == "ratelimit"

    def test_cache_key_is_string_enum(self):
        """Verify CacheKey inherits from str"""
        assert isinstance(CacheKey.NODE_HEALTH, str)
        assert CacheKey.NODE_HEALTH == "node:health"


class TestMemoryBackend:
    """Test MemoryBackend implementation"""

    @pytest.fixture
    def backend(self):
        return MemoryBackend(max_size=100)

    @pytest.mark.asyncio
    async def test_set_and_get(self, backend):
        """Test basic set and get operations"""
        await backend.set("test_key", {"value": 42}, ttl=60)
        result = await backend.get("test_key")
        assert result == {"value": 42}

    @pytest.mark.asyncio
    async def test_get_nonexistent(self, backend):
        """Test getting a non-existent key"""
        result = await backend.get("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete(self, backend):
        """Test delete operation"""
        await backend.set("to_delete", "value", ttl=60)
        await backend.delete("to_delete")
        result = await backend.get("to_delete")
        assert result is None

    @pytest.mark.asyncio
    async def test_exists(self, backend):
        """Test exists check"""
        await backend.set("exists_key", "value", ttl=60)
        assert await backend.exists("exists_key") is True
        assert await backend.exists("not_exists") is False

    @pytest.mark.asyncio
    async def test_incr(self, backend):
        """Test increment operation"""
        count1 = await backend.incr("counter", ttl=60)
        assert count1 == 1

        count2 = await backend.incr("counter", ttl=60)
        assert count2 == 2

        count3 = await backend.incr("counter", ttl=60)
        assert count3 == 3

    @pytest.mark.asyncio
    async def test_ttl_expiration(self, backend):
        """Test TTL expiration (simulated)"""
        # Set with 0 TTL (already expired)
        backend._cache["expired_key"] = {
            "value": "old",
            "expires_at": datetime.now(timezone.utc).timestamp() - 1,  # 1 second ago
        }

        result = await backend.get("expired_key")
        assert result is None

    @pytest.mark.asyncio
    async def test_max_size_eviction(self):
        """Test eviction when max size is reached"""
        backend = MemoryBackend(max_size=3)

        await backend.set("key1", "value1", ttl=60)
        await backend.set("key2", "value2", ttl=60)
        await backend.set("key3", "value3", ttl=60)

        # Should evict oldest when adding 4th
        await backend.set("key4", "value4", ttl=60)

        assert len(backend._cache) == 3
        # One of the first 3 should be evicted
        assert await backend.get("key4") == "value4"


class TestCache:
    """Test Cache unified interface"""

    @pytest.fixture
    def cache(self):
        reset_cache()
        cache = Cache(backend=MemoryBackend())
        cache._initialized = True
        return cache

    @pytest.mark.asyncio
    async def test_make_key_with_prefix(self, cache):
        """Test key construction"""
        key = cache._make_key(CacheKey.NODE_HEALTH, "node_01")
        assert key == "node:health:node_01"

    @pytest.mark.asyncio
    async def test_make_key_multiple_parts(self, cache):
        """Test key construction with multiple parts"""
        key = cache._make_key(CacheKey.DEVICE_STATUS, "node_01", "device_abc")
        assert key == "device:status:node_01:device_abc"

    @pytest.mark.asyncio
    async def test_make_key_string_prefix(self, cache):
        """Test key construction with string prefix"""
        key = cache._make_key("custom:prefix", "part1", "part2")
        assert key == "custom:prefix:part1:part2"

    @pytest.mark.asyncio
    async def test_set_and_get(self, cache):
        """Test set and get through Cache interface"""
        await cache.set(CacheKey.NODE_HEALTH, "node_01", {"status": "healthy"}, ttl=60)
        result = await cache.get(CacheKey.NODE_HEALTH, "node_01")
        assert result == {"status": "healthy"}

    @pytest.mark.asyncio
    async def test_delete(self, cache):
        """Test delete through Cache interface"""
        await cache.set(CacheKey.NODE_HEALTH, "node_02", {"status": "degraded"}, ttl=60)
        await cache.delete(CacheKey.NODE_HEALTH, "node_02")
        result = await cache.get(CacheKey.NODE_HEALTH, "node_02")
        assert result is None

    @pytest.mark.asyncio
    async def test_exists(self, cache):
        """Test exists through Cache interface"""
        await cache.set(CacheKey.NODE_METRICS, "node_03", {"cpu": 50}, ttl=60)
        assert await cache.exists(CacheKey.NODE_METRICS, "node_03") is True
        assert await cache.exists(CacheKey.NODE_METRICS, "node_99") is False

    @pytest.mark.asyncio
    async def test_get_or_set_cache_hit(self, cache):
        """Test get_or_set when value is cached"""
        # Pre-populate cache
        await cache.set(CacheKey.JOB_STATS, {"total": 100}, ttl=60)

        factory_called = False

        def factory():
            nonlocal factory_called
            factory_called = True
            return {"total": 200}

        result = await cache.get_or_set(CacheKey.JOB_STATS, ttl=60, factory=factory)
        assert result == {"total": 100}
        assert factory_called is False

    @pytest.mark.asyncio
    async def test_get_or_set_cache_miss(self, cache):
        """Test get_or_set when value is not cached"""
        factory_called = False

        def factory():
            nonlocal factory_called
            factory_called = True
            return {"computed": True}

        result = await cache.get_or_set(CacheKey.SYSTEM_STATS, ttl=60, factory=factory)
        assert result == {"computed": True}
        assert factory_called is True

    @pytest.mark.asyncio
    async def test_get_or_set_async_factory(self, cache):
        """Test get_or_set with async factory"""

        async def async_factory():
            await asyncio.sleep(0.01)
            return {"async": True}

        result = await cache.get_or_set(CacheKey.VIDEO_QUEUE_STATS, ttl=60, factory=async_factory)
        assert result == {"async": True}

    @pytest.mark.asyncio
    async def test_incr(self, cache):
        """Test increment through Cache interface"""
        count = await cache.incr(CacheKey.RATE_LIMIT, "user_123", ttl=60)
        assert count == 1

        count = await cache.incr(CacheKey.RATE_LIMIT, "user_123", ttl=60)
        assert count == 2


class TestRateLimiter:
    """Test RateLimiter implementation"""

    @pytest.fixture
    def limiter(self):
        reset_cache()
        cache = Cache(backend=MemoryBackend())
        cache._initialized = True
        return RateLimiter(cache, max_requests=5, window_seconds=60)

    @pytest.mark.asyncio
    async def test_is_allowed_under_limit(self, limiter):
        """Test requests are allowed under limit"""
        for i in range(5):
            assert await limiter.is_allowed("client_1") is True

    @pytest.mark.asyncio
    async def test_is_allowed_over_limit(self, limiter):
        """Test requests are rejected over limit"""
        # Use up the limit
        for i in range(5):
            await limiter.is_allowed("client_2")

        # 6th request should be rejected
        assert await limiter.is_allowed("client_2") is False

    @pytest.mark.asyncio
    async def test_get_remaining(self, limiter):
        """Test get_remaining count"""
        remaining = await limiter.get_remaining("client_3")
        assert remaining == 5

        await limiter.is_allowed("client_3")
        await limiter.is_allowed("client_3")

        remaining = await limiter.get_remaining("client_3")
        assert remaining == 3

    @pytest.mark.asyncio
    async def test_different_identifiers_independent(self, limiter):
        """Test different identifiers have independent limits"""
        for i in range(5):
            await limiter.is_allowed("client_a")

        # client_a is at limit
        assert await limiter.is_allowed("client_a") is False

        # client_b should still have full quota
        assert await limiter.is_allowed("client_b") is True


class TestSingleton:
    """Test singleton pattern"""

    def test_get_cache_returns_same_instance(self):
        """Test get_cache returns singleton"""
        reset_cache()
        cache1 = get_cache()
        cache2 = get_cache()
        assert cache1 is cache2

    def test_reset_cache_clears_singleton(self):
        """Test reset_cache clears the singleton"""
        reset_cache()
        cache1 = get_cache()
        reset_cache()
        cache2 = get_cache()
        assert cache1 is not cache2


class TestRedisBackendMocked:
    """Test RedisBackend with mocked redis client"""

    @pytest.mark.asyncio
    async def test_redis_get_success(self):
        """Test Redis GET operation"""
        backend = RedisBackend("redis://localhost:6379")

        # Mock the redis client
        mock_client = AsyncMock()
        mock_client.get.return_value = '{"value": 42}'
        backend._redis = mock_client

        result = await backend.get("test_key")
        assert result == {"value": 42}
        mock_client.get.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_redis_set_success(self):
        """Test Redis SET operation"""
        backend = RedisBackend("redis://localhost:6379")

        mock_client = AsyncMock()
        backend._redis = mock_client

        result = await backend.set("test_key", {"value": 42}, ttl=60)
        assert result is True
        mock_client.setex.assert_called_once()

    @pytest.mark.asyncio
    async def test_redis_incr_success(self):
        """Test Redis INCR operation with pipeline"""
        backend = RedisBackend("redis://localhost:6379")

        # Create a proper mock pipeline that returns sync methods for chaining
        mock_pipe = MagicMock()
        mock_pipe.incr.return_value = mock_pipe
        mock_pipe.expire.return_value = mock_pipe
        mock_pipe.execute = AsyncMock(return_value=[5, True])

        # Note: client.pipeline() is synchronous, not async
        mock_client = MagicMock()
        mock_client.pipeline.return_value = mock_pipe
        backend._redis = mock_client

        result = await backend.incr("counter", ttl=60)
        assert result == 5
        mock_pipe.incr.assert_called_once_with("counter")
        mock_pipe.expire.assert_called_once_with("counter", 60)

    @pytest.mark.asyncio
    async def test_redis_fallback_on_error(self):
        """Test Redis operations return safe values on error"""
        backend = RedisBackend("redis://localhost:6379")

        mock_client = AsyncMock()
        mock_client.get.side_effect = Exception("Connection refused")
        backend._redis = mock_client

        result = await backend.get("test_key")
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
