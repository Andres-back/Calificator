import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import fitz
import pytest
from PIL import Image

from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.calificaciones import router
from app.modules.calificaciones.models import Entrega
from app.modules.calificaciones.service import (
    _build_revision_guide,
    _select_current_calificaciones,
    _revision_row,
    _revision_page,
)
from app.shared.enums import EntregaEstado, EntregaTipo, PoliticaIntento, UserRole


def test_revision_30_enrolled_all_eight_claims_and_complete_counters():
    from tests.fixtures.grading_batch import synthetic_review_rows
    from app.modules.calificaciones.schemas import RevisionAlumno
    rows = synthetic_review_rows()
    first = _revision_page(rows, cursor=None, limit=5, filtro="alertas", q="")
    second = _revision_page(rows, cursor=first["siguiente_cursor"], limit=5, filtro="alertas", q="")
    assert len(first["alumnos"]) == 5 and len(second["alumnos"]) == 3
    assert first["contadores"] == {"todas": 30, "pendientes": 28, "alertas": 8, "procesando": 1, "publicadas": 1}
    assert second["siguiente_cursor"] is None
    assert {row["estudiante_id"] for row in first["alumnos"]}.isdisjoint(row["estudiante_id"] for row in second["alumnos"])
    assert rows[10]["nota"] == 0 and rows[9]["nota"] is None
    assert RevisionAlumno.model_validate(rows[11]).resumen_revision.version is None
    with pytest.raises(Exception) as stale:
        _revision_page(rows, cursor=uuid4(), limit=5, filtro="todas", q="")
    assert stale.value.status_code == 409
    assert _revision_page(rows, cursor=None, limit=5, filtro="todas", q="Alumno 29")["contadores"]["todas"] == 30


@pytest.mark.parametrize("state,score,expected", [("sugerida", 0, 0), ("procesando", 0, None)])
def test_revision_zero_and_unknown_without_false_alert(state, score, expected):
    grade = SimpleNamespace(id=uuid4(), entrega_id=None, estado=state, nota_confirmada=None, nota_sugerida=score)
    row = _revision_row(SimpleNamespace(id=uuid4(), nombre="Prueba"), grade, None, None, None, None)
    assert row["nota"] == expected
    assert row["resumen_revision"]["version"] is None
    assert row["resumen_revision"]["pqrs_abiertas"] is None
    assert row["resumen_revision"]["componentes_pendientes"] is None
    assert not row["resumen_revision"]["tiene_alertas"]


def test_revision_resolved_breakdown_does_not_resurrect_historical_disagreement():
    student = SimpleNamespace(id=uuid4(), nombre="Prueba")
    grade = SimpleNamespace(id=uuid4(), entrega_id=None, estado="ajustada", nota_confirmada=4, nota_sugerida=0,
                            resultado_json={"comparador": {"discrepancia": True}})
    breakdown = SimpleNamespace(version=2, cobertura_estado="completa", bloqueos_json=[], pendientes=0,
                                ilegibles=0, requiere_revision=False)
    row = _revision_row(student, grade, None, None, breakdown, 0)
    assert not row["resumen_revision"]["tiene_alertas"]
    breakdown.ilegibles = 1
    assert _revision_row(student, grade, None, None, breakdown, 0)["resumen_revision"]["tiene_alertas"]


def test_revision_projection_is_teacher_only_even_with_grading_read():
    actor = SimpleNamespace(rol="estudiante", _effective_permissions={"grading.read"})
    with pytest.raises(Exception) as denied:
        asyncio.run(router.revision_evaluacion(uuid4(), current_user=actor, db=None))
    assert denied.value.status_code == 403


def test_revision_projection_checks_ownership_and_permissions(monkeypatch):
    from app.modules.evaluaciones import service as evaluation_service
    evaluation = SimpleNamespace(id=uuid4(), profesor_id=uuid4())

    async def get_evaluation(*args):
        return evaluation

    monkeypatch.setattr(evaluation_service, "get_evaluation_or_404", get_evaluation)
    for actor in [
        SimpleNamespace(id=uuid4(), rol="profesor", _effective_permissions={"grading.read"}),
        SimpleNamespace(id=evaluation.profesor_id, rol="profesor", _effective_permissions=set()),
    ]:
        with pytest.raises(Exception) as denied:
            asyncio.run(router.revision_evaluacion(evaluation.id, current_user=actor, db=None))
        assert denied.value.status_code == 403


