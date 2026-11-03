"""Spec140: real PostgreSQL transactions, synthetic evidence and no inference.

The queue boundary records the exact immutable reference; it never contacts a
broker, a model, production storage, or the application's DATABASE_URL.
"""
from __future__ import annotations

import asyncio
import json
from copy import deepcopy
from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID, uuid4

from fastapi import FastAPI
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
import pytest
import pytest_asyncio
from sqlalchemy import func, select, text
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.calificaciones import photo_service, revision_service
from app.modules.calificaciones.breakdown_models import CalificacionDesglose
from app.modules.calificaciones.models import Calificacion, CalificacionRevision, Entrega
from app.modules.calificaciones.revision_router import router
from app.modules.evaluaciones import score_service, service as evaluation_service
from app.modules.evaluaciones.grading_visual_context import grading_job_reference, read_grading_definition
from app.modules.evaluaciones.models import EvaluacionContenidoVersion
from app.modules.evaluaciones.score_schemas import ScorePlanUpdate
from app.modules.evaluaciones.visual_service import content_hash
from app.modules.feedback_sharing.models import FeedbackPublication
from tests.integration.test_evaluation_visual_persistence import TEST_URL, database, visual_scope, synthetic_png
from tests.integration.test_score_allocation_persistence import scoring_scope, seed_legacy, seed_breakdown, by_type

pytestmark = pytest.mark.skipif(not TEST_URL, reason="Requiere PostgreSQL sintético SPEC101_TEST_DATABASE_URL")
assert database and visual_scope and scoring_scope


def path(grade_id):
    return f"/api/calificaciones/{grade_id}/recalificar"


def context_path(grade_id):
    return f"/api/calificaciones/{grade_id}/recalificacion-contexto"


async def grade_snapshot(case, grade_id):
    async with case.sessions() as db:
        grade = await db.scalar(select(Calificacion).where(Calificacion.id == grade_id)
                                .options(selectinload(Calificacion.entrega)))
        return revision_service.revision_snapshot(grade)


async def counts(case):
    async with case.sessions() as db:
        return (await db.scalar(select(func.count()).select_from(CalificacionRevision)),
                await db.scalar(text("SELECT count(*) FROM ai_jobs")))


async def payload(case, grade_id, proposal=None, **changes):
    before = await grade_snapshot(case, grade_id)
    result = {"solicitud_id": str(uuid4()), "version_esperada": before["updated_at"],
              "confirmar_reapertura": "true"}
    if proposal is not None:
        result.update(usar_puntajes_actuales="true", version_puntajes_objetivo=proposal["version_objetivo_id"],
                      contexto_puntajes_fingerprint=proposal["fingerprint"])
    return {**result, **changes}


async def proposal(case, grade_id):
    response = await case.client.get(context_path(grade_id))
    assert response.status_code == 200, response.text
    assert response.headers['cache-control'] == 'private, no-store'
    return response.json()


