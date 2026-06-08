# Pushti AI WhatsApp Service

A lightweight, standalone proxy service that sits between the Meta Cloud API and the Pushti AI main backend.

## Responsibilities

- Receives Meta webhook events (`POST /webhook/whatsapp`)
- Verifies webhook subscription (`GET /webhook/whatsapp`)
- Forwards incoming messages to the main backend (`POST /whatsapp/incoming`)
- Sends outgoing messages via Meta Cloud API on behalf of the main backend (`POST /send-message`)
- **Does NOT** talk to the database, Prisma, or RAG engine directly

## Quick Start

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Fill in `.env` with your credentials.

3. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. Run locally:
   ```bash
   uvicorn main:app --reload --port 8010
   ```

## Docker

```bash
docker build -t pushti-whatsapp-service .
docker run -p 8010:8010 --env-file .env pushti-whatsapp-service
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Port to bind the service (default `8010`) |
| `WHATSAPP_TOKEN` | Meta Cloud API permanent token |
| `PHONE_NUMBER_ID` | Meta phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Token used for webhook verification handshake |
| `MAIN_SERVER_URL` | Base URL of the Pushti AI main backend |
| `WHATSAPP_SERVICE_API_KEY` | Shared secret for HMAC-style auth with the main backend |
