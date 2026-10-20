"""Muestras exclusivamente sintéticas; ejecutar en contenedor PDF sin red."""
from copy import deepcopy
import base64
import json
from pathlib import Path
import sys
import time

import fitz

from app.modules.herramientas.pdf_render import render_material_pdf

output = Path(sys.argv[1])
output.mkdir(parents=True, exist_ok=True)
image = {"b64_data": base64.b64encode(Path(sys.argv[2]).read_bytes()).decode()}
paragraph = "En el patio de la escuela apareció un triángulo de cartón. Tenía tres lados iguales. El grupo comparó la figura con una ventana cuadrada y encontró diferencias. Después dibujaron otros triángulos y comprobaron que todos conservaban tres lados, aunque cambiaran de tamaño."
questions = [
    {"numero": 8, "enunciado": "¿Cuántos lados tiene el triángulo?", "respuesta_esperada": "Tres lados."},
    {"numero": 8, "enunciado": "Explica una diferencia con el cuadrado.", "respuesta_esperada": "El cuadrado tiene cuatro lados y el triángulo tres."},
    {"enunciado": "¿Qué sucede si cambia el tamaño?", "tipo": "inferencial", "respuesta_esperada": "Conserva tres lados."},
    "Escribe otro ejemplo y una idea de la lectura.",
]
samples = [
    ("cuento-hojas-separadas", {"tipo": "cuento", "contenido_json": {"titulo": "El triángulo del patio", "imagen": image, "parrafos": [paragraph], "preguntas_comprension": questions}}),
    ("lectura-larga-hojas-separadas", {"tipo": "lectura_comprensiva", "contenido_json": {"titulo": "Figuras para observar", "imagen": image, "texto": "\n\n".join([paragraph] * 16) + "\nFIN DE LECTURA", "preguntas": questions}}),
]
for name, value in samples:
    before = deepcopy(value)
    started = time.monotonic()
    pdf = render_material_pdf(value)
    elapsed = time.monotonic() - started
    assert value == before
    doc = fitz.open(stream=pdf, filetype="pdf")
    texts = [page.get_text() for page in doc]
    question_page = next(index for index, text in enumerate(texts) if "¿Cuántos lados tiene el triángulo?" in text)
    narrative_page = max(index for index, text in enumerate(texts) if "conservaban tres lados" in text or "FIN DE LECTURA" in text)
    assert question_page > narrative_page
    assert not any("Tres lados." in text for text in texts)
    assert all(text.strip() for text in texts)
    (output / f"{name}.pdf").write_bytes(pdf)
    for index, page in enumerate(doc):
        page.get_pixmap(dpi=100, alpha=False).save(output / f"{name}-{index + 1}.png")
    print(json.dumps({"sample": name, "pages": len(doc), "questions_start_page": question_page + 1, "last_narrative_page": narrative_page + 1, "seconds": round(elapsed, 3), "input_unchanged": True, "student_copy_without_solutions": True}))
