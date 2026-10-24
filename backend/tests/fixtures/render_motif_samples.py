"""Synthetic visual QA outputs. Run in the existing isolated backend image."""
from copy import deepcopy
import base64
from pathlib import Path
import sys
from types import SimpleNamespace
from uuid import uuid4

from app.modules.evaluaciones.export_service import build_evaluation_material, render_evaluation_docx
from app.modules.evaluaciones.visual_render import ResolvedVisualBlock
from app.modules.evaluaciones.visual_schemas import VisualBlock
from app.modules.herramientas.pdf_render import render_material_pdf
from app.modules.motif_library.service import load_catalog, read_asset


def main() -> None:
    output = Path(sys.argv[1])
    output.mkdir(parents=True, exist_ok=True)
    material = {"tipo": "guia", "titulo": "Guía sintética de lectura", "created_at": "2026-10-24", "contenido_json": {
        "titulo": "Guía sintética de lectura",
        "objetivos": ["Identificar el personaje y explicar sus decisiones con una razón del texto."],
        "introduccion": "Lee con atención y escribe con tus propias palabras. Esta guía solo usa contenido sintético de pruebas.",
        "secciones": [{"titulo": f"Actividad {index}", "explicacion": "Busca una pista en la lectura. Explica qué ocurrió, qué hizo el personaje y por qué tomó esa decisión.", "actividades": ["Escribe una razón apoyada en la lectura.", "Compara tu explicación con la pista que encontraste."]} for index in range(1, 5)],
        "cierre": "Revisa que tu respuesta incluya una razón y una pista del texto.",
    }}
    decorated = deepcopy(material)
    decorated["contenido_json"]["_presentacion"] = {"version": 1, "decoracion": {"motif_id": "naturales-001", "placement": "header"}}
    for name, sample in [("con-motivo", decorated), ("sin-motivo", material)]:
        destination = output / f"spec123-recurso-{name}.pdf"
        destination.write_bytes(render_material_pdf(sample))
        print(destination.name, destination.stat().st_size)

    # Exercise existing story/game exporters without replacing their content.
    samples = [
        ("cuento", {"titulo": "El puente del bosque", "parrafos": ["Lina encontró un puente roto. En lugar de cruzarlo sola, llamó a sus vecinos y juntos lo repararon.", "Al terminar, todos pudieron llevar agua al huerto. Lina comprendió que pedir ayuda también es una forma de cuidar a los demás."], "moraleja": "Cooperar permite resolver dificultades.", "preguntas_comprension": ["¿Por qué Lina pidió ayuda?", "Explica una consecuencia de trabajar juntos."]}),
        ("sopa_letras", {"titulo": "Palabras del bosque", "grilla": [list("RIO"), list("SOL"), list("AVE")], "banco_palabras": ["RIO", "SOL", "AVE"], "instrucciones": "Encuentra las tres palabras y explica una relación entre ellas."}),
    ]
    for kind, content in samples:
        if kind == "cuento":
            illustration = next(item for item in load_catalog().motifs if item.id == "libro")
            original_image = read_asset(load_catalog(), illustration.id, "full", illustration.full.sha256)
            content["imagen"] = {"b64_data": base64.b64encode(original_image.content).decode("ascii")}
        original = deepcopy(content)
        content["_presentacion"] = {"version": 1, "decoracion": {"motif_id": "naturales-001", "placement": "header"}}
        destination = output / f"spec123-recurso-{kind}.pdf"
        destination.write_bytes(render_material_pdf({"tipo": kind, "titulo": content["titulo"], "contenido_json": content}))
        assert {key: value for key, value in content.items() if key != "_presentacion"} == original
        print(destination.name, destination.stat().st_size)

    question_id = uuid4()
    motif = next(item for item in load_catalog().motifs if item.id == "naturales-001")
    image = read_asset(load_catalog(), motif.id, "full", motif.full.sha256)
    visual = ResolvedVisualBlock(VisualBlock(id=uuid4(), tipo="imagen", orden=0,
        pregunta_ids=[question_id], recurso_id=uuid4(), descripcion="Ilustración temática decorativa",
        seguridad_contenido="publicable_confirmado"), image.content)
    evaluation = SimpleNamespace(nombre="Lectura y explicación", descripcion="Lee el relato y responde con una razón.", created_at="2026-10-24", nota_maxima=5,
        blueprint=SimpleNamespace(reglas_feedback={"lectura": "Lina y sus vecinos repararon el puente. Al trabajar juntos, lograron que todas las familias pudieran llegar al huerto."}),
        preguntas=[{"numero": 1, "contenido_id": str(question_id), "enunciado": "¿Qué hicieron Lina y sus vecinos?", "puntaje": 2, "opciones": ["Repararon un puente", "Cerraron el huerto", "Se fueron", "Dejaron de colaborar"]},
            {"numero": 2, "enunciado": "Explica por qué fue importante colaborar.", "puntaje": 3}],
        respuestas_esperadas=[{"numero": 1, "respuesta": "Repararon un puente"}, {"numero": 2, "respuesta": "CLAVE PRIVADA NO PUBLICAR"}])
    material = build_evaluation_material(evaluation, soluciones=False, visual_blocks=[visual])
    for extension, data in [("pdf", render_material_pdf(material)), ("docx", render_evaluation_docx(material, soluciones=False))]:
        destination = output / f"spec123-evaluacion.{extension}"
        destination.write_bytes(data)
        print(destination.name, destination.stat().st_size)


if __name__ == "__main__":
    main()
