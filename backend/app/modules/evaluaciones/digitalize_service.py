"""Digitalización segura de evaluaciones desde PDF, DOCX o imagen."""
from __future__ import annotations

import ast
import json
import re
import math
import unicodedata
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import BytesIO
from typing import Any
from uuid import UUID
from zipfile import BadZipFile, ZipFile

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.calificaciones.agents import AgentContext, OpenCodeClient, vision_agent
from app.modules.dba.document_service import extraer_texto_docx, extraer_texto_pdf
from app.services.image_preprocessing import prepare_orientation_variants
from app.services.llm_router import LLMRouter
from app.services.storage_service import validate_mime
from app.services.vision_service import interpret_image

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
- Incluye TODAS las preguntas y conserva su numeración. Si el OCR numeró una lista de ejercicios originalmente sin número, conserva esa numeración secuencial.
- El contenido puede incluir etiquetas [RESPUESTA DEL ESTUDIANTE: ...]. No copies esas respuestas en la clave ni las mezcles con el enunciado: resuelve cada ejercicio de forma independiente.
- Genera exactamente UNA respuesta esperada para CADA pregunta, incluso si el documento
  no trae una clave impresa. Resuelve las operaciones y, para preguntas abiertas, redacta
  una solucion especifica, breve y verificable. Nunca uses marcadores como "pendiente de
  validacion", "respuesta argumentada" o "el docente debe definirla".
- En opcion multiple devuelve EXACTAMENTE una de las opciones existentes, incluyendo letra
  y texto (por ejemplo, "B) 36"). En verdadero/falso devuelve "Verdadero" o "Falso".
- Razona la solucion; no copies todas las opciones ni inventes una respuesta fuera de ellas.
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
Resuelve cada pregunta de nuevo e ignora cualquier texto etiquetado como RESPUESTA DEL ESTUDIANTE. Para opcion multiple devuelve exactamente una opcion existente con letra y texto; para abiertas redacta una respuesta especifica y verificable. No uses marcadores ni pidas al docente definir la respuesta.

Preguntas:
{preguntas}

Contenido original:
{contenido}
"""

DIGITALIZATION_VISION_PROMPT = """Eres un extractor OCR de evaluaciones escolares.
La imagen contiene una hoja de preguntas que el docente quiere digitalizar. Puede estar
vacía o ya resuelta por un estudiante.

Transcribe todo el contenido educativo visible:
- título e instrucciones;
- cada pregunta con su número;
- todas las opciones de respuesta;
- expresiones matemáticas preservando +, -, ×, ÷, =, paréntesis y decimales;
- antes de leer, identifica la orientación y gira mentalmente la hoja 0°, 90°, 180° o 270°;
- separa el enunciado impreso de la respuesta manuscrita del estudiante;
- si hay una lista de ejercicios sin número, numérala secuencialmente sin omitir filas;
- no confundas números decorativos de dibujos para colorear con preguntas.

Devuelve SOLO JSON válido con este formato:
{
  "texto_extraido": "transcripción completa y ordenada",
  "preguntas_detectadas": [1, 2],
  "respuestas_detectadas": [{"pregunta": 1, "respuesta": "respuesta manuscrita visible"}],
  "calidad_imagen": {"borroso": "bajo|medio|alto", "iluminacion": "buena|mala", "recorte": "completo|parcial|cortado"},
  "usable": true,
  "alertas": []
}

Marca usable=true si puedes reconstruir al menos una pregunta, incluso cuando el texto sea
manuscrito, la hoja esté inclinada o existan imperfecciones menores. Usa false únicamente
si no hay contenido educativo recuperable. No inventes texto que no esté visible.
En texto_extraido etiqueta las respuestas realizadas como [RESPUESTA DEL ESTUDIANTE: ...].
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



