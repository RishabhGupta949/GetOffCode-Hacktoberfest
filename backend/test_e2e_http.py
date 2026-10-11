#!/usr/bin/env python3
"""Full HTTP flow test against running demo server."""
import time
import httpx

BASE = "http://127.0.0.1:8765/api/v1"
SID = "e2e_demo_2"

with httpx.Client(timeout=30.0) as client:
    print("1. health")
    print(client.get(f"{BASE}/health").json())

    print("2. activity (working)")
    r = client.post(f"{BASE}/activity", json={"session_id": SID, "idle_ms": 1000, "tab_switches_5m": 0, "active_domain": "github.com"})
    print(r.json())

    print("3. stuck")
    r = client.post(f"{BASE}/stuck", json={"session_id": SID, "problem": "Redis GET returns stale data after PATCH", "error": "ECONNREFUSED 127.0.0.1:3000"})
    print(r.json())
    snap_id = r.json()["snapshot_id"]

    print("4. break/start")
    r = client.post(f"{BASE}/break/start", json={"session_id": SID})
    print(r.json())

    print("5. state during BREAK_ACTIVE")
    r = client.get(f"{BASE}/state", params={"session_id": SID})
    print(r.json())

    print("6. wait 11s for demo break...")
    time.sleep(11)

    print("7. break/end")
    r = client.post(f"{BASE}/break/end", json={"session_id": SID, "early": False})
    print(r.json())

    print("8. reflect (choice=none)")
    r = client.post(f"{BASE}/reflect", json={"session_id": SID, "choice": "none"})
    print(r.json())

    print("9. hypothesis")
    r = client.post(f"{BASE}/hypothesis", json={"session_id": SID})
    print(r.json())
    hyp_id = r.json()["hypothesis_id"]

    print("10. feedback")
    r = client.post(f"{BASE}/feedback", json={"session_id": SID, "hypothesis_id": hyp_id, "outcome": "fixed"})
    print(r.json())

    print("11. final state")
    r = client.get(f"{BASE}/state", params={"session_id": SID})
    print(r.json())

    print("\n✓ Full HTTP flow completed successfully!")