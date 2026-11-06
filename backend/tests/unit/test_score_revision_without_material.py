"""Spec 153: a saved score plan must not trap an evaluation without material."""
from __future__ import annotations

import asyncio
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.evaluaciones import service, visual_service
from app.modules.evaluaciones.modality_service import normalize_question_modalities
from app.shared.enums import EvaluacionEstado, EvaluacionModalidad, EvaluacionTipoOrigen

UPDATED_AT = datetime(2026, 1, 1, 12, 0, 0)


class FakeDB:
    def __init__(self, scalars=()) -> None:
        self.scalar_results = list(scalars)
        self.added: list[object] = []
        self.commits = 0

    async def scalar(self, _statement, _params=None):
        return self.scalar_results.pop(0)

    def add(self, item) -> None:
        self.added.append(item)

    async def flush(self) -> None:
        return None

    async def commit(self) -> None:
        self.commits += 1


def _evaluation(version_id=None) -> SimpleNamespace:
    modality = EvaluacionModalidad.FISICA.value
    # Digitized questions have no contenido_id: that identity belongs to the visual editor.
    questions = normalize_question_modalities(
        [{"numero": 1, "tipo": "abierta", "enunciado": "Explica el texto.", "puntaje": "5"}], modality,
    )
    key = [{"numero": 1, "respuesta": "La respuesta correcta del punto uno."}]
    criteria = [{"nombre": "Comprensión", "descripcion": "Responde a lo preguntado."}]
    return SimpleNamespace(
        id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(), nombre="Sintética", descripcion=None,
        estado=EvaluacionEstado.BORRADOR.value, recepcion_habilitada=False, fecha_publicacion=None,
        modalidad=modality, tipo_origen=EvaluacionTipoOrigen.EXTERNA_DIGITALIZADA.value, nota_maxima=5,
        criterios=criteria, preguntas=questions, respuestas_esperadas=key, dba_ids=[], dba_personalizado_ids=[],
        metas_profesor=None, configuracion_impresion=None, estructura_documento=None,
        contenido_version_id=version_id, updated_at=UPDATED_AT,
        blueprint=SimpleNamespace(
            nivel_contexto="reconstruido", dba=[], metas=None, criterios=criteria, preguntas=questions,
            respuestas_esperadas=key, errores_comunes=[], contexto_rag=[], reglas_feedback={},
        ),
    )


def _revision(*, coverage, visual=None, pending=()) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(), numero_version=3, source_resource_id=None, coverage_json=coverage, recurso_ids=[],
        snapshot_json={"contenido_visual": visual, "claves_pendientes_revision": list(pending)},
    )


def _publish(monkeypatch, evaluation, revision) -> FakeDB:
    db = FakeDB()

    async def reload(_db, _evaluation_id):
        return evaluation

    monkeypatch.setattr(service, "ensure_active_materia", AsyncMock())
    monkeypatch.setattr(service, "get_content_revision", AsyncMock(return_value=revision))
    monkeypatch.setattr(service, "get_evaluation_or_404", reload)
    asyncio.run(service.publish_evaluation(db, evaluation))
    return db


def test_score_plan_version_without_material_can_be_published(monkeypatch) -> None:
    """Regresión: la versión creada por el reparto guarda `coverage_json` vacío."""
    evaluation = _evaluation(version_id=uuid4())

    db = _publish(monkeypatch, evaluation, _revision(coverage={}))

    assert evaluation.estado == EvaluacionEstado.PUBLICADA.value
    assert evaluation.recepcion_habilitada is True
    assert db.commits == 1


@pytest.mark.parametrize(
    "revision",
    [
        _revision(coverage={"estado": "requiere_revision"}, visual={"bloques": []}),
        _revision(coverage={}, visual={"bloques": []}),
        _revision(coverage={"estado": "completa"}, pending=["pregunta"]),
        _revision(coverage={}, pending=["pregunta"]),
    ],
    ids=["visual-requires-review", "visual-without-coverage", "pending-keys", "pending-keys-without-coverage"],
)
def test_publication_still_requires_reviewed_material_and_keys(monkeypatch, revision) -> None:
    evaluation = _evaluation(version_id=uuid4())

    with pytest.raises(HTTPException) as exc:
        _publish(monkeypatch, evaluation, revision)

    assert exc.value.status_code == 409
    assert evaluation.estado == EvaluacionEstado.BORRADOR.value


def _prepare(evaluation):
    db = FakeDB(scalars=[evaluation, False, False])
    return asyncio.run(visual_service.prepare_content_edit(
        db, evaluation.id, expected_version_id=evaluation.contenido_version_id, expected_updated_at=UPDATED_AT,
    ))


def test_versioned_evaluation_without_material_can_start_a_text_edit(monkeypatch) -> None:
    """Regresión: tras el reparto, editar la clave respondía 422 pidiendo contenido visual."""
    previous = _revision(coverage={})
    monkeypatch.setattr(visual_service, "get_content_revision", AsyncMock(return_value=previous))

    edit = _prepare(_evaluation(version_id=previous.id))

    assert edit.previous is previous
    assert edit.manifest is None


def test_unversioned_evaluation_still_needs_content_to_start_an_edit() -> None:
    with pytest.raises(HTTPException) as exc:
        _prepare(_evaluation())

    assert exc.value.status_code == 422


def test_text_edit_saves_a_new_version_with_the_key_and_complete_coverage() -> None:
    """Regresión: guardar exigía `contenido_id` y material en preguntas digitalizadas."""
    previous = _revision(coverage={})
    evaluation = _evaluation(version_id=previous.id)
    evaluation.respuestas_esperadas = [{"numero": 1, "respuesta": "La respuesta corregida por el docente."}]
    db = FakeDB()

    edit = visual_service.ContentEdit(evaluation=evaluation, previous=previous, manifest=None)
    asyncio.run(visual_service.save_content_revision(db, edit))

    revision = db.added[0]
    assert revision.numero_version == 4
    assert revision.previous_version_id == previous.id
    assert revision.coverage_json == {"estado": "completa"}
    assert revision.snapshot_json["contenido_visual"] is None
    assert revision.snapshot_json["respuestas_esperadas"] == evaluation.respuestas_esperadas


def test_first_version_still_needs_material_or_document() -> None:
    evaluation = _evaluation()
    evaluation.preguntas = [{**evaluation.preguntas[0], "contenido_id": str(uuid4())}]
    edit = visual_service.ContentEdit(evaluation=evaluation, previous=None, manifest=None)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(visual_service.save_content_revision(FakeDB(), edit))

    assert exc.value.status_code == 422