def test_revision_projection_allows_owned_read_only_without_claims(monkeypatch):
    from app.modules.evaluaciones import service as evaluation_service
    from app.modules.calificaciones import service
    evaluation = SimpleNamespace(id=uuid4(), profesor_id=uuid4())
    captured = {}

    async def get_evaluation(*args):
        return evaluation

    async def project(db, selected, **kwargs):
        captured.update(kwargs)
        assert selected is evaluation
        return {"total_alumnos": 0}

    monkeypatch.setattr(evaluation_service, "get_evaluation_or_404", get_evaluation)
    monkeypatch.setattr(service, "revision_evaluacion", project)
    actor = SimpleNamespace(id=evaluation.profesor_id, rol="profesor", _effective_permissions={"grading.read"})
    result = asyncio.run(router.revision_evaluacion(evaluation.id, current_user=actor, db=None))
    assert result == {"total_alumnos": 0}
    assert captured["include_pqrs"] is False


def test_revision_projection_constant_queries_no_private_payload_and_pqrs_scope():
    from app.modules.calificaciones import service
    from sqlalchemy.dialects import postgresql
    from tests.fixtures.grading_batch import synthetic_review_rows
    rows = synthetic_review_rows()
    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4(), politica_intento="un_intento")

    class Result:
        def __init__(self, rows):
            self.rows = rows

        def all(self):
            return self.rows

        def mappings(self):
            return self

    class DB:
        def __init__(self):
            self.queries = []

        async def execute(self, query, *args):
            sql = str(query.compile(dialect=postgresql.dialect()))
            self.queries.append(sql)
            if len(self.queries) == 1:
                return Result([SimpleNamespace(id=row["estudiante_id"], nombre=row["nombre"]) for row in rows])
            return Result([])

    for include_claims in (True, False):
        db = DB()
        result = asyncio.run(service.revision_evaluacion(db, evaluation, include_pqrs=include_claims))
        assert len(db.queries) == (6 if include_claims else 5)
        assert result["total_alumnos"] == 30
        assert all(row["estado"] == "sin_entrega" for row in result["alumnos"])
        assert result["alumnos"][0]["resumen_revision"]["pqrs_abiertas"] == (0 if include_claims else None)
        sql = " ".join(db.queries)
        for field in ("respuesta_referencia", "respuesta_estudiante", "archivo_url", "resultado_json", "visual_text_json"):
            assert field not in sql
        assert ("calificacion_incidencias" in sql) is include_claims


def _grade(*, student_id, created_at, score, estado="sugerida"):
    return SimpleNamespace(
        estudiante_id=student_id,
        created_at=created_at,
        nota_confirmada=Decimal(str(score)) if score is not None else None,
        nota_sugerida=Decimal(str(score)) if score is not None else None,
        estado=estado,
    )


def test_workspace_muestra_solo_el_intento_mas_reciente_por_estudiante() -> None:
    student_id = uuid4()
    now = datetime.now(timezone.utc)
    old = _grade(student_id=student_id, created_at=now - timedelta(days=1), score=5)
    current = _grade(student_id=student_id, created_at=now, score=3.8)

    selected = _select_current_calificaciones(
        [old, current],
        PoliticaIntento.ULTIMO_INTENTO.value,
    )

    assert selected == [current]


def test_workspace_respeta_mejor_puntaje_y_descarta_anuladas() -> None:
    student_id = uuid4()
    now = datetime.now(timezone.utc)
    best = _grade(student_id=student_id, created_at=now - timedelta(days=1), score=4.8)
    latest = _grade(student_id=student_id, created_at=now, score=3.5)
    annulled = _grade(student_id=uuid4(), created_at=now, score=5, estado="anulada")

    selected = _select_current_calificaciones(
        [best, latest, annulled],
        PoliticaIntento.MEJOR_PUNTAJE.value,
    )

    assert selected == [best]


def test_revision_guide_combina_preguntas_y_respuestas_por_numero() -> None:
    guide = _build_revision_guide(
        {
            "preguntas": [
                {
                    "numero": 2,
                    "enunciado": "¿Cuánto es 4 × 9?",
                    "tipo": "seleccion_multiple",
                    "opciones": ["A) 32", {"texto": "B) 36"}],
                    "puntaje": 1,
                },
                {"numero": 3, "texto": "La multiplicación es conmutativa."},
            ],
            "respuestas_esperadas": [
                {"numero": 3, "respuesta": True},
                {"numero": 2, "respuesta_correcta": "B) 36"},
            ],
        }
    )

    assert guide[0]["opciones"] == ["A) 32", "B) 36"]
    assert guide[0]["respuesta_correcta"] == "B) 36"
    assert guide[1]["respuesta_correcta"] == "Verdadero"


