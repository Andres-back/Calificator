# Tareas: calificación con salida completa

## Fase 1: Preparación

- [X] T001 Registrar aprobación y alcance del hotfix en `specs/118-calificacion-salida-completa/spec.md`, issue #251 y rama aislada.

## Fase 2: Fundamentos

- [X] T002 Añadir y ejecutar primero regresiones de presupuesto y transporte en `backend/tests/unit/test_grading_output_budget.py` y `backend/tests/unit/test_ai_api_transport.py` (FR-001, FR-003).

## Fase 3: Historia 1

- [X] T003 [US1] Implementar estimador acotado y techo en `backend/app/modules/calificaciones/output_budget.py` y `backend/app/core/config.py` (FR-001, FR-002).
- [X] T004 [US1] Aplicarlo a texto/imagen, verificación y recuperación en `backend/app/modules/calificaciones/agents.py`; probar con cliente falso y modelos arbitrarios en `backend/tests/unit/test_grading_output_budget.py` (FR-001, FR-002, FR-005).

## Fase 4: Historia 2

- [X] T005 [US2] Clasificar corte explícito con conteos saneados en `backend/app/services/ai_api_transport.py`; probar tres protocolos y rechazo sin filtrar texto en `backend/tests/unit/test_ai_api_transport.py` (FR-003, FR-004).
- [X] T006 [US2] Preservar causas y conteos seguros en `backend/app/modules/calificaciones/agents.py`, `backend/app/modules/analytics/usage_logger.py` y `backend/app/modules/calificaciones/orchestrator.py`; añadir pruebas en `backend/tests/unit/` (FR-004, FR-005).

## Fase 5: Validación

- [X] T007 Documentar prueba real del botón con copia anónima, duración, cobertura y límites en `specs/118-calificacion-salida-completa/quickstart.md`, sin contenido sensible (FR-006, SC-004).
- [X] T008 Ejecutar lint, suite backend y regresiones de cálculo/recalificación; registrar resultados en `specs/118-calificacion-salida-completa/quickstart.md` (FR-005, FR-006).
- [X] T009 Revisar convergencia, inventario y gobernanza; registrar entrega en `specs/README.md` y abrir PR sin incluir cambios ajenos (FR-006). PR #252 publicado; controles remotos obligatorios antes de cualquier merge.

## Dependencias

T001 → T002 → T003 → T004. T005 requiere T002; T006 requiere T004/T005. T007/T008 → T009. Las pruebas sintéticas de presupuesto y transporte son separables; se ejecutan sin agentes adicionales. MVP: US1, pero ambas historias son obligatorias para cerrar el hotfix.
