from datetime import timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.permissions import is_student_enrolled
from app.modules.dba.service import get_dba_personalizado_records_for_evaluation, get_dba_records
from app.modules.evaluaciones.blueprint_service import (
    build_blueprint_payload,
    grading_answer_key_status,
    normalize_dba_records,
)
from app.modules.evaluaciones.modality_service import (
    normalize_question_modalities,
    validate_mixed_question_modalities,
)
from app.modules.evaluaciones.models import Evaluacion, EvaluacionBlueprint, EvaluacionContenidoVersion
from app.modules.evaluaciones.reading_service import evaluation_reading, normalize_reading
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.evaluaciones.schemas import (
    DigitalizarEvaluacionExternaRequest,
    EvaluacionCreate,
    EvaluacionEstructuraValidacion,
    EvaluacionSorpresaCreate,
    EvaluacionUpdate,
)
from app.modules.evaluaciones.state_machine import transition_evaluation_state
from app.modules.evaluaciones.visual_service import ContentEdit, get_content_revision, prepare_content_edit, save_content_revision
from app.modules.materias.service import ensure_active_materia, ensure_can_manage_materia, ensure_can_read_materia
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
    "xcalificator",
    "alineacion",
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
    'estructura_documento',
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
    "La estructura de esta evaluación ya está bloqueada. "
    "Edita su contenido desde la evaluación para conservar las entregas y notas existentes."
)

async def _select_evaluation(db: AsyncSession, evaluacion_id: UUID) -> Evaluacion | None:
    return await db.scalar(
        select(Evaluacion)
        .options(selectinload(Evaluacion.blueprint))
        .where(
            Evaluacion.id == evaluacion_id,
            Evaluacion.deleted_at.is_(None),
        )
    )


async def get_evaluation_or_404(db: AsyncSession, evaluacion_id: UUID) -> Evaluacion:
    evaluacion = await _select_evaluation(db, evaluacion_id)
    if not evaluacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    return evaluacion


async def _linked_material_is_visible(db: AsyncSession, evaluacion: Evaluacion) -> bool:
    """Las evaluaciones normales no dependen de Material; las actividades sí."""
    material_origen_id = getattr(evaluacion, 'material_origen_id', None)
    if not material_origen_id:
        return True
    return bool(
        await db.scalar(
            text(
                "SELECT publicado_estudiantes FROM materiales_generados "
                "WHERE id = :material_id AND profesor_id = :profesor_id "
                "AND publicado_estudiantes = true"
            ),
            {
                "material_id": str(material_origen_id),
                "profesor_id": str(evaluacion.profesor_id),
            },
        )
    )

