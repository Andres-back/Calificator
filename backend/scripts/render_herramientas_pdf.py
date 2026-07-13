"""Regenera PDFs de herramientas con la estética de la app (WeasyPrint).

Toma el último material de cada tipo en la base de datos y escribe, por cada
uno, la hoja del estudiante y la hoja de respuestas en
``uploads/herramientas_pdf/``. Pensado para correr DENTRO del contenedor:

    docker compose exec backend python scripts/render_herramientas_pdf.py

(Supersede al antiguo ``export_materiales_pdf.py`` basado en reportlab.)
"""
from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path

# Permite ejecutar el script directamente (python scripts/render_herramientas_pdf.py).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.modules.herramientas.pdf_render import TOOL_LABELS, render_material_pdf

OUTPUT_DIR = Path("/app/uploads/herramientas_pdf")
TIPOS = list(TOOL_LABELS.keys())


def _slug(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return value or "material"


async def _latest_per_tipo() -> list[dict]:
    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            text(
                "SELECT DISTINCT ON (tipo) id, tipo, titulo, contenido_json, created_at "
                "FROM materiales_generados WHERE tipo = ANY(:tipos) "
                "ORDER BY tipo, created_at DESC"
            ),
            {"tipos": TIPOS},
        )
        return [
            {
                "id": r.id,
                "tipo": r.tipo,
                "titulo": r.titulo,
                "contenido_json": r.contenido_json,
                "created_at": r.created_at,
            }
            for r in rows.fetchall()
        ]


async def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    materials = await _latest_per_tipo()
    # Orden estable según TOOL_LABELS.
    materials.sort(key=lambda m: TIPOS.index(m["tipo"]) if m["tipo"] in TIPOS else 99)

    if not materials:
        print("No hay materiales en la base de datos.")
        return

    written: list[str] = []
    for idx, material in enumerate(materials, start=1):
        base = f"{idx:02d}-{material['tipo']}-{_slug(material['titulo'])}"
        for sol in (False, True):
            pdf = render_material_pdf(material, soluciones=sol)
            name = f"{base}{'-soluciones' if sol else ''}.pdf"
            path = OUTPUT_DIR / name
            path.write_bytes(pdf)
            written.append(str(path))
        print(f"  [{material['tipo']:<14}] {material['titulo']}")

    print(f"\n{len(written)} PDFs escritos en {OUTPUT_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
