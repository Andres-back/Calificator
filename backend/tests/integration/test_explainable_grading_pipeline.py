from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from uuid import uuid4

import pytest

from app.modules.calificaciones.breakdown_policy import (
    build_component_scaffold,
    calculate_formula,
    component_consensus,
    coverage_state,
)
from app.modules.rag import context_builder, retrieval_service
from app.modules.impacto_tesis.kappa_service import cohen_kappa
from app.modules.impacto_tesis.schemas import (
    FeedbackQualityPayload,
    GradeComparisonPayload,
    ObservationBatch,
    ObservationWrite,
    RetentionApply,
    StudyProtocol,
    SurveyPayload,
    TimingPayload,
)
from app.modules.impacto_tesis.service import (
    activation_missing,
    batch_digest,
    batch_size_bytes,
    create_owner_grants,
    has_grant,
    participant_pseudonym,
    require_study_grant,
    require_batch_size,
    study_indicators,
    valid_grant_target,
)
from app.modules.impacto_tesis import router as impact_router
from fastapi import HTTPException
from pydantic import ValidationError
from types import SimpleNamespace
from datetime import datetime

FIXTURE = Path(__file__).parents[1] / "fixtures" / "resource_grading_sanitized.json"


@pytest.mark.skipif(not os.getenv('SPEC031_TEST_DATABASE_URL'), reason='Requiere PostgreSQL de pruebas aislado')
def test_review_projection_sql_30_students_in_isolated_schema():
    from sqlalchemy import event, text
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from app.modules.calificaciones import service
    from tests.fixtures.grading_batch import synthetic_grading_batch

    async def exercise():
        schema = 'spec033_' + uuid4().hex
        url = os.environ['SPEC031_TEST_DATABASE_URL']
        admin = create_async_engine(url)
        async with admin.begin() as conn:
            await conn.execute(text(f'CREATE SCHEMA {schema}'))
        engine = create_async_engine(url, connect_args={'server_settings': {'search_path': schema}})
        try:
            ddl = [
                'CREATE TABLE users (id uuid PRIMARY KEY, nombre text)',
                'CREATE TABLE matriculas (materia_id uuid, estudiante_id uuid, estado text)',
                'CREATE TABLE calificaciones (id uuid PRIMARY KEY, evaluacion_id uuid, estudiante_id uuid, entrega_id uuid, estado text, nota_confirmada numeric, nota_sugerida numeric, created_at timestamp DEFAULT NOW())',
                'CREATE TABLE entregas (id uuid PRIMARY KEY, evaluacion_id uuid, estudiante_id uuid, estado text, created_at timestamp DEFAULT NOW())',
                'CREATE TABLE calificacion_desgloses (id uuid PRIMARY KEY, calificacion_id uuid, version int, cobertura_estado text, bloqueos_json jsonb, requiere_revision bool, activo bool)',
                'CREATE TABLE calificacion_componentes (id uuid PRIMARY KEY, desglose_id uuid, requiere_revision bool, estado text)',
                'CREATE TABLE calificacion_incidencias (id uuid PRIMARY KEY, calificacion_id uuid, estado text, tipo text)',
                'CREATE TABLE ai_jobs (id uuid PRIMARY KEY, entrega_id uuid, estado text, tipo text, created_at timestamp DEFAULT NOW())',
            ]
            evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4(), politica_intento='un_intento')
            batch = synthetic_grading_batch()
            async with engine.begin() as conn:
                for statement in ddl:
                    await conn.execute(text(statement))
                for index, item in enumerate(batch):
                    await conn.execute(text('INSERT INTO users VALUES (:id,:name)'), {'id': item.student_id, 'name': f'Alumno {index:02}'})
                    await conn.execute(text("INSERT INTO matriculas VALUES (:subject,:student,'activo')"), {'subject': evaluation.materia_id, 'student': item.student_id})
                    if index == 29:
                        continue
                    gid, bid = uuid4(), uuid4()
                    await conn.execute(text("INSERT INTO entregas (id,evaluacion_id,estudiante_id,estado) VALUES (:id,:evaluation,:student,'calificada')"), {'id': item.delivery_id, 'evaluation': evaluation.id, 'student': item.student_id})
                    await conn.execute(text("INSERT INTO calificaciones (id,evaluacion_id,estudiante_id,entrega_id,estado,nota_sugerida) VALUES (:id,:evaluation,:student,:delivery,:state,:score)"), {'id': gid, 'evaluation': evaluation.id, 'student': item.student_id, 'delivery': item.delivery_id, 'state': 'procesando' if index == 8 else 'sugerida', 'score': None if index == 8 else 0 if index == 9 else 4})
                    if index < 8:
                        await conn.execute(text("INSERT INTO calificacion_incidencias VALUES (:id,:grade,'abierta','solicitud_revision')"), {'id': uuid4(), 'grade': gid})
                    if index == 8:
                        await conn.execute(text("INSERT INTO ai_jobs (id,entrega_id,estado,tipo) VALUES (:id,:delivery,'running','calificacion_entrega')"), {'id': uuid4(), 'delivery': item.delivery_id})
                    if index == 10:  # Una nota antigua no tiene desglose.
                        continue
                    await conn.execute(text("INSERT INTO calificacion_desgloses VALUES (:id,:grade,1,'completa','[]',false,true)"), {'id': bid, 'grade': gid})
                    await conn.execute(text("INSERT INTO calificacion_componentes VALUES (:id,:breakdown,false,'incorrecta')"), {'id': uuid4(), 'breakdown': bid})
            statements = []
            event.listen(engine.sync_engine, 'before_cursor_execute', lambda conn, cursor, statement, parameters, context, many: statements.append(statement))
            async with async_sessionmaker(engine)() as db:
                result = await service.revision_evaluacion(db, evaluation, include_pqrs=True, limit=30)
                assert len(statements) == 6
                assert result['total_alumnos'] == 30 and result['contadores']['alertas'] == 8
                by_student = {row['estudiante_id']: row for row in result['alumnos']}
                assert by_student[batch[8].student_id]['estado'] == 'procesando'
                assert by_student[batch[8].student_id]['nota'] is None
                assert by_student[batch[9].student_id]['nota'] == 0
                assert by_student[batch[10].student_id]['resumen_revision']['version'] is None
                assert by_student[batch[29].student_id]['estado'] == 'sin_entrega'
                first = await service.revision_evaluacion(db, evaluation, include_pqrs=False, limit=5)
                second = await service.revision_evaluacion(db, evaluation, include_pqrs=False, limit=5, cursor=first['siguiente_cursor'])
                assert set(row['estudiante_id'] for row in first['alumnos']).isdisjoint(row['estudiante_id'] for row in second['alumnos'])
                assert all(row['resumen_revision']['pqrs_abiertas'] is None for row in first['alumnos'])
        finally:
            await engine.dispose()
            async with admin.begin() as conn:
                await conn.execute(text(f'DROP SCHEMA {schema} CASCADE'))
            await admin.dispose()
    asyncio.run(exercise())


