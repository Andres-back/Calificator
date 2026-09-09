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
)
from app.shared.enums import EntregaEstado, EntregaTipo, PoliticaIntento, UserRole


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
