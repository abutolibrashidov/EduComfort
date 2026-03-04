"""
Redis client helper for EduComfort.

Usage:
    from app.core.redis_client import get_redis_client

    redis = get_redis_client()
    if redis:
        redis.set("key", "value", ex=300)
        value = redis.get("key")

Redis DB layout:
    DB 0  ← application caching (leaderboards, XP daily cap, rate limit, etc.)
    DB 1  ← Celery broker (task queues)
    DB 2  ← Celery results backend

The client gracefully returns None if Redis is unavailable so that
application logic can degrade gracefully without crashing.
"""
from __future__ import annotations

import redis as _redis
from loguru import logger

from app.core.config import settings

_redis_client: _redis.Redis | None = None


def get_redis_client() -> _redis.Redis | None:
    """
    Return a shared Redis client instance (singleton per process).
    Returns None and logs a warning if REDIS_URL is not configured
    or if connection fails.
    """
    global _redis_client

    if _redis_client is not None:
        return _redis_client

    redis_url = getattr(settings, "REDIS_URL", None)
    if not redis_url:
        logger.debug("REDIS_URL not configured — Redis features disabled")
        return None

    try:
        client = _redis.from_url(redis_url, db=0, decode_responses=True)
        client.ping()           # Fail fast if unreachable
        _redis_client = client
        logger.info(f"Redis connected: {redis_url}")
        return _redis_client
    except _redis.ConnectionError as e:
        logger.warning(f"Redis connection failed — caching disabled: {e}")
        return None


def invalidate_leaderboard(engine: str, institution_id: int | None = None) -> None:
    """Convenience function to delete a leaderboard cache key."""
    redis = get_redis_client()
    if redis is None:
        return
    scope = str(institution_id) if institution_id else "global"
    key = f"lb:{engine}:{scope}"
    redis.delete(key)
    logger.debug(f"Leaderboard cache invalidated: {key}")


def get_leaderboard_cache(engine: str, institution_id: int | None = None) -> str | None:
    """Return cached leaderboard JSON string, or None if not cached."""
    redis = get_redis_client()
    if redis is None:
        return None
    scope = str(institution_id) if institution_id else "global"
    return redis.get(f"lb:{engine}:{scope}")


def set_leaderboard_cache(
    engine: str,
    institution_id: int | None,
    data: str,
    ttl_seconds: int = 300,
) -> None:
    """Store leaderboard JSON with TTL."""
    redis = get_redis_client()
    if redis is None:
        return
    scope = str(institution_id) if institution_id else "global"
    redis.setex(f"lb:{engine}:{scope}", ttl_seconds, data)


def check_daily_xp_cap(user_id: int, date_str: str) -> int:
    """
    Return the total XP already awarded to user_id on date_str (YYYY-MM-DD).
    Uses Redis counter key with midnight expiry.
    Returns 0 if Redis is not configured (cap not enforced).
    """
    redis = get_redis_client()
    if redis is None:
        return 0
    key = f"xpcap:{user_id}:{date_str}"
    val = redis.get(key)
    return int(val) if val else 0


def increment_daily_xp_cap(user_id: int, date_str: str, amount: int, ttl_seconds: int = 86400) -> None:
    """Increment the daily XP counter for a user. TTL defaults to 24h."""
    redis = get_redis_client()
    if redis is None:
        return
    key = f"xpcap:{user_id}:{date_str}"
    pipe = redis.pipeline()
    pipe.incrby(key, amount)
    pipe.expire(key, ttl_seconds)
    pipe.execute()
