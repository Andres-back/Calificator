# Tareas: La decisión del empate llega a todas las lecturas, la analítica y el PDF (backend)

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-04 (`spec-approved`, `plan-approved` en #314).

## Fase 1: Preparación

- [X] T001 Registrar en `specs/148-nota-presentada-lecturas/{spec,plan}.md` qué lecturas, qué cálculo y qué reporte usan la nota, y las decisiones (exponer la decisión, empate sin decidir fuera de la tasa, promedios exactos). (FR-001, FR-002, FR-003, FR-004, FR-005)

## Fase 2: Pruebas primero (RED)

- [X] T002 `backend/tests/unit/test_tie_decision_reads.py`: tasa de aprobación (2.94, 2.96, 2.95 decidida "arriba", 2.95 sin decidir → 2 de 3); `BoletinItem`, `mi_redondeo_empate` y Xali con la decisión; huella de devolución idéntica sin decisión y carga útil `summary` con la decisión solo cuando existe; texto del PDF. RED: no existían `approval_rate`, `boletin_grade_text` ni los campos. (FR-001, FR-002, FR-003, FR-004, FR-005)
- [X] T003 Ampliar `backend/tests/unit/test_xali_delivered_max_grade.py` con la decisión. (FR-001)

## Fase 3: Corrección (GREEN)

- [X] T004 [US2] `grade_rounding.approval_rate` y su uso en `analytics/service.py` (`get_evaluaciones_list`, `tasa_aprobacion`). Los promedios no cambian. (FR-003)
- [X] T005 [US1] `redondeo_empate` en `BoletinItem` y `get_boletin`; `mi_redondeo_empate` en `EvaluacionRead` y en el progreso del estudiante (`evaluaciones/service.py`); `redondeo_empate` en Xali. (FR-001)
- [X] T006 [US1] Devoluciones (`feedback_sharing/projection.py`): `_tie_fields` añade la decisión a la huella de origen y a las cargas útiles `summary` y `detail` solo si existe. (FR-001, FR-002)
- [X] T007 [US3] `pdf_service.boletin_grade_text`: nota presentada con un decimal, "(por decidir)" en el empate sin decisión y texto exacto anterior en filas sin escala. (FR-004)

## Fase final: Validación

- [X] T008 Ejecutar la suite unitaria de backend, la regla de ruff del CI, el inventario y la gobernanza; registrar los resultados en `quickstart.md` y el spec en `specs/README.md`. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Dependencias

T001 → T002 y T003 (RED) → T004, T005, T006 y T007 (GREEN) → T008. Depende de la Spec 147 (columna `redondeo_empate`). Sin IA ni datos reales.
