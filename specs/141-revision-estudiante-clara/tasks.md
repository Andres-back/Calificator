# Tareas: revisión de estudiante clara

**Base**: main `c27a30c`; **Issue**: #301; **Rama**: `codex/141-revision-estudiante-clara`.
Alcance y plan aprobados el 2026-11-02. No iniciar código funcional hasta completar el gate de calidad, análisis y maqueta previa. Las marcas de tareas no sustituyen las del revisor.

## Fase 1: Preparación

- [X] T001 Registrar aprobación y enfoque premium en `specs/141-revision-estudiante-clara/spec.md`, `plan.md` y issue #301, sin ampliar a fusión/despliegue.
- [X] T002 Resolver la revisión del responsable de `specs/141-revision-estudiante-clara/checklists/ux-integridad.md`, generar Tasks y ejecutar Analyze con cobertura de todos los FR/SC en `specs/141-revision-estudiante-clara/tasks.md`.
- [X] T003 Crear/revisar maqueta sintética 384/1440 px de las cuatro pestañas y los estados de enlace en `specs/141-revision-estudiante-clara/design/revision-premium.html`, retirando los controles descritos en `contracts/diseno-premium.md` antes de código funcional.
- [X] T004 Verificar ignorados/dependencias y ejecutar caracterización sintética del frontend en `frontend/package.json`, `frontend/src/modules/feedback_sharing/FeedbackWorkspace.test.tsx` y `frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx`, sin tocar otras ramas ni producción.

## Fase 2: Fundamentos

- [ ] T005 Añadir fixtures comunes de contexto/resultado/evidencia/enlaces y pruebas de aislamiento/estado anterior en `frontend/e2e/mock/spec141-fixtures.ts` y `frontend/src/modules/feedback_sharing/FeedbackWorkspace.test.tsx` para conservar sesión, permisos, borradores y retorno (FR-001, FR-002, FR-015, FR-016, FR-017, FR-019).

## Fase 3: Historia 4 — lectura y enlace individual (P1, primera entrega visual)

**Prueba independiente**: abrir/editar/compartir/reabrir un estudiante sin controles de grupo; texto y enlace íntegros, una acción principal.

- [ ] T006 [US4] Escribir regresiones de individual sin barra/lista grupal, estados de enlace y edición protegida en `frontend/src/modules/feedback_sharing/FeedbackWorkspace.test.tsx`, `FeedbackStudentLink.test.tsx` y `FeedbackMessage.test.tsx` antes de cambiar presentación (FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, SC-002, SC-003, SC-006).
- [ ] T007 [US4] Extraer composición individual separada y consulta/acciones reutilizables en `frontend/src/modules/feedback_sharing/FeedbackWorkspace.tsx`, `ShareFeedbackDialog.tsx` y componentes/hook internos de esa carpeta, sin duplicar autorización/emisión o montar selección grupal (FR-001, FR-012, FR-013, FR-019).
- [X] T008 [US4] Presentar diseño 3 con comentario íntegro y títulos explícitos en `frontend/src/modules/feedback_sharing/FeedbackMessage.tsx` y `feedbackSections.ts`, con pruebas de contenido legado/Markdown y sin aciertos inventados (FR-012, FR-021, SC-006, SC-008).
- [X] T009 [US4] Compactar `frontend/src/modules/feedback_sharing/FeedbackStudentLink.tsx` con acción primaria generar/copiar en una zona, recuperación segura y menú secundario de canales/vigencia, conservando revalidación/fallback y estados ambiguos (FR-013, FR-014, FR-015, FR-016, SC-003).
- [ ] T010 [US4] Integrar la pestaña individual sin marco/cabecera duplicados en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`, conservando edición guardada y pie contextual sin solapamientos (FR-002, FR-012, FR-018, FR-021, SC-002, SC-008).
- [ ] T011 [US4] Añadir E2E de reentrada, enlace guardado, editor, error/caducidad/foco y scroll en `frontend/e2e/mock/spec141-revision-estudiante-clara.spec.ts` y capturas sintéticas de implementación (FR-013, FR-015, FR-018, FR-020, SC-002, SC-003, SC-006).

## Fase 4: Historia 1 — cálculo claro (P1)

**Prueba independiente**: reconstruir la nota desde el desglose guardado en completa, ajustada, provisional y sin desglose, sin mutaciones.

- [X] T012 [US1] Escribir pruebas de pesos históricos, escala, ajuste, límites, redondeo, secciones y falta de datos en `frontend/src/modules/calificaciones/components/GradeFormula.test.tsx` y pruebas del modelo de presentación junto a `GradeFormula.tsx` (FR-003, FR-004, FR-005, SC-001).
- [X] T013 [US1] Unificar la explicación usando fórmula/snapshot en `frontend/src/modules/calificaciones/components/GradeFormula.tsx` y `gradeCalculationPresentation.ts`, sin aritmética nueva sobre entradas redondeadas ni pesos actuales (FR-003, FR-004, FR-005, SC-001).
- [X] T014 [US1] Sustituir explicaciones parciales/repetidas de `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y `components/GradeBreakdown.tsx` por un único cálculo accesible, manteniendo distinción nota docente/desglose (FR-003, FR-005, FR-021, SC-001, SC-008).