@pytest_asyncio.fixture
async def regrading_case(scoring_scope, monkeypatch, request):
    sessions, owner, subject, root = scoring_scope
    count = getattr(request, "param", 3)
    # Only FK ancestors already created by visual_scope and these additive
    # tables in its random schema. No migrations or shared/public tables here.
    async with sessions() as db:
        connection = await db.connection()
        for model in (CalificacionRevision, FeedbackPublication):
            await connection.run_sync(lambda sync, model=model: model.__table__.create(sync, checkfirst=True))
        await db.execute(text("CREATE TABLE audit_events (event text, entity_type text, entity_id text, metadata jsonb)"))
        await db.commit()
        evaluation, actor, _, _ = await seed_legacy(db, owner, subject, count)
        evaluation.estado = "publicada"
        grades = list(await db.scalars(select(Calificacion).where(Calificacion.evaluacion_id == evaluation.id)
                                       .order_by(Calificacion.id).options(selectinload(Calificacion.entrega))))
        for index, grade in enumerate(grades):
            # The cohort includes suggested, published, adjusted and incomplete
            # grades. Reopening is individual and preserves all prior decisions.
            await seed_breakdown(db, evaluation, grade, manual=index % 4 == 2,
                                 published=index % 4 == 1, pending=index % 4 == 3)
            photo = root / f"evidence-{index}.png"
            photo.write_bytes(synthetic_png())
            grade.entrega.archivo_url = f"/uploads/{photo.name}"
            grade.entrega.respuesta_texto = f"Texto sintético conservado {index}"
            grade.feedback = f"Recomendación concreta conservada {index}"
            db.add(FeedbackPublication(calificacion_id=grade.id, estudiante_id=grade.estudiante_id,
                evaluacion_id=evaluation.id, materia_id=subject, authorized_by=owner, revision=1,
                content_fingerprint="a" * 64, payload_json={"synthetic": True}, state="authorized"))
        await db.commit()
        info = await score_service.read_score_plan(db, evaluation.id, actor)
        updated = await score_service.save_score_plan(db, evaluation.id,
            ScorePlanUpdate(plan=by_type(info), expected_updated_at=info["updated_at"]), actor)
        target_id = updated.contenido_version_id
        ids = [grade.id for grade in grades]
        old_id = grades[0].entrega.contenido_version_id
        actor._effective_permissions.add("grading.publish")
    monkeypatch.setattr(settings, "FEEDBACK_SHARING_ENABLED", True)
    monkeypatch.setattr(revision_service, "resolve_upload_path", lambda url: root / url.split("/")[-1])
    calls = []

    async def queue(db, **kwargs):
        reference = await grading_job_reference(db, kwargs["evaluacion"], kwargs["entrega"])
        call = {"grade_id": kwargs["calificacion"].id, "delivery_id": kwargs["entrega"].id,
                "reference": deepcopy(reference), "url": kwargs["entrega"].archivo_url}
        job_id = uuid4()
        await db.execute(text("INSERT INTO ai_jobs(id,estado,input_json,entrega_id) VALUES (:id,'queued',CAST(:input AS jsonb),:delivery)"),
            {"id": job_id, "input": json.dumps({"evaluacion_id": str(kwargs["evaluacion"].id), **reference}),
             "delivery": kwargs["entrega"].id})
        result = photo_service.prepare_queued_grading(entrega=kwargs["entrega"], evaluacion=kwargs["evaluacion"],
            estudiante_id=kwargs["estudiante_id"], profesor_id=kwargs["profesor_id"], job_id=job_id,
            evidence_metadata=kwargs.get("evidence_metadata"), calificacion=kwargs["calificacion"])
        await db.commit()
        await db.refresh(result)
        calls.append(call)
        return result

    monkeypatch.setattr(revision_service.grading_queue_service, "enqueue_persisted_grading", queue)
    app = FastAPI()
    app.include_router(router, prefix="/api")
    current_actor = {"user": actor}

    async def current():
        return current_actor["user"]

    async def session():
        async with sessions() as db:
            yield db

    app.dependency_overrides[get_current_user] = current
    app.dependency_overrides[get_db] = session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://synthetic") as client:
        yield SimpleNamespace(sessions=sessions, owner=owner, subject=subject, root=root, evaluation_id=evaluation.id,
            grade_ids=ids, old_id=old_id, target_id=target_id, actor=current_actor, calls=calls, client=client, app=app)


@pytest.mark.asyncio
async def test_context_can_be_consulted_in_a_read_only_transaction_without_admission_locks(regrading_case):
    case = regrading_case

    async def read_only_session():
        async with case.sessions() as db:
            await db.execute(text('SET TRANSACTION READ ONLY'))
            yield db

    case.app.dependency_overrides[get_db] = read_only_session
    result = await proposal(case, case.grade_ids[0])
    assert result['estado'] == 'puntajes_actualizados'
    assert await counts(case) == (0, 0) and case.calls == []


@pytest.mark.asyncio
async def test_context_is_private_read_only_and_compares_actual_maxima(regrading_case):
    case = regrading_case
    grade_id = case.grade_ids[0]
    before = await grade_snapshot(case, grade_id)
    result = await proposal(case, grade_id)
    assert result["estado"] == "puntajes_actualizados" and result["requiere_confirmacion"] is True
    assert result["version_entrega_id"] == str(case.old_id)
    assert result["version_objetivo_id"] == str(case.target_id)
    assert len(result["fingerprint"]) == 64
    changes = {row["numero"]: row for row in result["cambios"]}
    assert Decimal(changes["9"]["puntaje_anterior"]) == Decimal(".52")
    assert [Decimal(changes[key]["puntaje_actual"]) for key in ("8", "9")] == [Decimal("1.25")] * 2
    assert set(result) == {"estado", "version_entrega_id", "version_objetivo_id", "fingerprint",
                           "requiere_confirmacion", "cambios", "mensaje"}
    assert (await grade_snapshot(case, grade_id)) == before
    assert await counts(case) == (0, 0) and case.calls == []
    async with case.sessions() as db:
        assert set(await db.scalars(select(FeedbackPublication.state))) == {"authorized"}