def test_student_claim_forwards_component_version_through_router_and_service(monkeypatch):
    from app.modules.calificaciones import router, service
    from app.modules.calificaciones.schemas import SolicitudRevisionCreate
    grade_id, component_id, evaluation_id, student_id = uuid4(), uuid4(), uuid4(), uuid4()
    captured = {}

    async def reviewed_grade(*args, **kwargs):
        return SimpleNamespace(id=grade_id)

    async def create_claim(*args, **kwargs):
        captured.update(kwargs)
        return {"ok": True}

    class DB:
        calls = 0

        async def scalar(self, query):
            self.calls += 1
            return component_id if self.calls == 1 else None

    monkeypatch.setattr(service, "_calificacion_revisada_del_estudiante", reviewed_grade)
    monkeypatch.setattr(service, "crear_incidencia", create_claim)
    result = asyncio.run(router.solicitar_revision_calificacion(
        evaluation_id,
        SolicitudRevisionCreate(motivo="respuesta", descripcion="Solicito revisar la respuesta dos", componente_id=component_id, desglose_version=3),
        current_user=SimpleNamespace(id=student_id, _effective_permissions={"grading.read"}), db=DB(),
    ))
    assert result == {"ok": True}
    assert captured == {"componente_id": component_id, "desglose_version": 3}


