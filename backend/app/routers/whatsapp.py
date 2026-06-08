import os
import json
import uuid
import httpx
from fastapi import APIRouter, Depends, Request, HTTPException, Header
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional
from app.db import prisma
from app.core.security import create_access_token
from app.config import settings
from app.dependencies import get_current_user

router = APIRouter()

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class IncomingMessagePayload(BaseModel):
    phone: str
    message: str


# ---------------------------------------------------------------------------
# Shared business logic
# ---------------------------------------------------------------------------
async def _resolve_user(phone_raw: str):
    """Look up a user by phone number (supports +880 and 01 formats)."""
    phone_plus = "+" + phone_raw
    phone_zero = "0" + phone_raw[3:]
    user = (
        await prisma.user.find_unique(where={"phone": phone_plus})
        or await prisma.user.find_unique(where={"phone": phone_zero})
    )
    return user, phone_plus, phone_zero


async def _build_history(user_id: str):
    """Fetch the last 10 chat messages for a user."""
    rows = await prisma.chatmessage.find_many(
        where={"userId": user_id},
        order={"createdAt": "desc"},
        take=10,
    )
    return [{"role": r.role, "content": r.content} for r in reversed(rows)]


async def _generate_reply(user, user_message: str) -> str:
    """Call the RAG endpoint and return the plain-text reply."""
    token = create_access_token(data={"sub": user.id})
    history = await _build_history(user.id)

    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream(
            "POST",
            f"{BACKEND_URL}/chat",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "text/event-stream",
                "Content-Type": "application/json",
            },
            json={
                "message": user_message,
                "language": user.language or "bn",
                "history": history,
                "image_data_url": None,
                "lat": None,
                "lng": None,
            },
        ) as response:
            full_text = ""
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if not data_str or data_str == "[DONE]":
                    continue
                try:
                    parsed = json.loads(data_str)
                    if "token" in parsed:
                        full_text += parsed["token"]
                except Exception:
                    pass

    full_text = full_text.strip()
    if len(full_text) > 4000:
        full_text = full_text[:3997] + "..."
    if not full_text:
        full_text = (
            "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। একটু পরে আবার চেষ্টা করুন। 🙏"
        )
    return full_text


async def _save_messages(user_id: str, user_message: str, reply: str):
    """Persist both sides of the conversation to the DB."""
    await prisma.chatmessage.create_many(
        data=[
            {
                "messageId": str(uuid.uuid4()),
                "userId": user_id,
                "role": "user",
                "content": user_message,
            },
            {
                "messageId": str(uuid.uuid4()),
                "userId": user_id,
                "role": "assistant",
                "content": reply,
            },
        ]
    )


async def _handle_incoming_message(phone_raw: str, user_message: str) -> dict:
    """Core incoming-message handler used by both direct webhook and
    standalone-service proxy. Returns a dict with either a 'reply' key
    or an 'error' key (for unregistered users).
    """
    user, phone_plus, phone_zero = await _resolve_user(phone_raw)
    print(f"Looking up user: {phone_plus} or {phone_zero} -> Found: {user is not None}")

    if not user:
        reg_link = f"{settings.frontend_url}/auth"
        msg_text = (
            f"You are not a Pushti AI registered user. Please register first: {reg_link}\n\n"
            f"আপনার মোবাইল নম্বরটি Pushti AI-তে নিবন্ধিত নয়। "
            f"অনুগ্রহ করে প্রথমে এই লিঙ্কে গিয়ে নিবন্ধন করুন: {reg_link} 🙏"
        )
        return {"error": "not_registered", "fallback_text": msg_text}

    reply = await _generate_reply(user, user_message)
    await _save_messages(user.id, user_message, reply)
    return {"reply": reply}


# ---------------------------------------------------------------------------
# 1. Webhook verification (GET)
# ---------------------------------------------------------------------------
@router.get("/webhook/whatsapp")
async def verify_webhook(request: Request):
    params = request.query_params
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == VERIFY_TOKEN
    ):
        return PlainTextResponse(params.get("hub.challenge"))
    raise HTTPException(status_code=403, detail="Verification failed")


# ---------------------------------------------------------------------------
# 2. Incoming messages — DIRECT Meta webhook (backward-compatible)
# ---------------------------------------------------------------------------
@router.post("/webhook/whatsapp")
async def incoming_message(request: Request):
    body = await request.json()

    try:
        print(f"WhatsApp webhook received: {json.dumps(body, ensure_ascii=False)[:500]}")

        entry = body["entry"][0]["changes"][0]["value"]

        # Ignore status updates (delivered, read etc.)
        if "messages" not in entry:
            print("Status update (no message), ignoring.")
            return {"status": "ok"}

        msg = entry["messages"][0]
        phone_number_id = entry["metadata"]["phone_number_id"]
        phone_raw = msg["from"]
        print(f"From: {msg.get('from')} | Type: {msg.get('type')}")

        if msg["type"] != "text":
            await send_whatsapp_message(
                phone_number_id,
                phone_raw,
                "দুঃখিত, আমি শুধু টেক্সট মেসেজ বুঝতে পারি। 🙏",
            )
            return {"status": "ok"}

        user_message = msg["text"]["body"]
        result = await _handle_incoming_message(phone_raw, user_message)

        if "error" in result:
            await send_whatsapp_message(
                phone_number_id, phone_raw, result["fallback_text"]
            )
            return {"status": "ok"}

        reply = result["reply"]
        print(f"Sending reply: {reply[:100]}...")
        await send_whatsapp_message(phone_number_id, phone_raw, reply)
        print("Reply sent successfully")

    except Exception as e:
        print(f"WhatsApp webhook error: {e}")
        import traceback

        traceback.print_exc()

    return {"status": "ok"}


