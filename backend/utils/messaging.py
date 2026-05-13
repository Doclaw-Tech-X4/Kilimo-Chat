"""
Twilio WhatsApp outbound helpers: long-message chunking under the 1600-char limit.

Twilio rejects a single ``body`` longer than 1600 characters. This module splits
on paragraphs and sentences when possible, sends each chunk as its own message,
retries transient failures, and caps the number of chunks to protect cost and UX.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from dataclasses import dataclass
from typing import List, Optional

from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

logger = logging.getLogger(__name__)

# Twilio documented max for a single message body
TWILIO_WHATSAPP_MAX_BODY_CHARS = 1600
# Slight margin for safety (encoding / future policy tweaks)
DEFAULT_MAX_CHUNK_CHARS = 1530
DEFAULT_MAX_CHUNKS = 100
DEFAULT_SEND_RETRIES = 3
DEFAULT_RETRY_BACKOFF_SEC = 0.75


@dataclass(frozen=True)
class LongMessageSendResult:
    """Outcome of a chunked WhatsApp send."""

    success: bool
    message_sids: tuple[str, ...]
    chunks_sent: int
    error: Optional[str] = None


def _hard_wrap(text: str, max_len: int) -> List[str]:
    """Split ``text`` into segments of at most ``max_len`` characters."""
    if max_len < 1:
        raise ValueError("max_len must be positive")
    chunks: List[str] = []
    i = 0
    n = len(text)
    while i < n:
        piece = text[i : i + max_len]
        if piece.strip():
            chunks.append(piece)
        i += max_len
    return chunks


def _split_sentences(text: str) -> List[str]:
    """Split on sentence boundaries; preserves readability when possible."""
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def _refine_oversized_unit(unit: str, max_chunk: int) -> List[str]:
    """Break a single long unit into pieces no longer than ``max_chunk``."""
    if len(unit) <= max_chunk:
        return [unit]
    sentences = _split_sentences(unit)
    if len(sentences) <= 1 and sentences and len(sentences[0]) == len(unit):
        return _hard_wrap(unit, max_chunk)
    out: List[str] = []
    for s in sentences:
        if len(s) <= max_chunk:
            out.append(s)
        else:
            out.extend(_hard_wrap(s, max_chunk))
    return out


def chunk_whatsapp_text(
    text: str,
    *,
    max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS,
    max_chunks: int = DEFAULT_MAX_CHUNKS,
) -> List[str]:
    """
    Split ``text`` into WhatsApp-safe chunks.

    Strategy:
        1. Normalize newlines; strip outer whitespace; skip empty.
        2. Split on blank-line paragraph boundaries.
        3. Oversized paragraphs are split by sentences, then hard-wrapped.
        4. Pack refined units greedily up to ``max_chunk_chars`` (joined with
           double newlines between former paragraphs).

    Args:
        text: Full assistant reply.
        max_chunk_chars: Maximum characters per chunk (<= 1600 recommended).
        max_chunks: Hard cap on chunks to avoid runaway sends.

    Returns:
        Non-empty string chunks, each length <= ``max_chunk_chars``.
    """
    if max_chunk_chars > TWILIO_WHATSAPP_MAX_BODY_CHARS:
        raise ValueError(
            f"max_chunk_chars must be <= {TWILIO_WHATSAPP_MAX_BODY_CHARS}"
        )
    if max_chunk_chars < 48:
        raise ValueError("max_chunk_chars too small for readable splitting")

    normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return []

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", normalized) if p.strip()]
    if not paragraphs:
        paragraphs = [normalized]

    units: List[str] = []
    for para in paragraphs:
        units.extend(_refine_oversized_unit(para, max_chunk_chars))

    packed: List[str] = []
    buf = ""
    truncated = False

    for u in units:
        candidate = f"{buf}\n\n{u}" if buf else u
        if len(candidate) <= max_chunk_chars:
            buf = candidate
            continue
        if buf.strip():
            if len(packed) >= max_chunks:
                truncated = True
                break
            packed.append(buf.strip())
        buf = u
        if len(packed) >= max_chunks:
            truncated = True
            break

    if not truncated and buf.strip():
        if len(packed) < max_chunks:
            packed.append(buf.strip())
        else:
            truncated = True

    if truncated:
        logger.warning(
            "chunk_whatsapp_text: hit max_chunks=%s; trailing segments omitted",
            max_chunks,
        )

    return [c for c in packed if c.strip()]


def _should_retry_twilio(exc: TwilioRestException) -> bool:
    status = getattr(exc, "status", None)
    if status is None:
        return True
    if status == 429:
        return True
    if 500 <= int(status) < 600:
        return True
    return False


def _send_one_with_retries(
    client: Client,
    *,
    from_: str,
    to: str,
    body: str,
    log: logging.Logger,
    max_retries: int,
    backoff_sec: float,
) -> str:
    """Send a single chunk; returns Message SID."""
    attempt = 0
    last_exc: Optional[Exception] = None
    while attempt < max_retries:
        try:
            msg = client.messages.create(from_=from_, to=to, body=body)
            return str(msg.sid)
        except TwilioRestException as exc:
            last_exc = exc
            if not _should_retry_twilio(exc) or attempt >= max_retries - 1:
                raise
            sleep_for = backoff_sec * (2**attempt)
            log.warning(
                "Twilio send retry after error status=%s code=%s sleep=%.2fs",
                getattr(exc, "status", None),
                getattr(exc, "code", None),
                sleep_for,
            )
            time.sleep(sleep_for)
        except OSError as exc:
            last_exc = exc
            if attempt >= max_retries - 1:
                raise
            sleep_for = backoff_sec * (2**attempt)
            log.warning("Network error on Twilio send: %s; retry in %.2fs", exc, sleep_for)
            time.sleep(sleep_for)
        attempt += 1
    assert last_exc is not None
    raise last_exc


def send_long_whatsapp_message(
    client: Client,
    *,
    from_: str,
    to: str,
    body: str,
    log: Optional[logging.Logger] = None,
    max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS,
    max_chunks: int = DEFAULT_MAX_CHUNKS,
    max_retries: int = DEFAULT_SEND_RETRIES,
    retry_backoff_sec: float = DEFAULT_RETRY_BACKOFF_SEC,
) -> LongMessageSendResult:
    """
    Send a WhatsApp message, splitting when ``body`` exceeds Twilio limits.

    Each chunk is one ``messages.create`` call (separate WhatsApp bubbles).
    Retries only on likely-transient errors; does not retry after a successful
    SID is returned for a chunk (avoids duplicate sends on success path).

    Args:
        client: Initialized Twilio REST client.
        from_: Twilio WhatsApp-enabled sender (``whatsapp:+...``).
        to: Recipient WhatsApp number.
        body: Full text to deliver.
        log: Optional logger (defaults to module logger).
        max_chunk_chars: Per-chunk character limit.
        max_chunks: Maximum number of outbound messages.
        max_retries: Retries per chunk for transient failures.
        retry_backoff_sec: Base backoff; doubled each retry.

    Returns:
        :class:`LongMessageSendResult` with SIDs for each chunk sent.
    """
    log = log or logger
    stripped = (body or "").strip()
    if not stripped:
        log.info("send_long_whatsapp_message: empty body; nothing sent")
        return LongMessageSendResult(success=True, message_sids=tuple(), chunks_sent=0)

    chunks = chunk_whatsapp_text(
        stripped,
        max_chunk_chars=max_chunk_chars,
        max_chunks=max_chunks,
    )
    if not chunks:
        log.info("send_long_whatsapp_message: no non-empty chunks after split")
        return LongMessageSendResult(success=True, message_sids=tuple(), chunks_sent=0)

    sids: List[str] = []
    total = len(chunks)
    try:
        for index, chunk in enumerate(chunks, start=1):
            piece = chunk.strip()
            if not piece:
                continue
            sid = _send_one_with_retries(
                client,
                from_=from_,
                to=to,
                body=piece,
                log=log,
                max_retries=max_retries,
                backoff_sec=retry_backoff_sec,
            )
            sids.append(sid)
            log.info(
                "WhatsApp chunk sent to=%s part=%s/%s chars=%s sid=%s",
                to,
                index,
                total,
                len(piece),
                sid,
            )
    except Exception as exc:
        log.error(
            "send_long_whatsapp_message failed after %s chunks: %s",
            len(sids),
            exc,
            exc_info=True,
        )
        return LongMessageSendResult(
            success=False,
            message_sids=tuple(sids),
            chunks_sent=len(sids),
            error=str(exc),
        )

    return LongMessageSendResult(
        success=True,
        message_sids=tuple(sids),
        chunks_sent=len(sids),
        error=None,
    )


async def send_long_whatsapp_message_async(
    client: Client,
    *,
    from_: str,
    to: str,
    body: str,
    log: Optional[logging.Logger] = None,
    max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS,
    max_chunks: int = DEFAULT_MAX_CHUNKS,
    max_retries: int = DEFAULT_SEND_RETRIES,
    retry_backoff_sec: float = DEFAULT_RETRY_BACKOFF_SEC,
) -> LongMessageSendResult:
    """
    Async wrapper: runs the blocking Twilio client in a thread pool.

    Use from ``async def`` endpoints or tasks without blocking the event loop.
    """
    return await asyncio.to_thread(
        send_long_whatsapp_message,
        client,
        from_=from_,
        to=to,
        body=body,
        log=log,
        max_chunk_chars=max_chunk_chars,
        max_chunks=max_chunks,
        max_retries=max_retries,
        retry_backoff_sec=retry_backoff_sec,
    )
