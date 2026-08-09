import asyncio
from types import SimpleNamespace
from uuid import uuid4

from app.modules.presentaciones import service
from app.modules.presentaciones.schemas import PresentacionCreate


def test_materia_enriquece_el_contexto_de_generacion(monkeypatch) -> None:
    materia_id = uuid4()
    profesor_id = uuid4()
    current_user = SimpleNamespace(id=uuid4())
    materia = SimpleNamespace(
        id=materia_id,
        profesor_id=profesor_id,
        nombre="Naturales",
        area="Ciencias Naturales y Educacion Ambiental",
        grado="5 grados",
        descripcion="Curso enfocado en fenomenos del entorno colombiano.",
    )

    async def ensure_can_manage_materia(*_args):
        return materia

    monkeypatch.setattr(service.materias_service, "ensure_can_manage_materia", ensure_can_manage_materia)
    payload = PresentacionCreate(
        titulo="El ciclo del agua",
        materia_id=materia_id,
        tema="Cambios de estado del agua",

    )

    resolved_profesor, enriched = asyncio.run(service._resolve_presentacion_context(None, payload, current_user))

    assert resolved_profesor == profesor_id
    assert enriched.materia_nombre == materia.nombre
    assert enriched.area == materia.area
    assert enriched.grado == materia.grado
    assert enriched.contexto_materia == materia.descripcion

    customized_payload = payload.model_copy(update={"area": "Biologia", "grado": "6"})
    _, customized = asyncio.run(service._resolve_presentacion_context(None, customized_payload, current_user))
    assert customized.area == "Biologia"
    assert customized.grado == "6"

    assert "Materia: {materia}" in service.SLIDES_PROMPT
    assert "Contexto de la materia: {contexto_materia}" in service.SLIDES_PROMPT