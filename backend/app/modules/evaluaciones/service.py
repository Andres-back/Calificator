from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import is_student_enrolled
from app.modules.dba.service import get_dba_personalizado_records_for_evaluation, get_dba_records
from app.modules.evaluaciones.blueprint_service import build_blueprint_payload
from app.modules.evaluaciones.modality_service import (
    normalize_question_modalities,
    validate_mixed_question_modalities,
)
from app.modules.evaluaciones.models import Evaluacion, EvaluacionBlueprint
from app.modules.evaluaciones.schemas import (
    DigitalizarEvaluacionExternaRequest,
    EvaluacionCreate,
    EvaluacionEstructuraValidacion,
    EvaluacionSorpresaCreate,
    EvaluacionUpdate,
)
from app.modules.evaluaciones.state_machine import transition_evaluation_state
from app.modules.materias.service import ensure_can_manage_materia, ensure_can_read_materia
from app.modules.users.models import User
from app.shared.enums import EvaluacionEstado, EvaluacionTipoOrigen, UserRole
from app.shared.utils import utcnow


STRUCTURAL_FIELDS = {
    "dba_ids",
    "dba_personalizado_ids",
    "metas_profesor",
    "criterios",
    "preguntas",
    "respuestas_esperadas",
    "nota_maxima",
    "modalidad",
}

STRUCTURE_LOCKED_MESSAGE = (
    "No se puede modificar la estructura academica de una evaluacion publicada o en proceso."
)


async def _select_evaluation(db: AsyncSession, evaluacion_id: UUID) -> Evaluacion | None:
    return await db.scalar(
        select(Evaluacion)
        .options(selectinload(Evaluacion.blueprint))
        .where(Evaluacion.id == evaluacion_id)
    )


async def get_evaluation_or_404(db: AsyncSession, evaluacion_id: UUID) -> Evaluacion:
    evaluacion = await _select_evaluation(db, evaluacion_id)
    if not evaluacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    return evaluacion


async def ensure_can_read_evaluation(
    db: AsyncSession,
    evaluacion_id: UUID,
    current_user: User,
) -> Evaluacion | dict:
    evaluacion = await get_evaluation_or_404(db, evaluacion_id)
    if current_user.rol == UserRole.ADMIN.value or evaluacion.profesor_id == current_user.id:
        return evaluacion
    if (
        current_user.rol == UserRole.ESTUDIANTE.value
        and evaluacion.estado in {EvaluacionEstado.PUBLICADA.value, EvaluacionEstado.CERRADA.value}
        and await is_student_enrolled(db, evaluacion.materia_id, current_user.id)
    ):
        return _student_safe_evaluation(evaluacion)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def ensure_can_manage_evaluation(
    db: AsyncSession,
    evaluacion_id: UUID,
    current_user: User,
) -> Evaluacion:
    evaluacion = await get_evaluation_or_404(db, evaluacion_id)
    if current_user.rol == UserRole.ADMIN.value or evaluacion.profesor_id == current_user.id:
        return evaluacion
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


def _uuid_values(ids: list[UUID]) -> list[str]:
    return [str(value) for value in ids]


def _student_safe_evaluation(evaluacion: Evaluacion) -> dict:
    return {
        "id": evaluacion.id,
        "materia_id": evaluacion.materia_id,
        "profesor_id": evaluacion.profesor_id,
        "nombre": evaluacion.nombre,
        "descripcion": evaluacion.descripcion,
        "tipo_origen": evaluacion.tipo_origen,
        "modalidad": evaluacion.modalidad,
        "nota_maxima": evaluacion.nota_maxima,
        "estado": evaluacion.estado,
        "fecha_publicacion": evaluacion.fecha_publicacion,
        "politica_intento": evaluacion.politica_intento,
        "intentos_permitidos": evaluacion.intentos_permitidos,
        "tiempo_limite_minutos": evaluacion.tiempo_limite_minutos,
        "dba_ids": evaluacion.dba_ids,
        "dba_personalizado_ids": evaluacion.dba_personalizado_ids,
        "metas_profesor": evaluacion.metas_profesor,
        "criterios": evaluacion.criterios,
        "preguntas": normalize_question_modalities(
            evaluacion.preguntas,
            evaluacion.modalidad,
        ),
        "respuestas_esperadas": [],
        "created_at": evaluacion.created_at,
        "updated_at": evaluacion.updated_at,
        "blueprint": None,
    }


