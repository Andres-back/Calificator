from __future__ import annotations

import asyncio
from uuid import uuid4

from app.modules.analytics import service


class FakeSession:
    def __init__(self) -> None:
        self.added = None
        self.committed = False
        self.refreshed = None

    def add(self, value) -> None:
        self.added = value

    async def commit(self) -> None:
        self.committed = True

    async def refresh(self, value) -> None:
        self.refreshed = value


def test_registrar_evento_persists_payload() -> None:
    session = FakeSession()
    actor_id = uuid4()

    evento = asyncio.run(
        service.registrar_evento(
            session,
            tipo="workspace_opened",
            actor_id=actor_id,
            metadata_json={"source": "workspace"},
        )
    )

    assert session.added is evento
    assert session.committed is True
    assert session.refreshed is evento
    assert evento.tipo == "workspace_opened"
    assert evento.actor_id == actor_id
    assert evento.metadata_json == {"source": "workspace"}
