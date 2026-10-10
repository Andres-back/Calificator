# Tareas: criterios de recursos y vista docente compacta

**Rama**: `codex/093-recursos-vista-docente` | **Issue**: #196
**Fuentes**: [spec.md](./spec.md), [plan.md](./plan.md), [contratos](./contracts/interfaces.md).
Alcance y plan aprobados. Implementación condicionada a revisión del checklist y Analyze; sin autorización de merge/despliegue.

## Fase 1: Preparación

- [x] T001 Registrar aprobaciones, comprobar checkout y exclusiones locales sin tocar cambios ajenos en `specs/093-recursos-vista-docente/spec.md`, `.gitignore` y `.dockerignore` existentes.

## Fase 2: Fundamentos

- [x] T002 Revisar gate de checklist y analizar cobertura FR-001–011/SC-001–006, documentando resultado en `specs/093-recursos-vista-docente/tasks.md`; no marcar checklist durante Implement.

## Fase 3: Historia 1 — criterios observables (P1)

Objetivo: criterios distintos de preguntas/claves, sin alterar contenido académico.
Prueba independiente: generar/revisar/convertir crucigrama y matriz de 16 tipos; comparar preguntas, clave y escala.

- [x] T003 [US1] Añadir primero regresiones de criterios observables, copia literal, rúbrica inválida, niveles, pesos y conservación exacta para los 16 tipos/modalidades en `backend/tests/unit/test_material_evaluation_adapter.py` (FR-001–004, SC-001–002).
- [x] T004 [P] [US1] Añadir regresiones de fuentes docentes, conflictos, rechazo previo a escrituras y vínculo idempotente en `backend/tests/unit/test_material_conversion_service.py` (FR-003/011).
- [x] T005 [P] [US1] Añadir regresiones de propuesta inválida corregible sin regenerar contenido y material de apoyo libre en `backend/tests/unit/test_herramientas_content_quality.py` y `backend/tests/unit/test_material_dba_alignment.py` (FR-003–005).
- [x] T006 [US1] Implementar política pura compartida en `backend/app/modules/herramientas/evaluation_criteria.py`: fuente, logro, evidencia, regla, referencias y validación antes de normalizar pesos; sin soluciones ni penalizaciones ajenas (FR-001–004).
- [x] T007 [US1] Integrar política en `backend/app/modules/herramientas/evaluation_adapter.py` sin cambiar extracción de preguntas, opciones, claves, grilla, redondeo o componentes canónicos (FR-004/011).
- [x] T008 [US1] Integrar propuesta/diagnósticos de criterios y recuperación de fuente docente en `backend/app/modules/herramientas/service.py` y `backend/app/modules/herramientas/content_quality.py`, preservando retorno temprano y rechazo 422 antes de crear evaluación (FR-003–005/011).
- [x] T009 [US1] Conservar criterios explícitos que corresponden al recurso en `backend/app/modules/herramientas/generators/crucigrama.py` y revisar generadores existentes sin regenerar preguntas/grilla al corregir únicamente criterios (FR-003–004).
- [x] T010 [US1] Mostrar propuesta y errores accionables, permitir edición con controles existentes en `frontend/src/modules/herramientas/DetailPage.tsx` y `frontend/src/modules/herramientas/MaterialContentEditor.tsx`; mantener apoyo sin rúbrica y revisión antes de publicar (FR-005).
- [x] T011 [US1] Ampliar pruebas de proyección en `backend/tests/unit/test_xali_student_resources.py` y de puntuación en `backend/tests/unit/test_calificacion_breakdown.py` según consumidores reales: ningún criterio filtra clave, duplica puntaje o invalida respuesta objetiva correcta; conservar regresiones de `test_grading_component_consensus.py` y `test_evaluation_lifecycle_actions.py` (FR-004/011, SC-006).
- [x] T012 [US1] Ejecutar pruebas focalizadas de historia 1 y registrar comandos/resultados reales en `specs/093-recursos-vista-docente/quickstart.md` (SC-001–002/006).

## Fase 4: Historia 2 — bandeja sin reclamos vacíos (P2)

Objetivo: liberar espacio solo cuando no hay reclamos, sin ocultar trabajo o errores.
Prueba independiente: bandeja compacta y completa con cero/uno, notas pendientes, error y contador incoherente.