def _has_meaningful_evaluation_text(text: str) -> bool:
    """Acepta OCR parcial suficiente aunque el proveedor sea conservador con `usable`."""
    normalized = " ".join(text.split())
    alphanumeric = sum(character.isalnum() for character in normalized)
    words = re.findall(r"\w+", normalized, flags=re.UNICODE)
    has_question_signal = bool(
        re.search(r"(?:^|\s)\d+\s*[.)-]", normalized)
        or re.search(
            r"\d\s*[-+x×*/÷=]\s*\d",
            normalized,
            flags=re.IGNORECASE,
        )
        or "?" in normalized
    )
    has_instruction_signal = bool(
        re.search(
            r"\b(?:calcula|calcule|resuelve|responda|responde|explica|selecciona|"
            r"seleccione|escribe|completa|marca|indica)\b",
            normalized,
            flags=re.IGNORECASE,
        )
    )
    return alphanumeric >= 12 and len(words) >= 3 and (
        has_question_signal or has_instruction_signal
    )


def _declared_usable(value: Any, *, default: bool) -> bool:
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"false", "0", "no", "inutilizable", "ilegible"}:
            return False
        if normalized in {"true", "1", "si", "sí", "usable", "legible"}:
            return True
    return default if value is None else bool(value)


def _clean_warnings(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    return [str(value).strip() for value in values if str(value).strip()]


async def _extract_image_text(
    content: bytes,
    mime: str,
    name: str,
) -> tuple[str, list[str]]:
    variants = prepare_orientation_variants(content, mime)
    last_result = None
    client = OpenCodeClient()
    try:
        for variant in variants:
            context = AgentContext(
                evaluacion_nombre=name,
                nota_maxima=5.0,
                blueprint={"nombre": name},
                image_bytes=variant.data,
                image_mime=variant.mime,
            )
            result = await vision_agent(
                context,
                model=settings.OPEN_CODE_DIGITALIZATION_VISION_MODEL,
                client=client,
                prompt_override=DIGITALIZATION_VISION_PROMPT,
                timeout=settings.OPEN_CODE_DIGITALIZATION_VISION_TIMEOUT_SECONDS,
                max_attempts=max(1, int(settings.PHOTO_GRADING_MODEL_MAX_ATTEMPTS)),
            )
            last_result = result
            raw = result.raw_output or {}
            text = str(raw.get("texto_extraido") or "").strip()
            primary_usable = _declared_usable(raw.get("usable"), default=bool(text))
            if text and (primary_usable or _has_meaningful_evaluation_text(text)):
                warnings = _clean_warnings(raw.get("alertas"))
                if variant.rotation_degrees:
                    warnings.append(
                        "Se corrigió automáticamente la orientación de la foto "
                        f"({variant.rotation_degrees:+d}°)."
                    )
                if not primary_usable:
                    warnings.append("El documento es parcialmente legible; revisa el borrador antes de publicarlo.")
                return text, warnings
            if result.error:
                break
    finally:
        await client.close()

    if last_result and last_result.error:
        logger.warning(
            "OpenCode vision failed during evaluation digitalization: %s",
            last_result.error,
        )
    else:
        logger.info("Primary vision did not recover usable evaluation text; trying fallback")



    fallback_warnings: list[str] = []
    for variant in variants:
        fallback = await interpret_image(
            variant.data,
            mime_type=variant.mime,
            context_hint=(
                f"Nombre del archivo: {name}. Rotación aplicada: "
                f"{variant.rotation_degrees:+d} grados."
            ),
            purpose="evaluation_document",
        )
        fallback_text = str(fallback.get("text_or_visual_content") or "").strip()
        quality = fallback.get("image_quality") or {}
        fallback_usable = _declared_usable(
            quality.get("is_usable") if isinstance(quality, dict) else None,
            default=bool(fallback_text),
        )
        fallback_warnings.extend(_clean_warnings(fallback.get("warnings")))
        if fallback_text and (
            fallback_usable or _has_meaningful_evaluation_text(fallback_text)
        ):
            warnings = _clean_warnings(fallback.get("warnings"))
            if variant.rotation_degrees:
                warnings.append(
                    "Se corrigió automáticamente la orientación de la foto "
                    f"({variant.rotation_degrees:+d}°)."
                )
            warnings.append(
                "Se utilizó el proveedor alternativo de visión. Revisa la transcripción "
                "antes de publicar."
            )
            return fallback_text, warnings

    providers_unavailable = bool(last_result and last_result.error) and any(
        "ningún proveedor" in warning.lower() for warning in fallback_warnings
    )
    if providers_unavailable:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Los proveedores de visión no respondieron en este momento. "
                "La foto no fue rechazada por su calidad; intenta nuevamente en unos minutos."
            ),
        )
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=(
            "No se encontró texto educativo suficiente en la imagen, incluso después de "
            "corregir su orientación. Verifica el encuadre y vuelve a intentarlo."
        ),
    )

