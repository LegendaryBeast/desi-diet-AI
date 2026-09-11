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

def _get_verify_token() -> str:
    return (getattr(settings, "whatsapp_verify_token", None) or os.getenv("WHATSAPP_VERIFY_TOKEN") or "").strip()

def _get_whatsapp_token() -> str:
    return (getattr(settings, "whatsapp_token", None) or os.getenv("WHATSAPP_TOKEN") or "").strip()

def _get_phone_number_id(override: Optional[str] = None) -> str:
    return (override or getattr(settings, "phone_number_id", None) or os.getenv("PHONE_NUMBER_ID") or "").strip()

def _get_backend_url() -> str:
    backend_url = getattr(settings, "backend_url", None) or os.getenv("BACKEND_URL")
    if backend_url and backend_url != "http://localhost:8000":
        return backend_url.rstrip("/")
    port = os.getenv("PORT", "8000")
    return f"http://127.0.0.1:{port}"


@router.get("/whatsapp/debug")
async def whatsapp_debug():
    """Diagnostic endpoint to verify Meta credentials directly on the deployed server."""
    token = _get_whatsapp_token()
    pid = _get_phone_number_id()
    meta_status = None
    meta_body = None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                f"https://graph.facebook.com/v19.0/{pid}/messages",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": "8801762489345",
                    "type": "text",
                    "text": {"body": "Test from Railway WhatsApp Debug"},
                },
            )
            meta_status = res.status_code
            meta_body = res.text
    except Exception as exc:
        meta_body = str(exc)

    return {
        "token_prefix": token[:20] if token else "EMPTY",
        "token_len": len(token),
        "phone_number_id": pid,
        "meta_status": meta_status,
        "meta_response": meta_body,
    }



# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class IncomingMessagePayload(BaseModel):
    phone: str
    message: str


# ---------------------------------------------------------------------------
# Shared business logic
# ---------------------------------------------------------------------------
def _normalize_phone_candidates(phone_raw: str) -> list[str]:
    """Generate all common representations of a phone number."""
    digits = "".join(c for c in phone_raw if c.isdigit())
    candidates = {phone_raw.strip(), f"+{digits}", digits}

    # Bangladesh phone variations
    if digits.startswith("880") and len(digits) == 13:
        candidates.add("0" + digits[3:])
        candidates.add("+" + digits)
    elif digits.startswith("01") and len(digits) == 11:
        candidates.add("88" + digits)
        candidates.add("+88" + digits)
        candidates.add("+880" + digits[1:])
    elif digits.startswith("1") and len(digits) == 10:
        candidates.add("0" + digits)
        candidates.add("880" + digits)
        candidates.add("+880" + digits)

    return [c for c in candidates if c]


async def _resolve_or_create_user(phone_raw: str):
    """Look up a user by any phone representation, or auto-create a user so WhatsApp callers are never rejected."""
    candidates = _normalize_phone_candidates(phone_raw)
    user = None
    for cand in candidates:
        user = await prisma.user.find_unique(where={"phone": cand})
        if user:
            print(f"WhatsApp user resolved: {cand} (id={user.id})")
            return user

    # Auto-register guest WhatsApp user so they can chat immediately
    digits = "".join(c for c in phone_raw if c.isdigit())
    if digits.startswith("880") and len(digits) == 13:
        primary_phone = "0" + digits[3:]
    elif digits.startswith("01") and len(digits) == 11:
        primary_phone = digits
    else:
        primary_phone = f"+{digits}" if digits else phone_raw

    try:
        user = await prisma.user.create(
            data={
                "phone": primary_phone,
                "passwordHash": get_password_hash(str(uuid.uuid4())),
                "language": "bn",
                "role": "user",
            }
        )
        print(f"Auto-created new WhatsApp user with phone: {primary_phone} (id={user.id})")
        return user
    except Exception as e:
        print(f"Could not auto-create user for {primary_phone}: {e}")
        # Fallback to any existing user as fallback if creation failed
        fallback_user = await prisma.user.find_first()
        return fallback_user


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
            f"{_get_backend_url()}/chat",
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

    # Strip frontend-only PDF-report tag and replace with WhatsApp-friendly text
    if "[HEALTH_REPORT_LINK]" in full_text:
        report_url = f"{settings.frontend_url}/report"
        full_text = full_text.replace(
            "[HEALTH_REPORT_LINK]",
            f"\n\n📊 View full report: {report_url}"
        )

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
    standalone-service proxy. Returns a dict with a 'reply' key.
    Auto-registers unregistered phone numbers so all WhatsApp callers get AI answers.
    """
    user = await _resolve_or_create_user(phone_raw)
    if not user:
        reg_link = f"{settings.frontend_url}/auth"
        msg_text = (
            f"You are not a Pushti AI registered user. Please register first: {reg_link}\n\n"
            f"আপনার মোবাইল নম্বরটি Pushti AI-তে নিবন্ধিত নয়। "
            f"অনুগ্রহ করে প্রথমে এই লিঙ্কে গিয়ে নিবন্ধন করুন: {reg_link} 🙏"
        )
        return {"error": "not_registered", "fallback_text": msg_text}

    reply = await _generate_reply(user, user_message)
    # NOTE: We intentionally do NOT call _save_messages here.
    # The /chat endpoint already persists both user and assistant messages.
    return {"reply": reply}


# ---------------------------------------------------------------------------
# 1. Webhook verification (GET)
# ---------------------------------------------------------------------------
@router.get("/webhook/whatsapp")
async def verify_webhook(request: Request):
    params = request.query_params
    verify_token = _get_verify_token()
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == verify_token
    ):
        return PlainTextResponse(params.get("hub.challenge", ""))
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
    service_key = (settings.whatsapp_service_api_key or "").strip()
    if not service_key:
        raise HTTPException(
            status_code=501,
            detail="Standalone WhatsApp service integration is not configured.",
        )
    
    caller_key = (x_whatsapp_service_key or "").strip()
    if caller_key != service_key:
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
    token = _get_whatsapp_token()
    pid = _get_phone_number_id(phone_number_id)
    if not token or not pid:
        print(f"Cannot send WhatsApp message: missing token (len={len(token)}) or phone_number_id='{pid}'")
        return
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"https://graph.facebook.com/v19.0/{pid}/messages",
            headers={
                "Authorization": f"Bearer {token}",
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
        if response.status_code == 401:
            print("❌ CRITICAL ERROR: Meta WhatsApp Access Token is EXPIRED or INVALID (Error 190). Please generate a new token and update WHATSAPP_TOKEN!")
        elif response.status_code >= 400:
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
    service_url = (settings.whatsapp_service_url or "").strip()
    if service_url:
        try:
            async with httpx.AsyncClient() as client:
                headers = {}
                service_key = (settings.whatsapp_service_api_key or "").strip()
                if service_key:
                    headers["X-WhatsApp-Service-Key"] = service_key

                response = await client.post(
                    f"{service_url.rstrip('/')}/send-message",
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
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error calling external WhatsApp service: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to communicate with external WhatsApp service: {str(e)}.",
            )

    phone_number_id = _get_phone_number_id()
    if not phone_number_id:
        raise HTTPException(
            status_code=500,
            detail="WhatsApp service is not configured on the server.",
        )

    try:
        await send_whatsapp_message(phone_number_id, phone_raw, greeting_message)
        return {"status": "success", "phone": current_user.phone}
    except Exception as e:
        print(f"WhatsApp optin error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send message via Meta Cloud API.",
        )
