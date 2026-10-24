"""Opt-in isolated PostgreSQL regression, using the existing synthetic fixture."""
import json
import asyncio
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.modules.herramientas import service


@pytest.mark.asyncio
async def test_decoration_only_preserves_content_grade_and_does_not_rebuild(fb_db, fb_case, monkeypatch):
    teacher, _, subject, evaluation, grade = fb_case
    material_id = uuid4()
    academic = {"titulo": "Cuento sintético", "parrafos": ["Texto original"], "preguntas": [{"numero": 1, "respuesta": "Clave privada", "puntaje": 0.625}], "criterios": [{"nombre": "Comprende", "peso": 100}], "imagen": {"url": "existing-image"}}
    await fb_db.execute(text("INSERT INTO materiales_generados (id, profesor_id, materia_id, tipo, titulo, input_json, contenido_json) VALUES (:id, :p, :m, 'cuento', 'Cuento sintético', '{}'::jsonb, CAST(:content AS jsonb))"), {"id": str(material_id), "p": str(teacher.id), "m": str(subject.id), "content": json.dumps(academic)})
    await fb_db.execute(text("UPDATE evaluaciones SET material_origen_id=:m WHERE id=:e"), {"m": str(material_id), "e": str(evaluation.id)})
    evaluation_before = tuple((await fb_db.execute(text("SELECT preguntas, respuestas_esperadas FROM evaluaciones WHERE id=:e"), {"e": str(evaluation.id)})).one())
    await fb_db.commit()
    original_grade = (grade.nota_confirmada, grade.feedback, grade.estado)

    def forbidden(*args, **kwargs):
        raise AssertionError("Decorating must not rebuild academic content")

    monkeypatch.setattr(service, "_rebuild_edited_puzzle", forbidden)
    monkeypatch.setattr(service, "prepare_evaluation_criteria", forbidden)
    try:
        updated = await service.update_material(fb_db, material_id, teacher, {"decoracion": {"motif_id": "naturales-001", "placement": "header"}})
        content = updated["contenido_json"]
        assert {key: value for key, value in content.items() if key != "_presentacion"} == academic
        stored = (await fb_db.execute(text("SELECT contenido_json FROM materiales_generados WHERE id=:id"), {"id": str(material_id)})).scalar_one()
        assert "asset_url" not in str(stored)
        assert stored["_presentacion"]["decoracion"]["motif_id"] == "naturales-001"
        removed = await service.update_material(fb_db, material_id, teacher, {"decoracion": None})
        assert removed["contenido_json"]["_presentacion"]["decoracion"] is None
        await fb_db.refresh(grade)
        assert (grade.nota_confirmada, grade.feedback, grade.estado) == original_grade
        evaluation_after = tuple((await fb_db.execute(text("SELECT preguntas, respuestas_esperadas FROM evaluaciones WHERE id=:e"), {"e": str(evaluation.id)})).one())
        assert evaluation_after == evaluation_before
    finally:
        await fb_db.execute(text("UPDATE evaluaciones SET material_origen_id=NULL WHERE id=:e AND material_origen_id=:m"), {"e": str(evaluation.id), "m": str(material_id)})
        await fb_db.execute(text("DELETE FROM materiales_generados WHERE id=:id AND profesor_id=:p"), {"id": str(material_id), "p": str(teacher.id)})
        await fb_db.commit()


@pytest.mark.asyncio
async def test_invalid_or_unowned_decoration_never_changes_material(fb_db, fb_case):
    teacher, student, subject, _, _ = fb_case
    teacher_id = teacher.id
    material_id = uuid4()
    academic = {"titulo": "Original", "parrafos": ["Texto conservado"]}
    await fb_db.execute(text("INSERT INTO materiales_generados (id, profesor_id, materia_id, tipo, titulo, input_json, contenido_json) VALUES (:id, :p, :m, 'cuento', 'Original', '{}'::jsonb, CAST(:content AS jsonb))"), {"id": str(material_id), "p": str(teacher.id), "m": str(subject.id), "content": json.dumps(academic)})
    await fb_db.commit()
    try:
        with pytest.raises(HTTPException) as invalid:
            await service.update_material(fb_db, material_id, teacher, {"decoracion": {"motif_id": "unknown", "placement": "header"}})
        assert invalid.value.status_code == 422
        await fb_db.rollback()
        await fb_db.refresh(student)
        with pytest.raises(HTTPException) as unowned:
            await service.update_material(fb_db, material_id, student, {"decoracion": None})
        assert unowned.value.status_code == 404
        await fb_db.rollback()
        stored = (await fb_db.execute(text("SELECT contenido_json FROM materiales_generados WHERE id=:id"), {"id": str(material_id)})).scalar_one()
        assert stored == academic
    finally:
        await fb_db.execute(text("DELETE FROM materiales_generados WHERE id=:id AND profesor_id=:p"), {"id": str(material_id), "p": str(teacher_id)})
        await fb_db.commit()


@pytest.mark.asyncio
async def test_concurrent_academic_and_decoration_saves_preserve_both(fb_db, fb_case, monkeypatch):
    teacher, _, subject, _, _ = fb_case
    material_id = uuid4()
    academic = {"titulo": "Relato", "parrafos": ["Texto anterior"], "preguntas": []}
    await fb_db.execute(text("INSERT INTO materiales_generados (id, profesor_id, materia_id, tipo, titulo, input_json, contenido_json) VALUES (:id, :p, :m, 'cuento', 'Relato', '{}'::jsonb, CAST(:content AS jsonb))"), {"id": str(material_id), "p": str(teacher.id), "m": str(subject.id), "content": json.dumps(academic)})
    await fb_db.commit()
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)
    reached = asyncio.Event()
    release = asyncio.Event()
    original_get = service.get_material
    try:
        async with sessions() as academic_session, sessions() as decoration_session:
            async def controlled_get(db, *args):
                result = await original_get(db, *args)
                if db is academic_session and not reached.is_set():
                    reached.set()
                    await release.wait()
                return result

            monkeypatch.setattr(service, "get_material", controlled_get)
            first = asyncio.create_task(service.update_material(academic_session, material_id, teacher, {"contenido_json": {**academic, "parrafos": ["Texto editado"]}}))
            await asyncio.wait_for(reached.wait(), timeout=5)
            second = asyncio.create_task(service.update_material(decoration_session, material_id, teacher, {"decoracion": {"motif_id": "naturales-001", "placement": "header"}}))
            try:
                finished, _ = await asyncio.wait({second}, timeout=0.1)
                assert not finished, "Concurrent decoration must wait for the academic transaction"
            finally:
                release.set()
                await asyncio.gather(first, second)
        stored = (await fb_db.execute(text("SELECT contenido_json FROM materiales_generados WHERE id=:id"), {"id": str(material_id)})).scalar_one()
        assert stored["parrafos"] == ["Texto editado"]
        assert stored["_presentacion"]["decoracion"]["motif_id"] == "naturales-001"
    finally:
        release.set()
        await fb_db.execute(text("DELETE FROM materiales_generados WHERE id=:id AND profesor_id=:p"), {"id": str(material_id), "p": str(teacher.id)})
        await fb_db.commit()
