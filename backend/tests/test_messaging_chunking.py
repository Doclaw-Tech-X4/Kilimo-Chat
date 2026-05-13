"""Unit tests for Twilio WhatsApp message chunking."""

from __future__ import annotations

import pytest

from utils.messaging import (
    TWILIO_WHATSAPP_MAX_BODY_CHARS,
    chunk_whatsapp_text,
    DEFAULT_MAX_CHUNK_CHARS,
)


def test_chunk_respects_max_length() -> None:
    body = "a" * 5000
    chunks = chunk_whatsapp_text(body, max_chunk_chars=200, max_chunks=50)
    assert chunks
    assert all(len(c) <= 200 for c in chunks)


def test_chunk_prefers_paragraphs() -> None:
    p1 = "First paragraph." * 20
    p2 = "Second paragraph." * 20
    text = p1 + "\n\n" + p2
    chunks = chunk_whatsapp_text(
        text, max_chunk_chars=DEFAULT_MAX_CHUNK_CHARS, max_chunks=20
    )
    joined = "\n---\n".join(chunks)
    assert "First paragraph" in joined
    assert "Second paragraph" in joined


def test_empty_returns_empty_list() -> None:
    assert chunk_whatsapp_text("   \n\n  ") == []


def test_max_chunks_truncates() -> None:
    text = "\n\n".join(f"block{i}." * 400 for i in range(30))
    chunks = chunk_whatsapp_text(
        text, max_chunk_chars=100, max_chunks=3
    )
    assert len(chunks) <= 3
    for c in chunks:
        assert len(c) <= 100


def test_invalid_max_chunk_raises() -> None:
    with pytest.raises(ValueError):
        chunk_whatsapp_text("hi", max_chunk_chars=TWILIO_WHATSAPP_MAX_BODY_CHARS + 1)