async def _build_or_update_blueprint(
    db: AsyncSession,
    evaluacion: Evaluacion,
    dba_ids: list[UUID],
    dba_personalizado_ids: list[UUID],
    extra: EvaluacionEstructuraValidacion | None = None,
) -> EvaluacionBlueprint:
    blueprint = await db.scalar(
        select(EvaluacionBlueprint).where(EvaluacionBlueprint.evaluacion_id == evaluacion.id)
    )
    dba_records = await get_dba_records(db, dba_ids)
    dba_personalizados = await get_dba_personalizado_records_for_evaluation(
        db,
        dba_personalizado_ids,
        materia_id=evaluacion.materia_id,
        profesor_id=evaluacion.profesor_id,
    )
    payload = build_blueprint_payload(
        evaluacion_id=evaluacion.id,
        tipo_origen=evaluacion.tipo_origen,
        dba_records=[*dba_records, *dba_personalizados],
        metas=evaluacion.metas_profesor,
        criterios=extra.criterios if extra and extra.criterios is not None else evaluacion.criterios,
        preguntas=extra.preguntas if extra and extra.preguntas is not None else evaluacion.preguntas,
        respuestas_esperadas=(
            extra.respuestas_esperadas
            if extra and extra.respuestas_esperadas is not None
            else evaluacion.respuestas_esperadas
        ),
        errores_comunes=(
            extra.errores_comunes
            if extra and extra.errores_comunes is not None
            else blueprint.errores_comunes if blueprint else None
        ),
        contexto_rag=(
            extra.contexto_rag
            if extra and extra.contexto_rag is not None
            else blueprint.contexto_rag if blueprint else None
        ),
        reglas_feedback=(
            extra.reglas_feedback
            if extra and extra.reglas_feedback is not None
            else blueprint.reglas_feedback if blueprint else None
        ),
    )

    if blueprint:
        for field, value in payload.items():
            if field != "evaluacion_id":
                setattr(blueprint, field, value)
    else:
        blueprint = EvaluacionBlueprint(**payload)
        db.add(blueprint)
        evaluacion.blueprint = blueprint
    await db.flush()
    return blueprint


async def create_evaluation(
    db: AsyncSession,
    payload: EvaluacionCreate,
    current_user: User,
) -> Evaluacion:
    materia = await ensure_can_manage_materia(db, payload.materia_id, current_user)
    questions = normalize_question_modalities(payload.preguntas, payload.modalidad)
    evaluacion = Evaluacion(
        materia_id=materia.id,
        profesor_id=materia.profesor_id,
        nombre=payload.nombre,
        descripcion=payload.descripcion,
        tipo_origen=payload.tipo_origen.value,
        modalidad=payload.modalidad.value,
        nota_maxima=payload.nota_maxima,
        estado=EvaluacionEstado.BORRADOR.value,
        politica_intento=payload.politica_intento.value if payload.politica_intento else None,
        intentos_permitidos=payload.intentos_permitidos,
        tiempo_limite_minutos=payload.tiempo_limite_minutos,
        dba_ids=_uuid_values(payload.dba_ids),
        dba_personalizado_ids=_uuid_values(payload.dba_personalizado_ids),
        metas_profesor=payload.metas_profesor,
        criterios=payload.criterios,
        preguntas=questions,
        respuestas_esperadas=payload.respuestas_esperadas,
    )
    db.add(evaluacion)
    await db.flush()
    await _build_or_update_blueprint(db, evaluacion, payload.dba_ids, payload.dba_personalizado_ids)
    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)