async def _extract_scanned_pdf(content: bytes, name: str) -> tuple[str, list[str]]:
    context = AgentContext(
        evaluacion_nombre=name,
        nota_maxima=5.0,
        blueprint={"nombre": name},
        image_bytes=content,
        image_mime="application/pdf",
    )
    result = await vision_agent(
        context,
        model=settings.OPEN_CODE_DIGITALIZATION_VISION_MODEL,
        prompt_override=DIGITALIZATION_VISION_PROMPT,
    )
    raw = result.raw_output or {}
    text = str(raw.get("texto_extraido") or "").strip()
    if result.error:
        temporary = bool(raw.get("vision_failure_temporary"))
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
                if temporary else status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "El proveedor visual no respondió; el trabajo puede reintentarse."
                if temporary else "No fue posible extraer el PDF escaneado."
            ),
        )
    if not text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se encontró contenido educativo legible en el PDF.",
        )
    return text, _clean_warnings(raw.get("alertas"))



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
        return await _extract_image_text(content, mime, filename)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Tipo de archivo no soportado: {mime}",
    )
_CIRCLED_QUESTION_NUMBERS = {
    character: index
    for index, character in enumerate("①②③④⑤⑥⑦⑧⑨⑩", start=1)
}
_NUMBERED_QUESTION_RE = re.compile(
    r"^\s*(\d{1,3})\s*(?:[.)-]\s*|\s+)(.+?)\s*$"
)
_OPTION_LINE_RE = re.compile(r"^\s*([A-Ha-h])\s*[).:-]\s*(.+?)\s*$")