## Fase 5: Historia 2 — respuestas sin ruido (P1)

**Prueba independiente**: recorrer ocho/veinte preguntas con un resumen activo único; datos y restricciones conservados.

- [X] T015 [US2] Escribir regresiones de deduplicación, prioridad frente a corrección y avisos históricos en `frontend/src/modules/calificaciones/review-triage/ReviewTriagePanel.test.tsx` y `components/GradeBreakdown.test.tsx` (FR-006, FR-007, FR-008, SC-005).
- [X] T016 [US2] Presentar un resumen accionable y reubicar detalle histórico en `frontend/src/modules/calificaciones/review-triage/ReviewTriagePanel.tsx` y `CalificacionesWorkspace.tsx`, sin alterar bloqueos/decisiones (FR-006, FR-007, FR-016, SC-005).
- [X] T017 [US2] Simplificar pregunta activa y ayudas de evidencia en `frontend/src/modules/calificaciones/components/GradeBreakdown.tsx` y `GradeQuestionEvidence.tsx`, conservar explicación/regiones válidas y navegación compacta accesible (FR-006, FR-008, FR-018, FR-021, SC-005, SC-008).

## Fase 6: Historia 3 — evidencia contextual editable (P1)

**Prueba independiente**: giro de vista sin escrituras; paquete editado con hojas existentes/nuevas, cancelación intacta y guardado confirmado versionado/idempotente.

- [X] T018 [US3] Escribir pruebas de giros de vista, zoom, región/versiones y scroll en `frontend/src/modules/calificaciones/components/GradeEvidenceViewer.test.tsx` y `evidenceViewport.test.ts` (FR-009, FR-017, FR-018, SC-004).
- [X] T019 [US3] Implementar giro visual reversible con región coherente y restablecer en `frontend/src/modules/calificaciones/components/GradeEvidenceViewer.tsx` y `evidenceViewport.ts`, sin API de escritura ni IA (FR-009, FR-017, SC-004).
- [ ] T020 [US3] Escribir pruebas del contrato de edición por referencias, permisos, versión obsoleta/ajena y fallos sin escrituras en `backend/tests/` junto a las regresiones de revisión/escaneo existentes (FR-009, FR-010, FR-011, FR-016, FR-019, SC-004, SC-007).
- [X] T021 [US3] Exponer metadatos/preview de edición seguros por hoja en `backend/app/modules/calificaciones/revision_router.py`, schemas/servicio de edición en esa carpeta y `backend/app/services/evidence_scan_reads.py`, sin paths privados ni confundir preview con original (FR-009, FR-016, FR-019).
- [X] T022 [US3] Ampliar admisión opcional compatible por referencias/recetas en `backend/app/modules/calificaciones/revision_router.py`, `revision_service.py` y servicios de preparación/almacenamiento relacionados, conservando snapshot, atomicidad de admisión, idempotencia y elección de pesos de Spec 140 (FR-010, FR-011, FR-019).
- [X] T023 [US3] Añadir cliente/modelo de borrador seguro y editor de hojas existentes/nuevas en `frontend/src/modules/calificaciones/api.ts`, `components/GradeReprocessing.tsx` y `frontend/src/components/evidence/`, con pruebas de límites, cancelación y conflicto (FR-009, FR-011, FR-017, FR-019).
- [X] T024 [US3] Integrar «Editar hojas» y «Guardar y volver a calificar» en la pestaña Evidencia de `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`, retirando controles repetidos de otras pestañas y manteniendo confirmación/motivo opcional/historial (FR-009, FR-010, FR-014, FR-019, SC-004).
- [X] T025 [US3] Validar persistencia, concurrencia, original/preparada, snapshot, reintento/worker obsoleto y ausencia de cambios parciales en `backend/tests/integration/test_evidence_scan_persistence.py` y suites de revisión/Spec 140, con base aislada (FR-010, FR-011, FR-019, SC-004, SC-007).

## Fase 7: Historia 5 — grupo y navegación (P2)

**Prueba independiente**: entrar por materia/evaluación, compartir a varios, copiar e imprimir y regresar al mismo contexto/selección.

