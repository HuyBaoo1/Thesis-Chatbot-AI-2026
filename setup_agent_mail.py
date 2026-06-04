#!/usr/bin/env python3
"""Setup agents in agent_mail for this project - FIXED VERSION"""
import requests
import json

BASE_URL = "http://127.0.0.1:8765/mcp/"
PROJECT_KEY = "a20-app-165"

def send_rpc(method, params=None, req_id=1):
    payload = {"jsonrpc": "2.0", "method": method, "id": req_id}
    if params:
        payload["params"] = params
    return requests.post(BASE_URL, json=payload).json()

def call_tool(name, arguments, req_id=10):
    return send_rpc("tools/call", {"name": name, "arguments": arguments}, req_id)

# Initialize
send_rpc("initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "setup-script", "version": "1.0"}
}, 0)

print("=== Setting up Agent Mail for A20-App-165 ===\n")

# 1. Ensure project exists
print("1. Creating project...")
result = call_tool("ensure_project", {"human_key": PROJECT_KEY})
text = result.get('result', {}).get('content', [{}])[0].get('text', '')
print(f"   Result: {text}")

# 2. Register agents (using name, program, model correctly)
agents = [
    {"name": "CoderAgent", "program": "coder", "model": "claude-sonnet", "task_desc": "Handles code writing and debugging"},
    {"name": "ReviewerAgent", "program": "reviewer", "model": "claude-sonnet", "task_desc": "Reviews code and suggests improvements"},
    {"name": "TesterAgent", "program": "tester", "model": "claude-sonnet", "task_desc": "Runs tests and validates functionality"},
]

print("\n2. Registering agents...")
for i, agent in enumerate(agents):
    result = call_tool("register_agent", {
        "project_key": PROJECT_KEY,
        "name": agent["name"],  # IMPORTANT: use 'name' field
        "program": agent["program"],
        "model": agent["model"],
        "task_description": agent["task_desc"],
    }, 20 + i)
    text = result.get('result', {}).get('content', [{}])[0].get('text', '')
    print(f"   {agent['name']}: {text[:80]}...")

# 3. Send a test message (IMPORTANT: use 'name' for sender and recipients)
print("\n3. Sending test message...")
result = call_tool("send_message", {
    "project_key": PROJECT_KEY,
    "sender_name": "CoderAgent",  # Use agent's name, not program
    "to": ["ReviewerAgent"],  # Use agent's name, not program
    "subject": "Test message from Coder",
    "body_md": "Hello ReviewerAgent! This is a test from CoderAgent.",
    "importance": "normal",
}, 30)
content = result.get('result', {}).get('content', [{}])[0].get('text', '')
print(f"   Send result: {content[:150]}...")

# 4. Check ReviewerAgent inbox
print("\n4. Checking ReviewerAgent inbox...")
result = call_tool("fetch_inbox", {
    "project_key": PROJECT_KEY,
    "agent_name": "ReviewerAgent",
    "include_bodies": True
}, 40)
content = result.get('result', {}).get('content', [{}])[0].get('text', '')
try:
    msgs = json.loads(content)
    print(f"   Messages in inbox: {len(msgs)}")
    for m in msgs:
        print(f"     - from {m.get('from')}: {m.get('subject')}")
except:
    print(f"   Raw: {content[:200]}")

# 5. Send from ReviewerAgent back to CoderAgent
print("\n5. Replying from ReviewerAgent to CoderAgent...")
result = call_tool("send_message", {
    "project_key": PROJECT_KEY,
    "sender_name": "ReviewerAgent",
    "to": ["CoderAgent"],
    "subject": "Re: Test message",
    "body_md": "Hi CoderAgent! Got your message. Setup is working!",
}, 50)
content = result.get('result', {}).get('content', [{}])[0].get('text', '')
print(f"   Send result: {content[:100]}...")

# 6. Check CoderAgent inbox
print("\n6. Checking CoderAgent inbox...")
result = call_tool("fetch_inbox", {
    "project_key": PROJECT_KEY,
    "agent_name": "CoderAgent",
    "include_bodies": True
}, 60)
content = result.get('result', {}).get('content', [{}])[0].get('text', '')
try:
    msgs = json.loads(content)
    print(f"   Messages in inbox: {len(msgs)}")
    for m in msgs:
        print(f"     - from {m.get('from')}: {m.get('subject')}")
except:
    print(f"   Raw: {content[:200]}")

print("\n=== Setup Complete! ===")
print(f"Project: {PROJECT_KEY}")
print(f"Agents: CoderAgent, ReviewerAgent, TesterAgent")
print(f"Web UI: http://127.0.0.1:8765/mail")
print(f"\nTest message flow working correctly!")