from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.modules.evaluaciones import generation_service, service
from app.modules.evaluaciones.digitalize_service import (
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
from app.modules.jobs import service as jobs_service
from app.modules.users.models import User
from app.services.storage_service import (
    read_upload_limited,
    resolve_private_upload_path,
    save_private_upload,
)
from app.shared.enums import EvaluacionModalidad, JobEstado, JobTipo, UserRole
from app.workers.tasks_digitalization import digitalize_evaluation

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
    content = await read_upload_limited(file, 20 * 1024 * 1024)
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
    status_code=status.HTTP_202_ACCEPTED,
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
    _: None = Depends(
        rate_limit(
            limit=10,
            window_seconds=3600,
            scope="evaluation-digitalization",
        ),
    ),
) -> dict:
    """Valida y encola una digitalización persistente; no bloquea la navegación."""
    from app.modules.materias.service import ensure_can_manage_materia

    await ensure_can_manage_materia(db, materia_id, current_user)
    content = await read_upload_limited(file, 20 * 1024 * 1024)
    filename = file.filename or "evaluacion"
    try:
        mime = detect_digitalization_mime(content, filename)
        file_key = await save_private_upload(
            content,
            mime,
            subfolder="digitalizaciones",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    job_id: UUID | None = None
    try:
        job_id = await jobs_service.create_job(
            db,
            user_id=current_user.id,
            tipo=JobTipo.EVALUACION_DIGITALIZACION.value,
            input_json={
                "materia_id": str(materia_id),
                "nombre": nombre,
                "filename": filename,
            },
        )
        await db.commit()
        digitalize_evaluation.apply_async(kwargs={
            "job_id": str(job_id),
            "user_id": str(current_user.id),
            "materia_id": str(materia_id),
            "file_key": file_key,
            "filename": filename,
            "nombre": nombre,
            "descripcion": descripcion,
            "nota_maxima": str(nota_maxima),
            "modalidad": modalidad.value,
        })
    except Exception as exc:
        await db.rollback()
        if job_id is not None:
            await jobs_service.finish_job(
                db,
                job_id,
                estado=JobEstado.FAILED.value,
                resultado_json={
                    "status": JobEstado.FAILED.value,
                    "materia_id": str(materia_id),
                    "nombre": nombre,
                },
                error="No fue posible iniciar la digitalización",
            )
            await db.commit()
        try:
            resolve_private_upload_path(file_key).unlink(missing_ok=True)
        except OSError:
            pass
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "No fue posible iniciar la digitalización. "
                "Intenta nuevamente en unos momentos."
            ),
        ) from exc

    return {
        "job_id": job_id,
        "estado": JobEstado.QUEUED.value,
        "materia_id": materia_id,
        "nombre": nombre,
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


@router.get("/evaluaciones/{evaluacion_id}/pdf")
async def download_evaluation_pdf(
    evaluacion_id: UUID,
    soluciones: bool = False,
    descargar: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Muestra o descarga la evaluación/material asignado sin filtrar soluciones."""
    await service.ensure_can_read_evaluation(db, evaluacion_id, current_user)
    evaluacion = await service.get_evaluation_or_404(db, evaluacion_id)
    if current_user.rol == UserRole.ESTUDIANTE.value and soluciones:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Las soluciones son exclusivas del docente",
        )

    if evaluacion.material_origen_id:
        from app.modules.herramientas import service as materiales_service

        material = await materiales_service.get_material(
            db, evaluacion.material_origen_id, evaluacion.profesor_id
        )
        if material is None:
            raise HTTPException(status_code=404, detail="Material asignado no encontrado")
    else:
        expected_by_number: dict[object, object] = {}
        for index, answer in enumerate(evaluacion.respuestas_esperadas or [], start=1):
            if not isinstance(answer, dict):
                continue
            number = answer.get("numero", index)
            expected_by_number[number] = next(
                (
                    answer.get(key)
                    for key in ("respuesta", "texto", "respuesta_esperada", "valor")
                    if answer.get(key) not in (None, "", [])
                ),
                None,
            )
        questions: list[dict] = []
        for index, question in enumerate(evaluacion.preguntas or [], start=1):
            if not isinstance(question, dict):
                continue
            printable = dict(question)
            number = printable.get("numero", index)
            if soluciones and expected_by_number.get(number) is not None:
                printable["respuesta_correcta"] = expected_by_number[number]
            questions.append(printable)
        material = {
            "tipo": "examen",
            "titulo": evaluacion.nombre,
            "contenido_json": {
                "titulo": evaluacion.nombre,
                "instrucciones": evaluacion.descripcion or "Lee y responde cada punto.",
                "preguntas": questions,
                "total_puntaje": evaluacion.nota_maxima,
            },
            "created_at": evaluacion.created_at,
        }

    from app.modules.herramientas.pdf_render import render_material_pdf

    pdf = render_material_pdf(material, soluciones=soluciones)
    safe_name = "".join(
        char for char in evaluacion.nombre if char.isalnum() or char in {" ", "-", "_"}
    ).strip()[:100] or "evaluacion"
    disposition = "attachment" if descargar else "inline"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'{disposition}; filename="{safe_name}.pdf"',
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )

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
