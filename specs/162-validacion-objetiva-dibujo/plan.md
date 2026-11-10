# Plan: La nota del dibujo no impide reconocer la opción marcada

**Spec**: [spec.md](spec.md) | **Issue**: [#344](https://github.com/Andres-back/Calificator/issues/344)

## Diagnóstico

- `vision_extractor._answer_with_visual_description` une la respuesta y la nota en el campo `respuesta`.
- `orchestrator.build_objective_validation` compara ese campo con la clave. `_choice_matches` deja de ver una selección simple porque el texto trae un salto de línea, y `_truth_value` no reconoce "A) Verdadero".
- En verdadero o falso, una lectura que no se entiende se registraba como `correcta: false`. Ese dato va al prompt de los calificadores, y uno de ellos respondía "no evaluable" por la contradicción.
- `_truth_value` usaba prefijos: "sin…" empezaba por "si" y "no se observa…" por "no".

## Decisión

Un PR pequeño, solo en la comparación.

- `VISUAL_NOTE_PREFIX` en `vision_extractor.py`, usado al escribir la nota y al quitarla, para que no se separen.
- `_read_answer` en `orchestrator.py` devuelve la respuesta sin la nota. `build_objective_validation` compara con ella y omite la pregunta si queda vacía.
- `_truth_value` compara palabras completas, acepta "V", "F" y la opción con letra, y devuelve nada si hay dos marcas.
- En verdadero o falso, la letra sola se resuelve con el orden de las dos opciones de la pregunta.
- `respuesta_detectada` se guarda igual que antes, con la nota.

Descartado:

- **Quitar la nota del campo `respuesta`**: los calificadores la usan para las preguntas con dibujo.
- **Encender el camino nuevo de validación objetiva**: es una decisión aparte, con su propio plan de activación.
- **Corregir aquí las calificaciones guardadas**: toca datos de producción y necesita una decisión explícita.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/services/vision_extractor.py` | constante del prefijo de la nota |
| `backend/app/modules/calificaciones/orchestrator.py` | comparar sin la nota; verdadero o falso por palabras |
| `backend/tests/unit/test_objective_drawing_note.py` | pruebas nuevas |

## Riesgos

- Una opción leída con poca confianza recibe el puntaje completo si coincide con la clave. Ya ocurría antes de que existiera la nota; la calificación sigue pasando por la revisión docente.
- "Sí, es verdadero" y frases parecidas dejan de reconocerse y pasan a los calificadores. Es el lado seguro.
- La repetición sobre datos reales no cubre la letra sola en verdadero o falso, porque el dato guardado no trae las opciones. Lo cubren las pruebas.