- [ ] T026 [US5] Escribir pruebas de selección/filtros/retorno, enlaces existentes y fallos parciales en `frontend/src/modules/feedback_sharing/ShareFeedbackDialog.test.tsx` y pruebas de navegación de `frontend/src/modules/calificaciones/` (FR-001, FR-002, FR-013, FR-015, FR-018, SC-003).
- [X] T027 [US5] Aplicar lista compacta opción 1 y zona única generar/copiar en `frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx`, `FeedbackStudentList.tsx` y `FeedbackSelectionBar.tsx`, conservando impresión/publicación y permisos (FR-001, FR-013, FR-014, FR-015, FR-016, FR-021, SC-002, SC-003, SC-008).
- [ ] T028 [US5] Compactar cabecera/retorno y diferenciar acciones de lista/detalle en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`, sin romper rutas antiguas ni libro/resumen (FR-001, FR-002, FR-018, FR-021, SC-005, SC-008).
- [ ] T029 [US5] Completar E2E grupal de generación/copia/parciales/impresión/publicación/volver en `frontend/e2e/mock/spec141-revision-estudiante-clara.spec.ts` conservando privacidad del enlace público y cuota/chat existentes (FR-013, FR-015, FR-016, FR-020, SC-003, SC-007).

## Fase final: Pulido y validación

- [ ] T030 Revisar jerarquía premium y estados vacío/carga/error/foco a 360/384/412/1440 px contra `specs/141-revision-estudiante-clara/contracts/diseno-premium.md`, con capturas de implementación y correcciones locales sin ampliar dependencias (FR-018, FR-021, SC-008).
- [X] T031 Ejecutar TypeScript, lint, unidad, acciones/build/auditorías aplicables de `frontend/package.json` y registrar resultados reales en `specs/141-revision-estudiante-clara/validation.md`, sin marcar ejecuciones pendientes como verdes (FR-020, SC-007).
- [X] T032 Ejecutar regresión backend/persistencia/permisos/desglose/feedback/revisión en `backend/tests/` con PostgreSQL aislado y registrar alcance/entorno en `specs/141-revision-estudiante-clara/validation.md` (FR-020, SC-004, SC-007).
- [ ] T033 Ejecutar E2E Chromium/Firefox/WebKit, teclado, scroll central, claro/oscuro y capturas de app real 384/1440 px en `frontend/e2e/mock/spec141-revision-estudiante-clara.spec.ts`; registrar entorno estable y resultados en `specs/141-revision-estudiante-clara/validation.md` (FR-018, FR-020, SC-002, SC-005, SC-007, SC-008).
- [ ] T034 Obtener y registrar comprobación física Android/iPhone de los gestos nuevos en `specs/141-revision-estudiante-clara/validation.md`, sin atribuir pruebas de una versión anterior a esta entrega (FR-018, FR-020, SC-007).
- [ ] T035 Ejecutar Converge y comprobar cobertura/retirada de controles y comportamiento en `specs/141-revision-estudiante-clara/tasks.md`; añadir trabajo pendiente real sin declarar completa una tarea no verificada (FR-001 a FR-021; SC-001 a SC-008).
- [ ] T036 Preparar commit y PR con spec/issue, resumen, evidencia visual y validaciones de `specs/141-revision-estudiante-clara/validation.md`; respetar CI/gobernanza sin fusión ni despliegue en esta autorización (FR-020, SC-007).

## Dependencias

- T001–T004 antes de código funcional; T002 depende de revisión autorizada del responsable, no de autovalidar el checklist.
- T005 es base común. US4 primero por prioridad visual del usuario; US1/US2 pueden verificarse independientemente, pero cambios a `CalificacionesWorkspace.tsx` son secuenciales.
- T018 → T019. T020 → T021/T022 → T023 → T024 → T025; la interfaz de guardar no se activa con backend incompleto.
- US5 reutiliza la separación individual de US4 y no elimina las pruebas de impresión/publicación anteriores.
- T030–T036 no se completan con maquetas ni solo tests unitarios. Sin autorización de datos reales/IA/producción.

## Oportunidades de ejecución independiente

- Pruebas puras de fórmula y giro no comparten archivos y pueden ejecutarse separadas tras fundamentos.
- Backend de edición por referencias y lectura individual de feedback no comparten archivos; sus integraciones finales se serializan.
- Cada historia puede probarse con fixtures sintéticos sin acceso a cuentas o producción. Estas oportunidades no autorizan agentes adicionales por sí solas.

## Estrategia de implementación

Incremental: feedback individual premium → cálculo → respuestas → evidencia → grupo/contexto → regresión/visual. Un incremento incompleto no se presenta como entrega total ni se fusiona ocultando pendientes. El foco inicial es frontend; las garantías backend para evidencia siguen siendo parte del alcance aprobado.
