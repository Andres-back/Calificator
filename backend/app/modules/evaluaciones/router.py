from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.evaluaciones import generation_service, service
from app.modules.evaluaciones.digitalize_service import (
    detectar_estructura_evaluacion,
    detect_digitalization_mime,
    extract_evaluation_text,
)
from app.modules.evaluaciones.schemas import (
    DigitalizarEvaluacionExternaRequest,
    EvaluacionBlueprintRead,
    EvaluacionCreate,
    EvaluacionRead,
    EvaluacionEstadoRead,
    EvaluacionEstructuraValidacion,
    EvaluacionGenerarRequest,
    EvaluacionSorpresaCreate,
    EvaluacionUpdate,
)
from app.modules.users.models import User
from app.shared.enums import EvaluacionModalidad

router = APIRouter(tags=["evaluaciones"])


@router.post("/evaluaciones/referencia/extraer")
async def extract_generation_reference(
    materia_id: UUID = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Extrae texto de un PDF o imagen para orientar una generación posterior."""
    from app.modules.materias.service import ensure_can_manage_materia

    await ensure_can_manage_materia(db, materia_id, current_user)
    content = await file.read()
    filename = file.filename or "material-referencia"
    try:
        mime = detect_digitalization_mime(content, filename)
        if mime not in {"application/pdf", "image/jpeg", "image/png", "image/webp"}:
            raise ValueError("Selecciona un PDF o una imagen JPG, PNG o WebP")
        extracted_text, warnings = await extract_evaluation_text(content, mime, filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    clean_text = extracted_text.strip()
    if not clean_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fue posible extraer texto legible del archivo",
        )
    if len(clean_text) > 12000:
        clean_text = clean_text[:12000]
        warnings = [*warnings, "El texto extraído se limitó a 12.000 caracteres."]
    return {
        "texto": clean_text,
        "nombre_archivo": filename,
        "mime": mime,
        "caracteres": len(clean_text),
        "advertencias": warnings,
    }


@router.post(
    "/evaluaciones/externa/digitalizar-con-archivo",
    status_code=status.HTTP_201_CREATED,
)
async def digitalize_from_file(
    materia_id: UUID = Form(...),
    nombre: str = Form(..., min_length=2, max_length=220),
    descripcion: str | None = Form(default=None),
    nota_maxima: Decimal = Form(default=Decimal("5.0"), gt=0),
    modalidad: EvaluacionModalidad = Form(default=EvaluacionModalidad.FISICA),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Crea un borrador revisable desde PDF, DOCX o imagen con clave completa."""
    from app.modules.materias.service import ensure_can_manage_materia

    await ensure_can_manage_materia(db, materia_id, current_user)
    content = await file.read()
    try:
        mime = detect_digitalization_mime(
            content,
            file.filename or "evaluacion",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    extracted_text, extraction_warnings = await extract_evaluation_text(
        content,
        mime,
        file.filename or nombre,
    )
    structure = await detectar_estructura_evaluacion(
        user_id=current_user.id,
        contenido_texto=extracted_text,
        nota_maxima=nota_maxima,
        initial_warnings=extraction_warnings,
    )
    payload = DigitalizarEvaluacionExternaRequest(
        materia_id=materia_id,
        nombre=nombre,
        descripcion=descripcion,
        nota_maxima=nota_maxima,
        modalidad=modalidad,
        criterios=structure.get("criterios", []),
        estructura_detectada=structure,
    )
    evaluation = await service.digitalize_external_evaluation(
        db,
        payload,
        current_user,
    )
    return {
        "evaluacion": {
            "id": str(evaluation.id),
            "nombre": evaluation.nombre,
            "materia_id": str(evaluation.materia_id),
            "estado": evaluation.estado,
            "tipo_origen": evaluation.tipo_origen,
            "modalidad": evaluation.modalidad,
            "nota_maxima": float(evaluation.nota_maxima),
            "preguntas_count": len(structure["preguntas"]),
            "respuestas_count": len(structure["respuestas_esperadas"]),
            "clave_completa": structure["clave_completa"],
        },
        "estructura_detectada": structure,
    }

@router.post(
    "/evaluaciones/generar-borrador",
    response_model=EvaluacionRead,
    status_code=status.HTTP_201_CREATED,
)
async def generate_evaluation_draft(
    payload: EvaluacionGenerarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await generation_service.generate_evaluation_draft(db, payload, current_user)


@router.post("/evaluaciones/externa/digitalizar", response_model=EvaluacionRead, status_code=status.HTTP_201_CREATED)
async def digitalize_external_evaluation(
    payload: DigitalizarEvaluacionExternaRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.digitalize_external_evaluation(db, payload, current_user)


@router.post("/evaluaciones/sorpresa", response_model=EvaluacionRead, status_code=status.HTTP_201_CREATED)
async def create_surprise_evaluation(
    payload: EvaluacionSorpresaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.create_surprise_evaluation(db, payload, current_user)


@router.post("/evaluaciones", response_model=EvaluacionRead, status_code=status.HTTP_201_CREATED)
async def create_evaluation(
    payload: EvaluacionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.create_evaluation(db, payload, current_user)


@router.get("/materias/{materia_id}/evaluaciones", response_model=list[EvaluacionRead])
async def list_evaluations_for_materia(
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[object]:
    return await service.list_evaluations_for_materia(db, materia_id, current_user)


@router.get("/evaluaciones/{evaluacion_id}", response_model=EvaluacionRead)
async def get_evaluation(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.ensure_can_read_evaluation(db, evaluacion_id, current_user)


@router.get("/evaluaciones/{evaluacion_id}/actividad", response_model=dict | None)
async def get_student_activity(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict | None:
    return await service.get_student_activity(db, evaluacion_id, current_user)


@router.patch("/evaluaciones/{evaluacion_id}", response_model=EvaluacionRead)
async def update_evaluation(
    evaluacion_id: UUID,
    payload: EvaluacionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.update_evaluation(db, evaluacion, payload)


@router.post("/evaluaciones/{evaluacion_id}/crear-blueprint", response_model=EvaluacionBlueprintRead)
async def rebuild_blueprint(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.rebuild_blueprint(db, evaluacion)


@router.post("/evaluaciones/{evaluacion_id}/publicar", response_model=EvaluacionRead)
async def publish_evaluation(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.publish_evaluation(db, evaluacion)


@router.post("/evaluaciones/{evaluacion_id}/cerrar", response_model=EvaluacionRead)
async def close_evaluation(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.close_evaluation(db, evaluacion)


@router.post("/evaluaciones/{evaluacion_id}/activar-recepcion", response_model=EvaluacionRead)
async def activate_reception(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.activate_reception(db, evaluacion)


@router.post("/evaluaciones/{evaluacion_id}/pausar-recepcion", response_model=EvaluacionRead)
async def pause_reception(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.pause_reception(db, evaluacion)


@router.delete("/evaluaciones/{evaluacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_evaluation(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    await service.delete_evaluation(db, evaluacion)


@router.patch("/evaluaciones/{evaluacion_id}/validar-estructura", response_model=EvaluacionRead)
async def validate_structure(
    evaluacion_id: UUID,
    payload: EvaluacionEstructuraValidacion,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.validate_structure(db, evaluacion, payload)
