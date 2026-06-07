"""WhatsApp Cloud API webhook -- replaces n8n entirely."""

import os
import json
import uuid
import httpx
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import PlainTextResponse
from app.db import prisma
from app.core.security import create_access_token
from app.config import settings
from app.dependencies import get_current_user

router = APIRouter()

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")


# -- 1. Webhook verification (GET) ------------------------------------------
@router.get("/webhook/whatsapp")
async def verify_webhook(request: Request):
    params = request.query_params
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == VERIFY_TOKEN
    ):
        return PlainTextResponse(params.get("hub.challenge"))
    raise HTTPException(status_code=403, detail="Verification failed")


# -- 2. Incoming messages (POST) --------------------------------------------
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
        print(f"From: {msg.get('from')} | Type: {msg.get('type')}")

        if msg["type"] != "text":
            await send_whatsapp_message(
                phone_number_id,
                msg["from"],
                "\u09a6\u09c1\u0983\u0996\u09bf\u09a4, \u0986\u09ae\u09bf \u09b6\u09c1\u09a7\u09c1 \u099f\u09c7\u0995\u09cd\u09b8\u099f \u09ae\u09c7\u09b8\u09c7\u099c \u09ac\u09c1\u099d\u09a4\u09c7 \u09aa\u09be\u09b0\u09bf\u0964 \ud83d\ude4f",
            )
            return {"status": "ok"}

        phone_raw = msg["from"]           # e.g. "8801876375141"
        user_message = msg["text"]["body"]

        # Normalize phone for DB lookup (try both formats)
        phone_plus = "+" + phone_raw      # +8801876375141
        phone_zero = "0" + phone_raw[3:]  # 01876375141

        user = (
            await prisma.user.find_unique(where={"phone": phone_plus})
            or await prisma.user.find_unique(where={"phone": phone_zero})
        )

        print(f"Looking up user: +{phone_raw} or {phone_zero} -> Found: {user is not None}")

        if not user:
            reg_link = f"{settings.frontend_url}/auth"
            msg_text = (
                f"You are not a Pushti AI registered user. Please register first: {reg_link}\n\n"
                f"\u0986\u09aa\u09a8\u09be\u09b0 \u09ae\u09cb\u09ac\u09be\u0987\u09b2 \u09a8\u09ae\u09cd\u09ac\u09b0\u099f\u09bf Pushti AI-\u09a4\u09c7 \u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09bf\u09a4 \u09a8\u09df\u0964 "
                f"\u0985\u09a8\u09c1\u0997\u09cd\u09b0\u09b9 \u0995\u09b0\u09c7 \u09aa\u09cd\u09b0\u09a5\u09ae\u09c7 \u098f\u0987 \u09b2\u09bf\u0999\u09cd\u0995\u09c7 \u0997\u09bf\u09df\u09c7 \u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8 \u0995\u09b0\u09c1\u09a8: {reg_link} \U0001F64F"
            )
            await send_whatsapp_message(phone_number_id, phone_raw, msg_text)
            return {"status": "ok"}

        # Fetch last 10 messages as history
        history_rows = await prisma.chatmessage.find_many(
            where={"userId": user.id},
            order={"createdAt": "desc"},
            take=10,
        )
        history = [
            {"role": r.role, "content": r.content}
            for r in reversed(history_rows)
        ]

        # Get service JWT for this user
        token = create_access_token(data={"sub": user.id})

        # Call RAG /chat endpoint and parse SSE
        reply = await call_rag(
            token, user_message, user.language or "bn", history
        )

        # Save both messages to DB
        await prisma.chatmessage.create_many(
            data=[
                {
                    "messageId": str(uuid.uuid4()),
                    "userId": user.id,
                    "role": "user",
                    "content": user_message,
                },
                {
                    "messageId": str(uuid.uuid4()),
                    "userId": user.id,
                    "role": "assistant",
                    "content": reply,
                },
            ]
        )

        # Send WhatsApp reply
        print(f"Sending reply: {reply[:100]}...")
        await send_whatsapp_message(phone_number_id, phone_raw, reply)
        print("Reply sent successfully")

    except Exception as e:
        print(f"WhatsApp webhook error: {e}")
        import traceback
        traceback.print_exc()

    return {"status": "ok"}


# -- 3. Call RAG /chat and parse SSE stream ---------------------------------
async def call_rag(
    token: str, message: str, language: str, history: list
) -> str:
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
                "message": message,
                "language": language,
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
                full_text = "\u09a6\u09c1\u0983\u0996\u09bf\u09a4, \u098f\u0987 \u09ae\u09c1\u09b9\u09c2\u09b0\u09cd\u09a4\u09c7 \u0989\u09a4\u09cd\u09a4\u09b0 \u09a6\u09bf\u09a4\u09c7 \u09aa\u09be\u09b0\u099b\u09bf \u09a8\u09be\u0964 \u098f\u0995\u099f\u09c1 \u09aa\u09b0\u09c7 \u0986\u09ac\u09be\u09b0 \u099a\u09c7\u09b7\u09cd\u099f\u09be \u0995\u09b0\u09c1\u09a8\u0964 \ud83d\ude4f"
            return full_text


# -- 4. Send WhatsApp message via Meta Cloud API ----------------------------
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


# -- 5. WhatsApp Opt-In (Greeting Trigger) ----------------------------------
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

    if not PHONE_NUMBER_ID:
        raise HTTPException(
            status_code=500,
            detail="WhatsApp service is not configured on the server.",
        )

    greeting_message = (
        "\u0986\u0938\u09b8\u09be\u09b2\u09be\u09ae\u09c1 \u0986\u09b2\u09be\u0987\u0995\u09c1\u09ae! "
        "Pushti AI (\u09aa\u09c1\u09b7\u09cd\u099f\u09bf \u098f\u0986\u0987) \u09a5\u09c7\u0995\u09c7 "
        "\u0986\u09aa\u09a8\u09be\u0995\u09c7 \u09b8\u09cd\u09ac\u09be\u0997\u09a4\u09ae\u0964 \U0001F966\n\n"
        "\u098f\u0996\u09a8 \u09a5\u09c7\u0995\u09c7 \u0986\u09aa\u09a8\u09bf \u09b8\u09b0\u09be\u09b8\u09b0\u09bf "
        "\u098f\u0987 WhatsApp \u099a\u09cd\u09af\u09be\u099f\u09c7 \u0986\u09ae\u09be\u09a6\u09c7\u09b0 "
        "\u09b8\u09be\u09a5\u09c7 \u0995\u09a5\u09be \u09ac\u09b2\u09a4\u09c7 \u09aa\u09be\u09b0\u09ac\u09c7\u09a8\u0964 "
        "\u0986\u09aa\u09a8\u09be\u09b0 \u09af\u09c7\u0995\u09cb\u09a8\u09cb \u09aa\u09c1\u09b7\u09cd\u099f\u09bf, "
        "\u09a1\u09be\u09df\u09c7\u099f \u09ac\u09be \u09b8\u09cd\u09ac\u09be\u09b8\u09cd\u09a5\u09cd\u09af "
        "\u09ac\u09bf\u09b7\u09df\u0995 \u09aa\u09cd\u09b0\u09b6\u09cd\u09a8 \u0986\u09ae\u09be\u09a6\u09c7\u09b0 "
        "\u099c\u09bf\u099c\u09cd\u099e\u09c7\u09b8 \u0995\u09b0\u09c1\u09a8! \U0001F64F\n\n"
        "Welcome to Pushti AI! You can now chat with me directly on WhatsApp. "
        "Feel free to ask any dietary or nutritional questions!"
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
