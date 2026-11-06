# Tareas: Decisión del docente en el empate del umbral (backend)

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-04 (`spec-approved`, `plan-approved` en #312).

## Fase 1: Preparación

- [X] T001 Mapear todos los caminos que fijan, publican o borran la nota final y registrar las decisiones del usuario (decisión aparte, dos PRs de backend) en `specs/147-decision-empate-backend/{spec,plan}.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Fase 2: Pruebas primero (RED)

- [X] T002 [US1] [US2] `backend/tests/unit/test_grade_rounding.py`: tabla de la regla del empate en escalas 5, 10, 100 y 4.5; nota presentada con y sin decisión; exigencia y bloqueo de publicación. RED: el módulo no existía. (FR-001, FR-002, FR-004)
- [X] T003 [US1] [US2] [US3] `backend/tests/unit/test_tie_decision_paths.py`: confirmar, ajustar (incluido cambiar solo la decisión), "Establecer nota", lote de confirmar, publicar, descarte de la decisión al cambiar la cifra calculada y esquemas opcionales. RED con `main` @ `1b82884` (10 fallos). (FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Fase 3: Corrección (GREEN)

- [X] T004 [US1] Regla compartida en `backend/app/modules/calificaciones/grade_rounding.py`: `is_threshold_tie`, `presented_grade`, `resolve_tie_decision`, `ensure_tie_decided`, `apply_final_grade` y `apply_computed_final_grade`. (FR-001, FR-005)
- [X] T005 [US1] [US3] Columna `calificaciones.redondeo_empate` con `CHECK` en `models.py` y migración aditiva `backend/alembic/versions/202611040001_redondeo_empate.py`; campo opcional en `ConfirmarNota`, `AjustarNota`, `CalificacionManualCreate`, `BatchConfirmItem`, `BatchAjustarItem` y `CalificacionRead`. (FR-003, FR-006, FR-007)
- [X] T006 [US1] Confirmar, ajustar (validación antes del desglose y decisión en el `fingerprint`), "Establecer nota" y ajustar y confirmar en lote usan `apply_final_grade` y dejan la decisión en el historial. (FR-002, FR-003)
- [X] T007 [US2] `_prepare_grade_publication`, que comparten publicar y publicar en lote, bloquea el empate sin decisión. "Aceptar y publicar devoluciones" hereda la guarda y deja ese estudiante como `needs_review` con el mensaje. (FR-004)
- [X] T008 [US2] Desglose (`breakdown_service.update_breakdown`) y reparto (`evaluaciones/score_notes._apply_one`) usan `apply_computed_final_grade`: descartan la decisión si cambia la cifra y despublican un empate sin decidir. Los reinicios a NULL (`service.py`, `photo_service.py`, `router.py` y `jobs/router.py`) también borran la decisión. (FR-004, FR-005)

## Fase final: Validación

- [X] T009 Ejecutar la suite unitaria de backend, el inventario y la gobernanza; registrar los resultados en `quickstart.md` y el spec en `specs/README.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Dependencias

T001 → T002 y T003 (RED) → T004 → T005 → T006, T007 y T008 (GREEN) → T009. Sin delegación de código, sin llamadas a IA y sin datos reales. El mapeo de T001 se hizo con un agente de exploración de solo lectura.