async def list_evaluations_for_materia(
    db: AsyncSession,
    materia_id: UUID,
    current_user: User,
) -> list[Evaluacion | dict]:
    await ensure_can_read_materia(db, materia_id, current_user)
    stmt = (
        select(Evaluacion)
        .options(selectinload(Evaluacion.blueprint))
        .where(Evaluacion.materia_id == materia_id)
        .order_by(Evaluacion.created_at.desc())
    )
    if current_user.rol == UserRole.ESTUDIANTE.value:
        stmt = stmt.where(
            Evaluacion.estado.in_([EvaluacionEstado.PUBLICADA.value, EvaluacionEstado.CERRADA.value])
        )
    result = await db.scalars(stmt)
    evaluaciones = list(result)
    if current_user.rol == UserRole.ESTUDIANTE.value:
        return [_student_safe_evaluation(evaluacion) for evaluacion in evaluaciones]
    return evaluaciones


async def update_evaluation(
    db: AsyncSession,
    evaluacion: Evaluacion,
    payload: EvaluacionUpdate,
) -> Evaluacion:
    data = payload.model_dump(exclude_unset=True)
    if "estado" in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El estado de una evaluacion solo puede cambiar mediante endpoints dedicados.",
        )
    if evaluacion.estado != EvaluacionEstado.BORRADOR.value and STRUCTURAL_FIELDS.intersection(data):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=STRUCTURE_LOCKED_MESSAGE,
        )

    rebuild_blueprint = False
    dba_ids = [UUID(value) for value in evaluacion.dba_ids]
    dba_personalizado_ids = [UUID(value) for value in evaluacion.dba_personalizado_ids]

    for field, value in data.items():
        if field == "dba_ids" and value is not None:
            dba_ids = value
            evaluacion.dba_ids = _uuid_values(value)
            rebuild_blueprint = True
        elif field == "dba_personalizado_ids" and value is not None:
            dba_personalizado_ids = value
            evaluacion.dba_personalizado_ids = _uuid_values(value)
            rebuild_blueprint = True
        elif field in {"metas_profesor", "criterios", "preguntas", "respuestas_esperadas"} and value is not None:
            setattr(evaluacion, field, value)
            rebuild_blueprint = True
        elif field == "nota_maxima" and value is not None:
            evaluacion.nota_maxima = Decimal(value)
        elif field == "modalidad" and value is not None:
            evaluacion.modalidad = value.value
        elif field == "politica_intento" and value is not None:
            evaluacion.politica_intento = value.value
        elif field == "intentos_permitidos" and value is not None:
            evaluacion.intentos_permitidos = int(value)
        elif field == "tiempo_limite_minutos" and value is not None:
            evaluacion.tiempo_limite_minutos = int(value)
        elif value is not None or field == "descripcion":
            setattr(evaluacion, field, value)

    if {"preguntas", "modalidad"}.intersection(data):
        evaluacion.preguntas = normalize_question_modalities(
            evaluacion.preguntas,
            evaluacion.modalidad,
        )
        rebuild_blueprint = True

    if rebuild_blueprint:
        await _build_or_update_blueprint(db, evaluacion, dba_ids, dba_personalizado_ids)

    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)


async def rebuild_blueprint(
    db: AsyncSession,
    evaluacion: Evaluacion,
) -> EvaluacionBlueprint:
    dba_ids = [UUID(value) for value in evaluacion.dba_ids]
    dba_personalizado_ids = [UUID(value) for value in evaluacion.dba_personalizado_ids]
    blueprint = await _build_or_update_blueprint(db, evaluacion, dba_ids, dba_personalizado_ids)
    await db.commit()
    await db.refresh(blueprint)
    return blueprint


