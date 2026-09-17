"""Reindexa todas las fuentes RAG con el espacio de embeddings efectivo."""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal, engine
from app.modules.rag.ingest_service import ingest_source
from app.modules.rag.models import RagSource


async def main() -> None:
    async with AsyncSessionLocal() as db:
        source_ids = list(
            await db.scalars(select(RagSource.id).order_by(RagSource.created_at))
        )
    completed = 0
    for source_id in source_ids:
        async with AsyncSessionLocal() as db:
            await ingest_source(db, source_id)
        completed += 1
        print(f"reindexed={completed}/{len(source_ids)} source={source_id}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
