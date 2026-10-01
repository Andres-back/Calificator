# Tareas: asistencia sin superposición y captura docente directa

**Issue**: #165 | **Rama**: `codex/079-captura-docente-directa`
**Alcance y plan**: aprobados el 2026-10-01. No autoriza merge o producción.
Pruebas con fixtures sintéticos, sin llamadas de IA ni modificaciones de registros reales.

## Fase 1: Preparación

- [x] T001 Verificar rama limpia y contexto, registrar aprobaciones y comprobar ignores existentes en `.gitignore`, `.dockerignore` y `frontend/eslint.config.js`.
- [x] T002 Completar el gate de revisión de `specs/079-captura-docente-directa/checklists/ux.md` y ejecutar Analyze sobre `spec.md`, `plan.md` y `tasks.md` antes de cambios funcionales.

## Fase 2: Fundamentos de captura

- [x] T003 Añadir regresiones de calidad pendiente, doble pulsación, paquete ordenado/rotado y error con evidencia conservada en `frontend/src/modules/materias/MateriaCalificar.test.tsx` (FR-007–010, SC-005).
- [x] T004 Añadir regresiones de archivo/cámara tardíos y análisis de contexto anterior en `frontend/src/components/evidence/MultiPageEvidencePicker.test.tsx` (FR-008–009, SC-005).

## Fase 3: US1 — Asistencia sin superposición

- [x] T005 [US1] Ampliar primero la regresión de resumen y scroll en `frontend/e2e/p2-responsive.spec.ts` y conservación de borrador/globales en `frontend/e2e/mock/grading-review.mock.spec.ts` (FR-001–004, SC-001–003).
- [x] T006 [US1] Compactar resumen en flujo normal y plegar ayuda/desglose en `frontend/src/modules/materias/MateriaAsistencia.tsx`, sin modificar modelo ni handlers de guardado (FR-001–004).
- [x] T007 [US1] Ejecutar regresión de payload completo en `frontend/src/modules/materias/attendanceModel.test.ts` y los casos de asistencia existentes (SC-003).

## Fase 4: US2 — Entrada contextual directa

- [x] T008 [US2] Añadir pruebas de captura papel/mixta, ausencia online/borrador/consulta y parámetros de contexto en `frontend/src/modules/materias/MateriaEvaluaciones.test.tsx` (FR-005–006, SC-007).
- [x] T009 [US2] Añadir acción contextual «Calificar por foto» conservando «Notas y entregas» en `frontend/src/modules/materias/MateriaEvaluaciones.tsx` (FR-005–006).

## Fase 5: US3 — Envío único seguro y continuidad

- [x] T010 [US3] Implementar selector inicial visible en flujo normal, contexto/resumen inline y envío explícito único con exclusión síncrona en `frontend/src/modules/materias/MateriaCalificar.tsx` (FR-006–010).
- [x] T011 [US3] Bloquear ingreso y callbacks tardíos por contexto en `frontend/src/components/evidence/MultiPageEvidencePicker.tsx`, manteniendo calidad, límites y controles actuales (FR-008–009).
- [x] T012 [US3] Comprobar refetch y aceptación sin falso descarte en el workspace real mediante `frontend/e2e/mock/grading-review.mock.spec.ts`, conservar las regresiones unitarias de `frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx`; mantener captura montada, pasar contexto y guardar aviso aceptado en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` (FR-009–011, SC-005–006).
- [x] T013 [US3] Ajustar solo pasos legítimamente eliminados y ampliar invariantes de los dos paquetes/error/reintento en `frontend/e2e/explainable-grading.spec.ts`; medir cuatro acciones y permisos en `frontend/e2e/mock/grading-review.mock.spec.ts` (FR-007–012, SC-004–007).

## Fase final: Validación y entrega

- [x] T014 Medir cinco tamaños, ambos temas, 200 % de zoom/reflujo y resumen ≤160 px a 390 px en las suites existentes `frontend/e2e/p2-responsive.spec.ts` / `frontend/e2e/mock/grading-review.mock.spec.ts`; documentar método y resultados en `specs/079-captura-docente-directa/quickstart.md` (SC-001–002, FR-012).
- [x] T015 Ejecutar tipos, lint estricto, unitarias, E2E aplicables, auditorías y build desde `frontend/package.json`; registrar resultados reales en `specs/079-captura-docente-directa/quickstart.md` (SC-005–007).
- [x] T016 Actualizar responsabilidad/evolución en `specs/README.md` y especificación previa responsable, ejecutar Converge contra `specs/079-captura-docente-directa/`, revisar diff sin cambios backend/datos y preparar PR enlazado a #165, sin fusionar ni desplegar.

## Dependencias y ejecución

T001 → T002 habilitan todas las fases. T003–T004 son contratos previos para T010–T012. Cada historia añade sus pruebas antes de código; T005 → T006 → T007 y T008 → T009. T010 → T011 → T012 → T013 integran captura con el workspace existente; T014–T016 requieren las tres historias completas. No hay tareas `[P]`: componentes, fixtures y estados compartidos hacen preferible ejecución secuencial para este cambio acotado.

**Validación independiente**: US1 puede demostrarse solo en asistencia; US2 por enlaces/permiso; US3 por paquete y resultado controlados. **MVP**: US1 resuelve la superposición, pero la entrega aprobada incluye las tres historias; no declarar completa 079 con solo US1.

**Ejemplos de organización**: comprobar US1 con `p2-responsive.spec.ts` antes de avanzar a US2; ejecutar las unitarias de captura después de T010–T012 y luego integrar la regresión de dos alumnos de T013. Ningún resultado pendiente de CI se anuncia como verde.

## Trazabilidad explícita

| Requisito | Tareas |
|---|---|
| FR-001 | T005, T006, T014 |
| FR-002 | T005, T006, T014 |
| FR-003 | T005, T006 |
| FR-004 | T005, T006, T007 |
| FR-005 | T008, T009 |
| FR-006 | T008, T009, T010 |
| FR-007 | T003, T010, T013 |
| FR-008 | T003, T004, T010, T011 |
| FR-009 | T003, T004, T010, T011, T012 |
| FR-010 | T003, T010, T012 |
| FR-011 | T012, T013, T015 |
| FR-012 | T013, T014 |
| SC-001 | T005, T014 |
| SC-002 | T005, T014 |
| SC-003 | T005, T007 |
| SC-004 | T013 |
| SC-005 | T003, T004, T012, T013, T015 |
| SC-006 | T012, T013, T015 |
| SC-007 | T008, T013, T015 |