async def publish_evaluation(db: AsyncSession, evaluacion: Evaluacion) -> Evaluacion:
    if not evaluacion.blueprint:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evaluation must have a blueprint before publication",
        )
    normalized_questions = normalize_question_modalities(
        evaluacion.preguntas,
        evaluacion.modalidad,
    )
    try:
        validate_mixed_question_modalities(
            normalized_questions,
            evaluacion.modalidad,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    if normalized_questions != evaluacion.preguntas:
        evaluacion.preguntas = normalized_questions
        await _build_or_update_blueprint(
            db,
            evaluacion,
            [UUID(value) for value in evaluacion.dba_ids],
            [UUID(value) for value in evaluacion.dba_personalizado_ids],
        )
    transition_evaluation_state(evaluacion, EvaluacionEstado.PUBLICADA)
    evaluacion.fecha_publicacion = utcnow()
    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)


async def close_evaluation(db: AsyncSession, evaluacion: Evaluacion) -> Evaluacion:
    transition_evaluation_state(evaluacion, EvaluacionEstado.CERRADA)
    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)


async def create_surprise_evaluation(
    db: AsyncSession,
    payload: EvaluacionSorpresaCreate,
    current_user: User,
) -> Evaluacion:
    create_payload = EvaluacionCreate(
        materia_id=payload.materia_id,
        nombre=payload.nombre,
        descripcion=payload.descripcion,
        tipo_origen=EvaluacionTipoOrigen.SORPRESA,
        nota_maxima=payload.nota_maxima,
        dba_ids=payload.dba_ids,
        dba_personalizado_ids=payload.dba_personalizado_ids,
        metas_profesor=payload.metas_profesor,
        criterios=payload.criterios,
    )
    return await create_evaluation(db, create_payload, current_user)


async def digitalize_external_evaluation(
    db: AsyncSession,
    payload: DigitalizarEvaluacionExternaRequest,
    current_user: User,
) -> Evaluacion:
    """Crea una evaluacion externa desde estructura ya detectada; no ejecuta Vision Router."""
    structure = payload.estructura_detectada
    create_payload = EvaluacionCreate(
        materia_id=payload.materia_id,
        nombre=payload.nombre,
        descripcion=payload.descripcion,
        tipo_origen=EvaluacionTipoOrigen.EXTERNA_DIGITALIZADA,
        modalidad=payload.modalidad,
        nota_maxima=payload.nota_maxima,
        dba_ids=payload.dba_ids,
        dba_personalizado_ids=payload.dba_personalizado_ids,
        metas_profesor=payload.metas_profesor,
        criterios=payload.criterios or structure.get("criterios", []),
        preguntas=structure.get("preguntas", []),
        respuestas_esperadas=structure.get("respuestas_esperadas", []),
    )
    evaluacion = await create_evaluation(db, create_payload, current_user)
    if structure.get("errores_comunes") or structure.get("reglas_feedback"):
        validation = EvaluacionEstructuraValidacion(
            errores_comunes=structure.get("errores_comunes"),
            reglas_feedback=structure.get("reglas_feedback"),
        )
        evaluacion = await validate_structure(db, evaluacion, validation)
    return evaluacion


async def validate_structure(
    db: AsyncSession,
    evaluacion: Evaluacion,
    payload: EvaluacionEstructuraValidacion,
) -> Evaluacion:
    if evaluacion.estado != EvaluacionEstado.BORRADOR.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=STRUCTURE_LOCKED_MESSAGE,
        )
    if payload.criterios is not None:
        evaluacion.criterios = payload.criterios
    if payload.preguntas is not None:
        payload.preguntas = normalize_question_modalities(
            payload.preguntas,
            evaluacion.modalidad,
        )
        evaluacion.preguntas = payload.preguntas
    if payload.respuestas_esperadas is not None:
        evaluacion.respuestas_esperadas = payload.respuestas_esperadas

    dba_ids = [UUID(value) for value in evaluacion.dba_ids]
    dba_personalizado_ids = [UUID(value) for value in evaluacion.dba_personalizado_ids]
    await _build_or_update_blueprint(db, evaluacion, dba_ids, dba_personalizado_ids, payload)
    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)
