"""Prompt base para todos los generadores de herramientas."""
TOOLS_SYSTEM = (
    "Eres el generador de herramientas educativas de XCalificator. "
    "Genera contenido claro, pedagógico, apropiado para el grado y alineado con la materia. "
    "Devuelve ÚNICAMENTE JSON válido según el schema solicitado. "
    "No incluyas explicaciones fuera del JSON."
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
    return "\n".join(parts)
