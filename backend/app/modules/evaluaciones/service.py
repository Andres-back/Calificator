from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, text
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
from app.modules.calificaciones.models import Calificacion, Entrega
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
from app.shared.enums import (
    CalificacionEstado,
    EntregaEstado,
    EvaluacionEstado,
    EvaluacionTipoOrigen,
    MaterialTipo,
    UserRole,
)
from app.shared.utils import utcnow


STUDENT_VISIBLE_EVALUATION_STATES = {
    EvaluacionEstado.PUBLICADA.value,
    EvaluacionEstado.EN_CALIFICACION.value,
    EvaluacionEstado.PENDIENTE_REVISION.value,
    EvaluacionEstado.CERRADA.value,
}

ACTIVE_RECEPTION_STATES = {
    EvaluacionEstado.PUBLICADA.value,
    EvaluacionEstado.EN_CALIFICACION.value,
    EvaluacionEstado.PENDIENTE_REVISION.value,
}

_STUDENT_FORBIDDEN_KEYS = {
    "answer",
    "answers",
    "answerkey",
    "clave",
    "claverespuesta",
    "claverespuestas",
    "correct",
    "correctanswer",
    "correctoption",
    "correcta",
    "escorrecta",
    "expectedanswer",
    "iscorrect",
    "opcioncorrecta",
    "respuesta",
    "respuestacorrecta",
    "respuestaesperada",
    "solucion",
    "soluciones",
    "valorcorrecto",
}


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
        and evaluacion.estado in STUDENT_VISIBLE_EVALUATION_STATES
        and await is_student_enrolled(db, evaluacion.materia_id, current_user.id)
    ):
        progress = await _student_progress_by_evaluation(db, [evaluacion], current_user.id)
        return _student_safe_evaluation(evaluacion, progress.get(evaluacion.id))
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


def _student_key(value: object) -> str:
    return "".join(char for char in str(value).lower() if char.isalnum())


def sanitize_student_payload(value: object) -> object:
    if isinstance(value, dict):
        return {
            key: sanitize_student_payload(item)
            for key, item in value.items()
            if _student_key(key) not in _STUDENT_FORBIDDEN_KEYS
        }
    if isinstance(value, list):
        return [sanitize_student_payload(item) for item in value]
    return value


def _student_safe_evaluation(evaluacion: Evaluacion, progress: dict | None = None) -> dict:
    safe_questions = normalize_question_modalities(
        evaluacion.preguntas,
        evaluacion.modalidad,
    )
    payload = {
        "id": evaluacion.id,
        "materia_id": evaluacion.materia_id,
        "profesor_id": evaluacion.profesor_id,
        "nombre": evaluacion.nombre,
        "descripcion": evaluacion.descripcion,
        "tipo_origen": evaluacion.tipo_origen,
        "modalidad": evaluacion.modalidad,
        "material_origen_id": getattr(evaluacion, "material_origen_id", None),
        "tipo_actividad": getattr(evaluacion, "tipo_actividad", None),
        "recepcion_habilitada": getattr(evaluacion, "recepcion_habilitada", False),
        "nota_maxima": evaluacion.nota_maxima,
        "estado": evaluacion.estado,
        "fecha_publicacion": evaluacion.fecha_publicacion,
        "politica_intento": evaluacion.politica_intento,
        "intentos_permitidos": evaluacion.intentos_permitidos,
        "tiempo_limite_minutos": evaluacion.tiempo_limite_minutos,
        "dba_ids": evaluacion.dba_ids,
        "dba_personalizado_ids": evaluacion.dba_personalizado_ids,
        "metas_profesor": evaluacion.metas_profesor,
        "criterios": sanitize_student_payload(evaluacion.criterios),
        "preguntas": sanitize_student_payload(safe_questions),
        "respuestas_esperadas": [],
        "created_at": evaluacion.created_at,
        "updated_at": evaluacion.updated_at,
        "blueprint": None,
    }
    payload.update(progress or {})
    return payload


