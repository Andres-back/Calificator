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
    PoliticaIntento,
    UserRole,
)


class FakeDB:
    def __init__(self, scalar_values: list[object] | None = None) -> None:
        self.added: list[object] = []
        self.events: list[str] = []
        self.scalar_values = list(scalar_values or [])

    async def scalar(self, _query):
        return self.scalar_values.pop(0) if self.scalar_values else None

    def add(self, value: object) -> None:
        self.added.append(value)

    async def flush(self) -> None:
        for value in self.added:
            if getattr(value, "id", None) is None:
                value.id = uuid4()
        self.events.append("flush")

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
        politica_intento=PoliticaIntento.PRACTICA_LIBRE.value,
        intentos_permitidos=None,
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


def test_prepare_queued_grading_resets_previous_decision_and_keeps_job() -> None:
    evaluation = evaluation_fixture()
    student_id = uuid4()
    delivery = delivery_fixture(evaluation, student_id)
    job_id = uuid4()

    grade = photo_service.prepare_queued_grading(
        entrega=delivery,
        evaluacion=evaluation,
        estudiante_id=student_id,
        profesor_id=evaluation.profesor_id,
        job_id=job_id,
    )

    assert delivery.estado == EntregaEstado.RECIBIDA.value
    assert delivery.visual_text_json["pipeline_status"] == "queued"
    assert grade.nota_sugerida is None
    assert grade.resultado_json["job_id"] == str(job_id)
    assert grade.estado == CalificacionEstado.REQUIERE_REVISION.value

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
        assert db.events == ["flush"]
        assert kwargs["entrega"] in db.added
        assert kwargs["entrega"].estado == EntregaEstado.RECIBIDA.value
        return sentinel

    class FakeUpload:
        filename = "respuesta.jpg"

        async def read(self, _size: int = -1):
                if getattr(self, "_consumed", False):
                    return b""
                self._consumed = True
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
        router,
        "_enqueue_persisted_grading",
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


def test_teacher_replaces_existing_delivery_without_consuming_student_attempt(
    monkeypatch,
) -> None:
    evaluation = evaluation_fixture()
    evaluation.politica_intento = PoliticaIntento.UN_INTENTO.value
    student_id = uuid4()
    teacher = SimpleNamespace(
        id=evaluation.profesor_id,
        rol=UserRole.PROFESOR.value,
    )
    delivery = delivery_fixture(evaluation, student_id)
    delivery.archivo_url = "/uploads/entregas/anterior.jpg"
    existing_grade = SimpleNamespace(
        id=uuid4(),
        entrega_id=delivery.id,
        revisado_por_docente=True,
    )
    db = FakeDB([delivery, existing_grade])
    sentinel = object()

    async def ensure_manage(*_args, **_kwargs):
        return evaluation

    async def enrolled(*_args, **_kwargs):
        return True

    async def save(*_args, **_kwargs):
        return "/uploads/entregas/reemplazo.pdf"

    async def grade_replacement(_db, **kwargs):
        assert kwargs["entrega"] is delivery
        assert kwargs["calificacion"] is existing_grade
        assert delivery.archivo_url == "/uploads/entregas/reemplazo.pdf"
        assert delivery.tipo == "pdf"
        return sentinel

    async def forbidden_attempt_check(*_args, **_kwargs):
        raise AssertionError("La politica de intentos no aplica al reemplazo docente")

    class FakeUpload:
        filename = "reemplazo.pdf"

        async def read(self, _size: int = -1):
                if getattr(self, "_consumed", False):
                    return b""
                self._consumed = True
                return b"%PDF-1.7"

    monkeypatch.setattr(
        router.evaluaciones_service,
        "ensure_can_manage_evaluation",
        ensure_manage,
    )
    monkeypatch.setattr(router, "is_student_enrolled", enrolled)
    monkeypatch.setattr(router, "validate_mime", lambda *_args: "application/pdf")
    monkeypatch.setattr(router, "save_upload", save)
    monkeypatch.setattr(
        router.service,
        "ensure_student_can_submit_new_evidence",
        forbidden_attempt_check,
    )
    monkeypatch.setattr(
        router,
        "_enqueue_persisted_grading",
        grade_replacement,
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

    assert result is sentinel
    assert db.added == []
    assert db.events == ["flush"]