@pytest.mark.asyncio
@pytest.mark.parametrize("regrading_case", [24], indirect=True)
async def test_24_mixed_four_confirmed_regrades_pin_current_and_archive_prior_decisions(regrading_case):
    case = regrading_case
    before = {identifier: await grade_snapshot(case, identifier) for identifier in case.grade_ids}
    async with case.sessions() as db:
        revisions_before = {row.id: (deepcopy(row.snapshot_json), row.content_hash)
            for row in await db.scalars(select(EvaluacionContenidoVersion))}
        breakdowns_before = {row.id: (row.version, row.nota_final, row.activo)
            for row in await db.scalars(select(CalificacionDesglose))}
    for identifier in case.grade_ids[:4]:
        context = await proposal(case, identifier)
        form = await payload(case, identifier, context)
        response = await case.client.post(path(identifier), data=form)
        assert response.status_code == 202, response.text
        assert response.json()["estado"] == "procesando"
        assert response.json()["nota_confirmada"] is None and response.json()["nota_sugerida"] is None
        repeat = await case.client.post(path(identifier), data=form)
        assert repeat.status_code == 202 and repeat.json() == response.json()
        async with case.sessions() as db:
            grade = await db.scalar(select(Calificacion).where(Calificacion.id == identifier)
                                    .options(selectinload(Calificacion.entrega)))
            evaluation = await evaluation_service.get_evaluation_or_404(db, case.evaluation_id)
            definition = await read_grading_definition(db, evaluation, grade.entrega)
            assert definition.version_id == case.target_id
            assert [Decimal(str(q["puntaje"])) for q in definition.blueprint["preguntas"][-2:]] == [Decimal("1.25")] * 2
            archived = await db.scalar(select(CalificacionRevision).where(CalificacionRevision.calificacion_id == identifier))
            saved = deepcopy(archived.snapshot_json)
            metadata = saved.pop("recalificacion_puntajes")
            assert saved == before[identifier]
            assert str(case.old_id) in str(metadata) and str(case.target_id) in str(metadata)
            assert context["fingerprint"] in str(metadata)
            assert grade.entrega.archivo_url == before[identifier]["entrega"]["archivo_url"]
            assert grade.entrega.respuesta_texto == before[identifier]["entrega"]["respuesta_texto"]
            assert (case.root / grade.entrega.archivo_url.split("/")[-1]).read_bytes() == synthetic_png()
            assert await db.scalar(select(FeedbackPublication.state).where(FeedbackPublication.calificacion_id == identifier)) == "suspended"
    assert len(case.calls) == 4 and await counts(case) == (4, 4)
    assert all(call["reference"]["contenido_version_id"] == str(case.target_id) for call in case.calls)
    async with case.sessions() as db:
        target = await db.get(EvaluacionContenidoVersion, case.target_id)
        assert all(call["reference"]["contenido_hash"] == target.content_hash for call in case.calls)
        assert {row.id: (deepcopy(row.snapshot_json), row.content_hash)
                for row in await db.scalars(select(EvaluacionContenidoVersion))} == revisions_before
        assert {row.id: (row.version, row.nota_final, row.activo)
                for row in await db.scalars(select(CalificacionDesglose))} == breakdowns_before
    for identifier in case.grade_ids[4:]:
        assert await grade_snapshot(case, identifier) == before[identifier]


@pytest.mark.asyncio
@pytest.mark.parametrize("missing", ["all", "acceptance", "target", "fingerprint"])
async def test_legacy_or_incomplete_confirmation_never_silently_queues_old_points(regrading_case, missing):
    case = regrading_case
    identifier = case.grade_ids[0]
    before = await grade_snapshot(case, identifier)
    context = await proposal(case, identifier)
    form = await payload(case, identifier, None if missing == "all" else context)
    if missing != "all":
        del form[{"acceptance": "usar_puntajes_actuales", "target": "version_puntajes_objetivo",
                  "fingerprint": "contexto_puntajes_fingerprint"}[missing]]
    response = await case.client.post(path(identifier), data=form)
    assert response.status_code == 409, response.text
    assert "punt" in str(response.json()).lower()
    assert await grade_snapshot(case, identifier) == before
    assert await counts(case) == (0, 0) and case.calls == []