def test_student_claim_rejects_foreign_or_stale_component(monkeypatch):
    from app.modules.calificaciones import service

    async def reviewed_grade(*args, **kwargs):
        return SimpleNamespace(id=uuid4())

    class DB:
        async def scalar(self, query):
            return None

    monkeypatch.setattr(service, "_calificacion_revisada_del_estudiante", reviewed_grade)
    with pytest.raises(HTTPException) as error:
        asyncio.run(service.crear_solicitud_revision_estudiante(DB(), evaluacion_id=uuid4(), estudiante_id=uuid4(),
            motivo="respuesta", descripcion="Revisar pregunta", componente_id=uuid4(), desglose_version=1))
    assert error.value.status_code == 409


def test_twenty_component_regression_keeps_formula_and_identity_stable() -> None:
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    components = payload["grading"]["componentes"]

    first = calculate_formula(components, payload["grading"]["nota_maxima"])
    second = calculate_formula(components, payload["grading"]["nota_maxima"])
    coverage, blockers = coverage_state(components)

    assert len({item["componente_id"] for item in components}) == 20
    assert first == second
    assert float(first["puntos_posibles"]) == 5.0
    assert float(first["puntos_obtenidos"]) == 4.0
    assert float(first["nota_final"]) == 4.0
    assert coverage == "completa"
    assert blockers == []


@pytest.mark.parametrize(
    ("name", "student_response", "state", "score", "teacher_reference", "review"),
    [
        ("paráfrasis válida", "El agua cambia a vapor por el calor.", "correcta", 1.0, 1.0, False),
        ("interpretación válida", "El personaje actúa por miedo a perder a su familia.", "correcta", 1.0, 1.0, False),
        ("argumento parcial", "La decisión fue injusta, pero no aporta evidencia.", "parcial", 0.5, 0.5, False),
        ("respuesta en blanco", "", "sin_respuesta", 0.0, 0.0, False),
        ("evidencia ilegible", "[ilegible]", "ilegible", None, None, True),
    ],
)
def test_open_response_cases_preserve_teacher_reference_and_explain_score(
    name: str,
    student_response: str,
    state: str,
    score: float | None,
    teacher_reference: float | None,
    review: bool,
) -> None:
    """Casos sintéticos: la comparación docente es explícita, no una métrica inventada."""
    blueprint = {
        "nota_maxima": 1,
        "preguntas": [{"numero": 1, "enunciado": name, "puntaje": 1, "respuesta_esperada": "Criterio semántico docente"}],
    }
    scaffold = build_component_scaffold(blueprint)
    valuation = {
        "clave": "pregunta:1",
        "respuesta_estudiante": student_response,
        "puntaje": score,
        "estado": state,
        "explicacion": f"Comparación semántica controlada para {name}.",
        "orientacion_mejora": "Añade evidencia concreta." if state == "parcial" else "",
        "paginas": [1],
    }
    components, blockers = component_consensus(scaffold, [valuation], [valuation])
    component = components[0]

    assert (float(component["puntos_obtenidos"]) if component["puntos_obtenidos"] is not None else None) == teacher_reference
    assert component["estado"] == state
    assert component["requiere_revision"] is review
    assert bool(blockers) is review
    assert component["explicacion_verificable"]
    if state == "parcial":
        assert component["evidencia_json"]["orientacion_mejora"] == "Añade evidencia concreta."


