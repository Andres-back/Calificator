# Plan: Al digitalizar, las instrucciones de lectura llegan al modelo

**Spec**: [spec.md](spec.md) | **Issue**: [#378](https://github.com/Andres-back/Calificator/issues/378)

## Diagnóstico

Digitalizar una foto tiene dos pasos con IA: **leer** la hoja (visión → texto) y **organizar** ese texto (texto → preguntas, lectura y clave). El formato se pierde sobre todo en el primero.

- `digitalize_service._extract_image_text` y `_extract_scanned_pdf` llaman a `vision_agent(prompt_override=DIGITALIZATION_VISION_PROMPT)`. `vision_agent` solo usa ese parámetro para elegir `purpose="evaluation_document"`; el texto no se pasa a `VisionExtractor`.
- `VisionExtractor._prompt` arma para cualquier propósito el prompt de calificar: «PRIORIDAD CRÍTICA: busca las respuestas del estudiante, no te detengas al reconocer el texto impreso». Para `page_text`, que es lo único que usa la digitalización, no hay ninguna regla.
- Lo mismo ocurre con la relectura literal de la Spec 156 (`LITERAL_READING_PROMPT`) y con `VISUAL_PAGE_PROMPT` de la importación visual: se construyen y no se envían. Además piden campos (`texto_preguntas`, `texto_extraido`) que el lector no interpreta.
- `VisionExtraction.legacy_payload` devuelve `texto_extraido` con el bloque «=== EVIDENCIA GRÁFICA DEL ESTUDIANTE ===» al final. `_strip_student_answer_annotations` no lo retira, así que llega al organizador.
- Las pruebas de digitalización sustituyen `vision_agent` completo y comprueban el `prompt_override` que recibe, no lo que se envía al proveedor.

Evidencia con tres hojas reales anonimizadas, leídas el 2026-11-07 con el flujo actual (`gpt-6-luna`):

| Hoja | Lo que devolvió la lectura |
| --- | --- |
| Lectura con tres secciones de comprensión y un compromiso | «La liebre y la tortuga (lectura)» en vez del cuento; las 9 preguntas y sus opciones en un solo renglón; sin las indicaciones de cada sección («Marca la respuesta correcta.») |
| Lectura con subtítulos e ilustraciones y 8 preguntas | La lectura completa, pero cada pregunta con sus opciones en un solo renglón |
| Dos hojas, 10 preguntas por parte | El encabezado de la parte al final del texto, después de las preguntas; la hoja 2 sin leer |

Las tres llevaban al final el bloque de evidencia del estudiante, y al organizar por secciones ese bloque quedó como texto de apoyo.

No se pudieron leer los dos casos reales de producción del 4 y el 6 de noviembre: el sistema de permisos de la sesión denegó la lectura.

## Decisión

1. `VisionExtractor` tiene un prompt propio para `purpose="evaluation_document"`: encabezado, reglas y el JSON que ya interpreta (`page_text`, `answers`, `warnings`, `page_role`, `document_quality`). Las reglas las entrega quien llama (`document_instructions`); sin ellas usa unas reglas mínimas.
2. `vision_agent` pasa `prompt_override` como `document_instructions` y añade `texto_preguntas` con solo lo impreso (`VisionExtraction.printed_text`).
3. `DIGITALIZATION_VISION_PROMPT` se reescribe como reglas para `page_text`: un elemento por renglón, orden de lectura, secciones con su indicación, lectura palabra por palabra, numeración impresa, tablas por filas y nada escrito por el estudiante. `LITERAL_READING_PROMPT` y `VISUAL_PAGE_PROMPT` pasan a nombrar `page_text`, `answers` y `warnings`.
4. `_strip_student_answer_annotations` retira el bloque de evidencia del estudiante, hasta la siguiente hoja o el final. Cubre las transcripciones guardadas y la organización por secciones.

Descartado:

- **Reenviar el prompt antiguo tal cual**: pide `texto_preguntas` y `texto_extraido`, y el lector tomaría `texto_extraido`, que es el que mezcla las respuestas.
- **Añadir marcadores de figura y de espacio de respuesta**: los consumidores actuales (organizador, recuperación local, detector de lectura incompleta) los tratarían como texto del enunciado. Va en el paso 3, con el armador que los entiende.
- **Activar la organización por secciones**: depende de que la lectura llegue por renglones; se decide después de medir este paso.
- **Subir `VISION_MAX_TOKENS`**: lo comparte la calificación. Se mide primero.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/services/vision_extractor.py` | prompt de documento, `document_instructions`, `printed_text` |
| `backend/app/modules/calificaciones/agents.py` | `vision_agent` entrega las reglas y `texto_preguntas` |
| `backend/app/modules/evaluaciones/digitalize_service.py` | reglas de lectura y retiro del bloque del estudiante |
| `backend/app/modules/evaluaciones/reading_completeness.py`, `visual_import_service.py` | nombres de campos del lector |
| `backend/tests/unit/test_digitalization_reading_prompt.py` | pruebas que capturan el texto enviado |

Sin frontend, sin migraciones y sin cambios de datos. No toca el prompt de calificar.

## Camino completo, por pasos

| Paso | Qué consigue | Modelo | Costo aproximado por evaluación |
| --- | --- | --- | --- |
| 1 (esta spec) | La lectura devuelve la hoja completa, en orden y por renglones; sin marcas del estudiante | el que ya esté configurado para leer (no se pudo comprobar cuál es en producción) | igual que hoy: 1 llamada de visión por hoja |
| 2 | Medir el paso 1 con las 3 hojas anonimizadas y los dos casos reales; ajustar el límite de salida del lector para documentos si corta hojas densas | Haiku | unas 8 llamadas en total, menos de 0,15 USD; no es costo por evaluación |
| 3 | La lectura devuelve bloques ordenados (título, sección, indicación, lectura, pregunta con su etiqueta, tabla, figura con su posición, espacio de respuesta) y el servidor arma `estructura_documento` en ese orden, sin pedir al organizador que reordene líneas | Haiku para leer; Sonnet solo para la clave | unos 0,01 USD por hoja en Haiku; la organización deja de enviar el inventario de líneas, que hoy duplica su tiempo |
| 4 | Vista previa, hoja del estudiante e impresión muestran etiquetas impresas, secciones, indicaciones y el espacio de respuesta de cada pregunta (ya leen `estructura_documento`; falta el espacio de respuesta, que hoy son 2 renglones por defecto) | sin IA | 0 |
| 5 | Figuras: recorte de cada ilustración por la posición que da el modelo, y el docente confirma que no muestra respuestas | Haiku (posiciones) | incluido en la lectura del paso 3 |
| 6 | Encender la organización por secciones en producción, primero para un docente | sin IA nueva | 0 |

Los modelos son una recomendación: Haiku para leer y ubicar, Sonnet solo donde hay que razonar la clave. Los costos son estimaciones a partir de la medición local del 2026-11-07 (unos 0,006 USD de lista por hoja con `claude-haiku-5-5`); una transcripción completa es más larga, por eso se estima 0,01. El costo real se lee de `usage` en el paso 2.

## Riesgos

- **Sin comprobar con un modelo real.** La clave de IA local respondió 401. Las pruebas demuestran qué texto se envía, no cómo responde el modelo. La comprobación del paso 2 debe hacerse antes de fusionar.
- Una transcripción completa y por renglones es más larga. Con `VISION_MAX_TOKENS=3072`, una hoja muy densa y ya resuelta puede cortarse; hoy ese caso termina en un JSON reparado o en una relectura.
- El organizador recibe un texto con otra forma (renglones en vez de prosa). Su prompt no cambia y la recuperación local ya trabaja por renglones, pero la calidad de la clave con un modelo real no se midió.
- Las digitalizaciones ya terminadas no cambian. Para mejorarlas hay que digitalizar de nuevo.
