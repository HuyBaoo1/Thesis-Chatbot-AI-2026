#!/usr/bin/env python3
import asyncio
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from src.core.config import settings
print(f"TELEGRAM_POLLING_ENABLED = {settings.TELEGRAM_POLLING_ENABLED}")

async def test():
    from src.services.telegram_service import start_polling
    print("Starting polling...")
    await start_polling()

asyncio.run(test())