def test_orientation_does_not_change_the_grade_formula() -> None:
    base = [{"clave": "pregunta:1", "puntos_maximos": 2, "puntos_obtenidos": 1}]
    with_orientation = [{**base[0], "evidencia_json": {"orientacion_mejora": "Explica el segundo paso."}}]
    assert calculate_formula(base, 5) == calculate_formula(with_orientation, 5)


def test_question_components_do_not_duplicate_dba_or_rubric_points() -> None:
    blueprint = {
        "nota_maxima": 5,
        "dba": [{"enunciado": "Comprende cambios de estado"}],
        "criterios": [{"nombre": "Comprensión", "puntaje": 5}],
        "preguntas": [
            {"numero": 1, "enunciado": "Explica la evaporación", "puntaje": 3},
            {"numero": 2, "enunciado": "Da un ejemplo", "puntaje": 2},
        ],
    }
    scaffold = build_component_scaffold(blueprint)
    assert [item["clave"] for item in scaffold] == ["pregunta:1", "pregunta:2"]
    assert sum(float(item["puntos_maximos"]) for item in scaffold) == 5.0


def test_question_context_uses_one_authorized_search_and_records_provenance(monkeypatch) -> None:
    own_source = {
        "id": "chunk-own",
        "source_id": "source-own",
        "source_title": "Guía del docente",
        "source_version": "4",
        "chunk_text": "La evaporación transforma agua líquida en vapor por efecto del calor.",
        "tipo": "material",
        "similarity": 0.91,
    }
    calls: list[dict] = []

    async def fake_search(_db, _query, **kwargs):
        calls.append(kwargs)
        return [own_source]

    monkeypatch.setattr(context_builder, "search_chunks", fake_search)
    materia_id, profesor_id = uuid4(), uuid4()
    assigned, provenance = asyncio.run(context_builder.build_question_context_for_grading(
        object(), materia_id=materia_id, profesor_id=profesor_id,
        evaluacion_nombre="Estados del agua",
        questions=[{"numero": 1, "enunciado": "Explica la evaporación"}],
        detected_answers=[{"pregunta": "1", "respuesta": "El calor convierte el agua en vapor"}],
    ))
    assert calls == [{"materia_id": materia_id, "profesor_id": profesor_id, "limit": 12}]
    assert assigned["1"] == [own_source]
    assert provenance == [{
        "pregunta": "1", "source_id": "source-own", "chunk_id": "chunk-own",
        "titulo": "Guía del docente", "version": "4", "fragmento": own_source["chunk_text"],
    }]


def test_question_context_declares_absence_instead_of_inventing_sources(monkeypatch) -> None:
    async def no_authorized_sources(*_args, **_kwargs):
        return []

    monkeypatch.setattr(context_builder, "search_chunks", no_authorized_sources)
    assigned, provenance = asyncio.run(context_builder.build_question_context_for_grading(
        object(), materia_id=uuid4(), profesor_id=uuid4(), evaluacion_nombre="Lectura",
        questions=[{"numero": 1, "enunciado": "Interpreta la decisión del personaje"}],
        detected_answers=[{"pregunta": "1", "respuesta": "Actuó por miedo"}],
    ))
    assert assigned == {"1": []}
    assert provenance == []
    assert context_builder.format_question_context_as_text(assigned) == "(sin fuentes adicionales pertinentes)"


