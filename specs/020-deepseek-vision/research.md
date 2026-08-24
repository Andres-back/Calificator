# Investigación y medición previa

## Recorrido actual

`POST /api/calificaciones/foto` o `POST /api/evaluaciones/{id}/entregas/archivo`
→ consolidación y almacenamiento
→ marcador de cola
→ Celery `tasks.grade_batch`
→ `grade_submission`
→ `orchestrate_grading`
→ `vision_agent`
→ normalización parcial
→ validación objetiva local
→ grader/verificador textual
→ persistencia y desglose
→ workspace frontend.

La digitalización usa `extract_evaluation_text` y su propio prompt, pero reutiliza `vision_agent`.

## Estado anterior

- Modelo principal de calificación visual: `qwen3.7-plus`.
- Fallbacks: `qwen3.6-plus`, `mimo-v2.5` y luego OpenAI/Groq en digitalización.
- Endpoint OpenCode de Qwen: `/messages`; DeepSeek usa `/chat/completions`.
- Cliente visual: `OpenCodeClient`.
- PDF: PyMuPDF renderiza hasta 20 páginas; calificación enviaba las páginas en una sola solicitud.
- Retry: hasta tres intentos generales; configuración de grading podía reducirlo a uno.
- Timeout: conexión/escritura/pool finitos, lectura indefinida.
- Problemas: contrato libre, falta de error por página, lectura infinita, modelos por defecto distintos y credencial DB inválida que precede a una credencial de entorno válida en algunos servicios.

## Protocolo verificado

La documentación oficial de OpenCode Go lista `deepseek-v4-flash-vision-exp` en:
`https://opencode.ai/zen/go/v1/chat/completions`, compatible con contenido `image_url` y autorización Bearer.

## Benchmark directo previo

Fixture sintético 1200×800, JPEG, dos respuestas sin datos personales:

| Prueba | Tiempo | HTTP | JSON válido | Resultado |
|---|---:|---:|---|---|
| 1 | 5837 ms | 200 | sí | correcto |
| 2 | 3942 ms | 200 | sí | correcto |
| 3 | 3930 ms | 200 | sí | correcto |

Promedio: **4570 ms**. Mínimo: **3930 ms**. Máximo: **5837 ms**.

Una credencial cifrada en base de datos devolvió 401; la credencial de entorno usada por el pipeline respondió 200. No se registró ni mostró ninguna clave.

## Decisiones

- DeepSeek Vision será principal tanto para extracción de respuestas como para OCR de evaluación, con prompts por propósito.
- La llamada visual tendrá read timeout finito y no heredará la espera infinita del grader textual.
- Cada página se extraerá independientemente con concurrencia limitada; el merge conserva orden y fallo parcial.
- Qwen/MiMo permanecen como fallback configurable.
- La normalización antigua se conservará como adaptador de compatibilidad durante esta evolución.

## Benchmark posterior del extractor integrado

Se utilizó la misma clase de evidencia sintética (JPEG 1200×800, dos respuestas y sin datos personales) desde el contenedor backend reconstruido.

| Prueba | Tiempo total | HTTP | JSON válido | Modelo | Resultado |
|---|---:|---:|---|---|---|
| 1 | 8414 ms | 200 | sí | `deepseek-v4-flash-vision-exp` | 2 respuestas |
| 2 | 9841 ms | 200 | sí | `deepseek-v4-flash-vision-exp` | 2 respuestas |
| 3 | 12742 ms | 200 | sí | `deepseek-v4-flash-vision-exp` | 2 respuestas |

Promedio: **10332 ms**. Mínimo: **8414 ms**. Máximo: **12742 ms**. No se usó fallback ni se solicitó revisión.

La llamada directa previa era más corta y promedió 4570 ms; el contrato posterior envía blueprint, clave, tipos, reglas contra invención y un esquema por respuesta. No son cargas idénticas. La mejora operativa no consiste en reducir este prompt a costa de fidelidad, sino en eliminar cascadas y rotaciones innecesarias, procesar páginas en paralelo con límite y separar la extracción del grading.

## Medición mediante Calificator

Se ejecutó `grade_submission`, la función que consume el worker, con la misma evidencia sintética y contexto RAG anulado para garantizar que ningún dato local fuese enviado al proveedor. No se modificaron entregas reales.

| Etapa | Duración |
|---|---:|
| recepción HTTP | no aplica en prueba interna |
| almacenamiento inicial | no aplica en prueba interna |
| espera en cola | 0 ms |
| preparación de imagen | 65 ms |
| DeepSeek Vision | 10277 ms |
| parsing | < 1 ms |
| grader primario explicable | 14034 ms |
| verificador | 21774 ms |
| consolidación | 0 ms |
| persistencia | instrumentada en el worker; 0 ms en prueba sin escritura |
| total | **46188 ms** |

Una ejecución anterior del mismo pipeline tomó 31182 ms; por tanto la variación observada está principalmente en los graders textuales, no en el preprocesamiento o parsing visual. No hay muestras suficientes para un P95 representativo.

## Resultado técnico

- Principal: `deepseek-v4-flash-vision-exp` vía `/zen/go/v1/chat/completions`.
- Timeout: conexión, lectura, escritura, pool y total explícitos.
- Retry: máximo uno, solo 429/502/503/504, timeout o transporte.
- Fallback: Qwen/MiMo configurable y registrado.
- PDF: todas las páginas, concurrencia limitada, orden y fallo parcial.
- Estados: éxito/revisión/fallo temporal/fallo permanente propagados al contrato persistido.
- Seguridad: logs sin claves, prompts ni contenido completo de evidencia.
- Regresión: 503 pruebas backend pasaron, 1 omitida; 200 pruebas frontend pasaron; lint, TypeScript y build pasaron.
- Docker: imágenes backend/worker construyeron y ambos servicios quedaron saludables.
