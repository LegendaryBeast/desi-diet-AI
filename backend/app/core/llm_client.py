"""Async LLM client for OpenAI (or any OpenAI-compatible endpoint: Groq, OpenRouter, etc.)."""

import io
import time
import uuid
import logging
from typing import AsyncIterator, List, Dict, Any, Optional
import httpx
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """Unified async LLM client.
    Prefers Groq when GROQ_API_KEY is set, otherwise uses OpenAI-compatible config."""

    def __init__(self):
        default_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        if settings.groq_api_key:
            self.client = AsyncOpenAI(
                api_key=settings.groq_api_key,
                base_url="https://api.groq.com/openai/v1",
                default_headers=default_headers,
            )
            self.model = "llama-3.3-70b-versatile"
        else:
            self.client = AsyncOpenAI(
                api_key=settings.llm_api_key,
                base_url=settings.llm_base_url,
                default_headers=default_headers,
            )
            self.model = settings.llm_model

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        response_format: Optional[Dict[str, str]] = None,
        request_id: Optional[str] = None,
    ) -> str:
        """Non-streaming chat completion with structured telemetry and bounded retry."""
        req_id = request_id or str(uuid.uuid4())[:8]
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens or settings.llm_max_tokens,
        }
        if response_format:
            kwargs["response_format"] = response_format

        max_retries = 2
        for attempt in range(max_retries + 1):
            t0 = time.perf_counter()
            try:
                response = await self.client.chat.completions.create(**kwargs)
                latency_ms = round((time.perf_counter() - t0) * 1000.0, 1)
                tokens = getattr(response, "usage", None)
                total_tokens = tokens.total_tokens if tokens else "est"
                logger.info(
                    "[LLM req_id=%s] model=%s latency_ms=%s tokens=%s attempt=%s",
                    req_id, self.model, latency_ms, total_tokens, attempt + 1
                )
                return response.choices[0].message.content or ""
            except Exception as e:
                latency_ms = round((time.perf_counter() - t0) * 1000.0, 1)
                logger.warning(
                    "[LLM req_id=%s ERROR] model=%s latency_ms=%s attempt=%s error=%s",
                    req_id, self.model, latency_ms, attempt + 1, str(e)[:120]
                )
                if attempt == max_retries:
                    raise e
                import asyncio
                await asyncio.sleep(0.5 * (attempt + 1))

        return ""

    async def chat_completion_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        request_id: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Streaming chat completion with request tracking."""
        req_id = request_id or str(uuid.uuid4())[:8]
        t0 = time.perf_counter()
        logger.info("[LLM STREAM req_id=%s] starting stream model=%s", req_id, self.model)
        stream = await self.client.chat.completions.create(

            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens or settings.llm_max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices:
                content = chunk.choices[0].delta.content
                if content:
                    yield content

    async def get_embedding(self, text: str, model: str = "text-embedding-3-small") -> List[float]:
        """Generate vector embedding for a text query using OpenAI."""
        response = await self.client.embeddings.create(
            input=[text],
            model=model
        )
        return response.data[0].embedding

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        model: str = "gpt-4o-transcribe",
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> str:
        """Transcribe speech to text via OpenAI.

        Models:
          - "gpt-4o-transcribe"      → best quality, multilingual (default)
          - "gpt-4o-mini-transcribe" → cheaper, still strong multilingual
          - "whisper-1"              → legacy Whisper v2

        Pass `prompt` (a short context phrase) to bias short/noisy clips.
        """
        buf = io.BytesIO(audio_bytes)
        buf.name = filename  # OpenAI SDK uses .name to infer format
        kwargs: Dict[str, Any] = {"model": model, "file": buf}
        if language:
            kwargs["language"] = language
        if prompt:
            kwargs["prompt"] = prompt
        result = await self.client.audio.transcriptions.create(**kwargs)
        return (getattr(result, "text", None) or "").strip()

    async def text_to_speech(
        self,
        text: str,
        voice: str = "alloy",
        model: str = "gpt-4o-mini-tts",
        response_format: str = "mp3",
    ) -> bytes:
        """Synthesize speech via OpenAI TTS. Returns raw audio bytes (default mp3)."""
        response = await self.client.audio.speech.create(
            model=model,
            voice=voice,
            input=text,
            response_format=response_format,
        )
        # SDK returns an HttpxBinaryResponseContent; .read() gives bytes
        return await response.aread() if hasattr(response, "aread") else response.read()

    async def create_realtime_session(
        self,
        instructions: str,
        voice: str = "alloy",
        model: str = "gpt-realtime",
    ) -> Dict[str, Any]:
        """Mint an ephemeral Realtime API client secret for browser WebRTC clients.

        Uses the **GA** Realtime endpoint (POST /v1/realtime/client_secrets) — the old
        Beta endpoint (`/v1/realtime/sessions` + `OpenAI-Beta: realtime=v1` header) was
        removed in late 2025.

        Returns the full response, which includes:
          - `value`: ephemeral bearer (`ek_...`) the browser uses for SDP exchange
          - `expires_at`: unix timestamp
          - `session`: the full session config that was applied

        Docs: https://platform.openai.com/docs/guides/realtime
        """
        base = settings.llm_base_url.rstrip("/")
        url = f"{base}/realtime/client_secrets"
        # GA request body — session config is nested under `session`.
        # `output_modalities: ["audio"]` makes the model speak; transcripts stream alongside.
        payload: Dict[str, Any] = {
            "session": {
                "type": "realtime",
                "model": model,
                "instructions": instructions,
                "output_modalities": ["audio"],
                "audio": {
                    "input": {
                        "transcription": {"model": "gpt-4o-transcribe"},
                        "turn_detection": {
                            "type": "server_vad",
                            "create_response": True,
                            "interrupt_response": True,
                        },
                    },
                    "output": {
                        "voice": voice,
                    },
                },
            }
        }
        headers = {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()


# Singleton instance
llm_client = LLMClient()
