"""Digitalización segura de evaluaciones desde PDF, DOCX o imagen."""
from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import BytesIO
from typing import Any
from uuid import UUID
from zipfile import BadZipFile, ZipFile

from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.modules.calificaciones.agents import AgentContext, OpenCodeClient, vision_agent
from app.modules.dba.document_service import extraer_texto_docx, extraer_texto_pdf
from app.services.llm_router import LLMRouter
from app.services.storage_service import validate_mime

logger = get_logger(__name__)

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

MAX_DIGITALIZATION_SIZE_BYTES = 20 * 1024 * 1024
MAX_SCANNED_PDF_PAGES = 5
QUESTION_TYPES = {"abierta", "opcion_multiple", "verdadero_falso", "completar"}
DEFAULT_CRITERIA = [
    {
        "nombre": "Comprensión conceptual",
        "descripcion": "Demuestra comprensión de los conceptos evaluados.",
    },
    {
        "nombre": "Aplicación y procedimiento",
        "descripcion": "Aplica procedimientos adecuados y justifica sus respuestas.",
    },
]

PROMPT_DETECTAR_ESTRUCTURA = """Eres un asistente experto en evaluación escolar colombiana.
Analiza el contenido extraído de una evaluación y reconstruye una estructura que luego
será revisada por el docente y usada para calificar respuestas en papel.

Devuelve SOLO JSON válido con esta estructura exacta:
{{
  "preguntas": [
    {{
      "numero": 1,
      "tipo": "abierta" | "opcion_multiple" | "verdadero_falso" | "completar",
      "enunciado": "texto completo de la pregunta",
      "opciones": ["A) ...", "B) ..."],
      "puntaje": 1.0
    }}
  ],
  "respuestas_esperadas": [
    {{"numero": 1, "respuesta": "respuesta correcta o respuesta de referencia"}}
  ],
  "criterios": [
    {{"nombre": "criterio", "descripcion": "cómo se evalúa"}}
  ],
  "errores_comunes": ["error común"],
  "reglas_feedback": {{"tono": "formativo", "orientar_sin_dar_respuesta": true}},
  "puntaje_total_declarado": 7.0
}}

REGLAS OBLIGATORIAS:
- Incluye TODAS las preguntas y conserva su numeración.
- Genera exactamente UNA respuesta esperada para CADA pregunta, incluso si el documento
  no trae una clave impresa. Resuelve las operaciones y, para preguntas abiertas, redacta
  una respuesta de referencia breve o una rúbrica observable. Nunca dejes la clave incompleta.
- En opción múltiple devuelve la letra y el valor correctos. En verdadero/falso devuelve
  "Verdadero" o "Falso". No copies todas las opciones como respuesta.
- Extrae el puntaje de cada pregunta cuando aparezca. Usa null si realmente no está visible.
- Extrae puntaje_total_declarado solo si el documento lo muestra; en otro caso usa null.
- Las preguntas abiertas no tienen opciones. Verdadero/falso usa ["Verdadero", "Falso"].
- Si no hay criterios explícitos, genera 2 o 3 criterios generales y formativos.
- No inventes preguntas adicionales ni confundas encabezados, nombre, fecha o pie de página
  con preguntas.
- La nota máxima configurada por el docente es {nota_maxima}; los puntajes se escalarán luego.

Contenido extraído:
---
{contenido}
---
"""

REPAIR_KEY_PROMPT = """Completa la clave de respuestas de esta evaluación.
Devuelve SOLO JSON con {{"respuestas_esperadas": [{{"numero": 1, "respuesta": "..."}}]}}.
Debe existir una respuesta correcta o de referencia no vacía para cada número: {numeros}.
Resuelve operaciones y preguntas objetivas; para abiertas redacta una referencia breve.

Preguntas:
{preguntas}

Contenido original:
{contenido}
"""


