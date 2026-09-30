# Tareas 077 — Qwen en verificación y arbitraje

## Preparación

- [x] T001 Registrar alcance/aprobación y baseline en spec.md y research.md; revisar requisitos sin ambigüedades críticas (FR-005, FR-006, FR-007).
- [x] T002 Añadir regresiones en backend/tests/unit/test_opencode_model_gateway.py y test_ai_model_discovery.py para protocolo, imagen, truncamiento y controles por etapa (FR-001, FR-002, FR-003).

## US1 — Verificación visual rápida

- [x] T003 Reconocer Qwen 3.8 Flash en backend/app/services/ai_model_discovery.py (FR-001).
- [x] T004 Extender control por etapa en backend/app/services/llm_router.py y aplicarlo también a Messages en backend/app/modules/calificaciones/agents.py (FR-002, FR-003).
- [x] T005 Añadir y ejecutar regresión visual Qwen del verificador en backend/tests/unit/test_photo_grading_failures.py; mantener revisión humana y ausencia de mutaciones de notas anteriores (FR-003, FR-005).

## US2 — Validación y entrega

- [x] T006 Documentar publicación auditada, preservación de rutas y rollback en quickstart.md y plan.md; registrar esta evolución en specs/README.md (FR-004, FR-007).
- [x] T007 Ejecutar regresiones, lint y compile; Analyze y Converge sin hallazgos funcionales, preparar PR/CI y procedimiento de medición por etapas (FR-001, FR-002, FR-003, FR-005, FR-006, FR-007).

## Dependencias y gates operativos

T001 → T002 → T003/T004 → T005 → T006/T007. No paralelizar cambios sobre el mismo adaptador. Las tareas implementan y verifican el parche; publicación administrativa y benchmark E2E de producción son gates **posteriores al merge** documentados en quickstart.md y se reportan en issue #161, no se presumen cumplidos antes de fusionar. Un fallo de CI bloquea merge; un fallo productivo activa recuperación.