async def _student_progress_by_evaluation(
    db: AsyncSession,
    evaluaciones: list[Evaluacion],
    estudiante_id: UUID,
) -> dict[UUID, dict]:
    """Construye el estado de entrega/nota para todas las tarjetas en dos consultas."""
    if not evaluaciones:
        return {}

    evaluation_ids = [evaluacion.id for evaluacion in evaluaciones]
    deliveries = list(
        (
            await db.scalars(
                select(Entrega)
                .where(
                    Entrega.evaluacion_id.in_(evaluation_ids),
                    Entrega.estudiante_id == estudiante_id,
                )
                .order_by(Entrega.created_at.desc())
            )
        )
    )
    grades = list(
        (
            await db.scalars(
                select(Calificacion)
                .where(
                    Calificacion.evaluacion_id.in_(evaluation_ids),
                    Calificacion.estudiante_id == estudiante_id,
                    Calificacion.revisado_por_docente.is_(True),
                    Calificacion.nota_confirmada.is_not(None),
                    Calificacion.estado.in_(
                        {
                            CalificacionEstado.CONFIRMADA.value,
                            CalificacionEstado.AJUSTADA.value,
                            CalificacionEstado.PUBLICADA.value,
                        }
                    ),
                )
                .order_by(Calificacion.created_at.desc())
            )
        )
    )

    latest_delivery: dict[UUID, Entrega] = {}
    attempt_counts: dict[UUID, int] = {}
    for delivery in deliveries:
        latest_delivery.setdefault(delivery.evaluacion_id, delivery)
        if delivery.estado != EntregaEstado.REQUIERE_REINTENTO.value:
            attempt_counts[delivery.evaluacion_id] = attempt_counts.get(delivery.evaluacion_id, 0) + 1

    latest_grade: dict[UUID, Calificacion] = {}
    for grade in grades:
        latest_grade.setdefault(grade.evaluacion_id, grade)

    progress: dict[UUID, dict] = {}
    for evaluacion in evaluaciones:
        delivery = latest_delivery.get(evaluacion.id)
        grade = latest_grade.get(evaluacion.id)
        delivered = bool(
            delivery
            and delivery.estado != EntregaEstado.REQUIERE_REINTENTO.value
        )
        progress[evaluacion.id] = {
            "mi_entrega_id": delivery.id if delivery else None,
            "mi_entrega_estado": delivery.estado if delivery else None,
            "mi_entrega_tipo": delivery.tipo if delivery else None,
            "mi_entrega_created_at": delivery.created_at if delivery else None,
            "intentos_realizados": attempt_counts.get(evaluacion.id, 0),
            "entrega_realizada": delivered,
            "mi_nota_confirmada": grade.nota_confirmada if grade else None,
            "mi_calificacion_estado": grade.estado if grade else None,
        }
    return progress


def _safe_crossword_content(content: dict) -> dict:
    nested = content.get("crucigrama") if isinstance(content.get("crucigrama"), dict) else {}
    grid = nested.get("grid") or content.get("grid") or []
    horizontal = content.get("preguntas_horizontales") or nested.get("pistas_horizontal") or []
    vertical = content.get("preguntas_verticales") or nested.get("pistas_vertical") or []

    def safe_clues(values: object, direction: str, start: int) -> list[dict]:
        if not isinstance(values, list):
            return []
        clues: list[dict] = []
        for offset, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            clues.append({
                "numero": item.get("numero", offset + 1),
                "numero_evaluacion": start + len(clues),
                "pista": str(item.get("pista") or item.get("definicion") or "").strip(),
                "fila": int(item.get("fila") or 0),
                "columna": int(item.get("columna") or 0),
                "longitud": int(item.get("longitud") or len(str(item.get("respuesta") or item.get("palabra") or ""))),
                "direccion": direction,
            })
        return clues

    safe_horizontal = safe_clues(horizontal, "horizontal", 1)
    safe_vertical = safe_clues(vertical, "vertical", len(safe_horizontal) + 1)
    return {
        "grid_mascara": [
            [bool(str(cell).strip()) for cell in row]
            for row in grid
            if isinstance(row, list)
        ],
        "pistas_horizontales": safe_horizontal,
        "pistas_verticales": safe_vertical,
    }


def _safe_word_search_content(content: dict) -> dict:
    nested = content.get("sopa_letras") if isinstance(content.get("sopa_letras"), dict) else {}
    grid = content.get("grilla") or nested.get("grilla") or []
    words = content.get("banco_palabras") or nested.get("banco_palabras") or []
    return {
        "grilla": grid if isinstance(grid, list) else [],
        "banco_palabras": [str(word) for word in words] if isinstance(words, list) else [],
    }