def _evaluate_math_node(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and type(node.value) in {int, float}:
        return float(node.value)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        value = _evaluate_math_node(node.operand)
        return value if isinstance(node.op, ast.UAdd) else -value
    if isinstance(node, ast.BinOp):
        left = _evaluate_math_node(node.left)
        right = _evaluate_math_node(node.right)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            if right == 0:
                raise ValueError("División por cero")
            return left / right
        if isinstance(node.op, ast.Pow) and abs(right) <= 10:
            return left**right
    raise ValueError("Expresión matemática no permitida")


def _extract_math_value(text: str) -> float | None:
    for candidate in re.findall(r"\d[\d\s.,()+\-xX×*/÷^]*", text):
        if not any(operator in candidate for operator in "+-xX×*/÷^"):
            continue
        expression = (
            candidate.strip(" .,")
            .replace("×", "*")
            .replace("x", "*")
            .replace("X", "*")
            .replace("÷", "/")
            .replace("^", "**")
            .replace(",", ".")
        )
        try:
            parsed = ast.parse(expression, mode="eval")
            value = _evaluate_math_node(parsed.body)
        except (SyntaxError, ValueError, OverflowError, ZeroDivisionError):
            continue
        if math.isfinite(value):
            return value
    return None


def _format_math_value(value: float) -> str:
    if abs(value - round(value)) < 1e-9:
        return str(int(round(value)))
    return f"{value:.6f}".rstrip("0").rstrip(".")


def _local_reference_answer(question: dict[str, Any]) -> str:
    statement = str(question["enunciado"])
    normalized_statement = statement.lower()
    options = question.get("opciones") or []
    if options:
        evaluated: list[tuple[float, str]] = []
        for option in options:
            value = _extract_math_value(str(option))
            if value is not None:
                evaluated.append((value, str(option)))
        if len(evaluated) == len(options):
            if any(word in normalized_statement for word in ("más grande", "mayor")):
                return max(evaluated, key=lambda item: item[0])[1]
            if any(word in normalized_statement for word in ("más pequeño", "menor")):
                return min(evaluated, key=lambda item: item[0])[1]

    pi_number_words = {
        "un": 1,
        "uno": 1,
        "dos": 2,
        "tres": 3,
        "cuatro": 4,
        "cinco": 5,
        "seis": 6,
        "siete": 7,
        "ocho": 8,
        "nueve": 9,
        "diez": 10,
        "once": 11,
        "doce": 12,
    }
    pi_match = re.search(
        r"primeros?\s+(\d+|un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)"
        r"\s+decimales?\s+de\s+(?:\u03c0|pi)",
        normalized_statement,
    )
    if pi_match:
        decimal_token = pi_match.group(1)
        decimals = int(decimal_token) if decimal_token.isdigit() else pi_number_words[decimal_token]
        decimals = min(max(decimals, 1), 12)
        pi_digits = f"{math.pi:.15f}"
        return pi_digits[: decimals + 2]
    value = _extract_math_value(statement)
    if value is not None:
        return _format_math_value(value)
    return "Respuesta de referencia pendiente de validación docente."


def _build_local_digitalization_structure(
    content: str,
) -> dict[str, Any] | None:
    """Reconstruye localmente hojas numeradas cuando el proveedor está limitado."""
    questions: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    def save_current() -> None:
        nonlocal current
        if not current:
            return
        statement = " ".join(current.pop("_statement_parts", [])).strip()
        if not statement:
            current = None
            return
        options = current.get("opciones") or []
        current["enunciado"] = statement
        current["tipo"] = "opcion_multiple" if options else "abierta"
        current["puntaje"] = None
        if not options:
            current.pop("opciones", None)
        questions.append(current)
        current = None

    for raw_line in content.splitlines():
        line = " ".join(raw_line.split()).strip()
        if not line:
            continue
        number: int | None = None
        statement = ""
        if line[0] in _CIRCLED_QUESTION_NUMBERS:
            number = _CIRCLED_QUESTION_NUMBERS[line[0]]
            statement = line[1:].lstrip(" .)-")
        else:
            numbered = _NUMBERED_QUESTION_RE.match(line)
            if numbered:
                number = int(numbered.group(1))
                statement = numbered.group(2).strip()
        if number is not None:
            save_current()
            current = {
                "numero": number,
                "_statement_parts": [statement],
                "opciones": [],
            }
            continue
        option = _OPTION_LINE_RE.match(line)
        if option and current:
            current["opciones"].append(
                f"{option.group(1).upper()}) {option.group(2).strip()}"
            )
            continue
        if current:
            current["_statement_parts"].append(line)
    save_current()

    if not questions:
        return None
    numbers = [int(question["numero"]) for question in questions]
    if len(numbers) != len(set(numbers)):
        return None
    return {
        "preguntas": questions,
        "respuestas_esperadas": [
            {
                "numero": question["numero"],
                "respuesta": _local_reference_answer(question),
            }
            for question in questions
        ],
        "criterios": [dict(item) for item in DEFAULT_CRITERIA],
        "errores_comunes": [],
        "reglas_feedback": {},
        "puntaje_total_declarado": None,
    }


def _apply_locally_verified_answers(
    structure: dict[str, Any],
    content: str,
) -> dict[str, Any]:
    """Corrige respuestas objetivas que pueden resolverse de forma determinista."""
    local_structure = _build_local_digitalization_structure(content)
    if not local_structure:
        return structure

    verified_answers = {
        int(item["numero"]): str(item["respuesta"])
        for item in local_structure.get("respuestas_esperadas") or []
        if isinstance(item, dict)
        and item.get("numero") is not None
        and item.get("respuesta")
        and not _is_placeholder_answer(item["respuesta"])
    }
    if not verified_answers:
        return structure

    answer_map: dict[int, dict[str, Any]] = {}
    for answer in structure.get("respuestas_esperadas") or []:
        if not isinstance(answer, dict):
            continue
        try:
            answer_map[int(answer.get("numero"))] = dict(answer)
        except (TypeError, ValueError):
            continue
    for number, answer in verified_answers.items():
        answer_map[number] = {"numero": number, "respuesta": answer}

    verified = dict(structure)
    verified["respuestas_esperadas"] = list(answer_map.values())
    logger.info(
        "Clave objetiva verificada localmente para preguntas: %s",
        ", ".join(str(number) for number in sorted(verified_answers)),
    )
    return verified


_GENERIC_ANSWER_MARKERS = (
    "pendiente de validacion",
    "pendiente de definir",
    "por definir",
    "no registrada",
    "no disponible",
    "respuesta argumentada",
    "respuesta de referencia",
    "el docente debe",
    "seleccionar respuesta",
)


def _answer_key(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(character for character in text if not unicodedata.combining(character))
    return " ".join(text.casefold().split())


def _is_placeholder_answer(value: Any) -> bool:
    normalized = _answer_key(value)
    return not normalized or any(marker in normalized for marker in _GENERIC_ANSWER_MARKERS)


def _option_label_and_body(option: str) -> tuple[str | None, str]:
    match = re.match(r"^\s*([A-Ha-h])\s*[).:\-]\s*(.*?)\s*$", option)
    if not match:
        return None, option.strip()
    return match.group(1).upper(), match.group(2).strip()


def _canonical_answer_for_question(question: dict[str, Any], value: Any) -> str | None:
    """Convierte letras o textos parciales en la opcion exacta que consume el editor."""
    if _is_placeholder_answer(value):
        return None
    answer = str(value).strip()
    question_type = str(question.get("tipo") or "abierta").strip().lower()
    options = [str(item).strip() for item in (question.get("opciones") or []) if str(item).strip()]

    if question_type in {"verdadero_falso", "true_false", "vf"}:
        normalized = _answer_key(answer)
        if normalized in {"verdadero", "true", "v", "si", "cierto"}:
            return "Verdadero"
        if normalized in {"falso", "false", "f", "no"}:
            return "Falso"
        return None

    if question_type in {"opcion_multiple", "multiple_choice", "seleccion_multiple"} or options:
        if not options:
            return None
        answer_key = _answer_key(answer)
        for option in options:
            label, body = _option_label_and_body(option)
            if answer_key in {_answer_key(option), _answer_key(body)}:
                return option
            if label and answer_key in {label.casefold(), f"opcion {label.casefold()}"}:
                return option
        letter_match = re.search(
            r"(?:^|\b)(?:opci[o\u00f3]n\s+|respuesta\s+(?:correcta\s+)?(?:es\s+)?)?([A-Ha-h])(?:\b|\s*[).:\-])",
            answer,
            flags=re.IGNORECASE,
        )
        if letter_match:
            requested = letter_match.group(1).upper()
            for index, option in enumerate(options):
                label, _body = _option_label_and_body(option)
                if label == requested or (label is None and index == ord(requested) - ord("A")):
                    return option
        return None

    return answer


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

    questions_by_number = {int(question["numero"]): question for question in questions}
    answer_map: dict[int, str] = {}
    for answer in structure.get("respuestas_esperadas") or []:
        if not isinstance(answer, dict):
            continue
        try:
            number = int(answer.get("numero"))
        except (TypeError, ValueError):
            continue
        question = questions_by_number.get(number)
        if not question:
            continue
        value = _canonical_answer_for_question(question, answer.get("respuesta"))
        if value is not None:
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

    questions_by_number: dict[int, dict[str, Any]] = {}
    for index, question in enumerate(questions, start=1):
        if not isinstance(question, dict):
            continue
        try:
            questions_by_number[int(question.get("numero", index))] = question
        except (TypeError, ValueError):
            continue
    present: set[int] = set()
    for answer in structure.get("respuestas_esperadas") or []:
        if not isinstance(answer, dict):
            continue
        try:
            number = int(answer.get("numero"))
        except (TypeError, ValueError):
            continue
        question = questions_by_number.get(number)
        if question and _canonical_answer_for_question(question, answer.get("respuesta")) is not None:
            present.add(number)
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
        local_structure = _build_local_digitalization_structure(contenido_texto)
        if local_structure:
            fallback_warnings = [
                *(initial_warnings or []),
                (
                    "OpenCode no respondió; se utilizó recuperación local. "
                    "Revisa preguntas y respuestas antes de publicar."
                ),
            ]
            normalized = normalize_detected_structure(
                local_structure,
                nota_maxima=nota_maxima,
                initial_warnings=fallback_warnings,
            )
            logger.info(
                "Evaluación recuperada localmente: %d preguntas",
                len(normalized["preguntas"]),
            )
            return normalized
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "OpenCode no pudo analizar el archivo y no fue posible reconstruir "
                "localmente las preguntas. Intenta de nuevo en unos minutos."
            ),
        ) from exc
    if not isinstance(result, dict) or result.get("error"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El proveedor de IA no devolvió una estructura válida.",
        )
    result = _apply_locally_verified_answers(result, contenido_texto)
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