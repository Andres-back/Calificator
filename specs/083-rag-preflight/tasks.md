# Tareas: comprobación previa RAG

## Fase 1: Preparación

- [x] T001 Registrar diagnóstico, alcance aprobado y diseño en specs/083-rag-preflight/spec.md y plan.md; issue #172 (FR-004, FR-005).

## Fase 2: Fundamentos

- [x] T002 Añadir y ejecutar regresión antes del cambio en backend/tests/unit/test_rag_embedding_space.py: ausencia, presencia, aislamiento, exclusiones y errores (FR-001, FR-002, FR-003).

## Fase 3: Historia 1

- [x] T003 [US1] Implementar preflight sin embedding innecesario, con filtros compartidos y errores recuperables en backend/app/modules/rag/retrieval_service.py (FR-001, FR-002, FR-004).

## Fase 4: Historia 2

- [x] T004 [US2] Validar compatibilidad vectorial y recuperación existente con regresión en backend/tests/unit/test_rag_embedding_space.py, test_qwen_embedding_provider.py y backend/tests/integration/test_explainable_grading_pipeline.py (FR-003, FR-004).

## Fase final: Validación

- [x] T005 Ejecutar pruebas enfocadas, lint y convergencia, registrar resultados en specs/083-rag-preflight/quickstart.md; preparar PR con CI requerido para #172 (FR-005).

## Dependencias y ejecución

T001 → T002 (rojo) → T003 → T004 (verde) → T005. Cambios pequeños en los mismos archivos, sin implementación paralela. MVP completo: evitar trabajo inexistente conservando material autorizado. CI y despliegue/benchmark demo se verificarán después de completar las tareas de implementación; sus resultados se registrarán en el PR sin afirmar aprobación anticipada.

## Fase 5: Convergencia de gobernanza

- [x] T006 Registrar 083 en tests/spec_governance/test_spec_baseline.py y validar el inventario técnico con scripts/build_system_inventory.py; regenerar si corresponde (FR-005, parcial).