@pytest.mark.asyncio
@pytest.mark.parametrize("change", ["target", "fingerprint", "grade"])
async def test_stale_or_foreign_acceptance_is_rejected_without_effects(regrading_case, change):
    case = regrading_case
    identifier = case.grade_ids[0]
    context = await proposal(case, identifier)
    form = await payload(case, identifier, context)
    if change == "target":
        form["version_puntajes_objetivo"] = str(uuid4())
    elif change == "fingerprint":
        form["contexto_puntajes_fingerprint"] = "0" * 64
    else:
        async with case.sessions() as db:
            grade = await db.get(Calificacion, identifier)
            grade.feedback = "Cambio docente posterior que se conserva."
            await db.commit()
    before = await grade_snapshot(case, identifier)
    response = await case.client.post(path(identifier), data=form)
    assert response.status_code == 409, response.text
    assert await grade_snapshot(case, identifier) == before
    assert await counts(case) == (0, 0)


@pytest.mark.asyncio
async def test_new_partition_after_preview_requires_new_acceptance(regrading_case):
    case = regrading_case
    identifier = case.grade_ids[0]
    form = await payload(case, identifier, await proposal(case, identifier))
    async with case.sessions() as db:
        info = await score_service.read_score_plan(db, case.evaluation_id, case.actor["user"])
        next_plan = by_type(info)
        next_plan["grupos"][0]["presupuesto"] = "3"
        next_plan["grupos"][1]["presupuesto"] = "2"
        await score_service.save_score_plan(db, case.evaluation_id, ScorePlanUpdate(plan=next_plan,
            expected_updated_at=info["updated_at"], expected_content_version_id=info["contenido_version_id"]), case.actor["user"])
    before = await grade_snapshot(case, identifier)
    response = await case.client.post(path(identifier), data=form)
    assert response.status_code == 409, response.text
    assert await grade_snapshot(case, identifier) == before and await counts(case) == (0, 0)


async def replace_target(case, mutate):
    """Create a new immutable synthetic revision, never rewrite an old snapshot."""
    async with case.sessions() as db:
        evaluation = await evaluation_service.get_evaluation_or_404(db, case.evaluation_id)
        previous = await db.get(EvaluacionContenidoVersion, evaluation.contenido_version_id)
        raw = deepcopy(previous.snapshot_json)
        mutate(raw)
        revision = EvaluacionContenidoVersion(evaluacion_id=evaluation.id,
            numero_version=previous.numero_version + 1, autor_id=case.owner, previous_version_id=previous.id,
            content_hash=content_hash(raw), snapshot_json=raw, coverage_json=deepcopy(previous.coverage_json),
            recurso_ids=list(previous.recurso_ids), motivo="Cambio académico sintético", origen="edicion")
        db.add(revision)
        await db.flush()
        evaluation.contenido_version_id = revision.id
        # The live record and snapshot must describe the same target.
        evaluation.preguntas = deepcopy(raw["preguntas"])
        evaluation.respuestas_esperadas = deepcopy(raw["respuestas_esperadas"])
        evaluation.nota_maxima = Decimal(str(raw["nota_maxima"]))
        evaluation.blueprint.preguntas = deepcopy(raw["blueprint"]["preguntas"])
        evaluation.blueprint.respuestas_esperadas = deepcopy(raw["blueprint"]["respuestas_esperadas"])
        await db.commit()
        return revision.id