def test_rag_query_excludes_foreign_or_removed_sources_at_database_boundary(monkeypatch) -> None:
    """El JOIN excluye fuentes retiradas y ambos lados aplican dueño/materia."""
    executed: list[tuple[str, dict]] = []

    class Nested:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

    class Result:
        def fetchall(self):
            return []

    class FakeDb:
        def begin_nested(self):
            return Nested()

        async def execute(self, statement, params):
            executed.append((str(statement), params))
            return Result()

    async def fake_embedding(_query):
        return [0.1, 0.2]

    monkeypatch.setattr(retrieval_service, "embed_single", fake_embedding)
    materia_id, profesor_id = uuid4(), uuid4()
    result = asyncio.run(retrieval_service.search_chunks(
        FakeDb(), "consulta", materia_id=materia_id, profesor_id=profesor_id,
    ))
    sql, params = executed[0]
    normalized = " ".join(sql.split())
    assert "JOIN rag_sources s ON s.id = c.source_id" in normalized
    assert "c.materia_id = CAST(:materia_id AS uuid)" in normalized
    assert "s.materia_id = CAST(:materia_id AS uuid)" in normalized
    assert "c.profesor_id = CAST(:profesor_id AS uuid)" in normalized
    assert "s.profesor_id = CAST(:profesor_id AS uuid)" in normalized
    assert params["materia_id"] == str(materia_id)
    assert params["profesor_id"] == str(profesor_id)
    assert result == []


def _synthetic_study(owner_id=None):
    owner_id = owner_id or uuid4()
    return SimpleNamespace(
        id=uuid4(), owner_admin_id=owner_id, nombre="Piloto sintético",
        estado="draft", synthetic_only=True, version=1,
        protocol_json={}, participants_json=[],
        access_grants_json=create_owner_grants(owner_id), import_batches_json=[],
        retention_policy_json={}, retention_audit_json=[],
    )


def test_primary_admin_cannot_bypass_dataset_grant_and_revocation() -> None:
    owner, outsider = uuid4(), uuid4()
    study = _synthetic_study(owner)
    assert has_grant(study, owner, "manage")
    with pytest.raises(HTTPException) as denied:
        require_study_grant(study, SimpleNamespace(id=outsider, rol="admin", is_primary_admin=True), "read")
    assert denied.value.status_code == 403
    grant_id = study.access_grants_json[0]["grant_id"]
    study.access_grants_json = [
        *study.access_grants_json,
        {"kind": "revocation", "grant_id": grant_id},
    ]
    assert not has_grant(study, owner, "manage")


def test_real_study_activation_lists_every_missing_protocol_requirement() -> None:
    study = _synthetic_study()
    missing = activation_missing(
        study, real_data=True, authorization_reference=None, retention_days=None,
    )
    assert {
        "unidad_analisis", "materias", "grados", "condiciones", "orden",
        "escala_maxima", "categorias_kappa", "instrumentos",
        "criterios_inclusion", "criterios_exclusion",
        "authorization_reference", "retention_policy",
    } == set(missing)


def test_observation_contract_rejects_free_personal_fields_atomically() -> None:
    valid = {
        "external_id": "row-1", "teacher_pseudonym": "doc-a", "work_key": "work-a",
        "condition": "manual", "observed_at": datetime(2026, 9, 9),
        "payload": {"type": "timing", "duration_ms": 1000, "unit": "ms", "phase": "revision"},
    }
    with pytest.raises(ValidationError):
        ObservationWrite.model_validate({**valid, "teacher_email": "private@example.com"})
    with pytest.raises(ValidationError):
        ObservationBatch.model_validate({
            "expected_version": 1, "instrument_version": "v1", "import_id": "batch",
            "digest": "0" * 64, "rows": [{**valid, "payload": {"type": "survey", "instrument_version": "v1", "responses": {"comment": "texto libre"}}}],
        })


def test_batch_digest_is_stable_and_changes_with_any_row() -> None:
    first = ObservationWrite(
        external_id="row-1", teacher_pseudonym="doc-a", work_key="work-a",
        condition="manual", observed_at=datetime(2026, 9, 9),
        payload=TimingPayload(type="timing", duration_ms=1000, phase="revision"),
    )
    changed = first.model_copy(update={"payload": TimingPayload(type="timing", duration_ms=1001, phase="revision")})
    assert batch_digest("v1", [first]) == batch_digest("v1", [first])
    assert batch_digest("v1", [first]) != batch_digest("v1", [changed])


