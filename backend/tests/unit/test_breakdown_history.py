import asyncio
from types import SimpleNamespace
from uuid import uuid4

from app.modules.calificaciones.breakdown_service import _automatic_provenance, list_versions


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
        activo=True, created_at=None, pipeline_run_id=None,
        procedencia_json={'primera_sugerencia': {'version': 1}},
    )
    result = asyncio.run(list_versions(FakeDB([(version, 'Profesora Ana')]), uuid4()))
    assert result[0]['actor_nombre'] == 'Profesora Ana'
    assert result[0]['version'] == 2
    assert result[0]['es_sugerencia_inicial'] is False


def test_retry_preserves_the_first_ai_suggestion_identity():
    initial = _automatic_provenance(
        active=None,
        raw_output={'orchestrator': {'strategy': 'dual'}},
        pipeline_run_id='run-initial',
        version=1,
        note=4.5,
    )
    active = SimpleNamespace(
        version=1,
        pipeline_run_id='run-initial',
        nota_final=4.5,
        procedencia_json=initial,
    )

    retry = _automatic_provenance(
        active=active,
        raw_output={'orchestrator': {'strategy': 'retry'}},
        pipeline_run_id='run-retry',
        version=2,
        note=3.8,
    )

    assert retry['primera_sugerencia'] == {
        'version': 1,
        'pipeline_run_id': 'run-initial',
        'nota_final': 4.5,
    }
    assert retry['intento_actual'] == {
        'version': 2,
        'pipeline_run_id': 'run-retry',
        'nota_final': 3.8,
    }
