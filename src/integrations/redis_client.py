from redis import Redis

from src.core.config import settings

_redis_client = Redis.from_url(settings.REDIS_URL)


def get_redis_client() -> Redis:
    return _redis_client
