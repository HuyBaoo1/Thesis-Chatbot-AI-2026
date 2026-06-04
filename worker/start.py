#!/usr/bin/env python3
"""
Custom rq worker launcher - bypasses Click --url parsing issues
"""
import os
import sys
from redis import Redis
from rq import Worker, Queue, Connection

# Get URL from environment
url = os.environ.get('REDIS_URL', '')
if not url:
    print("FATAL: REDIS_URL environment variable is not set", flush=True)
    sys.exit(1)

print(f"=== Custom Worker Starting ===", flush=True)
print(f"REDIS_URL: {url[:40]}...", flush=True)

try:
    conn = Redis.from_url(url)
    conn.ping()
    print("Redis connection OK!", flush=True)
except Exception as e:
    print(f"Redis connection FAILED: {e}", flush=True)
    sys.exit(1)

queue_name = os.environ.get('RQ_QUEUE_NAME', 'default')
queues = [Queue(queue_name, connection=conn)]

with Connection(conn):
    worker = Worker(queues)
    worker.work(with_scheduler=True)

print("Worker stopped", flush=True)
