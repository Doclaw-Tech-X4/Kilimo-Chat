"""
Secure, pathlib-based helpers for voice upload paths.

WHY ``UPLOADS_DIR`` was a ``str``: In ``config``, ``UPLOADS_DIR`` was built with
``os.path.join(...)``, so it was a ``str``. The expression ``UPLOADS_DIR / name``
then invoked ``str.__truediv__``, which is not defined for ``str``/``str``,
causing ``TypeError``. Using ``pathlib.Path`` for the uploads root restores
correct path joining on Linux and Windows.
"""

from __future__ import annotations

import re
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

ALLOWED_VOICE_EXTENSIONS: frozenset[str] = frozenset(
    {".ogg", ".mp3", ".m4a", ".wav", ".webm"}
)
_DEFAULT_EXT = ".ogg"
_MAX_STEM_LEN = 128


def sanitize_path_stem(stem: str, *, max_len: int = _MAX_STEM_LEN) -> str:
    """
    Reduce path traversal and odd filesystem characters in a filename stem.

    Allows only ASCII letters, digits, hyphen, and underscore. Empty result
    falls back to ``voice``.
    """
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "_", stem.strip())
    cleaned = cleaned.strip("_")[:max_len]
    return cleaned or "voice"


def resolve_voice_extension_from_media_url(media_url: str) -> str:
    """
    Pick a safe voice file extension from a Twilio media URL (or default).

    Args:
        media_url: Twilio ``MediaUrl0`` or similar.

    Returns:
        A leading-dot extension in :data:`ALLOWED_VOICE_EXTENSIONS`, or
        ``.ogg`` when unknown or disallowed.
    """
    if not media_url or "." not in media_url:
        return _DEFAULT_EXT
    raw = media_url.rsplit(".", 1)[-1].split("?")[0].split("/")[0].lower()
    if not raw:
        return _DEFAULT_EXT
    ext = raw if raw.startswith(".") else f".{raw}"
    if ext in ALLOWED_VOICE_EXTENSIONS:
        return ext
    logger.debug("Disallowed or unknown voice extension %r; using .ogg", ext)
    return _DEFAULT_EXT


def voice_upload_file_path(
    uploads_dir: Path,
    voice_id: str,
    media_url: str,
) -> Path:
    """
    Build a secure absolute path for a downloaded voice file.

    Ensures the parent directory exists (idempotent).

    Args:
        uploads_dir: Root directory for voice files (must be absolute).
        voice_id: Unique id (e.g. UUID string).
        media_url: Source URL used only to infer extension.

    Returns:
        Absolute ``Path`` for the stored file.
    """
    root = Path(uploads_dir).expanduser().resolve()
    stem = sanitize_path_stem(voice_id)
    ext = resolve_voice_extension_from_media_url(media_url)
    root.mkdir(parents=True, exist_ok=True)
    path = root / f"{stem}{ext}"
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise ValueError("voice_id produced path outside uploads_dir") from exc
    return path