def test_indicators_preserve_negative_savings_and_use_only_blind_reference() -> None:
    def row(external_id, condition, payload, work="work-1", missing=None):
        return SimpleNamespace(
            external_id=external_id, revision=1, exclusion_reason=None, missing_reason=missing,
            teacher_pseudonym="doc-a", work_key=work, condition=condition, payload_json=payload,
        )
    rows = [
        row("t1", "manual", TimingPayload(type="timing", duration_ms=1000, phase="revision").model_dump()),
        row("t2", "asistida", TimingPayload(type="timing", duration_ms=1200, phase="revision").model_dump()),
        row("g1", "asistida", GradeComparisonPayload(type="grade_comparison", suggested_initial=4, confirmed=4, independent_reference=4, scale_max=5, categories_version="v1", reviewer_saw_ai=False).model_dump(), "grade-1"),
        row("g2", "asistida", GradeComparisonPayload(type="grade_comparison", suggested_initial=2, confirmed=3, independent_reference=2, scale_max=5, categories_version="v1", reviewer_saw_ai=False).model_dump(), "grade-2"),
        row("g3", "asistida", GradeComparisonPayload(type="grade_comparison", suggested_initial=5, confirmed=5, independent_reference=5, scale_max=5, categories_version="v1", reviewer_saw_ai=True).model_dump(), "grade-3"),
        row("f1", "asistida", FeedbackQualityPayload(type="feedback_quality", instrument_version="f1", correccion=4, especificidad=4, claridad=5, utilidad=4, adecuacion=3, blinded=True).model_dump()),
    ]
    indicators = study_indicators(rows, {"categorias_kappa": [1, 2, 3, 4]})
    assert indicators["time_savings"]["mean_percent"] == -20
    assert indicators["time_savings"]["paired_units"] == 1
    assert indicators["kappa_independent"]["n"] == 2
    assert indicators["exposed_grade_pairs"] == 1
    assert indicators["feedback_quality"]["mean"] == 4


def test_kappa_degenerate_and_missing_categories_are_not_success_values() -> None:
    missing = cohen_kappa([4], [4], boundaries=[1, 2, 3, 4])
    degenerate = cohen_kappa([5, 5], [5, 5], boundaries=[1, 2, 3, 4])
    no_categories = cohen_kappa([1, 2], [1, 2], boundaries=[])
    assert missing == {"available": False, "value": None, "reason": "insufficient_sample", "n": 1}
    assert degenerate["available"] is False and degenerate["reason"] == "degenerate_distribution"
    assert no_categories["available"] is False and no_categories["reason"] == "categories_not_configured"


def test_study_feature_is_denied_by_backend_when_disabled(monkeypatch) -> None:
    monkeypatch.setattr(impact_router.settings, "IMPACT_STUDY_ENABLED", False)
    with pytest.raises(HTTPException) as denied:
        asyncio.run(impact_router._admin_permission(None, SimpleNamespace(), "reports.read"))
    assert denied.value.status_code == 404


def test_grants_only_accept_active_administrators() -> None:
    assert valid_grant_target(SimpleNamespace(rol="admin", estado="activo"))
    assert not valid_grant_target(SimpleNamespace(rol="admin", estado="inactivo"))
    assert not valid_grant_target(SimpleNamespace(rol="profesor", estado="activo"))
    assert not valid_grant_target(None)


def test_participant_scope_resolves_only_the_assigned_teacher() -> None:
    teacher_id, outsider_id = uuid4(), uuid4()
    study = SimpleNamespace(participants_json=[{
        "user_id": str(teacher_id), "pseudonym": "doc-safe-1",
    }])
    assert participant_pseudonym(study, teacher_id) == "doc-safe-1"
    assert participant_pseudonym(study, outsider_id) is None


