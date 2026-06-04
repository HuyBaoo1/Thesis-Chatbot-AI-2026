#!/usr/bin/env python3
"""Quick manual test for the Zalo Bot integration.

Usage:
    1. Put ZALO_BOT_TOKEN=<token> in .env
    2. python test_zalo.py            # verify token via getMe, then long-poll
    3. Message your bot on Zalo — replies should come back via the RAG pipeline.
"""
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from src.core.config import settings
from src.services.zalo_service import get_me, start_polling

print(f"ZALO_BOT_TOKEN set     = {bool(settings.ZALO_BOT_TOKEN)}")
print(f"ZALO_POLLING_ENABLED   = {settings.ZALO_POLLING_ENABLED}")


async def test():
    print("Calling getMe ...")
    print("getMe ->", get_me())
    print("Starting Zalo getUpdates polling (Ctrl+C to stop) ...")
    await start_polling()


asyncio.run(test())
