# Tareas: Calibrar comprensión lectora y verificador

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md)

## Fase 1: Protección de regresión

- [x] T001 [US1] Añadir prueba de reglas semánticas de comprensión en `backend/tests/unit/test_photo_grading_failures.py` (FR-001, FR-002, FR-003, SC-001)
- [x] T002 [P] [US2] Añadir pruebas del nivel de razonamiento de GLM en `backend/tests/unit/test_llm_router_output_budget.py` y `backend/tests/unit/test_opencode_model_gateway.py` (FR-004, SC-002)

## Fase 2: Implementación

- [x] T003 [US1] Calibrar los prompts principal y verificador en `backend/app/modules/calificaciones/agents.py` (FR-001, FR-002, FR-003)
- [x] T004 [US2] Centralizar y aplicar el nivel de razonamiento compatible en `backend/app/services/llm_router.py` y `backend/app/modules/calificaciones/agents.py` (FR-004)
- [x] T005 [US2] Conservar el techo compacto y la detección de truncamiento con revisión en `backend/app/modules/calificaciones/agents.py` y `backend/app/core/config.py` (FR-005, SC-003)

## Fase 3: Validación y entrega

- [x] T006 Ejecutar pruebas unitarias focalizadas y confirmar ausencia de regresiones en cálculo y revisión (FR-005, FR-006, SC-004)
- [x] T007 Actualizar `specs/README.md` y `tests/spec_governance/test_spec_baseline.py` con la trazabilidad del hotfix (FR-006)
- [x] T008 Validar gobernanza local y preparar el caso real para comprobación posterior al despliegue sin confirmar ni publicar la nota (SC-001, SC-003, SC-004)

## Dependencias

- T001 y T002 preceden los cambios que protegen.
- T003, T004 y T005 pueden validarse conjuntamente después de las pruebas.
- T006 y T007 preceden T008.