def test_import_contract_caps_rows_and_serialized_size() -> None:
    row = {
        "external_id": "row-1", "teacher_pseudonym": "doc-a", "work_key": "work-a",
        "condition": "manual", "observed_at": "2026-09-09T00:00:00",
        "payload": {"type": "timing", "duration_ms": 1000, "unit": "ms", "phase": "revision"},
    }
    with pytest.raises(ValidationError):
        ObservationBatch.model_validate({
            "expected_version": 1, "instrument_version": "v1", "import_id": "too-many",
            "digest": "0" * 64, "rows": [row] * 1001,
        })
    oversized = {"rows": [{"opaque": "x" * (5 * 1024 * 1024)}]}
    assert batch_size_bytes(oversized) > 5 * 1024 * 1024
    with pytest.raises(HTTPException) as rejected:
        require_batch_size(oversized)
    assert rejected.value.status_code == 413


def test_import_replay_succeeds_after_study_version_advanced(monkeypatch) -> None:
    row = ObservationWrite(
        external_id="row-1", teacher_pseudonym="doc-a", work_key="work-a",
        condition="manual", observed_at=datetime(2026, 9, 9),
        payload=TimingPayload(type="timing", duration_ms=1000, phase="revision"),
    )
    digest = batch_digest("v1", [row])
    study = SimpleNamespace(
        id=uuid4(), estado="draft", synthetic_only=True, version=2,
        import_batches_json=[{
            "import_id": "batch-1", "digest": digest,
            "result": {"import_id": "batch-1", "accepted": 1, "created": 1},
        }],
    )

    async def fake_admin(*_args, **_kwargs):
        return None

    async def fake_study(*_args, **_kwargs):
        return study

    async def fake_observation_access(*_args, **_kwargs):
        return None

    monkeypatch.setattr(impact_router, "_admin_permission", fake_admin)
    monkeypatch.setattr(impact_router, "_study", fake_study)
    monkeypatch.setattr(impact_router, "_observation_access", fake_observation_access)
    result = asyncio.run(impact_router.import_observations(
        study.id,
        ObservationBatch(
            expected_version=1, instrument_version="v1", import_id="batch-1",
            digest=digest, rows=[row],
        ),
        SimpleNamespace(id=uuid4()),
        SimpleNamespace(),
    ))
    assert result == {
        "import_id": "batch-1", "accepted": 1, "created": 1,
        "replayed": True, "version": 2,
    }


def test_retention_targets_only_isolated_study_rows(monkeypatch) -> None:
    study = SimpleNamespace(
        id=uuid4(), estado="closed", version=3, retention_audit_json=[],
    )
    statements: list[str] = []

    class Result:
        rowcount = 2

    class FakeDb:
        async def execute(self, statement):
            statements.append(str(statement))
            return Result()

        async def commit(self):
            return None

    async def fake_admin(*_args, **_kwargs):
        return None

    async def fake_study(*_args, **_kwargs):
        return study

    monkeypatch.setattr(impact_router, "_admin_permission", fake_admin)
    monkeypatch.setattr(impact_router, "_study", fake_study)
    monkeypatch.setattr(impact_router, "require_study_grant", lambda *_args: None)
    result = asyncio.run(impact_router.apply_retention(
        study.id,
        RetentionApply(expected_version=3, reason="Fin del plazo autorizado"),
        SimpleNamespace(id=uuid4()),
        FakeDb(),
    ))

    normalized = " ".join(statements).lower()
    assert "impacto_observations" in normalized
    assert all(name not in normalized for name in ("calificaciones", "entregas", "archivos", "evidencias"))
    assert result["academic_records_changed"] is False
    assert result["removed_observations"] == 2
    assert set(study.retention_audit_json[0]) == {"event_id", "action", "actor_id", "at", "reason", "count"}