def _safe_matching_content(content: dict) -> dict:
    left = content.get("columna_izquierda") or []
    right = content.get("columna_derecha") or []
    return {
        "columna_izquierda": [
            {"numero": item.get("numero", index), "texto": str(item.get("texto") or "")}
            for index, item in enumerate(left, start=1)
            if isinstance(item, dict)
        ],
        "columna_derecha": [
            {"letra": str(item.get("letra") or ""), "texto": str(item.get("texto") or "")}
            for item in right
            if isinstance(item, dict)
        ],
    }


def build_student_activity_payload(
    material_type: str,
    title: str,
    content: dict,
    material_id: UUID | None = None,
) -> dict:
    """Expone el material asignado sin incluir claves ni soluciones."""
    if material_type == MaterialTipo.CRUCIGRAMA.value:
        safe_content = _safe_crossword_content(content)
    elif material_type == MaterialTipo.SOPA_LETRAS.value:
        safe_content = _safe_word_search_content(content)
    elif material_type in {MaterialTipo.UNIR_COLUMNAS.value, MaterialTipo.EMPAREJAR.value}:
        safe_content = _safe_matching_content(content)
    else:
        safe_content = sanitize_student_payload(content)
    return {
        "material_id": material_id,
        "tipo": material_type,
        "titulo": title,
        "contenido": safe_content,
        "interactivo": material_type in {
            MaterialTipo.CRUCIGRAMA.value,
            MaterialTipo.SOPA_LETRAS.value,
            MaterialTipo.UNIR_COLUMNAS.value,
            MaterialTipo.EMPAREJAR.value,
        },
    }


