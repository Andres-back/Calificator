"""Migrate legacy presentation assets into XCalificator storage.

Revision ID: 202608140002
Revises: 202608140001
Create Date: 2026-08-14
"""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.core.config import settings


revision: str = "202608140002"
down_revision: Union[str, None] = "202608140001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LEGACY_IMAGE = re.compile(r"^/app_data/images/xcal/([0-9a-f]{18})\.png$")
ASSET_URL = "/api/presentaciones/assets/{asset_id}"


def _copy_asset(asset_id: str, uploads_root: Path) -> None:
    source_dir = uploads_root / "presenton" / "images" / "xcal"
    target_dir = uploads_root / "presentaciones"
    source_image = source_dir / f"{asset_id}.png"
    target_image = target_dir / f"slide-{asset_id}.png"


    target_dir.mkdir(parents=True, exist_ok=True)
    target_meta = target_dir / f"slide-{asset_id}.json"
    if not source_image.is_file() and not target_image.is_file():
        from PIL import Image, ImageDraw

        image = Image.new("RGB", (960, 540), "#e0f2fe")
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle(
            (70, 70, 890, 470), radius=36, fill="#ffffff", outline="#0284c7", width=6
        )
        draw.text((120, 205), "XCalificator", fill="#0f172a")
        draw.text((120, 275), "Recurso visual no disponible", fill="#334155")
        image.save(target_image, "PNG")
        target_meta.write_text(
            json.dumps({"provider": "migrated-placeholder", "legacy_id": asset_id}),
            encoding="utf-8",
        )
        return

    if not target_image.is_file():
        shutil.copy2(source_image, target_image)

    source_meta = source_dir / f"{asset_id}.json"
    if source_meta.is_file() and not target_meta.is_file():
        shutil.copy2(source_meta, target_meta)


def _migrate_payload(value: Any, uploads_root: Path) -> tuple[Any, bool]:
    if isinstance(value, dict):
        changed = False
        migrated: dict[str, Any] = {}
        for key, child in value.items():
            if key == "presenton":
                changed = True
                continue
            migrated_child, child_changed = _migrate_payload(child, uploads_root)
            migrated[key] = migrated_child
            changed = changed or child_changed
        return migrated, changed

    if isinstance(value, list):
        changed = False
        migrated_items: list[Any] = []
        for child in value:
            migrated_child, child_changed = _migrate_payload(child, uploads_root)
            migrated_items.append(migrated_child)
            changed = changed or child_changed
        return migrated_items, changed

    if isinstance(value, str):
        match = LEGACY_IMAGE.fullmatch(value.strip())
        if match:
            asset_id = match.group(1)
            _copy_asset(asset_id, uploads_root)
            return ASSET_URL.format(asset_id=asset_id), True

    return value, False


def _drop_retired_database_objects() -> None:
    op.execute(
        "ALTER TABLE IF EXISTS ai_global_config "
        "DROP COLUMN IF EXISTS presenton_password_encrypted"
    )
    op.execute("DROP SCHEMA IF EXISTS legacy_presenton CASCADE")


def upgrade() -> None:
    connection = op.get_bind()
    uploads_root = Path(settings.UPLOADS_DIR).resolve()
    rows = connection.execute(
        sa.text(
            "SELECT id, slides_json FROM presentaciones "
            "WHERE slides_json::text LIKE '%/app_data/%' "
            "OR slides_json ? 'presenton'"
        )
    ).mappings()

    payload_type = postgresql.JSONB()
    update_statement = sa.text(
        "UPDATE presentaciones SET slides_json = :payload WHERE id = :id"
    ).bindparams(sa.bindparam("payload", type_=payload_type))

    for row in rows:
        migrated, changed = _migrate_payload(row["slides_json"], uploads_root)
        if changed:
            connection.execute(
                update_statement,
                {"id": row["id"], "payload": migrated},
            )

    _drop_retired_database_objects()


def downgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS legacy_presenton")
    op.execute(
        "ALTER TABLE IF EXISTS ai_global_config "
        "ADD COLUMN IF NOT EXISTS presenton_password_encrypted TEXT"
    )
