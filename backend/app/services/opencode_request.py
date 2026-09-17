"""Shared request metadata required by the OpenCode Go gateway."""
from __future__ import annotations

import hashlib
from typing import Any
from uuid import uuid4

OPEN_CODE_USER_AGENT = "XCalificator/1.0"


def new_opencode_session_id(seed: Any | None = None) -> str:
    """Return an opaque, stable identifier without leaking tracking metadata."""
    if seed is None or not str(seed).strip():
        return f"xca-{uuid4().hex}"
    digest = hashlib.sha256(str(seed).encode("utf-8")).hexdigest()
    return f"xca-{digest[:32]}"


def opencode_headers(
    api_key: str,
    *,
    session_id: str,
    messages_api: bool = False,
) -> dict[str, str]:
    """Build protocol-specific auth plus the routing metadata OpenCode requires."""
    headers = {
        "Content-Type": "application/json",
        "User-Agent": OPEN_CODE_USER_AGENT,
        "x-opencode-session": session_id,
    }
    if messages_api:
        headers.update({
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        })
    else:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers
