"""
Servicio de extracción de texto desde documentos PDF/Word
y generación de sugerencias DBA via RAG + LLM.
"""
from __future__ import annotations

import tempfile
from pathlib import Path
from uuid import UUID

from app.core.logging import get_logger
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)

TIPO_PDF = "application/pdf"
TIPO_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
MIMES_PERMITIDOS = {TIPO_PDF, TIPO_DOCX}

MAX_CHARS = 50_000  # límite de caracteres por documento


def extraer_texto_pdf(contenido: bytes) -> str:
    """Extrae texto de un PDF usando PyMuPDF."""
    import fitz  # pymupdf

    doc = fitz.open(stream=contenido, filetype="pdf")
    partes: list[str] = []
    for pagina in doc:
        texto = pagina.get_text()
        if texto.strip():
            partes.append(texto)
    doc.close()
    resultado = "\n\n".join(partes)
    logger.info("PDF extraído: %d páginas, %d caracteres", len(partes), len(resultado))
    return resultado[:MAX_CHARS]


def extraer_texto_docx(contenido: bytes) -> str:
    """Extrae texto de un DOCX usando python-docx."""
    import docx

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        tmp.write(contenido)
        tmp_path = tmp.name

    try:
        doc = docx.Document(tmp_path)
        parrafos = [p.text for p in doc.paragraphs if p.text.strip()]
        resultado = "\n\n".join(parrafos)
        logger.info("DOCX extraído: %d párrafos, %d caracteres", len(parrafos), len(resultado))
        return resultado[:MAX_CHARS]
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def extraer_texto(contenido: bytes, mime_type: str) -> str:
    """Extrae texto según el tipo MIME del archivo."""
    if mime_type == TIPO_PDF:
        return extraer_texto_pdf(contenido)
    if mime_type == TIPO_DOCX:
        return extraer_texto_docx(contenido)
    raise ValueError(f"Tipo de archivo no soportado: {mime_type}")


def _chunk_text(texto: str, chunk_size: int = 1500, overlap: int = 200) -> list[str]:
    """Divide texto en chunks con superposición."""
    if len(texto) <= chunk_size:
        return [texto]

    chunks: list[str] = []
    start = 0
    while start < len(texto):
        end = start + chunk_size
        if end >= len(texto):
            chunks.append(texto[start:])
            break
        # Intentar cortar en límite de párrafo
        corte = texto.rfind("\n\n", start, end)
        if corte > start + chunk_size // 2:
            chunks.append(texto[start:corte])
            start = corte
        else:
            # Cortar en límite de oración
            corte = texto.rfind(". ", start, end)
            if corte > start + chunk_size // 2:
                chunks.append(texto[start : corte + 1])
                start = corte + 1
            else:
                chunks.append(texto[start:end])
                start = end - overlap
    return chunks


async def generar_sugerencias_dba(
    user_id: UUID,
    materia_id: UUID,
    area: str,
    grado: str,
    texto_completo: str,
) -> list[dict]:
    """
    Usa el LLM para generar sugerencias de DBA a partir del texto extraído.

    Retorna una lista de dicts con:
      - enunciado: str
      - evidencias_aprendizaje: str | None
      - ejemplo: str | None
    """
    llm = LLMRouter(user_id=user_id)
    prompt = f"""Eres un experto curricular colombiano. A partir del siguiente texto extraído de un documento educativo,
genera hasta 5 Derechos Básicos de Aprendizaje (DBA) para el área "{area}", grado "{grado}".

Cada DBA debe tener:
1. **enunciado**: El derecho de aprendizaje (mínimo 10 caracteres, claro y accionable)
2. **evidencias_aprendizaje**: Indicadores observables de logro (o null si no aplica)
3. **ejemplo**: Una situación concreta que ilustre el DBA (o null si no aplica)

IMPORTANTE: Responde SOLO con un array JSON válido. Cada elemento del array debe tener los campos: enunciado, evidencias_aprendizaje, ejemplo.

Texto del documento:
---
{texto_completo[:8000]}
---
"""
    resultado = await llm.generate_json("dba_sugerencias", prompt)
    sugerencias = resultado if isinstance(resultado, list) else resultado.get("sugerencias", resultado.get("dba", []))

    if not isinstance(sugerencias, list):
        logger.warning("Respuesta inesperada del LLM para DBA: %s", type(sugerencias))
        return []

    # Validar estructura mínima
    validas = []
    for s in sugerencias:
        if isinstance(s, dict) and isinstance(s.get("enunciado"), str) and len(s["enunciado"].strip()) >= 10:
            validas.append({
                "enunciado": s["enunciado"].strip(),
                "evidencias_aprendizaje": (s.get("evidencias_aprendizaje") or "").strip() or None,
                "ejemplo": (s.get("ejemplo") or "").strip() or None,
            })
    return validas[:5]
