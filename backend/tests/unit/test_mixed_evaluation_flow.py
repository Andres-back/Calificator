from __future__ import annotations

import asyncio
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import UploadFile

from app.modules.calificaciones import router
from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.calificaciones.models import Entrega
from app.modules.calificaciones.orchestrator import (
    build_objective_validation,
    merge_detected_answers,
    parse_numbered_answers,
)
from app.services.evidence_bundle_service import EvidenceBundle
from app.modules.evaluaciones.modality_service import (
    normalize_question_modalities,
    question_numbers_by_section,
    validate_mixed_question_modalities,
)
from app.shared.enums import (
    EntregaEstado,
    EntregaTipo,
    EvaluacionEstado,
    EvaluacionModalidad,
    UserRole,
)


def test_mixed_questions_receive_explicit_online_and_physical_modes() -> None:
    questions = [
        {"numero": 1, "tipo": "opcion_multiple"},
        {"numero": 2, "tipo": "abierta"},
        {"numero": 3, "tipo": "verdadero_falso"},
    ]

    normalized = normalize_question_modalities(
        questions,
        EvaluacionModalidad.MIXTA,
    )

    assert [item["modalidad_respuesta"] for item in normalized] == [
        "online",
        "fisica",
        "online",
    ]
    assert question_numbers_by_section(normalized) == {
        "online": [1, 3],
        "fisica": [2],
    }
    validate_mixed_question_modalities(normalized, EvaluacionModalidad.MIXTA)
    assert "modalidad_respuesta" not in questions[0]


def test_mixed_evaluation_requires_both_sections() -> None:
    with pytest.raises(ValueError, match="online"):
        validate_mixed_question_modalities(
            [{"numero": 1, "modalidad_respuesta": "online"}],
            EvaluacionModalidad.MIXTA,
        )


def test_numbered_online_answers_and_physical_answers_are_merged_by_question_mode() -> None:
    blueprint = {
        "preguntas": [
            {
                "numero": 1,
                "tipo": "opcion_multiple",
                "modalidad_respuesta": "online",
            },
            {
                "numero": 2,
                "tipo": "verdadero_falso",
                "modalidad_respuesta": "fisica",
            },
        ],
        "respuestas_esperadas": [
            {"numero": 1, "respuesta": "B) 36"},
            {"numero": 2, "respuesta": "Verdadero"},
        ],
    }
    online = parse_numbered_answers("P1: B) 36\nP8: respuesta ajena")
    physical = [
        {"pregunta": 1, "respuesta": "A) 32"},
        {"pregunta": 2, "respuesta": "Sí"},
    ]

    merged = merge_detected_answers(blueprint, online, physical)
    validation = build_objective_validation(blueprint, merged)

    assert merged == [
        {"pregunta": 1, "respuesta": "B) 36"},
        {"pregunta": 2, "respuesta": "Sí"},
    ]
    assert [item["correcta"] for item in validation] == [True, True]
    assert merge_detected_answers(blueprint, [], physical) == [
        {"pregunta": 2, "respuesta": "Sí"},
    ]

def test_photo_endpoint_reuses_online_delivery_and_grades_both_mixed_sections(monkeypatch) -> None:
    evaluation = SimpleNamespace(
        id=uuid4(),
        materia_id=uuid4(),
        profesor_id=uuid4(),
        modalidad=EvaluacionModalidad.MIXTA.value,
        estado=EvaluacionEstado.PUBLICADA.value,
        preguntas=[
            {"numero": 1, "modalidad_respuesta": "online"},
            {"numero": 2, "modalidad_respuesta": "fisica"},
        ],
    )
    student_id = uuid4()
    delivery = Entrega(
        id=uuid4(),
        evaluacion_id=evaluation.id,
        estudiante_id=student_id,
        materia_id=evaluation.materia_id,
        tipo=EntregaTipo.MIXTA.value,
        respuesta_texto="P1: respuesta online",
        estado=EntregaEstado.RECIBIDA.value,
        visual_text_json={},
    )
    calls: dict = {}

    class FakeDB:
        def __init__(self) -> None:
            self.scalar_calls = 0
            self.added: list[object] = []

        async def scalar(self, _query):
            self.scalar_calls += 1
            return delivery if self.scalar_calls == 1 else None

        def add(self, value: object) -> None:
            self.added.append(value)

        async def flush(self) -> None:
            return None

        async def commit(self) -> None:
            return None

        async def refresh(self, _value: object) -> None:
            return None

    async def manage(_db, evaluation_id, _user):
        assert evaluation_id == evaluation.id
        return evaluation

    async def enrolled(_db, materia_id, requested_student_id):
        return materia_id == evaluation.materia_id and requested_student_id == student_id

    async def save(_content, _filename, *, subfolder, **_kwargs):
        assert subfolder == "entregas"
        return "/uploads/entregas/mixed.jpg"

    async def grade(_db, **kwargs):
        calls.update(kwargs)
        return "calificacion-consolidada"

    async def build_bundle(_uploads, *, rotations=None):
        assert rotations is None
        return EvidenceBundle(
            content=b"imagen-normalizada",
            filename="evidencia.jpg",
            mime="image/jpeg",
            page_count=1,
            evidence_type="foto",
            metadata={"tipo": "foto", "paginas": 1, "archivos": [{"nombre": "evidencia.jpg"}]},
        )

    monkeypatch.setattr(router.evaluaciones_service, "ensure_can_manage_evaluation", manage)
    monkeypatch.setattr(router.service, "ensure_evaluation_accepts_grading", lambda _evaluation: None)
    monkeypatch.setattr(router, "is_student_enrolled", enrolled)
    monkeypatch.setattr(router, "build_evidence_bundle", build_bundle)
    monkeypatch.setattr(router, "save_upload", save)
    monkeypatch.setattr(router, "_enqueue_persisted_grading", grade)

    result = asyncio.run(
        router.calificar_foto(
            evaluacion_id=evaluation.id,
            estudiante_id=student_id,
            foto=UploadFile(filename="evidencia.jpg", file=BytesIO(b"image")),
            current_user=SimpleNamespace(
                id=evaluation.profesor_id,
                rol=UserRole.PROFESOR.value,
                _effective_permissions=default_permissions_for_role(UserRole.PROFESOR.value),
            ),
            db=FakeDB(),
        )
    )

    assert result == "calificacion-consolidada"
    assert delivery.tipo == EntregaTipo.MIXTA.value
    assert delivery.archivo_url == "/uploads/entregas/mixed.jpg"
    assert calls["entrega"] is delivery
    assert calls["evidence_metadata"]["secciones"]["online"]["preguntas"] == [1]
    assert calls["evidence_metadata"]["secciones"]["fisica"]["preguntas"] == [2]
