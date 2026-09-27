# Tareas: arbitraje solo cuando aporta valor

## Fase 1: Preparación

- [X] T001 Documentar FR-001–FR-005 y las mediciones del incidente en `specs/056-avoid-redundant-arbitration/spec.md` y `research.md`.

## Fase 2: Fundamentos

- [X] T002 [P] Añadir regresiones para FR-001, FR-003 y FR-005 en `backend/tests/unit/test_photo_grading_failures.py`.
- [X] T003 [P] Añadir regresión para FR-002 y FR-004 en `backend/tests/unit/test_comparator_feedback.py`.

## Fase 3: Historia 1 - Revisión honesta sin tercera espera

**Prueba independiente**: notas cercanas y confiables con alerta conservan revisión sin arbitraje; discrepancia y baja confianza sí lo invocan.

- [X] T004 [US1] Reservar arbitraje para discrepancia o baja confianza en `backend/app/modules/calificaciones/orchestrator.py` según FR-001, FR-003 y FR-005.
- [X] T005 [US1] Propagar revisión y alertas al consolidar cerca en `backend/app/modules/calificaciones/agents.py` y `orchestrator.py` según FR-002 y FR-004.

## Fase final: Validación

- [X] T006 Ejecutar pytest, Ruff e inventario según `specs/056-avoid-redundant-arbitration/quickstart.md`.
- [X] T007 Actualizar `specs/README.md`, `tests/spec_governance/test_spec_baseline.py` y `specs/system-inventory/current.json`.
- [X] T008 Preparar el PR, controles CI y protocolo de despliegue y reensayo real sin publicar nota según SC-001–SC-004; ejecutar el reensayo tras el merge.

## Dependencias

T001 precede las pruebas T002/T003; T004/T005 siguen las pruebas; T006/T007 preceden T008. Las pruebas T002/T003 pueden prepararse en paralelo en archivos distintos.

## Estrategia

MVP: historia 1 completa, primero regresión fallida, luego regla y revisión, después pruebas y producción.