def detect_digitalization_mime(content: bytes, filename: str) -> str:
    """Detecta PDF/imágenes con magic bytes y DOCX por su estructura ZIP interna."""
    if not content:
        raise ValueError("El archivo está vacío")
    if len(content) > MAX_DIGITALIZATION_SIZE_BYTES:
        raise ValueError("El archivo supera el límite de 20 MB")
    try:
        return validate_mime(content, filename)
    except ValueError as image_error:
        try:
            with ZipFile(BytesIO(content)) as archive:
                names = set(archive.namelist())
                if "[Content_Types].xml" in names and "word/document.xml" in names:
                    return DOCX_MIME
        except (BadZipFile, OSError):
            pass
        raise ValueError(
            "Tipo de archivo no soportado. Usa PDF, DOCX, JPEG, PNG o WebP."
        ) from image_error


async def _extract_image_text(content: bytes, mime: str, name: str) -> str:
    context = AgentContext(
        evaluacion_nombre=name,
        nota_maxima=5.0,
        blueprint={},
        image_bytes=content,
        image_mime=mime,
    )
    client = OpenCodeClient()
    try:
        result = await vision_agent(
            context,
            model="qwen3.6-plus",
            client=client,
        )
    finally:
        await client.close()
    raw = result.raw_output or {}
    text = str(raw.get("texto_extraido") or "").strip()
    if result.error or not raw.get("usable", bool(text)) or not text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se pudo extraer texto de la imagen. Prueba con una foto más clara.",
        )
    return text


async def _extract_scanned_pdf(content: bytes, name: str) -> tuple[str, list[str]]:
    import fitz

    document = fitz.open(stream=content, filetype="pdf")
    try:
        page_count = len(document)
        pages_to_process = min(page_count, MAX_SCANNED_PDF_PAGES)
        parts: list[str] = []
        for index in range(pages_to_process):
            pixmap = document[index].get_pixmap(dpi=180, alpha=False)
            parts.append(
                await _extract_image_text(
                    pixmap.tobytes("png"),
                    "image/png",
                    f"{name} - página {index + 1}",
                )
            )
    finally:
        document.close()
    warnings: list[str] = []
    if page_count > MAX_SCANNED_PDF_PAGES:
        warnings.append(
            f"El PDF escaneado tiene {page_count} páginas; se analizaron las primeras "
            f"{MAX_SCANNED_PDF_PAGES}."
        )
    return "\n\n".join(parts).strip(), warnings


async def extract_evaluation_text(
    content: bytes,
    mime: str,
    filename: str,
) -> tuple[str, list[str]]:
    """Extrae texto y devuelve advertencias no bloqueantes para revisión docente."""
    if mime == "application/pdf":
        text = extraer_texto_pdf(content).strip()
        if text:
            return text, []
        return await _extract_scanned_pdf(content, filename)
    if mime == DOCX_MIME:
        return extraer_texto_docx(content).strip(), []
    if mime.startswith("image/"):
        return await _extract_image_text(content, mime, filename), []
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Tipo de archivo no soportado: {mime}",
    )


def _decimal(value: Any) -> Decimal | None:
    if value in (None, ""):
        return None
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None
    return result if result > 0 else None


def _scaled_scores(
    questions: list[dict[str, Any]],
    nota_maxima: Decimal,
    warnings: list[str],
) -> list[Decimal]:
    source_scores = [_decimal(question.pop("_puntaje_original", None)) for question in questions]
    if all(score is not None for score in source_scores):
        weights = [score for score in source_scores if score is not None]
    else:
        weights = [Decimal("1") for _ in questions]
        if any(score is not None for score in source_scores):
            warnings.append(
                "Algunas preguntas no tenían puntaje legible; se distribuyó la nota máxima de forma uniforme."
            )
    total = sum(weights, Decimal("0"))
    raw = [nota_maxima * weight / total for weight in weights]
    rounded = [value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) for value in raw]
    rounded[-1] += nota_maxima - sum(rounded, Decimal("0"))
    return rounded


