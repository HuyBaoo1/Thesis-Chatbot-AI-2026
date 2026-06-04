#!/usr/bin/env python3
"""Manage the Zalo Bot webhook: set / delete / info / getMe.

Reads ZALO_BOT_TOKEN and ZALO_WEBHOOK_SECRET from the environment / .env
(via src.core.config.settings).

Usage:
    python scripts/zalo_webhook.py getme
    python scripts/zalo_webhook.py set https://a20-app-165-production.up.railway.app/api/zalo/webhook
    python scripts/zalo_webhook.py info
    python scripts/zalo_webhook.py delete

Notes:
  * Once a webhook is set, getUpdates (long polling) stops returning updates.
  * `set` sends the secret_token; Zalo then echoes it back in the
    X-Bot-Api-Secret-Token header on every webhook call (verified by the app).
"""
import json
import os
import sys

import httpx

# Make `src` importable when run as `python scripts/zalo_webhook.py` from anywhere.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import settings

BASE = "https://bot-api.zaloplatforms.com"


def _base_url() -> str:
    token = settings.ZALO_BOT_TOKEN
    if not token:
        sys.exit("ZALO_BOT_TOKEN is not set (put it in .env)")
    return f"{BASE}/bot{token}"


def _post(method: str, payload: dict | None = None) -> dict:
    resp = httpx.post(f"{_base_url()}/{method}", json=payload or {}, timeout=30)
    data = resp.json()
    print(json.dumps(data, ensure_ascii=False, indent=2))
    return data


def main() -> None:
    args = sys.argv[1:]
    cmd = (args[0] if args else "info").lower()

    if cmd == "getme":
        _post("getMe")
    elif cmd == "info":
        _post("getWebhookInfo")
    elif cmd == "delete":
        _post("deleteWebhook")
    elif cmd == "set":
        if len(args) < 2:
            sys.exit("usage: zalo_webhook.py set <https-url>")
        url = args[1]
        secret = settings.ZALO_WEBHOOK_SECRET
        if not secret:
            sys.exit("ZALO_WEBHOOK_SECRET is not set (put it in .env)")
        _post("setWebhook", {"url": url, "secret_token": secret})
    else:
        sys.exit(f"unknown command: {cmd} (use: getme | set <url> | info | delete)")


if __name__ == "__main__":
    main()
