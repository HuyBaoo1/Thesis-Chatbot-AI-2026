#!/usr/bin/env python3
"""Setup agents in agent_mail for this project"""
import requests
import json

BASE_URL = "http://127.0.0.1:8765/mcp/"

def send_rpc(method, params=None, req_id=1):
    payload = {"jsonrpc": "2.0", "method": method, "id": req_id}
    if params:
        payload["params"] = params
    resp = requests.post(BASE_URL, json=payload)
    return resp.json()

# Initialize
init_resp = send_rpc("initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "setup-script", "version": "1.0"}
}, 0)
print("Initialized:", init_resp.get("result", {}).get("capabilities", {}).keys())

# List tools
tools_resp = send_rpc("tools/list")
tools = tools_resp.get("result", {}).get("tools", [])
print(f"\nAvailable tools ({len(tools)}):")
for t in tools:
    print(f"  - {t['name']}")

# Call health_check
print("\n--- Health Check ---")
hc = send_rpc("tools/call", {"name": "health_check", "arguments": {}}, 2)
print(json.dumps(hc.get("result", {}), indent=2))