# ---------------------------------------------------------------------------
# 3. Incoming messages — STANDALONE service proxy
# ---------------------------------------------------------------------------
@router.post("/whatsapp/incoming")
async def whatsapp_incoming(
    payload: IncomingMessagePayload,
    x_whatsapp_service_key: Optional[str] = Header(None),
):
    """Receives a normalized message from the standalone WhatsApp service,
    handles user lookup / RAG / DB persistence, and returns the reply text.
    """
    # Authorize the caller
    if not settings.whatsapp_service_api_key:
        raise HTTPException(
            status_code=501,
            detail="Standalone WhatsApp service integration is not configured.",
        )
    if x_whatsapp_service_key != settings.whatsapp_service_api_key:
        raise HTTPException(status_code=401, detail="Invalid service key.")

    result = await _handle_incoming_message(payload.phone, payload.message)

    if "error" in result:
        # Return the fallback text so the standalone service can send it
        return {"reply": result["fallback_text"]}

    return {"reply": result["reply"]}


# ---------------------------------------------------------------------------
# 4. Send WhatsApp message via Meta Cloud API
# ---------------------------------------------------------------------------
async def send_whatsapp_message(phone_number_id: str, to: str, text: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://graph.facebook.com/v19.0/{phone_number_id}/messages",
            headers={
                "Authorization": f"Bearer {WHATSAPP_TOKEN}",
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
            print(f"Failed to send WhatsApp message: {response.status_code} {response.text}")


# ---------------------------------------------------------------------------
# 5. WhatsApp Opt-In (Greeting Trigger)
# ---------------------------------------------------------------------------
@router.post("/whatsapp/optin")
async def whatsapp_optin(current_user=Depends(get_current_user)):
    """Accepts a Bearer JWT, reads the user's phone from the DB, and sends a WhatsApp greeting."""
    if not current_user.phone:
        raise HTTPException(
            status_code=400,
            detail="No phone number linked to your account. Please update your profile first.",
        )

    # Normalize to E.164 digits-only (no leading '+')
    phone_raw = "".join(c for c in current_user.phone if c.isdigit())
    if phone_raw.startswith("01") and len(phone_raw) == 11:
        phone_raw = "88" + phone_raw

    greeting_message = (
        "আসালামু আলাইকুম! "
        "Pushti AI (পুষ্টি এআই) থেকে "
        "আপনাকে স্বাগতম। 🥦\n\n"
        "এখন থেকে আপনি সরাসরি "
        "এই WhatsApp চ্যাটে আমাদের "
        "সাথে কথা বলতে পারবেন। "
        "আপনার যেকোনো পুষ্টি, "
        "ডায়েট বা স্বাস্থ্য "
        "বিষয়ক প্রশ্ন আমাদের "
        "জিজ্ঞেস করুন! 🙏\n\n"
        "Welcome to Pushti AI! You can now chat with me directly on WhatsApp. "
        "Feel free to ask any dietary or nutritional questions!"
    )

    # If standalone service is configured, forward the request to it
    if settings.whatsapp_service_url:
        try:
            async with httpx.AsyncClient() as client:
                headers = {}
                if settings.whatsapp_service_api_key:
                    headers["X-WhatsApp-Service-Key"] = settings.whatsapp_service_api_key

                response = await client.post(
                    f"{settings.whatsapp_service_url.rstrip('/')}/send-message",
                    headers=headers,
                    json={
                        "to": phone_raw,
                        "text": greeting_message
                    },
                    timeout=10.0
                )
                if response.status_code >= 400:
                    print(f"Failed to delegate WhatsApp opt-in message: {response.status_code} | {response.text}")
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to delegate message via external WhatsApp service."
                    )
                return {"status": "success", "phone": current_user.phone, "delegated": True}
        except Exception as e:
            print(f"Error calling external WhatsApp service: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to communicate with external WhatsApp service: {str(e)}.",
            )

    if not PHONE_NUMBER_ID:
        raise HTTPException(
            status_code=500,
            detail="WhatsApp service is not configured on the server.",
        )

    try:
        await send_whatsapp_message(PHONE_NUMBER_ID, phone_raw, greeting_message)
        return {"status": "success", "phone": current_user.phone}
    except Exception as e:
        print(f"WhatsApp optin error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send message via Meta Cloud API.",
        )
