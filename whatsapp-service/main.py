"""Standalone WhatsApp Cloud API proxy service.

Acts as a lightweight bridge between Meta Cloud API webhooks and the
Pushti AI main backend.  All business logic (user lookup, RAG, DB
writes) is delegated to the main backend via a secure HTTP endpoint.
"""

import json
import traceback

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from config import settings

app = FastAPI(title="Pushti AI WhatsApp Service")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class SendMessageRequest(BaseModel):
    to: str
    text: str


class IncomingPayload(BaseModel):
    phone: str
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def send_whatsapp_message(to: str, text: str) -> None:
    """Send a text message via Meta Cloud API."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"https://graph.facebook.com/v19.0/{settings.phone_number_id}/messages",
            headers={
                "Authorization": f"Bearer {settings.whatsapp_token}",
                "Content-Type": "application/json",
            },
            json={
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "text",
                "text": {"body": text},
            },
        )
        print(f"Meta API response: {response.status_code} | {response.text[:300]}")
        if response.status_code >= 400:
            raise RuntimeError(f"Meta API error {response.status_code}: {response.text}")


def _meta_headers() -> dict[str, str]:
    """Build headers for talking to the main backend."""
    headers = {"Content-Type": "application/json"}
    if settings.whatsapp_service_api_key:
        headers["X-WhatsApp-Service-Key"] = settings.whatsapp_service_api_key
    return headers


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/webhook/whatsapp")
async def verify_webhook(request: Request) -> PlainTextResponse:
    """Meta webhook verification handshake."""
    params = request.query_params
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == settings.whatsapp_verify_token
    ):
        return PlainTextResponse(params.get("hub.challenge", ""))
    raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/webhook/whatsapp")
async def incoming_webhook(request: Request) -> dict:
    """Receive a message from Meta, forward it to the main backend, and
    relay the AI reply back to the user via Meta Cloud API.
    """
    body = await request.json()
    print(f"Webhook received: {json.dumps(body, ensure_ascii=False)[:500]}")

    try:
        entry = body["entry"][0]["changes"][0]["value"]

        # Ignore status updates (delivered, read, etc.)
        if "messages" not in entry:
            print("Status update (no message), ignoring.")
            return {"status": "ok"}

        msg = entry["messages"][0]
        phone_raw = msg["from"]

        if msg["type"] != "text":
            await send_whatsapp_message(
                phone_raw,
                "দুঃখিত, আমি শুধু টেক্সট মেসেজ বুঝতে পারি। 🙏",
            )
            return {"status": "ok"}

        user_message = msg["text"]["body"]

        # Forward to main backend
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.main_server_url.rstrip('/')}/whatsapp/incoming",
                headers=_meta_headers(),
                json={"phone": phone_raw, "message": user_message},
            )

            if response.status_code >= 400:
                print(f"Main backend error: {response.status_code} | {response.text}")
                await send_whatsapp_message(
                    phone_raw,
                    "দুঃখিত, সার্ভারে একটি সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন। 🙏",
                )
                return {"status": "error"}

            data = response.json()
            reply = data.get("reply", "")

        if reply:
            await send_whatsapp_message(phone_raw, reply)

    except Exception as exc:
        print(f"WhatsApp webhook error: {exc}")
        traceback.print_exc()

    return {"status": "ok"}


@app.post("/send-message")
async def send_message(req: SendMessageRequest) -> dict:
    """Allow the main backend to trigger an outgoing message."""
    try:
        await send_whatsapp_message(req.to, req.text)
        return {"status": "success"}
    except Exception as exc:
        print(f"Error sending message: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Local dev entry-point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=settings.port)
