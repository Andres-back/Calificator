# Validación: Spec 179

Entorno: Windows 11 y Python 3.13. Pruebas unitarias sin IA: sustituyen solo la llamada al proveedor de visión (`VisionExtractor._one`) y capturan el texto que se enviaría. Las pruebas de integración con PostgreSQL las ejecuta el CI.

## Pruebas primero: RED

| Prueba (en `backend/`) | Resultado antes de la corrección (`main` @ `549e9ff`) |
| --- | --- |
| `pytest tests/unit/test_digitalization_reading_prompt.py` | ❌ 9 de 10. Pasa solo la guarda del prompt de calificar. El texto enviado al digitalizar no contenía las reglas de digitalización y sí «busca las respuestas del estudiante»; la relectura literal no se enviaba; el bloque de evidencia del estudiante seguía en la transcripción |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| `pytest tests/unit/test_digitalization_reading_prompt.py` | ✅ 10 |
| los 10 archivos de pruebas unitarias de digitalización, lectura y visión (`test_evaluation_digitalization`, `test_reading_completeness`, `test_vision_extractor`, `test_evaluation_visual_import`, `test_document_digitalization`, `test_digitalization_queue`, `test_visual_digitalization_worker`, `test_digitalization_scan`, `test_evaluation_reading` y la nueva) | ✅ 192, 2 omitidas |
| `pytest tests/unit` | 2238 pasan y 13 fallan. Los 13 fallos son de `test_evidence_scan*` y `test_pdf_service` (versiones locales de Pillow y fpdf, y enlaces de Windows) y son los mismos en una copia limpia de `main` |
| `ruff check --select F401,F821,F822,F823,F841` de los archivos tocados | ✅ |
| `python scripts/build_system_inventory.py --check` y `pytest tests/spec_governance` (en la raíz) | ✅ |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (las reglas llegan) | `test_the_digitalization_rules_reach_the_vision_model`, `test_the_scanned_pdf_reading_uses_the_document_rules` |
| FR-002 (hoja completa, en orden, por renglones) | `test_the_document_prompt_asks_for_the_printed_sheet_in_order_one_element_per_line` |
| FR-003 (sin reglas de calificar) | las dos pruebas de FR-001 y `test_a_document_read_without_rules_still_gets_a_document_prompt` |
| FR-004 (relectura literal y nombres de campos) | `test_the_literal_reread_instruction_reaches_the_vision_model`, `test_the_prompts_speak_the_contract_the_extractor_parses`, `test_reread_prompt_asks_for_literal_text` |
| FR-005 (solo lo impreso) | `test_marks_observed_on_an_answered_sheet_are_not_part_of_the_transcription`, `test_a_saved_transcription_drops_the_student_evidence_block`, `test_an_evidence_block_before_another_page_keeps_that_page` |
| FR-006 (calificar no cambia) | `test_the_grading_prompt_does_not_change` y las pruebas existentes del prompt de calificar en `test_vision_extractor.py` |
| FR-007 (pruebas que capturan lo enviado) | la tabla RED |

## Comprobación con un modelo real, pendiente antes de fusionar (SC-003)

No se hizo: la clave de IA del entorno local respondió 401 al listar modelos, y no se hizo ninguna llamada de IA.

Qué hacer, con una clave válida y el modelo de lectura de producción:

1. Costo a informar antes: 4 lecturas de hoja y 3 organizaciones, unas 7 a 8 llamadas con `claude-haiku-5-5`; menos de 0,15 USD de lista. Poner ese tope en el script o en el panel del proveedor.
2. En el entorno local, digitalizar las 3 hojas anonimizadas de `output/digitalizacion-tres-docentes-20261022/anonimo` (una de ellas tiene 2 hojas).
3. Mirar `ai_jobs.resultado_json.normalized_extraction.text` de cada trabajo y comparar con la lectura del 2026-11-07 (`output/digitalizacion-secciones-20261107/resultados.json`):
   - la lectura «La liebre y la tortuga» está completa y no como «(lectura)»;
   - cada pregunta y cada opción están en su renglón;
   - «Comprensión referencial», «Comprensión inferencial» y «Comprensión crítica» están en su renglón, con su indicación debajo;
   - no aparece «EVIDENCIA GRÁFICA DEL ESTUDIANTE»;
   - ninguna hoja queda cortada por el límite de salida (aviso «JSON reparado» o texto que termina a mitad de frase).
4. Comprobar que las preguntas y la clave del borrador no empeoran frente al 2026-11-07: 8, 9 y 10 preguntas en la primera hoja de cada documento.

Si una hoja densa se corta, el ajuste es un límite de salida propio para documentos; no se incluyó aquí porque `VISION_MAX_TOKENS` lo comparte la calificación.

## Observaciones

- No se comprobó en pantalla: no hay cambios de frontend.
- No se leyeron los dos casos reales de producción del 4 y el 6 de noviembre: el sistema de permisos de la sesión denegó la lectura de producción. El diagnóstico usa el código y tres hojas reales anonimizadas que ya estaban en local.
- Las evaluaciones ya digitalizadas no cambian.
- Las pruebas de `test_evaluation_digitalization.py` y `test_evaluation_visual_import.py` siguen sustituyendo `vision_agent`; las nuevas cubren el tramo que esas no ven.
