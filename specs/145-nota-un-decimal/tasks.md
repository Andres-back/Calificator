# Tareas: Nota con un decimal y redondeo consistente en todas las vistas

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-04 (`spec-approved`, `plan-approved` en #310).

## Fase 1: Preparación

- [X] T001 Registrar la regla del docente responsable, el alcance (PR 1 de 3) y las vistas afectadas en `specs/145-nota-un-decimal/{spec,plan}.md` y la checklist de calidad. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)

## Fase 2: Pruebas primero (RED)

- [X] T002 [US1] [US2] Tabla de presentación en `frontend/src/modules/calificaciones/gradePresentation.test.ts` con los valores de SC-002, escalas 5, 10, 100 y 4.5, valores en texto y el caso sin nota máxima. RED con `main` @ `1b82884` (9 fallos). (FR-001, FR-002, FR-004, FR-006)
- [X] T003 [US1] [US2] Regresiones de vista en `StudentResultCard.test.tsx` (1.15 → 1.2; 2.95 sin redondear) y `studentProgress.test.ts` (misma cifra que el docente). RED con `main` (2 fallos). (FR-001, FR-002, FR-003, FR-006)
- [X] T004 [US1] Prueba backend `backend/tests/unit/test_xali_delivered_max_grade.py`: la lista de Xali incluye `nota_maxima` y el campo es opcional. (FR-003)

## Fase 3: Corrección (GREEN)

- [X] T005 [US1] [US2] `formatGradeScore(score, notaMaxima?)` en `gradePresentation.ts` con aritmética entera y excepción del empate; `formatScoreDetail` conserva la presentación de dos decimales para cálculo y auditoría. (FR-001, FR-002, FR-005)
- [X] T006 [US1] Vistas del estudiante: `BoletinPage`, `StudentResultCard`, `ResolverEvaluacionPage`, `studentProgress`, `AnalyticsPage` (nota por evaluación) y `XaliPage`, con `nota_maxima` agregado al tipo `XaliEvaluacionEntregada`. (FR-001, FR-003, FR-004)
- [X] T007 [US1] Vistas del docente: nota principal, nota máxima, lista y confirmación de `CalificacionesWorkspace`; `StudentGradebookPreview`; retroalimentación (`ShareFeedbackDialog`, `FeedbackStudentList`, `FeedbackBatchPublish`, `FeedbackSharePanel`). El aviso de diferencia IA/cálculo y `PreviousGradeReference` usan `formatScoreDetail`. (FR-001, FR-003, FR-004, FR-005)
- [X] T008 [US1] Backend Xali: `nota_maxima` opcional en `XaliEvaluacionEntregadaRead` y en `list_delivered_evaluations_for_student`. (FR-003)
- [X] T009 Actualizar las expectativas que fijaban la presentación anterior con centésimas: `MateriaBoletin.test.tsx` y `e2e/p2-responsive.spec.ts`, donde "4.67 / 5.0" pasa a "4.7 / 5.0". (FR-001)

## Fase final: Validación

- [X] T010 Ejecutar la suite frontend completa, `lint`, `typecheck`, la prueba backend, los E2E con notas, el inventario y la gobernanza; registrar resultados en `quickstart.md` y el spec en `specs/README.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)

## Dependencias

T001 → T002, T003 y T004 (RED) → T005 → T006, T007 y T008 (GREEN) → T009 → T010. Sin delegación, sin llamadas a IA y sin datos reales.
