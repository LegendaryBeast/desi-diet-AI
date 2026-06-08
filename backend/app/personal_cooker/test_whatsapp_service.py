"""Quick integration test for the standalone WhatsApp service.

Usage (from repo root with backend venv active):
    python -m backend.app.personal_cooker.test_whatsapp_service

Prerequisites:
    - Main backend running on the URL configured in BACKEND_URL.
    - Standalone WhatsApp service running on the URL configured in WS_URL.
    - A valid WHATSAPP_SERVICE_API_KEY shared between both services.
"""

import os
import sys
import uuid
import httpx
import asyncio

# ---------------------------------------------------------------------------
# Configuration — override via env vars or edit below
# ---------------------------------------------------------------------------
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
WS_URL = os.getenv("WS_URL", "http://localhost:8010")
API_KEY = os.getenv("WHATSAPP_SERVICE_API_KEY", "change_me_to_a_long_random_string")

HEADERS = {"X-WhatsApp-Service-Key": API_KEY, "Content-Type": "application/json"}


# ---------------------------------------------------------------------------
# Test 1: Standalone service health check
# ---------------------------------------------------------------------------
async def test_ws_health():
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{WS_URL}/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        assert resp.json().get("status") == "ok"
        print("✅ test_ws_health passed")


# ---------------------------------------------------------------------------
# Test 2: Standalone service /send-message (delegated outgoing)
# ---------------------------------------------------------------------------
async def test_ws_send_message():
    """Sends a dummy message via the standalone service.
    NOTE: This will actually call Meta Cloud API if WHATSAPP_TOKEN is valid.
    Use a test phone number you control.
    """
    test_phone = os.getenv("TEST_PHONE", "+8801XXXXXXXXX")
    payload = {"to": test_phone, "text": f"Pushti AI test message {uuid.uuid4().hex[:6]}"}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{WS_URL}/send-message",
            headers=HEADERS,
            json=payload,
            timeout=30,
        )
        assert resp.status_code == 200, f"Send message failed: {resp.status_code} | {resp.text}"
        assert resp.json().get("status") == "success"
        print("✅ test_ws_send_message passed")


# ---------------------------------------------------------------------------
# Test 3: Main backend /whatsapp/incoming (requires DB + RAG)
# ---------------------------------------------------------------------------
async def test_backend_incoming():
    """Exercises the main-backend incoming endpoint with a dummy message.
    This will fail with 401 if the API key is wrong and with 404/500 if
    the user does not exist or RAG is unavailable.
    """
    test_phone = os.getenv("TEST_PHONE", "+8801XXXXXXXXX")
    payload = {"phone": test_phone, "message": "হ্যালো, তুমি কেমন আছো?"}

    async with httpx.AsyncClient() as client:
        # Bad key
        bad_resp = await client.post(
            f"{BACKEND_URL}/whatsapp/incoming",
            headers={"X-WhatsApp-Service-Key": "wrong-key"},
            json=payload,
        )
        assert bad_resp.status_code == 401
        print("✅ test_backend_incoming auth rejection passed")

        # Good key
        resp = await client.post(
            f"{BACKEND_URL}/whatsapp/incoming",
            headers=HEADERS,
            json=payload,
            timeout=60,
        )
        assert resp.status_code == 200, f"Incoming handler failed: {resp.status_code} | {resp.text}"
        data = resp.json()
        assert "reply" in data
        print(f"✅ test_backend_incoming passed (reply: {data['reply'][:80]}...)")


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
async def main():
    print(f"Testing against BACKEND={BACKEND_URL} WS={WS_URL}")
    try:
        await test_ws_health()
    except Exception as exc:
        print(f"❌ test_ws_health failed: {exc}")

    try:
        await test_ws_send_message()
    except Exception as exc:
        print(f"❌ test_ws_send_message failed: {exc}")

    try:
        await test_backend_incoming()
    except Exception as exc:
        print(f"❌ test_backend_incoming failed: {exc}")


if __name__ == "__main__":
    asyncio.run(main())