def _pdf(path: Path, pages: int) -> None:
    document = fitz.open()
    for page_number in range(1, pages + 1):
        page = document.new_page(width=300, height=400)
        page.insert_text((30, 40), f"Hoja {page_number}")
    document.save(path)
    document.close()


def test_evidence_page_renders_pdf20_and_reuses_fingerprint_cache(tmp_path: Path, monkeypatch) -> None:
    evidence = tmp_path / "evidence.pdf"
    _pdf(evidence, 20)
    monkeypatch.setattr(router, "get_upload_dir", lambda: tmp_path)

    first_path, total, fingerprint = router._render_cached_evidence_page(evidence, 20)
    first_mtime = first_path.stat().st_mtime_ns
    cached_path, cached_total, cached_fingerprint = router._render_cached_evidence_page(evidence, 20)

    assert first_path.read_bytes().startswith(b"\x89PNG")
    assert (total, cached_total) == (20, 20)
    assert cached_path == first_path
    assert cached_fingerprint == fingerprint
    assert cached_path.stat().st_mtime_ns == first_mtime


def test_evidence_page_rejects_page_outside_file_and_pdf_over_limit(tmp_path: Path) -> None:
    image_path = tmp_path / "evidence.jpg"
    Image.new("RGB", (40, 40), "white").save(image_path)
    with pytest.raises(router.EvidencePageError, match="no encontrada"):
        router._render_cached_evidence_page(image_path, 2)

    oversized_pdf = tmp_path / "oversized.pdf"
    _pdf(oversized_pdf, 21)
    with pytest.raises(router.EvidencePageError, match="máximo de 20"):
        router._render_cached_evidence_page(oversized_pdf, 1)


def test_evidence_page_denies_student_access_to_another_delivery(tmp_path: Path, monkeypatch) -> None:
    evidence_path = tmp_path / "entregas" / "evidence.jpg"
    evidence_path.parent.mkdir()
    Image.new("RGB", (40, 40), "white").save(evidence_path)
    delivery = Entrega(
        id=uuid4(),
        evaluacion_id=uuid4(),
        estudiante_id=uuid4(),
        materia_id=uuid4(),
        tipo=EntregaTipo.FOTO.value,
        estado=EntregaEstado.RECIBIDA.value,
        archivo_url="/uploads/entregas/evidence.jpg",
    )
    actor = SimpleNamespace(
        id=uuid4(),
        rol=UserRole.ESTUDIANTE.value,
        _effective_permissions=default_permissions_for_role(UserRole.ESTUDIANTE.value),
    )

    class FakeDB:
        async def scalar(self, _query):
            return delivery

    monkeypatch.setattr(router, "resolve_upload_path", lambda _url: evidence_path)
    with pytest.raises(Exception) as denied:
        asyncio.run(
            router.get_entrega_evidencia_page(
                delivery.id,
                1,
                current_user=actor,
                db=FakeDB(),
            )
        )
    assert getattr(denied.value, "status_code", None) == 403


def test_full_evidence_returns_authorized_student_file_inline(
    tmp_path: Path,
    monkeypatch,
) -> None:
    evidence_path = tmp_path / "entregas" / "evidence.pdf"
    evidence_path.parent.mkdir()
    _pdf(evidence_path, 2)
    student_id = uuid4()
    delivery = Entrega(
        id=uuid4(),
        evaluacion_id=uuid4(),
        estudiante_id=student_id,
        materia_id=uuid4(),
        tipo=EntregaTipo.PDF.value,
        estado=EntregaEstado.RECIBIDA.value,
        archivo_url="/uploads/entregas/evidence.pdf",
    )
    actor = SimpleNamespace(
        id=student_id,
        rol=UserRole.ESTUDIANTE.value,
        _effective_permissions=default_permissions_for_role(UserRole.ESTUDIANTE.value),
    )

    class FakeDB:
        async def scalar(self, _query):
            return delivery

    monkeypatch.setattr(router, "resolve_upload_path", lambda _url: evidence_path)

    response = asyncio.run(
        router.get_entrega_evidencia(
            delivery.id,
            current_user=actor,
            db=FakeDB(),
        )
    )

    assert Path(response.path) == evidence_path
    assert response.media_type == "application/pdf"
    assert response.headers["content-disposition"] == 'inline; filename="evidencia.pdf"'
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