def _normalize_question(raw: Any, index: int) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError(f"La pregunta {index} no tiene una estructura válida")
    try:
        number = int(raw.get("numero", index))
    except (TypeError, ValueError) as exc:
        raise ValueError(f"La pregunta {index} no tiene un número válido") from exc
    statement = str(raw.get("enunciado") or raw.get("texto") or "").strip()
    if number <= 0 or not statement:
        raise ValueError(f"La pregunta {number} está incompleta")
    question_type = str(raw.get("tipo") or "abierta").strip().lower()
    aliases = {
        "multiple_choice": "opcion_multiple",
        "seleccion_multiple": "opcion_multiple",
        "true_false": "verdadero_falso",
        "vf": "verdadero_falso",
    }
    question_type = aliases.get(question_type, question_type)
    if question_type not in QUESTION_TYPES:
        question_type = "abierta"
    options = [str(option).strip() for option in (raw.get("opciones") or []) if str(option).strip()]
    if question_type == "verdadero_falso" and not options:
        options = ["Verdadero", "Falso"]
    question: dict[str, Any] = {
        "numero": number,
        "tipo": question_type,
        "enunciado": statement,
        "_puntaje_original": raw.get("puntaje"),
    }
    if question_type in {"opcion_multiple", "verdadero_falso"}:
        question["opciones"] = options
    return question


def normalize_detected_structure(
    structure: dict[str, Any],
    *,
    nota_maxima: Decimal,
    initial_warnings: list[str] | None = None,
) -> dict[str, Any]:
    """Valida, completa pesos y produce el contrato persistible de una evaluación."""
    raw_questions = structure.get("preguntas") if isinstance(structure, dict) else None
    if not isinstance(raw_questions, list) or not raw_questions:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="La IA no pudo detectar preguntas válidas en el archivo.",
        )
    try:
        questions = [
            _normalize_question(raw, index)
            for index, raw in enumerate(raw_questions, start=1)
        ]
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    numbers = [question["numero"] for question in questions]
    if len(numbers) != len(set(numbers)):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="La IA devolvió números de pregunta duplicados.",
        )
    questions.sort(key=lambda item: item["numero"])

    answer_map: dict[int, str] = {}
    for answer in structure.get("respuestas_esperadas") or []:
        if not isinstance(answer, dict):
            continue
        try:
            number = int(answer.get("numero"))
        except (TypeError, ValueError):
            continue
        value = str(answer.get("respuesta") or "").strip()
        if value:
            answer_map[number] = value
    missing = [number for number in numbers if number not in answer_map]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "La IA no construyó una clave completa. Faltan respuestas para las preguntas: "
                + ", ".join(str(number) for number in missing)
            ),
        )

    warnings = list(initial_warnings or [])
    declared_total = _decimal(structure.get("puntaje_total_declarado"))
    visible_scores = [_decimal(question.get("_puntaje_original")) for question in questions]
    if declared_total is not None and all(score is not None for score in visible_scores):
        visible_total = sum((score for score in visible_scores if score is not None), Decimal("0"))
        if abs(visible_total - declared_total) > Decimal("0.01"):
            warnings.append(
                f"La suma de los puntajes por pregunta ({visible_total}) no coincide con el total "
                f"declarado ({declared_total}); se escalaron a {nota_maxima}."
            )
    scores = _scaled_scores(questions, nota_maxima, warnings)
    for question, score in zip(questions, scores, strict=True):
        question["puntaje"] = str(score)

    criteria: list[dict[str, str]] = []
    for criterion in structure.get("criterios") or []:
        if not isinstance(criterion, dict):
            continue
        name = str(criterion.get("nombre") or "").strip()
        description = str(criterion.get("descripcion") or "").strip()
        if name and description:
            criteria.append({"nombre": name, "descripcion": description})
    if not criteria:
        criteria = [dict(item) for item in DEFAULT_CRITERIA]

    rules = dict(structure.get("reglas_feedback") or {})
    rules.update({
        "tono": rules.get("tono") or "formativo",
        "orientar_sin_dar_respuesta": True,
        "requiere_validacion_docente": True,
        "digitalizada_desde_archivo": True,
        "clave_completa": True,
        "advertencias": warnings,
    })
    return {
        "preguntas": questions,
        "respuestas_esperadas": [
            {"numero": number, "respuesta": answer_map[number]}
            for number in numbers
        ],
        "criterios": criteria,
        "errores_comunes": [
            str(item).strip()
            for item in (structure.get("errores_comunes") or [])
            if str(item).strip()
        ],
        "reglas_feedback": rules,
        "puntaje_total_declarado": str(declared_total) if declared_total else None,
        "nota_maxima": str(nota_maxima),
        "clave_completa": True,
        "advertencias": warnings,
    }