@pytest.mark.asyncio
@pytest.mark.parametrize("change", ["question", "key", "scale", "reading"])
async def test_content_or_scale_change_keeps_original_and_cannot_be_adopted(regrading_case, change):
    case = regrading_case
    identifier = case.grade_ids[0]

    def mutate(raw):
        if change == "question":
            raw["preguntas"][0]["enunciado"] = "Otra pregunta que no estaba en la hoja."
            raw["blueprint"]["preguntas"][0]["enunciado"] = raw["preguntas"][0]["enunciado"]
        elif change == "key":
            raw["respuestas_esperadas"][0]["respuesta"] = "Otra clave"
            raw["blueprint"]["respuestas_esperadas"][0]["respuesta"] = "Otra clave"
        elif change == "scale":
            raw["nota_maxima"] = "10"
        else:
            raw["lectura"] = "Una lectura distinta a la original."
            raw["blueprint"]["reglas_feedback"]["lectura"] = raw["lectura"]

    target = await replace_target(case, mutate)
    context = await proposal(case, identifier)
    assert context["estado"] == "contenido_modificado" and context["requiere_confirmacion"] is False
    before = await grade_snapshot(case, identifier)
    invalid = await payload(case, identifier, usar_puntajes_actuales="true",
                            version_puntajes_objetivo=str(target), contexto_puntajes_fingerprint="0" * 64)
    response = await case.client.post(path(identifier), data=invalid)
    assert response.status_code == 409, response.text
    assert await grade_snapshot(case, identifier) == before and await counts(case) == (0, 0)
    # Regrading the preserved original still works, without adopting new content.
    response = await case.client.post(path(identifier), data=await payload(case, identifier))
    assert response.status_code == 202, response.text
    assert case.calls[0]["reference"]["contenido_version_id"] == str(case.old_id)


