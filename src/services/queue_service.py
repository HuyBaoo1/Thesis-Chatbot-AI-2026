from rq import Queue

from src.core.config import settings
from src.integrations.redis_client import get_redis_client

_default_queue = Queue(settings.RQ_QUEUE_NAME, connection=get_redis_client())


def get_default_queue() -> Queue:
    return _default_queue
