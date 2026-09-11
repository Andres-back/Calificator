"""Availability controls for new educational-tool generations."""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.herramientas.tool_registry import all_tools, canonical_tool_id, get_tool


async def _settings(db: AsyncSession) -> dict[str, dict[str, Any]]:
    try:
        result = await db.execute(
            text(
                "SELECT tool_id, generation_enabled, pause_reason, config_version, "
                "updated_at FROM ai_tool_settings"
            )
        )
        return {str(row.tool_id): dict(row._mapping) for row in result.fetchall()}
    except Exception:
        # During rolling deploys the migration may precede the new application.
        # Preserve the previous all-enabled behaviour until schema is available.
        await db.rollback()
        return {}


async def get_tool_catalog(db: AsyncSession, *, include_admin: bool = False) -> list[dict[str, Any]]:
    settings = await _settings(db)
    catalog: list[dict[str, Any]] = []
    for definition in all_tools():
        row = settings.get(str(definition["tool_id"]), {})
        enabled = bool(row.get("generation_enabled", True))
        item = {
            **definition,
            "generation_enabled": enabled,
            "unavailable_reason": None if enabled else "No admite nuevas generaciones por el momento.",
            "config_version": int(row.get("config_version") or 1),
            "updated_at": row.get("updated_at"),
        }
        if include_admin:
            item["pause_reason"] = row.get("pause_reason")
        catalog.append(item)
    return catalog


async def ensure_generation_enabled(db: AsyncSession, tool_id: str) -> str:
    canonical = canonical_tool_id(tool_id)
    if get_tool(canonical) is None:
        raise HTTPException(status_code=404, detail="Herramienta desconocida.")
    settings = await _settings(db)
    row = settings.get(canonical)
    if row is not None and not bool(row.get("generation_enabled")):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "tool_generation_paused",
                "message": "Esta herramienta no admite nuevas generaciones por el momento.",
            },
        )
    return canonical
