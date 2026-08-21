import asyncio
from types import SimpleNamespace
from uuid import uuid4

from app.modules.calificaciones.breakdown_service import list_versions


class Rows:
    def __init__(self, values):
        self.values = values

    def all(self):
        return self.values


class FakeDB:
    def __init__(self, values):
        self.values = values

    async def execute(self, _query):
        return Rows(self.values)


def test_history_returns_the_teacher_name_for_each_version():
    version = SimpleNamespace(
        id=uuid4(), version=2, origen='docente', nota_final=4.25,
        activo=True, created_at=None,
    )
    result = asyncio.run(list_versions(FakeDB([(version, 'Profesora Ana')]), uuid4()))
    assert result[0]['actor_nombre'] == 'Profesora Ana'
    assert result[0]['version'] == 2
