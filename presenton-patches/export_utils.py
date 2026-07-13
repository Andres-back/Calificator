import os
from typing import Literal
from urllib.parse import urlencode
import uuid

from pathvalidate import sanitize_filename

from models.presentation_and_path import PresentationAndPath
from services.export_task_service import EXPORT_TASK_SERVICE
from utils.simple_auth import (
    SESSION_COOKIE_NAME,
    create_session_token,
    get_configured_auth_username,
)


def _get_next_public_url() -> str:
    return (os.getenv("NEXT_PUBLIC_URL") or "").strip() or "http://127.0.0.1"


def _get_next_public_fastapi_url() -> str | None:
    value = (os.getenv("NEXT_PUBLIC_FAST_API") or "").strip()
    return value or None


def _build_presentation_export_url(presentation_id: uuid.UUID) -> tuple[str, str | None]:
    params = {"id": str(presentation_id)}
    fastapi_url = _get_next_public_fastapi_url()
    if fastapi_url:
        params["fastapiUrl"] = fastapi_url

    return (
        f"{_get_next_public_url().rstrip('/')}/pdf-maker?{urlencode(params)}",
        fastapi_url,
    )


def _build_export_cookie_header() -> str | None:
    username = get_configured_auth_username()
    if not username:
        return None

    token = create_session_token(username)
    return f"{SESSION_COOKIE_NAME}={token}"


async def export_presentation(
    presentation_id: uuid.UUID, title: str, export_as: Literal["pptx", "pdf"]
) -> PresentationAndPath:
    export_url, fastapi_url = _build_presentation_export_url(presentation_id)
    response_data = await EXPORT_TASK_SERVICE._run_task(
        {
            "type": "export",
            "url": export_url,
            "format": export_as,
            "title": sanitize_filename(title or str(uuid.uuid4())),
            "fastapiUrl": fastapi_url or None,
            "cookieHeader": _build_export_cookie_header(),
        },
        "Export task did not produce a response file",
    )

    return PresentationAndPath(
        presentation_id=presentation_id,
        path=EXPORT_TASK_SERVICE._resolve_output_path(response_data),
    )
