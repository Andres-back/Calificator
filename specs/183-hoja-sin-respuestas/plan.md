# Plan: Una hoja sin respuestas no impide calificar las demás

**Spec**: [spec.md](spec.md) | **Issue**: [#386](https://github.com/Andres-back/Calificator/issues/386)

## Decisión

En `VisionExtractor._managed_one` (`backend/app/services/vision_extractor.py`):

- Al detectar `vision_no_student_answers`, se guarda el resultado leído (`unanswered`) y se deja que el respaldo lo intente, como hasta ahora.
- Al terminar los intentos, si el último error fue `vision_no_student_answers`, se devuelve esa hoja con `requires_review`, sin texto y con el mismo aviso que la ruta no administrada.

El resto ya está preparado:

- `extract` acepta las hojas `requires_review` y marca la extracción para revisión.
- `objective_reading_candidates` marca todas las respuestas `needs_review` si el documento es incierto.
- El análisis de cobertura avisa que falta un bloque de preguntas y pide verificar las hojas.

Descartado:

- **Calificar las preguntas de la hoja como «sin respuesta»**: unas marcas tenues no se distinguen de una hoja en blanco; decide el docente.
- **Restaurar la nota anterior**: en el caso revisado era inventada.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/services/vision_extractor.py` | hoja sin respuestas devuelta para revisión en la ruta administrada |
| `backend/tests/unit/test_vision_route_policy.py` | cuatro pruebas |

## Riesgos

- Una calificación con una hoja en blanco pasa a requerir revisión en vez de fallar. Es el comportamiento que ya tenía la ruta no administrada.