async def get_student_activity(
    db: AsyncSession,
    evaluacion_id: UUID,
    current_user: User,
) -> dict | None:
    if current_user.rol != UserRole.ESTUDIANTE.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo disponible para estudiantes")
    evaluacion = await get_evaluation_or_404(db, evaluacion_id)
    if (
        evaluacion.estado not in STUDENT_VISIBLE_EVALUATION_STATES
        or not await is_student_enrolled(db, evaluacion.materia_id, current_user.id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta actividad")
    if not evaluacion.material_origen_id:
        return None
    row = (
        await db.execute(
            text(
                "SELECT tipo, titulo, contenido_json FROM materiales_generados "
                "WHERE id = :material_id AND profesor_id = :profesor_id"
            ),
            {
                "material_id": str(evaluacion.material_origen_id),
                "profesor_id": str(evaluacion.profesor_id),
            },
        )
    ).mappings().first()
    if not row:
        return None
    return build_student_activity_payload(
        str(row["tipo"]),
        str(row["titulo"]),
        row["contenido_json"] if isinstance(row["contenido_json"], dict) else {},
        material_id=evaluacion.material_origen_id,
    )


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
    *,
    material_origen_id: UUID | None = None,
    tipo_actividad: str | None = None,
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
        material_origen_id=material_origen_id,
        tipo_actividad=tipo_actividad,
        recepcion_habilitada=False,
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
            Evaluacion.estado.in_(STUDENT_VISIBLE_EVALUATION_STATES)
        )
    result = await db.scalars(stmt)
    evaluaciones = list(result)
    if current_user.rol == UserRole.ESTUDIANTE.value:
        progress = await _student_progress_by_evaluation(db, evaluaciones, current_user.id)
        return [
            _student_safe_evaluation(evaluacion, progress.get(evaluacion.id))
            for evaluacion in evaluaciones
        ]
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
    structural_update = bool(STRUCTURAL_FIELDS.intersection(data))

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

    # Una evaluación asignada continúa siendo editable por su profesor, pero
    # debe conservar una estructura válida mientras siga visible al estudiante.
    if structural_update and evaluacion.estado != EvaluacionEstado.BORRADOR.value:
        validate_publication_structure(evaluacion)

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


def validate_publication_structure(evaluacion: Evaluacion) -> None:
    questions = evaluacion.preguntas or []
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Agrega al menos una pregunta o evidencia evaluable antes de publicar.",
        )
    if not evaluacion.criterios:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Agrega criterios de calificacion antes de publicar.",
        )
    blueprint = evaluacion.blueprint
    if not blueprint or not blueprint.criterios or not blueprint.preguntas:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La estructura y su blueprint deben contener preguntas y criterios coherentes.",
        )

    numbers: list[object] = []
    total = Decimal("0")
    for index, question in enumerate(questions, start=1):
        if not isinstance(question, dict):
            raise HTTPException(status_code=409, detail=f"El punto {index} no tiene una estructura valida.")
        number = question.get("numero", index)
        if number in numbers:
            raise HTTPException(status_code=409, detail=f"El numero de pregunta {number} esta repetido.")
        numbers.append(number)
        try:
            score = Decimal(str(question.get("puntaje")))
        except (ArithmeticError, TypeError, ValueError):
            score = Decimal("0")
        if score <= 0:
            raise HTTPException(status_code=409, detail=f"El punto {number} debe tener un puntaje positivo.")
        total += score

    if abs(total - Decimal(evaluacion.nota_maxima)) > Decimal("0.01"):
        raise HTTPException(
            status_code=409,
            detail=(
                f"La suma de puntajes ({total}) debe coincidir con la nota maxima "
                f"({evaluacion.nota_maxima})."
            ),
        )

    answer_numbers = {
        item.get("numero")
        for item in (evaluacion.respuestas_esperadas or [])
        if isinstance(item, dict) and item.get("respuesta") not in (None, "", [])
    }
    objective_types = {"opcion_multiple", "verdadero_falso", "completar"}
    missing_answers = [
        question.get("numero", index)
        for index, question in enumerate(questions, start=1)
        if str(question.get("tipo") or "").lower() in objective_types
        and question.get("numero", index) not in answer_numbers
    ]
    if missing_answers:
        raise HTTPException(
            status_code=409,
            detail=f"Falta la respuesta esperada de los puntos objetivos: {missing_answers}.",
        )

    blueprint_numbers = [
        item.get("numero", index)
        for index, item in enumerate(blueprint.preguntas or [], start=1)
        if isinstance(item, dict)
    ]
    if blueprint_numbers != numbers:
        raise HTTPException(
            status_code=409,
            detail="El blueprint no coincide con las preguntas actuales; reconstruyelo antes de publicar.",
        )


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
    validate_publication_structure(evaluacion)
    transition_evaluation_state(evaluacion, EvaluacionEstado.PUBLICADA)
    evaluacion.fecha_publicacion = utcnow()
    evaluacion.recepcion_habilitada = True
    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)


async def activate_reception(db: AsyncSession, evaluacion: Evaluacion) -> Evaluacion:
    if evaluacion.estado == EvaluacionEstado.CERRADA.value:
        transition_evaluation_state(evaluacion, EvaluacionEstado.EN_CALIFICACION)
    elif evaluacion.estado not in ACTIVE_RECEPTION_STATES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Publica la evaluacion antes de abrir entregas.",
        )
    evaluacion.recepcion_habilitada = True
    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)


async def pause_reception(db: AsyncSession, evaluacion: Evaluacion) -> Evaluacion:
    if evaluacion.estado not in ACTIVE_RECEPTION_STATES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo una evaluacion publicada y activa puede pausar la recepcion.",
        )
    evaluacion.recepcion_habilitada = False
    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)


async def close_evaluation(db: AsyncSession, evaluacion: Evaluacion) -> Evaluacion:
    transition_evaluation_state(evaluacion, EvaluacionEstado.CERRADA)
    evaluacion.recepcion_habilitada = False
    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)


async def delete_evaluation(db: AsyncSession, evaluacion: Evaluacion) -> None:
    from app.modules.calificaciones.models import Calificacion, Entrega

    entrega_id = await db.scalar(
        select(Entrega.id).where(Entrega.evaluacion_id == evaluacion.id).limit(1)
    )
    calificacion_id = await db.scalar(
        select(Calificacion.id).where(Calificacion.evaluacion_id == evaluacion.id).limit(1)
    )
    if entrega_id or calificacion_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se puede eliminar una evaluacion con entregas o calificaciones. "
                "Pausa la recepcion o cierrala para conservar la evidencia."
            ),
        )
    await db.delete(evaluacion)
    await db.commit()


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