async def _repair_missing_answers(
    llm: LLMRouter,
    structure: dict[str, Any],
    content: str,
) -> dict[str, Any]:
    questions = structure.get("preguntas") or []
    numbers: list[int] = []
    for index, question in enumerate(questions, start=1):
        if not isinstance(question, dict):
            continue
        try:
            numbers.append(int(question.get("numero", index)))
        except (TypeError, ValueError):
            continue

    present: set[int] = set()
    for answer in structure.get("respuestas_esperadas") or []:
        if not isinstance(answer, dict) or not answer.get("respuesta"):
            continue
        try:
            present.add(int(answer.get("numero")))
        except (TypeError, ValueError):
            continue
    missing = [number for number in numbers if number not in present]
    if not missing:
        return structure
    repaired = await llm.generate_json(
        "evaluacion_digitalizar",
        REPAIR_KEY_PROMPT.format(
            numeros=", ".join(str(number) for number in missing),
            preguntas=json.dumps(questions, ensure_ascii=False),
            contenido=content[:8000],
        ),
    )
    merged = dict(structure)
    answer_map: dict[int, dict[str, Any]] = {}
    for answer in structure.get("respuestas_esperadas") or []:
        if not isinstance(answer, dict):
            continue
        try:
            answer_map[int(answer.get("numero"))] = answer
        except (TypeError, ValueError):
            continue
    for answer in repaired.get("respuestas_esperadas") or []:
        if not isinstance(answer, dict):
            continue
        try:
            answer_map[int(answer.get("numero"))] = answer
        except (TypeError, ValueError):
            continue
    merged["respuestas_esperadas"] = list(answer_map.values())
    return merged


async def detectar_estructura_evaluacion(
    user_id: UUID,
    contenido_texto: str,
    *,
    nota_maxima: Decimal = Decimal("5.0"),
    initial_warnings: list[str] | None = None,
) -> dict[str, Any]:
    """Detecta preguntas y exige una clave completa antes de crear el borrador."""
    if not contenido_texto.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se pudo extraer contenido del archivo.",
        )
    llm = LLMRouter(user_id=user_id)
    prompt = PROMPT_DETECTAR_ESTRUCTURA.format(
        contenido=contenido_texto[:12000],
        nota_maxima=str(nota_maxima),
    )
    try:
        result = await llm.generate_json("evaluacion_digitalizar", prompt)
    except Exception as exc:
        logger.warning("OpenCode no pudo digitalizar la evaluación: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenCode no pudo analizar el archivo. Intenta de nuevo en unos segundos.",
        ) from exc
    if not isinstance(result, dict) or result.get("error"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El proveedor de IA no devolvió una estructura válida.",
        )
    result = await _repair_missing_answers(llm, result, contenido_texto)
    normalized = normalize_detected_structure(
        result,
        nota_maxima=nota_maxima,
        initial_warnings=initial_warnings,
    )
    logger.info(
        "Evaluación digitalizada: %d preguntas, clave completa=%s, advertencias=%d",
        len(normalized["preguntas"]),
        normalized["clave_completa"],
        len(normalized["advertencias"]),
    )
    return normalized