@pytest.mark.asyncio
async def test_unversioned_historical_delivery_is_not_invented(regrading_case):
    case = regrading_case
    identifier = case.grade_ids[0]
    async with case.sessions() as db:
        grade = await db.get(Calificacion, identifier)
        delivery = await db.get(Entrega, grade.entrega_id)
        delivery.contenido_version_id = None
        await db.commit()
    before = await grade_snapshot(case, identifier)
    context = await proposal(case, identifier)
    assert context["estado"] == "version_no_disponible"
    response = await case.client.post(path(identifier), data=await payload(case, identifier))
    assert response.status_code == 409, response.text
    assert await grade_snapshot(case, identifier) == before and await counts(case) == (0, 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("actor_kind", ["student", "other_teacher", "missing_permission"])
async def test_context_and_acceptance_require_current_owner_and_permission(regrading_case, actor_kind):
    case = regrading_case
    identifier = case.grade_ids[0]
    context = await proposal(case, identifier)
    form = await payload(case, identifier, context)
    before = await grade_snapshot(case, identifier)
    if actor_kind == "missing_permission":
        case.actor["user"]._effective_permissions = set()
    else:
        case.actor["user"] = SimpleNamespace(id=uuid4(), rol="estudiante" if actor_kind == "student" else "profesor",
            _effective_permissions={"grading.grade"})
    assert (await case.client.get(context_path(identifier))).status_code == 403
    assert (await case.client.post(path(identifier), data=form)).status_code == 403
    assert await grade_snapshot(case, identifier) == before and await counts(case) == (0, 0)


@pytest.mark.asyncio
async def test_same_request_with_changed_score_choice_is_not_a_replay(regrading_case):
    case = regrading_case
    identifier = case.grade_ids[0]
    form = await payload(case, identifier, await proposal(case, identifier))
    first = await case.client.post(path(identifier), data=form)
    assert first.status_code == 202, first.text
    for field, value in [("usar_puntajes_actuales", "false"), ("version_puntajes_objetivo", str(uuid4())),
                         ("contexto_puntajes_fingerprint", "0" * 64)]:
        response = await case.client.post(path(identifier), data={**form, field: value})
        assert response.status_code == 409, response.text
    assert await counts(case) == (1, 1) and len(case.calls) == 1


@pytest.mark.asyncio
async def test_replay_is_resolved_before_rechecking_the_already_adopted_context(regrading_case):
    case = regrading_case
    identifier = case.grade_ids[0]
    form = await payload(case, identifier, await proposal(case, identifier))
    first = await case.client.post(path(identifier), data=form)
    assert first.status_code == 202, first.text
    context = await proposal(case, identifier)
    assert context["estado"] == "sin_cambios" and context["requiere_confirmacion"] is False
    again = await case.client.post(path(identifier), data=form)
    assert again.status_code == 202 and again.json() == first.json()
    assert await counts(case) == (1, 1) and len(case.calls) == 1


@pytest.mark.asyncio
async def test_queue_failure_rolls_back_pin_snapshot_note_and_publication(regrading_case, monkeypatch):
    case = regrading_case
    identifier = case.grade_ids[1]
    form = await payload(case, identifier, await proposal(case, identifier))
    before = await grade_snapshot(case, identifier)

    async def fail_after_staging(db, **kwargs):
        assert kwargs["entrega"].contenido_version_id == case.target_id
        await db.flush()
        raise RuntimeError("synthetic enqueue failure")

    monkeypatch.setattr(revision_service.grading_queue_service, "enqueue_persisted_grading", fail_after_staging)
    with pytest.raises(RuntimeError, match="synthetic enqueue failure"):
        await case.client.post(path(identifier), data=form)
    assert await grade_snapshot(case, identifier) == before
    assert await counts(case) == (0, 0)
    async with case.sessions() as db:
        assert set(await db.scalars(select(FeedbackPublication.state))) == {"authorized"}


@pytest.mark.asyncio
async def test_concurrent_score_acceptance_admits_exactly_one_operation(regrading_case):
    case = regrading_case
    identifier = case.grade_ids[0]
    form = await payload(case, identifier, await proposal(case, identifier))
    first, second = await asyncio.wait_for(asyncio.gather(
        case.client.post(path(identifier), data=form),
        case.client.post(path(identifier), data={**form, "solicitud_id": str(uuid4())})), timeout=15)
    assert sorted([first.status_code, second.status_code]) == [202, 409]
    assert await counts(case) == (1, 1) and len(case.calls) == 1
    assert case.calls[0]["reference"]["contenido_version_id"] == str(case.target_id)


@pytest.mark.asyncio
async def test_score_edit_waits_for_admission_and_cannot_change_accepted_job_context(regrading_case, monkeypatch):
    case = regrading_case
    identifier = case.grade_ids[0]
    form = await payload(case, identifier, await proposal(case, identifier))
    admitted, release, editing = asyncio.Event(), asyncio.Event(), asyncio.Event()
    original_queue = revision_service.grading_queue_service.enqueue_persisted_grading
    editor_pid = []

    async def paused_queue(db, **kwargs):
        # This point is after acceptance/locks and before its commit. The edit
        # must wait instead of changing the version beneath the queued job.
        admitted.set()
        await asyncio.wait_for(release.wait(), timeout=10)
        return await original_queue(db, **kwargs)

    async def edit():
        async with case.sessions() as db:
            editor_pid.append(await db.scalar(text("SELECT pg_backend_pid()")))
            info = await score_service.read_score_plan(db, case.evaluation_id, case.actor["user"])
            next_plan = by_type(info)
            next_plan["grupos"][0]["presupuesto"] = "3"
            next_plan["grupos"][1]["presupuesto"] = "2"
            editing.set()
            try:
                await score_service.save_score_plan(db, case.evaluation_id, ScorePlanUpdate(plan=next_plan,
                    expected_updated_at=info["updated_at"], expected_content_version_id=info["contenido_version_id"]),
                    case.actor["user"])
                return 200
            except HTTPException as error:
                await db.rollback()
                return error.status_code

    monkeypatch.setattr(revision_service.grading_queue_service, "enqueue_persisted_grading", paused_queue)
    sending = asyncio.create_task(case.client.post(path(identifier), data=form))
    changing = None
    try:
        await asyncio.wait_for(admitted.wait(), timeout=5)
        changing = asyncio.create_task(edit())
        await asyncio.wait_for(editing.wait(), timeout=5)
        # Inspect PostgreSQL, not scheduler timing, to prove a genuine lock wait
        # in another transaction. Both connections belong to this test fixture.
        blocked = False
        for _ in range(50):
            async with case.sessions() as observing:
                blocked = await observing.scalar(text("SELECT wait_event_type='Lock' FROM pg_stat_activity WHERE pid=:pid"),
                                                 {"pid": editor_pid[0]})
            if blocked:
                break
            await asyncio.sleep(.02)
        assert blocked is True and not changing.done()
        release.set()
        sent, edited = await asyncio.wait_for(asyncio.gather(sending, changing), timeout=10)
        assert sent.status_code == 202, sent.text
        # The existing score editor sees the now-active grading job and retains
        # its draft. It must neither overwrite the accepted version nor deadlock.
        assert edited == 409
    finally:
        release.set()
        for pending in (sending, changing):
            if pending is not None and not pending.done():
                pending.cancel()
        await asyncio.gather(*(item for item in (sending, changing) if item is not None), return_exceptions=True)
    async with case.sessions() as db:
        evaluation = await evaluation_service.get_evaluation_or_404(db, case.evaluation_id)
        assert evaluation.contenido_version_id == case.target_id
    assert await counts(case) == (1, 1) and len(case.calls) == 1
    assert case.calls[0]["reference"]["contenido_version_id"] == str(case.target_id)


@pytest.mark.asyncio
async def test_different_deliveries_share_context_lock_and_both_can_be_admitted(regrading_case):
    from app.modules.calificaciones.reprocessing_context import validate_reprocessing_target
    from app.modules.calificaciones.revision_router import owned_grade

    case = regrading_case
    identifiers = case.grade_ids[:2]
    forms = [await payload(case, identifier, await proposal(case, identifier)) for identifier in identifiers]
    both_admitted = asyncio.Event()
    entries = []

    async def compare_under_shared_lock(identifier, form):
        async with case.sessions() as db:
            grade, evaluation = await owned_grade(db, identifier, case.actor["user"], lock=True)
            accepted = await validate_reprocessing_target(db, evaluation, grade, actor_id=case.owner,
                use_current=True, target_version=UUID(form["version_puntajes_objetivo"]),
                context_fingerprint=form["contexto_puntajes_fingerprint"])
            entries.append(identifier)
            if len(entries) == 2:
                both_admitted.set()
            # Prove this new helper uses compatible shared evaluation locks in
            # separate real transactions. It must not introduce an exclusive
            # context lock. No pins, notes or jobs are changed by comparison.
            await asyncio.wait_for(both_admitted.wait(), timeout=5)
            assert accepted.target_version == case.target_id
            await db.rollback()

    await asyncio.wait_for(asyncio.gather(*(
        compare_under_shared_lock(identifier, form) for identifier, form in zip(identifiers, forms))), timeout=10)
    assert set(entries) == set(identifiers) and await counts(case) == (0, 0)
    # The existing active-materia admission gate has its own exclusive lock.
    # Do not require bypassing it: concurrent HTTP requests must both complete
    # successfully and queue the accepted reference without a lock cycle.
    responses = await asyncio.wait_for(asyncio.gather(*(
        case.client.post(path(identifier), data=form) for identifier, form in zip(identifiers, forms))), timeout=10)
    assert [response.status_code for response in responses] == [202, 202]
    assert set(entries) == set(identifiers)
    assert await counts(case) == (2, 2) and len(case.calls) == 2
    assert all(call["reference"]["contenido_version_id"] == str(case.target_id) for call in case.calls)


@pytest.mark.asyncio
async def test_active_job_and_missing_reopening_acceptance_preserve_old_context(regrading_case):
    case = regrading_case
    identifier = case.grade_ids[1]
    context = await proposal(case, identifier)
    form = await payload(case, identifier, context, confirmar_reapertura="false")
    before = await grade_snapshot(case, identifier)
    response = await case.client.post(path(identifier), data=form)
    assert response.status_code == 409, response.text
    async with case.sessions() as db:
        grade = await db.get(Calificacion, identifier)
        await db.execute(text("INSERT INTO ai_jobs(id,estado,input_json,entrega_id) VALUES (:id,'running','{}',:delivery)"),
                         {"id": uuid4(), "delivery": grade.entrega_id})
        await db.commit()
    response = await case.client.post(path(identifier), data={**form, "confirmar_reapertura": "true"})
    assert response.status_code == 409, response.text
    assert await grade_snapshot(case, identifier) == before
    assert await counts(case) == (0, 1) and case.calls == []


@pytest.mark.asyncio
async def test_same_maxima_in_new_revision_keep_legacy_request_compatible(regrading_case):
    case = regrading_case
    identifier = case.grade_ids[0]
    # A versioned delivery already updated via Spec137 does not need a second
    # points acceptance, even if a later revision has an identical allocation.
    async with case.sessions() as db:
        grade = await db.get(Calificacion, identifier)
        delivery = await db.get(Entrega, grade.entrega_id)
        delivery.contenido_version_id = case.target_id
        await db.commit()
    await replace_target(case, lambda raw: None)
    context = await proposal(case, identifier)
    assert context["estado"] == "sin_cambios" and context["requiere_confirmacion"] is False
    assert context["cambios"] == []
    form = await payload(case, identifier)
    first = await case.client.post(path(identifier), data=form)
    assert first.status_code == 202, first.text
    replay = await case.client.post(path(identifier), data=form)
    assert replay.status_code == 202 and replay.json() == first.json()
    assert await counts(case) == (1, 1) and len(case.calls) == 1


@pytest.mark.asyncio
async def test_evidence_replacement_accepts_current_points_and_keeps_old_file(regrading_case):
    case = regrading_case
    identifier = case.grade_ids[0]
    before = await grade_snapshot(case, identifier)
    old = case.root / before["entrega"]["archivo_url"].split("/")[-1]
    form = await payload(case, identifier, await proposal(case, identifier), motivo="")
    response = await case.client.post(path(identifier), data=form,
        files={"foto": ("new.png", synthetic_png("blue"), "image/png")})
    assert response.status_code == 202, response.text
    current = await grade_snapshot(case, identifier)
    assert current["entrega"]["archivo_url"] != before["entrega"]["archivo_url"]
    assert current["entrega"]["contenido_version_id"] == str(case.target_id)
    assert old.read_bytes() == synthetic_png()
    assert case.calls[0]["reference"]["contenido_version_id"] == str(case.target_id)
    async with case.sessions() as db:
        archived = await db.scalar(select(CalificacionRevision).where(CalificacionRevision.calificacion_id == identifier))
        assert archived.accion == "cambiar_evidencia" and archived.motivo is None
        assert archived.snapshot_json["entrega"] == before["entrega"]


@pytest.mark.asyncio
async def test_scanned_replacement_accepts_exact_points_and_keeps_original_history(regrading_case, monkeypatch):
    from app.modules.calificaciones.evidence_manifest import read_manifest
    from app.modules.calificaciones.evidence_preparation import read_verified_asset
    case = regrading_case
    monkeypatch.setattr(settings, 'EVIDENCE_SCAN_ENABLED', True)
    monkeypatch.setattr(settings, 'EVIDENCE_SCAN_TEACHER_IDS', '')
    identifier = case.grade_ids[0]
    before = await grade_snapshot(case, identifier)
    form = await payload(case, identifier, await proposal(case, identifier))
    recipe = {'schema_version': 1, 'pages': [{'page_id': str(uuid4()),
        'decision': 'original', 'rotation': 90, 'confirmed': True}]}
    form['escaneo'] = json.dumps(recipe)
    source = synthetic_png('blue')
    first = await case.client.post(path(identifier), data=form,
        files={'foto': ('new.png', source, 'image/png')})
    assert first.status_code == 202, first.text
    again = await case.client.post(path(identifier), data=form,
        files={'foto': ('new.png', source, 'image/png')})
    assert again.status_code == 202 and again.json() == first.json()
    async with case.sessions() as db:
        grade = await db.scalar(select(Calificacion).where(Calificacion.id == identifier)
                                .options(selectinload(Calificacion.entrega)))
        manifest = read_manifest(grade.entrega)
        assert manifest is not None and manifest.pages[0].rotation == 90
        assert await read_verified_asset(manifest.pages[0].source) == source
        assert grade.entrega.contenido_version_id == case.target_id
        archived = await db.scalar(select(CalificacionRevision).where(CalificacionRevision.calificacion_id == identifier))
        assert archived.accion == 'cambiar_evidencia'
        assert archived.snapshot_json['entrega'] == before['entrega']
        assert archived.snapshot_json['recalificacion_puntajes']['version_anterior_id'] == str(case.old_id)
    assert (case.root / before['entrega']['archivo_url'].split('/')[-1]).read_bytes() == synthetic_png()
    assert await counts(case) == (1, 1) and len(case.calls) == 1
    assert case.calls[0]['reference']['contenido_version_id'] == str(case.target_id)


@pytest.mark.asyncio
async def test_obsolete_note_version_remains_a_conflict_even_with_valid_score_acceptance(regrading_case):
    case = regrading_case
    identifier = case.grade_ids[0]
    form = await payload(case, identifier, await proposal(case, identifier))
    async with case.sessions() as db:
        grade = await db.get(Calificacion, identifier)
        form["version_esperada"] = (grade.updated_at - timedelta(days=1)).isoformat()
    before = await grade_snapshot(case, identifier)
    response = await case.client.post(path(identifier), data=form)
    assert response.status_code == 409, response.text
    assert await grade_snapshot(case, identifier) == before and await counts(case) == (0, 0)