- [x] T013 [P] [US2] Añadir primero regresiones de cero reclamos, elementos con contador cero, contador positivo sin detalle, carga/error, recuperación y actualización en `frontend/src/modules/dashboard/DashboardPage.test.tsx` (FR-006–007/011).
- [x] T014 [US2] Condicionar sección/contadores y ancho disponible en `frontend/src/modules/dashboard/TeacherInbox.tsx`; mantener notas pendientes, enlaces y recarga sin consultas nuevas (FR-006–007).
- [x] T015 [US2] Ejecutar regresiones de bandeja y registrar evidencia en `specs/093-recursos-vista-docente/quickstart.md` (SC-003/006).

## Fase 5: Historia 3 — asistencia compacta (P2)

Objetivo: más alumnos visibles, controles legibles y observación progresiva sin alterar persistencia.
Prueba independiente: búsqueda/marcado/observación y reintento en desktop y móvil, con cola existente.

- [x] T016 [P] [US3] Adaptar primero pruebas de observaciones a apertura explícita y añadir conservación ante colapso/búsqueda/fallo en `frontend/e2e/mock/grading-review.mock.spec.ts`; conservar pruebas de `frontend/src/modules/materias/useAttendanceAutosave.test.tsx` (FR-009–010).
- [x] T017 [US3] Compactar filas y adaptar estados/nombre/guardado al ancho real en `frontend/src/modules/materias/MateriaAsistencia.tsx`, con observaciones desplegables, indicador de texto existente y controles ≥44×44 sin tocar la cola de guardado (FR-008–010).
- [x] T018 [US3] Validar búsqueda, fechas, marcas masivas, importación/reporte y protección de salida usando `frontend/src/modules/materias/attendanceModel.test.ts`, `useAttendanceAutosave.test.tsx` y `backend/tests/integration/test_attendance_autosave.py` en entorno aislado (FR-010–011, SC-006).
- [x] T019 [US3] Medir filas y comprobar 360/390/768/1280 px, claro/oscuro, nombres largos, teclado y scroll con fixtures sintéticos de `frontend/e2e/mock/grading-review.mock.spec.ts`; registrar evidencia en `specs/093-recursos-vista-docente/quickstart.md` (SC-004–005).

## Fase 6: Validación transversal

- [x] T020 Ejecutar TypeScript, lint, build y regresiones aplicables; documentar resultados y limitaciones reales en `specs/093-recursos-vista-docente/quickstart.md` (SC-006, Constitución VII).
- [ ] T021 Ejecutar Converge sobre `specs/093-recursos-vista-docente/spec.md`, `plan.md`, `tasks.md` y código; completar cualquier tarea añadida antes de declarar entrega.
- [ ] T022 Actualizar trazabilidad/estado en `specs/README.md` y `specs/093-recursos-vista-docente/quickstart.md`; abrir PR enlazado a #196 con controles CI requeridos y sin merge/despliegue no autorizado.

## Dependencias y ejecución

T001 → T002 → historias. US1: T003–005 antes de T006 → T007–009 → T010–011 → T012. US2: T013 → T014 → T015. US3: T016 → T017 → T018–019. Historias completas → T020 → T021 → T022. Converge puede añadir trabajo; no borrar ni renumerar tareas.

Oportunidades paralelas, sin autorizar subagentes: US1 T003/T004/T005 en archivos distintos; US2 T013 independiente de backend US1; US3 T016 independiente de US1/US2. No editar simultáneamente el mismo archivo. En esta ejecución se puede trabajar secuencialmente.

MVP: historia 1, luego bandeja y asistencia como incrementos independientes, sin despliegue parcial no aprobado. Todos los marcadores representan trabajo realmente completado, no autorización ni expectativa.

## Gate previo (2026-10-10)

Checklist base 16/16 y custom 8/8 con revisión expresamente autorizada. Analyze de solo lectura: FR-001–005 → T003–012; FR-006–007 → T013–015; FR-008–010 → T016–019; FR-011 → T004/007/008/011/013/018/020; SC-001–002 → T003/005/012; SC-003 → T013–015; SC-004–005 → T016/017/019; SC-006 → T011/012/015/018/020. 17 requisitos/criterios, 22 tareas, cobertura 100 %, cero ambigüedades bloqueantes, duplicaciones, conflictos constitucionales o tareas sin correspondencia. Hooks ausentes. Implement solo consulta checklist; no vuelve a modificarlo.