async def ensure_can_read_evaluation(
    db: AsyncSession,
    evaluacion_id: UUID,
    current_user: User,
) -> Evaluacion | dict:
    evaluacion = await get_evaluation_or_404(db, evaluacion_id)
    if current_user.rol == UserRole.ADMIN.value or evaluacion.profesor_id == current_user.id:
        return evaluacion
    if (
        evaluacion.estado in STUDENT_VISIBLE_EVALUATION_STATES
        and await _linked_material_is_visible(db, evaluacion)
        and await is_student_enrolled(db, evaluacion.materia_id, current_user.id)
    ):
        progress = await _student_progress_by_evaluation(db, [evaluacion], current_user.id)
        return _student_safe_evaluation(evaluacion, progress.get(evaluacion.id))
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def ensure_can_manage_evaluation(
    db: AsyncSession,
    evaluacion_id: UUID,
    current_user: User,
    *, admission: bool = False,
) -> Evaluacion:
    evaluacion = await get_evaluation_or_404(db, evaluacion_id)
    if current_user.rol == UserRole.ADMIN.value or evaluacion.profesor_id == current_user.id:
        if admission:
            await ensure_active_materia(db, evaluacion.materia_id)
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
        "lectura": evaluation_reading(evaluacion),
        "tipo_origen": evaluacion.tipo_origen,
        "modalidad": evaluacion.modalidad,
        "material_origen_id": getattr(evaluacion, "material_origen_id", None),
        "tipo_actividad": getattr(evaluacion, "tipo_actividad", None),
        "recepcion_habilitada": getattr(evaluacion, "recepcion_habilitada", False),
        "nota_maxima": evaluacion.nota_maxima,
        "estado": evaluacion.estado,
        "fecha_publicacion": evaluacion.fecha_publicacion,
        "fecha_limite_entrega": getattr(evaluacion, "fecha_limite_entrega", None),
        "politica_intento": evaluacion.politica_intento,
        "intentos_permitidos": evaluacion.intentos_permitidos,
        "tiempo_limite_minutos": evaluacion.tiempo_limite_minutos,
        "dba_ids": evaluacion.dba_ids,
        "dba_personalizado_ids": evaluacion.dba_personalizado_ids,
        "metas_profesor": evaluacion.metas_profesor,
        "criterios": sanitize_student_payload(evaluacion.criterios),
        "preguntas": sanitize_student_payload(safe_questions),
        "respuestas_esperadas": [],
        "contenido_version_id": getattr(evaluacion, 'contenido_version_id', None),
        "created_at": evaluacion.created_at,
        "updated_at": evaluacion.updated_at,
        "blueprint": None,
    }
    payload.update(progress or {})
    document = getattr(evaluacion, 'estructura_documento', None)
    if document is not None:
        from app.modules.evaluaciones.document_schemas import EvaluationDocument
        from app.modules.evaluaciones.document_structure import public_document
        parsed = EvaluationDocument.model_validate(document)
        # Material references are projected after resource authorization by the
        # revision serializer, not by this database-free metadata helper.
        if not any(node.tipo == 'material' for node in parsed.nodos):
            try:
                payload['estructura_documento'] = public_document(parsed, evaluacion.preguntas)
            except ValueError as exc:
                raise HTTPException(409, 'El documento necesita revisión docente antes de consultarlo.') from exc
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
                    Entrega.estado.not_in({EntregaEstado.EN_PROGRESO.value, EntregaEstado.PENDIENTE.value}),
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

    deliveries_by_id = {delivery.id: delivery for delivery in deliveries}
    version_ids = {delivery.contenido_version_id for delivery in deliveries
                   if getattr(delivery, 'contenido_version_id', None)}
    versions = {revision.id: revision.snapshot_json for revision in await db.scalars(
        select(EvaluacionContenidoVersion).where(EvaluacionContenidoVersion.id.in_(version_ids))
    )} if version_ids else {}

    progress: dict[UUID, dict] = {}
    for evaluacion in evaluaciones:
        delivery = latest_delivery.get(evaluacion.id)
        grade = latest_grade.get(evaluacion.id)
        graded_delivery = deliveries_by_id.get(getattr(grade, 'entrega_id', None))
        graded_revision = getattr(graded_delivery, 'contenido_version_id', None)
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
            "mi_nota_maxima": Decimal(str(versions[graded_revision]['nota_maxima'])) if graded_revision in versions else evaluacion.nota_maxima,
            "mi_calificacion_estado": (
                CalificacionEstado.PROCESANDO.value
                if delivery and delivery.estado == EntregaEstado.PROCESANDO.value
                else grade.estado if grade else None
            ),
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
    evaluacion = await get_evaluation_or_404(db, evaluacion_id)
    if (
        evaluacion.estado not in STUDENT_VISIBLE_EVALUATION_STATES
        or not await is_student_enrolled(db, evaluacion.materia_id, current_user.id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta actividad")
    material_origen_id = getattr(evaluacion, 'material_origen_id', None)
    if not material_origen_id:
        return None
    row = (
        await db.execute(
            text(
                "SELECT tipo, titulo, contenido_json FROM materiales_generados "
                "WHERE id = :material_id AND profesor_id = :profesor_id "
                "AND publicado_estudiantes = true"
            ),
            {
                "material_id": str(material_origen_id),
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
    commit: bool = True,
    initial_validation: EvaluacionEstructuraValidacion | None = None,
    visual_import: bool = False,
) -> Evaluacion:
    materia = await ensure_can_manage_materia(db, payload.materia_id, current_user)
    if payload.estructura_documento is not None and not settings.EVALUATION_DOCUMENT_STRUCTURE_ENABLED:
        raise HTTPException(503, 'La organización por secciones todavía no está habilitada. Conserva el documento para continuar después.')
    if payload.contenido_visual is not None:
        enabled = settings.EVALUATION_VISUAL_IMPORT_ENABLED if visual_import else settings.EVALUATION_VISUAL_EDITOR_ENABLED
        if not enabled:
            raise HTTPException(503, "La edición visual todavía no está habilitada. Conserva tu documento para continuar después.")
    questions = normalize_question_modalities(payload.preguntas, payload.modalidad)
    from app.modules.evaluaciones.document_structure import apply_section_scoring
    try:
        questions = apply_section_scoring(None, payload.estructura_documento, questions, questions,
            payload.nota_maxima, payload.nota_maxima, confirmed=payload.confirmar_puntuacion_secciones)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    from app.modules.evaluaciones.print_settings import validate_print_scope
    try:
        validate_print_scope(payload.configuracion_impresion, questions,
            payload.contenido_visual.model_dump(mode='json') if payload.contenido_visual else None)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
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
        fecha_limite_entrega=payload.fecha_limite_entrega,
        dba_ids=_uuid_values(payload.dba_ids),
        dba_personalizado_ids=_uuid_values(payload.dba_personalizado_ids),
        metas_profesor=payload.metas_profesor,
        criterios=payload.criterios,
        preguntas=questions,
        respuestas_esperadas=payload.respuestas_esperadas,
        configuracion_impresion=payload.configuracion_impresion.model_dump(mode='json') if payload.configuracion_impresion else None,
        estructura_documento=payload.estructura_documento.model_dump(mode='json') if payload.estructura_documento else None,
    )
    db.add(evaluacion)
    await db.flush()
    await _build_or_update_blueprint(db, evaluacion, payload.dba_ids, payload.dba_personalizado_ids, initial_validation)
    if payload.contenido_visual is not None or payload.estructura_documento is not None:
        await save_content_revision(db, ContentEdit(evaluation=evaluacion, previous=None, manifest=payload.contenido_visual))
    if commit:
        await db.commit()
        return await get_evaluation_or_404(db, evaluacion.id)
    return evaluacion


async def list_evaluations_for_materia(
    db: AsyncSession,
    materia_id: UUID,
    current_user: User,
) -> list[Evaluacion | dict]:
    materia = await ensure_can_read_materia(db, materia_id, current_user)
    manages_context = (
        current_user.rol == UserRole.ADMIN.value
        or materia.profesor_id == current_user.id
    )
    stmt = (
        select(Evaluacion)
        .options(selectinload(Evaluacion.blueprint))
        .where(
            Evaluacion.materia_id == materia_id,
            Evaluacion.deleted_at.is_(None),
        )
        .order_by(Evaluacion.created_at.desc())
    )
    if not manages_context:
        stmt = stmt.where(
            Evaluacion.estado.in_(STUDENT_VISIBLE_EVALUATION_STATES)
        )
    result = await db.scalars(stmt)
    evaluaciones = list(result)
    if not manages_context:
        visible_evaluations = [
            evaluacion
            for evaluacion in evaluaciones
            if await _linked_material_is_visible(db, evaluacion)
        ]
        progress = await _student_progress_by_evaluation(db, visible_evaluations, current_user.id)
        return [
            _student_safe_evaluation(evaluacion, progress.get(evaluacion.id))
            for evaluacion in visible_evaluations
        ]
    return evaluaciones


async def update_evaluation(
    db: AsyncSession,
    evaluacion: Evaluacion,
    payload: EvaluacionUpdate,
    *, actor_id: UUID | None = None,
) -> Evaluacion:
    data = payload.model_dump(exclude_unset=True)
    confirm_scoring = data.pop('confirmar_puntuacion_secciones', False)
    expected_updated_at = data.pop("expected_updated_at", None)
    expected_content_version_id = data.pop("expected_content_version_id", None)
    reviewed_visual_keys = data.pop('claves_visuales_revisadas', [])
    reviewed_document_keys = data.pop('claves_documentales_revisadas', [])
    document_requested = 'estructura_documento' in data
    if document_requested and payload.estructura_documento is None:
        if getattr(evaluacion, 'estructura_documento', None) is not None:
            raise HTTPException(422, 'No borraremos el documento completo. Edita las secciones o prepara una copia.')
        data.pop('estructura_documento')
        document_requested = False
    if document_requested or reviewed_document_keys:
        if not settings.EVALUATION_DOCUMENT_STRUCTURE_ENABLED:
            raise HTTPException(409, 'La edición por secciones todavía no está habilitada. Tu documento sigue guardado.')
        if document_requested:
            data['estructura_documento'] = payload.estructura_documento.model_dump(mode='json')
    if 'configuracion_impresion' in data:
        data['configuracion_impresion'] = payload.configuracion_impresion.model_dump(mode='json') if payload.configuracion_impresion else None
    if set(data) == {'configuracion_impresion'} and not reviewed_visual_keys and not reviewed_document_keys:
        from app.modules.evaluaciones.print_service import set_print_settings
        await set_print_settings(db, evaluacion.id, payload.configuracion_impresion,
            expected_updated_at=expected_updated_at, expected_version_id=expected_content_version_id,
            actor_id=actor_id or evaluacion.profesor_id)
        await db.commit()
        return await get_evaluation_or_404(db, evaluacion.id)
    if reviewed_visual_keys and not settings.EVALUATION_VISUAL_EDITOR_ENABLED:
        raise HTTPException(409, 'La revisión de material todavía no está habilitada.')
    visual_requested = "contenido_visual" in data
    data.pop("contenido_visual", None)
    if visual_requested and not settings.EVALUATION_VISUAL_EDITOR_ENABLED:
        raise HTTPException(409, "La edición de imágenes todavía no está habilitada. Tu evaluación sigue disponible.")
    if visual_requested and payload.contenido_visual is None:
        raise HTTPException(422, "Indica el contenido que quieres guardar; para quitar un recurso, edita su asociación.")
    # A maximum-only edit uses the dedicated transition that freezes legacy
    # context. Never use this route for text, keys or visual/document changes.
    if not visual_requested and not reviewed_visual_keys and not reviewed_document_keys and not confirm_scoring:
        from app.modules.evaluaciones.score_schemas import ScorePlanUpdate
        from app.modules.evaluaciones.score_service import score_only_plan, save_scoring_definition
        try:
            score_plan = score_only_plan(evaluacion, data)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        if score_plan is not None:
            if expected_updated_at is None:
                raise HTTPException(409, 'Abre la versión actual antes de guardar el reparto. Conservamos tus puntos.')
            return await save_scoring_definition(db, evaluacion.id, ScorePlanUpdate(plan=score_plan,
                expected_updated_at=expected_updated_at, expected_content_version_id=expected_content_version_id),
                actor_id=actor_id or evaluacion.profesor_id)
    content_edit = None
    if visual_requested or document_requested or (getattr(evaluacion, "contenido_version_id", None) is not None and (data or reviewed_visual_keys or reviewed_document_keys)):
        content_edit = await prepare_content_edit(db, evaluacion.id,
            expected_version_id=expected_content_version_id, expected_updated_at=expected_updated_at,
            manifest=payload.contenido_visual, document=payload.estructura_documento if document_requested else None)
        evaluacion = content_edit.evaluation
        expected_updated_at = None  # Already checked while holding the row lock.
    if expected_updated_at is not None or 'lectura' in data:
        # Refresh under a row lock: a read-before-lock comparison loses races.
        locked = await db.scalar(
            select(Evaluacion)
            .where(Evaluacion.id == evaluacion.id, Evaluacion.deleted_at.is_(None))
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if locked is None:
            raise HTTPException(status_code=404, detail="Evaluación no disponible")
        evaluacion = locked
        def utc_naive(value):
            return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value
        if expected_updated_at is not None and utc_naive(evaluacion.updated_at) != utc_naive(expected_updated_at):
            raise HTTPException(status_code=409, detail="La evaluación cambió. Conservamos tu edición; vuelve a abrirla con la versión actual antes de guardar.")
    reading_changed = 'lectura' in data and normalize_reading(data['lectura']) != evaluation_reading(evaluacion)
    if reading_changed and getattr(evaluacion, 'contenido_version_id', None) is None:
        existing_delivery = await db.scalar(select(Entrega.id).where(Entrega.evaluacion_id == evaluacion.id).limit(1))
        if existing_delivery is not None:
            raise HTTPException(409, 'Esta evaluación ya tiene entregas guardadas. Conservamos su lectura original para no cambiar cómo se calificaron. Crea una copia para cambiarla.')
    if "estado" in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El estado de una evaluacion solo puede cambiar mediante endpoints dedicados.",
        )
    structural_update = bool(STRUCTURAL_FIELDS.intersection(data))
    from app.modules.evaluaciones.document_schemas import EvaluationDocument
    from app.modules.evaluaciones.document_structure import apply_section_scoring
    previous_document = EvaluationDocument.model_validate(evaluacion.estructura_documento) if getattr(evaluacion, 'estructura_documento', None) else None
    next_document = payload.estructura_documento if document_requested else previous_document
    if previous_document is not None or next_document is not None:
        if structural_update and not settings.EVALUATION_DOCUMENT_STRUCTURE_ENABLED:
            raise HTTPException(409, 'La edición por secciones está pausada. El documento y los puntajes se conservan.')
        try:
            proposed = data.get('preguntas') or evaluacion.preguntas
            compiled = apply_section_scoring(previous_document, next_document, evaluacion.preguntas, proposed,
                evaluacion.nota_maxima, data.get('nota_maxima') or evaluacion.nota_maxima, confirmed=confirm_scoring)
            if compiled != proposed:
                data['preguntas'] = compiled
                structural_update = True
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
    criteria_only = bool(data) and set(data) <= {"criterios", "dba_ids", "dba_personalizado_ids"}
    retained_custom_ids = {UUID(value) for value in evaluacion.dba_personalizado_ids}

    rebuild_blueprint = False
    dba_ids = [UUID(value) for value in evaluacion.dba_ids]
    dba_personalizado_ids = [UUID(value) for value in evaluacion.dba_personalizado_ids]

    for field, value in data.items():
        if field == 'lectura':
            continue  # Persisted in the blueprint below, never as an unmapped ORM field.
        elif field == "dba_ids" and value is not None:
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
        elif field == "fecha_limite_entrega":
            evaluacion.fecha_limite_entrega = value
        elif value is not None or field == "descripcion":
            setattr(evaluacion, field, value)

    if {"preguntas", "modalidad"}.intersection(data):
        evaluacion.preguntas = normalize_question_modalities(
            evaluacion.preguntas,
            evaluacion.modalidad,
        )
        rebuild_blueprint = True

    if rebuild_blueprint:
        if criteria_only:
            await _update_blueprint_criteria(db, evaluacion, dba_ids, dba_personalizado_ids, retained_custom_ids)
        else:
            await _build_or_update_blueprint(db, evaluacion, dba_ids, dba_personalizado_ids)

    if 'lectura' in data:
        if getattr(evaluacion, 'estructura_documento', None) is not None:
            raise HTTPException(422, 'Edita la lectura dentro de su sección para no guardar dos versiones diferentes del texto.')
        blueprint = evaluacion.blueprint
        if blueprint is None:
            blueprint = await _build_or_update_blueprint(db, evaluacion, dba_ids, dba_personalizado_ids)
        blueprint.reglas_feedback = {**(blueprint.reglas_feedback or {}), 'lectura': normalize_reading(data['lectura'])}
        # A JSON-only edit must still invalidate stale editor timestamps.
        if reading_changed:
            evaluacion.updated_at = utcnow()

    # Una evaluación asignada continúa siendo editable por su profesor, pero
    # debe conservar una estructura válida mientras siga visible al estudiante.
    if structural_update and evaluacion.estado != EvaluacionEstado.BORRADOR.value:
        validate_publication_structure(evaluacion)
        if getattr(evaluacion, 'estructura_documento', None):
            from app.modules.evaluaciones.document_structure import assert_document_ready
            try:
                assert_document_ready(EvaluationDocument.model_validate(evaluacion.estructura_documento))
            except ValueError as exc:
                raise HTTPException(422, 'Confirma la revisión del documento antes de actualizar una evaluación que ya está publicada.') from exc

    if content_edit is not None:
        if 'configuracion_impresion' in data:
            from app.modules.evaluaciones.print_settings import validate_print_scope
            try:
                validate_print_scope(payload.configuracion_impresion, evaluacion.preguntas,
                    content_edit.manifest.model_dump(mode='json') if content_edit.manifest else None)
            except ValueError as exc:
                raise HTTPException(422, str(exc)) from exc
        if reviewed_document_keys:
            from app.modules.evaluaciones.document_schemas import EvaluationDocument
            from app.modules.evaluaciones.document_structure import assert_document_ready
            try:
                assert_document_ready(EvaluationDocument.model_validate(evaluacion.estructura_documento))
            except ValueError as exc:
                raise HTTPException(422, str(exc)) from exc
        await save_content_revision(db, content_edit,
            reviewed_question_ids=set(reviewed_visual_keys) | set(reviewed_document_keys))
    elif 'configuracion_impresion' in data:
        from app.modules.evaluaciones.print_settings import validate_print_scope
        try:
            validate_print_scope(payload.configuracion_impresion, evaluacion.preguntas, None)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)


async def _update_blueprint_criteria(
    db: AsyncSession,
    evaluacion: Evaluacion,
    dba_ids: list[UUID],
    custom_ids: list[UUID],
    retained_ids: set[UUID],
) -> None:
    """Limited update: never normalize existing questions, answer keys or feedback."""
    official = await get_dba_records(db, dba_ids)
    custom = await get_dba_personalizado_records_for_evaluation(
        db, custom_ids, materia_id=evaluacion.materia_id,
        profesor_id=evaluacion.profesor_id, retained_ids=retained_ids,
    )
    blueprint = await db.scalar(select(EvaluacionBlueprint).where(EvaluacionBlueprint.evaluacion_id == evaluacion.id))
    if blueprint is None:
        blueprint = EvaluacionBlueprint(**build_blueprint_payload(
            evaluacion_id=evaluacion.id, tipo_origen=evaluacion.tipo_origen,
            dba_records=[*official, *custom], metas=evaluacion.metas_profesor,
            criterios=evaluacion.criterios, preguntas=evaluacion.preguntas,
            respuestas_esperadas=evaluacion.respuestas_esperadas,
        ))
        db.add(blueprint)
        evaluacion.blueprint = blueprint
    else:
        blueprint.dba = normalize_dba_records([*official, *custom])
        blueprint.criterios = evaluacion.criterios
    await db.flush()


async def rebuild_blueprint(
    db: AsyncSession,
    evaluacion: Evaluacion,
) -> EvaluacionBlueprint:
    if getattr(evaluacion, "contenido_version_id", None) is not None:
        raise HTTPException(409, "Guarda los cambios desde el editor para conservar la versión de las entregas anteriores.")
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

    feedback_rules = blueprint.reglas_feedback or {}
    grading_strategy = str(feedback_rules.get("estrategia_calificacion") or "").lower()
    objective_types = {"opcion_multiple", "verdadero_falso", "completar"}
    requires_full_digitalized_key = (
        getattr(evaluacion, "tipo_origen", None)
        == EvaluacionTipoOrigen.EXTERNA_DIGITALIZADA.value
        and grading_strategy != "manual"
    )
    key_questions = (
        []
        if grading_strategy == "manual"
        else [
            question
            for question in questions
            if requires_full_digitalized_key
            or str(question.get("tipo") or "").lower() in objective_types
        ]
    )
    if key_questions:
        key_complete, missing_answers = grading_answer_key_status(
            {
                "preguntas": key_questions,
                "respuestas_esperadas": evaluacion.respuestas_esperadas or [],
            }
        )
        if not key_complete:
            raise HTTPException(
                status_code=409,
                detail=(
                    "La IA debe completar una respuesta esperada especifica para cada pregunta "
                    f"antes de publicar. Revisa los puntos: {missing_answers}."
                ),
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
    await ensure_active_materia(db, evaluacion.materia_id)
    if getattr(evaluacion, 'estructura_documento', None) is not None:
        from app.modules.evaluaciones.document_schemas import EvaluationDocument
        from app.modules.evaluaciones.document_structure import assert_document_ready
        try:
            assert_document_ready(EvaluationDocument.model_validate(evaluacion.estructura_documento))
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from exc
    if getattr(evaluacion, "contenido_version_id", None) is not None:
        revision = await get_content_revision(db, evaluacion.id, evaluacion.contenido_version_id)
        if revision.snapshot_json.get("claves_pendientes_revision") or revision.coverage_json.get("estado") != "completa":
            raise HTTPException(409, "Revisa el material y las respuestas correctas de las preguntas modificadas antes de publicar.")
        from app.modules.evaluaciones.visual_render import resolve_visual_material
        try:
            await resolve_visual_material(db, evaluacion.id, revision)
        except ValueError as exc:
            raise HTTPException(409, 'No pudimos reunir el material completo. Revisa las figuras antes de publicar.') from exc
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
        if getattr(evaluacion, "contenido_version_id", None) is not None:
            raise HTTPException(409, "Revisa y guarda las preguntas desde el editor antes de publicar esta versión.")
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
    material_origen_id = getattr(evaluacion, 'material_origen_id', None)
    if material_origen_id:
        await db.execute(
            text(
                "UPDATE materiales_generados SET publicado_estudiantes = true, "
                "fecha_publicacion = COALESCE(fecha_publicacion, NOW()), updated_at = NOW() "
                "WHERE id = :material_id AND profesor_id = :profesor_id"
            ),
            {
                "material_id": str(material_origen_id),
                "profesor_id": str(evaluacion.profesor_id),
            },
        )
    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)


async def activate_reception(db: AsyncSession, evaluacion: Evaluacion) -> Evaluacion:
    await ensure_active_materia(db, evaluacion.materia_id)
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
    evaluacion.recepcion_habilitada = False
    evaluacion.deleted_at = utcnow()
    material_origen_id = getattr(evaluacion, 'material_origen_id', None)
    if material_origen_id:
        await db.execute(
            text(
                "UPDATE materiales_generados SET publicado_estudiantes = false, "
                "fecha_publicacion = NULL, updated_at = NOW() "
                "WHERE id = :material_id AND profesor_id = :profesor_id"
            ),
            {
                "material_id": str(material_origen_id),
                "profesor_id": str(evaluacion.profesor_id),
            },
        )
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
    *,
    commit: bool = True,
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
        contenido_visual=structure.get("contenido_visual"),
        estructura_documento=structure.get('estructura_documento'),
    )
    if create_payload.contenido_visual is not None or create_payload.estructura_documento is not None or not commit:
        # Build the complete blueprint before snapshotting, in the caller's transaction.
        return await create_evaluation(db, create_payload, current_user, commit=commit,
            initial_validation=EvaluacionEstructuraValidacion(
                errores_comunes=structure.get("errores_comunes"), reglas_feedback=structure.get("reglas_feedback")),
            visual_import=True)
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
    content_edit = None
    if getattr(evaluacion, "contenido_version_id", None) is not None:
        content_edit = await prepare_content_edit(db, evaluacion.id,
            expected_version_id=payload.expected_content_version_id, expected_updated_at=payload.expected_updated_at)
        evaluacion = content_edit.evaluation
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
    if content_edit is not None:
        await save_content_revision(db, content_edit)
    await db.commit()
    return await get_evaluation_or_404(db, evaluacion.id)
