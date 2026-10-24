"""Curated art follows the existing owned, reviewed, versioned visual workflow."""
from copy import deepcopy
from io import BytesIO
from uuid import uuid4
from zipfile import ZipFile

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.evaluaciones.export_service import build_evaluation_material, render_evaluation_docx
from app.modules.evaluaciones.models import EvaluacionContenidoVersion
from app.modules.evaluaciones.schemas import EvaluacionUpdate
from app.modules.evaluaciones.service import get_evaluation_or_404, update_evaluation
from app.modules.evaluaciones.visual_render import resolve_visual_material
from app.modules.evaluaciones.visual_schemas import VisualUploadRequest
from app.modules.evaluaciones.visual_service import stage_resource
from app.modules.motif_library.service import load_catalog, read_asset
from tests.integration import test_evaluation_visual_persistence as persistence

database = persistence.database
visual_scope = persistence.visual_scope
pytestmark = pytest.mark.skipif(not persistence.TEST_URL, reason="Requiere PostgreSQL aislado SPEC101_TEST_DATABASE_URL")


@pytest.mark.asyncio
async def test_curated_motif_preserves_history_and_requires_explicit_review(visual_scope, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "EVALUATION_VISUAL_EDITOR_ENABLED", True)
    sessions, owner, subject, _ = visual_scope
    catalog = load_catalog()
    motif = next(item for item in catalog.motifs if item.id == "naturales-001")
    image = read_asset(catalog, motif.id, "full", motif.full.sha256)
    async with sessions() as db:
        evaluation_id, submission_id, grade_id = await persistence.legacy_evaluation(db, owner, subject)
        evaluation = await get_evaluation_or_404(db, evaluation_id)
        questions, keys = deepcopy(evaluation.preguntas), deepcopy(evaluation.respuestas_esperadas)
        before_grade = await db.get(Calificacion, grade_id)
        grade_snapshot = (before_grade.nota_confirmada, before_grade.feedback, deepcopy(before_grade.resultado_json), before_grade.estado)
        before_delivery = await db.get(Entrega, submission_id)
        evidence_snapshot = (before_delivery.archivo_url, deepcopy(before_delivery.visual_text_json), before_delivery.contenido_version_id)
        resource = await stage_resource(db, propietario_id=owner,
            request=VisualUploadRequest(materia_id=subject, evaluacion_id=evaluation_id, request_key=uuid4()),
            content=image.content, clase="imagen", origen="subido")
        # Selecting/uploading alone is only preparation, never an implicit save.
        assert resource.estado == "staged"
        assert evaluation.contenido_version_id is None
        assert not list(await db.scalars(select(EvaluacionContenidoVersion)))
        assert evaluation.preguntas == questions and evaluation.respuestas_esperadas == keys

        question_id = uuid4()
        manifest = persistence.image_manifest(question_id, resource.id)
        manifest.bloques[0].descripcion = "Biblioteca temática: " + motif.label
        updated = await update_evaluation(db, evaluation, EvaluacionUpdate(
            expected_updated_at=evaluation.updated_at, expected_content_version_id=None,
            preguntas=[{**questions[0], "contenido_id": str(question_id)}], contenido_visual=manifest))
        versions = list(await db.scalars(select(EvaluacionContenidoVersion).order_by(EvaluacionContenidoVersion.numero_version)))
        assert len(versions) == 2
        baseline, illustrated = versions
        baseline_snapshot = deepcopy(baseline.snapshot_json)
        illustrated_snapshot = deepcopy(illustrated.snapshot_json)
        assert baseline.legacy_baseline and baseline.snapshot_json["preguntas"] == questions
        assert baseline.snapshot_json["respuestas_esperadas"] == keys
        assert illustrated.previous_version_id == baseline.id
        assert illustrated.snapshot_json["claves_pendientes_revision"] == [str(question_id)]
        assert resource.estado == "ready" and resource.propietario_id == owner
        assert resource.sha256 == motif.full.sha256
        assert updated.respuestas_esperadas == keys
        # The teacher also explicitly reviews the academic key after changing a visual.
        reviewed = await update_evaluation(db, updated, EvaluacionUpdate(
            expected_updated_at=updated.updated_at, expected_content_version_id=illustrated.id,
            claves_visuales_revisadas=[question_id]))
        revision = await db.get(EvaluacionContenidoVersion, reviewed.contenido_version_id)
        assert revision.id != illustrated.id
        assert revision.snapshot_json["claves_pendientes_revision"] == []
        visuals = await resolve_visual_material(db, reviewed.id, revision)
        assert len(visuals) == 1 and visuals[0].image_bytes == image.content
        material = build_evaluation_material(reviewed, soluciones=False, visual_blocks=visuals)
        assert "respuesta_correcta" not in material["contenido_json"]["preguntas"][0]
        word = render_evaluation_docx(material, soluciones=False)
        with ZipFile(BytesIO(word)) as package:
            assert any(name.startswith("word/media/") for name in package.namelist())
            text = package.read("word/document.xml").decode()
            assert "¿Cuánto vale?" in text and "Biblioteca temática" in text
            assert "Respuesta esperada" not in text
        assert baseline.snapshot_json == baseline_snapshot
        assert illustrated.snapshot_json == illustrated_snapshot
        await db.refresh(before_grade)
        await db.refresh(before_delivery)
        assert (before_grade.nota_confirmada, before_grade.feedback, before_grade.resultado_json, before_grade.estado) == grade_snapshot
        assert (before_delivery.archivo_url, before_delivery.visual_text_json, before_delivery.contenido_version_id) == evidence_snapshot
        current_version = revision.id

    # An obsolete editor cannot overwrite the reviewed version or historical grade.
    async with sessions() as db:
        evaluation = await get_evaluation_or_404(db, evaluation_id)
        with pytest.raises(HTTPException) as stale:
            await update_evaluation(db, evaluation, EvaluacionUpdate(
                expected_updated_at=evaluation.updated_at, expected_content_version_id=illustrated.id,
                nombre="Edición obsoleta"))
        assert stale.value.status_code == 409
        await db.rollback()
        evaluation = await get_evaluation_or_404(db, evaluation_id)
        assert evaluation.contenido_version_id == current_version
