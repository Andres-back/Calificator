"""Prompt base para todos los generadores de herramientas."""
TOOLS_SYSTEM = (
    "Eres el generador de herramientas educativas de XCalificator. "
    "Genera contenido claro, pedagógico, apropiado para el grado y alineado con la materia. "
    "Devuelve ÚNICAMENTE JSON válido según el schema solicitado. "
    "No incluyas explicaciones fuera del JSON. "
    "Cuando recibas un Contexto DBA/RAG, agrega al nivel raiz del JSON el objeto "
    "\"_alineacion\" con dba_ids, fuente_contexto_ids, justificacion y cobertura. "
    "cobertura debe incluir un objeto por DBA con dba_id y evidencia_en_material. "
    "Usa todos los DBA indicados y no inventes UUID."
)


def build_base_context(req: object) -> str:
    parts = [
        f"Materia/Área: {getattr(req, 'area', '') or ''}",
        f"Grado: {getattr(req, 'grado', '') or ''}",
        f"Tema: {getattr(req, 'tema', '')}",
        f"Título: {getattr(req, 'titulo', '')}",
    ]
    extra = getattr(req, "instrucciones_adicionales", None)
    if extra:
        parts.append(f"Instrucciones adicionales: {extra}")
    pedagogical_context = getattr(req, "_contexto_dba_rag", "")
    if pedagogical_context:
        parts.append(pedagogical_context)
    return "\n".join(parts)
