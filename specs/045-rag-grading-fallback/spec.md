# Especificación: RAG no bloqueante en calificación

**Rama**: `codex/045-rag-grading-fallback`
**Fecha**: 2026-09-16
**Estado**: hotfix aprobado por el usuario para implementación y producción.
**Issue**: [#90](https://github.com/Andres-back/Calificator/issues/90)

## Escenarios de usuario y pruebas

### Historia 1: calificar cuando el contexto complementario falla (P1)

Como profesor quiero que la evidencia se siga calificando con las preguntas, respuestas esperadas y rúbrica aunque la búsqueda de fuentes RAG esté temporalmente indisponible.

**Prueba independiente**: simular un error de autenticación del servicio de embeddings; los agentes de valoración reciben contexto vacío, producen una sugerencia y la salida indica que RAG no estuvo disponible.

### Historia 2: diagnóstico sin filtrar información (P1)

Como operador quiero distinguir un fallo complementario de RAG de un fallo real de calificación, sin registrar claves, mensajes del proveedor ni contenido de la evidencia.

## Casos límite

- Credencial de embeddings inválida, timeout o proveedor no disponible.
- Materia sin fuentes RAG: se conserva el comportamiento normal de contexto vacío.
- El error ocurre antes de consultar la base o durante la búsqueda semántica.
- La calificación continúa únicamente porque conserva evaluación y evidencia suficientes; RAG no sustituye esos datos.

## Requisitos funcionales

- **FR-001**: una excepción al obtener contexto RAG no termina el pipeline de calificación.
- **FR-002**: ante el fallo, la valoración continúa con contexto complementario vacío y mantiene evidencia, preguntas, criterios y rúbrica.
- **FR-003**: la salida auditable registra `rag_context` como no disponible y únicamente el tipo sanitizado del error.
- **FR-004**: no se incluyen claves, mensajes del proveedor, prompts ni respuestas del estudiante en el diagnóstico técnico.
- **FR-005**: el cambio no altera la fórmula, persistencia, publicación, permisos, revisión humana ni selección de modelos.
- **FR-006**: una regresión automatizada demuestra que el fallo RAG no genera `pipeline_error` ni una nota artificial.

## Resultados medibles

- **SC-001**: la prueba con excepción RAG produce una nota sugerida del agente simulado y estado `rag_context=unavailable`.
- **SC-002**: la medición autorizada en producción supera la etapa RAG y alcanza extracción/valoración sin persistir una nota.
- **SC-003**: CI completo permanece verde antes del merge.

## Impacto, reproducción, causa y solución

Impacto: el pipeline productivo se detenía en unos segundos aunque OpenCode ya respondía correctamente. Reproducción: ejecutar la calificación geométrica autorizada; la creación del embedding devuelve 401 y el orquestador produce `pipeline_error`. Causa: un servicio complementario estaba dentro del bloque crítico sin degradación. Solución: aislar solo la recuperación de contexto, continuar con contexto vacío y conservar telemetría sanitizada.

## Supuestos y límites

RAG mejora la referencia pedagógica, pero no es requisito para valorar una evaluación que ya contiene preguntas, criterios, soluciones y evidencia. Este hotfix no corrige ni reemplaza la credencial de embeddings; esa configuración sigue siendo administrable aparte. No hay cambios de esquema ni API pública.
