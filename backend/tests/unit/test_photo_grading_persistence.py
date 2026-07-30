from __future__ import annotations

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.modules.calificaciones import photo_service, router
from app.modules.calificaciones.models import Entrega
from app.modules.calificaciones.schemas import GradingResult
from app.shared.enums import (
    CalificacionEstado,
    EntregaEstado,
    EvaluacionEstado,
    UserRole,
)


class FakeDB:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.events: list[str] = []

    def add(self, value: object) -> None:
        self.added.append(value)

    async def commit(self) -> None:
        self.events.append("commit")

    async def rollback(self) -> None:
        self.events.append("rollback")

    async def refresh(self, value: object) -> None:
        if getattr(value, "id", None) is None:
            value.id = uuid4()
        self.events.append(f"refresh:{type(value).__name__}")


def evaluation_fixture():
    return SimpleNamespace(
        id=uuid4(),
        materia_id=uuid4(),
        profesor_id=uuid4(),
        nota_maxima=Decimal("5"),
        estado=EvaluacionEstado.PUBLICADA.value,
        nombre="Multiplicación",
        blueprint=None,
        metas_profesor=[],
        criterios=[],
        preguntas=[],
        respuestas_esperadas=[],
    )


def delivery_fixture(evaluation, student_id) -> Entrega:
    return Entrega(
        id=uuid4(),
        evaluacion_id=evaluation.id,
        estudiante_id=student_id,
        materia_id=evaluation.materia_id,
        tipo="foto",
        archivo_url="/uploads/entregas/respuesta.jpg",
        estado=EntregaEstado.PROCESANDO.value,
        visual_text_json={},
    )


def test_null_result_marks_retry_and_review() -> None:
    evaluation = evaluation_fixture()
    student_id = uuid4()
    delivery = delivery_fixture(evaluation, student_id)
    grading = GradingResult(
        nota_sugerida=None,
        nota_maxima=Decimal("5"),
        confianza=0,
        motivo_revision="image_not_usable",
        requiere_revision_docente=True,
    )

    grade = photo_service.apply_grading_result(
        entrega=delivery,
        evaluacion=evaluation,
        estudiante_id=student_id,
        profesor_id=evaluation.profesor_id,
        grading=grading,
    )

    assert delivery.estado == EntregaEstado.REQUIERE_REINTENTO.value
    assert delivery.archivo_url == "/uploads/entregas/respuesta.jpg"
    assert grade.nota_sugerida is None
    assert grade.confianza is None
    assert grade.estado == CalificacionEstado.REQUIERE_REVISION.value
    assert grade.resultado_json["motivo_revision"] == "image_not_usable"


def test_zero_result_marks_successful_suggestion() -> None:
    evaluation = evaluation_fixture()
    student_id = uuid4()
    delivery = delivery_fixture(evaluation, student_id)
    grading = GradingResult(
        nota_sugerida=Decimal("0"),
        nota_maxima=Decimal("5"),
        confianza=0.88,
        requiere_revision_docente=False,
    )

    grade = photo_service.apply_grading_result(
        entrega=delivery,
        evaluacion=evaluation,
        estudiante_id=student_id,
        profesor_id=evaluation.profesor_id,
        grading=grading,
    )

    assert delivery.estado == EntregaEstado.CALIFICADA.value
    assert grade.nota_sugerida == Decimal("0")
    assert grade.estado == CalificacionEstado.SUGERIDA.value


def test_provider_exception_keeps_persisted_delivery_and_creates_review_grade(
    monkeypatch,
) -> None:
    evaluation = evaluation_fixture()
    student_id = uuid4()
    delivery = delivery_fixture(evaluation, student_id)
    db = FakeDB()

    async def exploding_grade(*_args, **_kwargs):
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr(photo_service, "grade_submission", exploding_grade)

    grade = asyncio.run(
        photo_service.grade_persisted_photo(
            db,
            evaluacion=evaluation,
            entrega=delivery,
            estudiante_id=student_id,
            profesor_id=evaluation.profesor_id,
            image_bytes=b"image",
            image_mime="image/jpeg",
        )
    )

    assert delivery.id is not None
    assert delivery.estudiante_id == student_id
    assert delivery.evaluacion_id == evaluation.id
    assert delivery.archivo_url == "/uploads/entregas/respuesta.jpg"
    assert delivery.estado == EntregaEstado.REQUIERE_REINTENTO.value
    assert grade.nota_sugerida is None
    assert grade.estado == CalificacionEstado.REQUIERE_REVISION.value
    assert grade.resultado_json["error_type"] == "RuntimeError"


def test_endpoint_commits_delivery_before_invoking_grading(
    monkeypatch,
) -> None:
    evaluation = evaluation_fixture()
    student_id = uuid4()
    teacher = SimpleNamespace(
        id=evaluation.profesor_id,
        rol=UserRole.PROFESOR.value,
    )
    db = FakeDB()
    sentinel = object()

    async def ensure_manage(*_args, **_kwargs):
        return evaluation

    async def enrolled(*_args, **_kwargs):
        return True

    async def save(*_args, **_kwargs):
        return "/uploads/entregas/persistida.jpg"

    async def grade_after_commit(_db, **kwargs):
        assert db.events[:2] == ["commit", "refresh:Entrega"]
        assert kwargs["entrega"] in db.added
        assert kwargs["entrega"].estado == EntregaEstado.PROCESANDO.value
        return sentinel

    class FakeUpload:
        filename = "respuesta.jpg"

        async def read(self):
            return b"jpeg"

    monkeypatch.setattr(
        router.evaluaciones_service,
        "ensure_can_manage_evaluation",
        ensure_manage,
    )
    monkeypatch.setattr(router, "is_student_enrolled", enrolled)
    monkeypatch.setattr(router, "validate_mime", lambda *_args: "image/jpeg")
    monkeypatch.setattr(router, "save_upload", save)
    monkeypatch.setattr(
        router.photo_service,
        "grade_persisted_photo",
        grade_after_commit,
    )

    result = asyncio.run(
        router.calificar_foto(
            evaluacion_id=evaluation.id,
            estudiante_id=student_id,
            foto=FakeUpload(),
            current_user=teacher,
            db=db,
        )
    )

    delivery = db.added[0]
    assert result is sentinel
    assert delivery.archivo_url == "/uploads/entregas/persistida.jpg"
    assert delivery.evaluacion_id == evaluation.id
    assert delivery.estudiante_id == student_id
