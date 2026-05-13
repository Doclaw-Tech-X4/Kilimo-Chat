"""
Timezone-aware UTC helpers (replaces deprecated ``datetime.utcnow()``).

PyMongo 4.x stores ``datetime`` values in BSON as UTC. Passing
timezone-aware UTC datetimes is recommended; the driver serializes them
correctly. Existing documents that used naive UTC remain comparable to
new aware UTC instants in queries because both represent the same UTC
timeline when serialized.
"""

from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    """
    Return the current instant as timezone-aware UTC.

    Use this instead of ``datetime.utcnow()`` (deprecated in Python 3.12+).

    Returns:
        Aware ``datetime`` with ``tzinfo=datetime.timezone.utc``.
    """
    return datetime.now(timezone.utc)
