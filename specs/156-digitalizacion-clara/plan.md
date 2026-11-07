# Plan: Digitalizar desde foto con la lectura completa, una revisión clara y publicar para calificar

**Spec**: [spec.md](spec.md) | **Issue**: [#329](https://github.com/Andres-back/Calificator/issues/329)

## Diagnóstico

- `extract_evaluation_text` → `_extract_image_text` lee cada hoja con el modelo de visión. Su aviso "tardó demasiado" sale de `vision_extractor.py` y se pierde entre las advertencias generales.
- Nada comprueba si la lectura transcrita es un marcador.
- `DigitalizationJobMonitor` envía "Revisar" a la lista de la materia.
- `validate_publication_structure` exige respuesta esperada concreta para todas las preguntas de una evaluación digitalizada, salvo con estrategia `manual`.
- El calificador recibe `respuestas_esperadas` como JSON en su prompt. No existe una forma explícita de respuesta libre.

## Decisión

Cuatro PR pequeños, en este orden:

1. **Lectura completa (Historia 1).** `reading_completeness.py` detecta en cada hoja:
   - marcadores como `(lectura)`, `[texto]` o `...`;
   - resúmenes entre paréntesis;
   - preguntas que citan un texto cuando ninguna hoja tiene un tramo de prosa de 40 palabras o más.

   Si encuentra uno, hace un único reintento de esa hoja con un complemento del prompt que pide el texto literal y deja vacío `texto_extraido`, porque el límite de 3072 tokens con la hoja duplicada empuja al modelo a resumir. Si persiste, queda un aviso con la hoja.
2. **Hojas pendientes (Historia 2).** Las hojas fallidas se guardan con su número en el resultado del trabajo. El borrador muestra "Volver a leer la hoja N", que reutiliza el original guardado y la misma operación de digitalización sobre una sola hoja. El avance pasa a ser por hoja.
3. **Revisar y publicar (Historia 3).** "Revisar" abre el borrador por `evaluacion_id`. El borrador gana una lista de pendientes calculada en el frontend: lectura con aviso, claves pendientes, suma de puntos y hojas pendientes. "Publicar y empezar a calificar" llama al endpoint actual.
4. **Respuesta libre (Historia 4).** Las respuestas esperadas aceptan `respuesta_libre: true`, con el texto fijo "Cualquier respuesta válida". `grading_answer_key_status` lo cuenta como completo solo con esa marca. El prompt del calificador añade una regla para esas preguntas: la respuesta se valora por pertinencia y no se compara con una respuesta modelo. El editor muestra la pregunta con dos opciones.

Descartado:

- Aceptar "cualquier respuesta" como texto libre sin marca: el calificador lo leería como respuesta modelo y no habría control de quién lo decidió.
- Activar la organización por secciones: el experimento mostró 3 de 6 organizaciones fallidas y marcas del estudiante en el documento. Queda para otra spec.
- Subir el tiempo de espera de la visión para todos: haría más lenta cada digitalización. Se reintenta solo la hoja afectada.

## Alcance técnico

| PR | Archivos principales |
| --- | --- |
| 1 | `digitalize_service.py`, un módulo nuevo `reading_completeness.py` y pruebas unitarias |
| 2 | `vision_extractor.py`, `tasks_digitalization.py`, ruta de reintento, `DigitalizationJobMonitor` y editor |
| 3 | `DigitalizationJobMonitor.tsx`, `GenerationWizard.tsx` y E2E a 360 px |
| 4 | `blueprint_service.py`, `agents.py`, `generationWizardModel.ts`, editor y pruebas del calificador con modelo simulado |

Sin migraciones: la marca vive en el JSON de `respuestas_esperadas`. Cada PR se valida con las 3 hojas anonimizadas y un tope de llamadas, informando antes el costo.

## Riesgos

- Detectar marcadores puede dar falsos positivos. Por eso solo se reintenta una vez y la decisión final es un aviso, no un bloqueo.
- El reintento añade tiempo solo a las hojas afectadas.
- La respuesta libre cambia la calificación de esas preguntas. Su prueba usa un modelo simulado, y la validación con un modelo real necesita tu autorización y un tope de costo.
- El PR 2 toca el worker de digitalización: compatibilidad con trabajos en curso durante el despliegue.
