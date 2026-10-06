# Tareas: Docente primero en celular

**Rama**: `codex/084-docente-mobile-first` · **Issue**: [#174](https://github.com/Andres-back/Calificator/issues/174)
**Especificación y plan**: aprobados el 2026-10-05. Checklist personalizado revisado con autorización humana: 10/10; implementación iniciada, sin despliegue.

Todas las rutas son relativas al checkout de esta rama. Las pruebas anteceden a la implementación en cada historia; registrar resultados reales en quickstart. No realizar escrituras en producción ni renovar claves reales para probar.

## Fase 1: Preparación

- [x] T001 Registrar aprobaciones humanas en specs/084-docente-mobile-first/spec.md y plan.md, índice specs/README.md y etiquetas del issue #174.
- [x] T002 Obtener revisión autorizada de specs/084-docente-mobile-first/checklists/ux-integridad.md y evaluar sus diez requisitos sin confundirlos con implementación; respetar gate de Spec Kit.

## Fase 2: Fundamentos

- [x] T003 Revisar contratos/permisos y archivos de exclusión .gitignore, .dockerignore, frontend/eslint.config.js; preparar fixtures ficticias en frontend/src/test y backend/tests sin credenciales reales, documentando baseline en specs/084-docente-mobile-first/quickstart.md.

## Fase 3: US1 — Visualizar dentro del celular (P1)

Objetivo: consultar todas las páginas sin abrir PDF externo. Prueba independiente: documento multipágina, última página/zoom, cambio de documento/solucionario, cierre y permisos.

- [x] T004 [US1] Ampliar frontend/src/modules/evaluaciones/components/EvaluationPreviewModal.test.tsx y frontend/e2e/evaluation-preview.spec.ts para render real, cancelación, limpieza de contenido privado y navegación de páginas; conservar backend/tests/unit/test_evaluation_exports.py como contrato de permisos.
- [x] T005 [US1] Fijar pdfjs-dist en frontend/package.json y frontend/package-lock.json, comprobar Node CI/Docker y auditoría; empaquetar worker/recursos del mismo origen sin debilitar CSP ni cargar visor en bundle inicial.
- [x] T006 [US1] Implementar visor lazy acotado en frontend/src/modules/evaluaciones/components/EvaluationPdfViewer.tsx: una página, presupuesto de canvas, controles >=44×44, texto accesible, cancelación y destrucción de recursos.
- [x] T007 [US1] Integrar visor en frontend/src/modules/evaluaciones/components/EvaluationPreviewModal.tsx reutilizando frontend/src/modules/evaluaciones/api.ts, manteniendo descargas, solucionario explícito y apertura externa opcional.
- [x] T008 [US1] Ejecutar pruebas dirigidas del visor/exports y comprobar formatos compatibles, primera/última página y worker real con Chromium/WebKit en frontend/e2e/evaluation-preview.spec.ts; registrar evidencia y límites en specs/084-docente-mobile-first/quickstart.md.

## Fase 4: US2 — Criterios y rúbrica sin alterar preguntas (P1)

Objetivo: criterios/rúbrica a una acción desde revisión. Prueba independiente: seleccionar/crear/editar/guardar/reabrir, conflicto y conservación exacta de examen y notas.

- [x] T009 [P] [US2] Añadir casos de PATCH parcial, conflicto y referencias históricas/ajenas en backend/tests/unit/test_evaluation_lifecycle_actions.py y backend/tests/unit/test_authorization_contracts.py, y fixture de material especial en backend/tests/unit/test_material_evaluation_adapter.py con preservación de claves/metadatos/entregas/notas.
- [x] T010 [P] [US2] Ampliar frontend/src/modules/evaluaciones/components/GenerationWizard.test.tsx y frontend/src/modules/materias/MateriaEvaluaciones.test.tsx para revisión sin rúbrica, creación de criterio durante borrador, invalidaciones y payload limitado.
- [x] T011 [US2] Añadir expected_updated_at compatible en backend/app/modules/evaluaciones/schemas.py y comparación atómica en service.py; actualizar únicamente criterios/contexto del blueprint en PATCH limitado, preservando preguntas/claves y referencias inactivas autorizadas ya vinculadas.
- [x] T012 [US2] Implementar editor limitado en frontend/src/modules/evaluaciones/components/EvaluationCriteriaEditor.tsx reutilizando DBASelector, dbaApi y reglas de rúbrica actuales; añadir precondición a frontend/src/modules/evaluaciones/api.ts y conservar trabajo tras error/409.
- [x] T013 [US2] Integrar acceso en frontend/src/modules/evaluaciones/components/GenerationWizard.tsx y frontend/src/modules/materias/MateriaEvaluaciones.tsx; estabilizar inicialización por apertura/identidad y sincronizar solo criterios guardados sin borrar preguntas pendientes.
- [x] T014 [US2] Ejecutar pruebas de criterios y conservación histórica en suites T009–T010; registrar resultados reales en specs/084-docente-mobile-first/quickstart.md sin generar nuevas calificaciones.

## Fase 5: US3 — Materias breves (P1)

Objetivo: nombre/navegación/acción principal primero; detalles opcionales. Prueba independiente: todas las secciones vacías/pobladas, claro/oscuro, teclado y scroll.

- [x] T015 [US3] Ampliar frontend/src/modules/materias/MateriaDetailPage.test.tsx, MateriaVistaGeneral.test.tsx y frontend/e2e/p2-responsive.spec.ts con primer viewport, disclosures cerrados, estados importantes y navegación existente.
- [x] T016 [US3] Reducir encabezado y recomendaciones duplicadas en frontend/src/modules/materias/MateriaDetailPage.tsx y MateriaVistaGeneral.tsx, conservando código de inscripción/estudiantes en detalles o tareas visibles según prioridad.
- [x] T017 [US3] Simplificar frontend/src/modules/materias/MateriaEvaluaciones.tsx, MateriaRecursos.tsx, MateriaAsistencia.tsx, MateriaBoletin.tsx y MateriaDbaPage.tsx sin ocultar avisos, permisos o controles; mantener Calificar/Notas en cada evaluación.
- [x] T018 [US3] Ejecutar matriz de secciones y scroll/teclado/objetivos >=44×44 en frontend/e2e/p2-responsive.spec.ts y suites de materia, registrando dimensiones y navegadores realmente probados en specs/084-docente-mobile-first/quickstart.md.

## Fase 6: US4 — Registro y fichas privadas (P1)

Objetivo: foto/manual terminan con credenciales imprimibles, sin duplicaciones ni cambios accidentales de clave. Prueba independiente: alta, replay, asociación, impresión seleccionada y renovación autorizada.

- [x] T019 [P] [US4] Extender backend/tests/integration/test_roster_import_flow.py para lote manual, replay/concurrencia/UUID incompatible, homónimos, permisos efectivos y asociación sin cambio de clave usando solo base aislada.
- [x] T020 [P] [US4] Añadir frontend/src/modules/materias/RosterCredentials.test.tsx y ampliar frontend/src/modules/materias/RosterReview.test.tsx y frontend/e2e/roster-import.spec.ts para pérdida de respuesta, print-only, selección y cero llamadas de renovación al imprimir/cancelar.
- [x] T021 [US4] Añadir endpoint manual con schema compatible en backend/app/modules/importacion_estudiantes/router.py y schemas.py, creando lote revisable por UUID/huella en service.py sin upload/IA y reutilizando confirmación/matrícula transaccionales.
- [x] T022 [US4] Implementar alta manual en frontend/src/modules/materias/RosterManualDialog.tsx y rosterImportApi.ts; integrar en MateriaVistaGeneral.tsx y separar guardar/confirmar en RosterImportDialog.tsx con recuperación de estado del mismo lote.
- [x] T023 [US4] Implementar fichas seleccionables/portal aislado en frontend/src/modules/materias/RosterCredentials.tsx y frontend/src/index.css, limpiar secretos/resultados de mutation al cerrar/contexto/logout y compartir renderer con alta/renovación.
- [x] T024 [US4] Añadir confirmación previa y advertencia de efecto global en frontend/src/modules/materias/MateriaVistaGeneral.tsx; reforzar permiso subjects.update, alcance y bloqueo de renovación en backend/app/modules/importacion_estudiantes/router.py y service.py, respuestas sensibles no-store sin revelar clave anterior.
- [x] T025 [US4] Ejecutar suites T019–T020 con PostgreSQL aislado y emulación print real; comprobar ausencia de secretos persistidos y documentar resultados/omisiones en specs/084-docente-mobile-first/quickstart.md.

## Fase 7: US5 — Perfil propio (P2)

Objetivo: nombre/email/password propios con validación y salida de sesión predecible. Prueba independiente: cambios válidos/invalidaciones, duplicados, clave actual errónea y nuevo login.

- [x] T026 [P] [US5] Añadir backend/tests/integration/test_self_profile_api.py y extender backend/tests/unit/test_password_recovery.py para restricciones de campos, contraseña actual, atomicidad, correo duplicado, cookies, revocación access/refresh/recovery y relaciones intactas.
- [x] T027 [P] [US5] Añadir frontend/src/modules/users/ProfilePage.test.tsx y recorrido en frontend/e2e/profile.spec.ts para formulario móvil, errores de campo, actualización de identidad y login tras nueva contraseña.
- [x] T028 [US5] Extender UserSelfUpdate en backend/app/modules/users/schemas.py y wrapper update_self_user en service.py; ajustar router.py usando helpers auth actuales, 422 de clave errónea, bloqueo y limpieza de cookies tras cambio de password sin alterar actualizaciones admin.
- [x] T029 [US5] Implementar frontend/src/modules/users/ProfilePage.tsx y api.ts; integrar ruta lazy/menú en frontend/src/router.tsx, frontend/src/config/routes.ts y frontend/src/components/layout/Topbar.tsx; actualizar auth store y limpiar sesión/cachés privados apropiadamente.
- [x] T030 [US5] Ejecutar suites T026–T027 y comprobar contratos de frontend/src/lib/api.test.ts, recuperación/cambio inicial/admin y permisos; registrar evidencia en specs/084-docente-mobile-first/quickstart.md.

## Fase 8: Validación y entrega

- [x] T031 Completar matriz transversal de cinco recorridos en frontend/e2e/p2-responsive.spec.ts, evaluation-preview.spec.ts, roster-import.spec.ts y profile.spec.ts: tamaños del plan, claro/oscuro, error, foco, scroll y ausencia de acceso cruzado; declarar límites de Brave/iPhone físicos.
- [x] T032 Actualizar documentación/contratos canónicos responsables e inventario specs/system-inventory/current.json mediante generador existente cuando cambien rutas/contratos; registrar evidencia, limitaciones y procedimiento de rollback en specs/084-docente-mobile-first/quickstart.md y specs/README.md.
- [x] T033 Ejecutar TypeScript/lint/pruebas/build/auditoría aplicables de frontend/package.json y backend/tests, comprobar Docker/CI pertinente sin credenciales reales; no declarar aprobados tests omitidos ni sustituir ejecución por mocks.
- [x] T034 Ejecutar speckit-converge contra specs/084-docente-mobile-first/spec.md, plan.md y tasks.md; resolver cualquier tarea nueva antes de cerrar trabajo y dejar marcadas únicamente tareas realmente completadas.
- [x] T035 Abrir PR de codex/084-docente-mobile-first enlazado a issue #174, adjuntarlo a este chat y comprobar Spec governance/CI según .github/workflows/ci.yml; preparar entrega sin push directo a main ni despliegue/fusión no autorizados.

## Dependencias

T001–T003 bloquean todas las historias. Dentro de cada historia, pruebas → implementación → verificación. US1 puede implementarse primero como incremento mínimo, pero este alcance requiere las cinco historias. US2 y US3 comparten MateriaEvaluaciones: ejecutar secuencialmente. US3 y US4 comparten MateriaVistaGeneral: ejecutar secuencialmente. Cambios de blueprint y de usuario afectan tests compartidos: repetir regresiones después de integrar.

## Oportunidades de paralelización

T009/T010, T019/T020 y T026/T027 son pares de pruebas independientes de archivos frontend/backend. US1 puede desarrollar sus fixtures de exports independientemente del visor tras fundamentos. US3 puede preparar casos de secciones mientras se diseña US2, pero no editar sus archivos comunes simultáneamente. Estas oportunidades no autorizan por sí mismas delegar agentes; pueden ejecutarse secuencialmente.

## Estrategia y aceptación

Incrementos aislados por historia, sin migración prevista. Primero visor; después editor seguro de criterios, simplificación de materia, credenciales y perfil. Trazabilidad explícita: FR-001 y FR-002→T004–T008; FR-003, FR-004 y FR-005→T009–T014; FR-006→T015–T018; FR-007, FR-008, FR-009, FR-010 y FR-013→T019–T025; FR-011 y FR-012→T026–T030; FR-014 y FR-015→T031–T035. SC-001→US1, SC-002→US2, SC-003→US3, SC-004→US4, SC-005→US5, SC-006→US2/US4/US5, SC-007→T031/T033. Cualquier requisito fallido mantiene la tarea abierta y bloquea merge.

## Phase 9: Convergence

- [x] T036 Completar controles móviles del registro en frontend/src/modules/materias/RosterReview.tsx y ExistingStudentsDialog.tsx: texto de campos 16 px, objetivos táctiles de confirmación >=44 px y prueba dirigida de dimensiones/foco según FR-014 y plan: accesibilidad (partial, MEDIUM).
- [x] T037 Añadir verificación real de viewport reducido y orientación/foco/scroll del editor y perfil en frontend/e2e/p2-responsive.spec.ts y profile.spec.ts; registrar límites de teclado nativo en quickstart.md según SC-007, FR-014 y US1/Edge Cases (partial, MEDIUM).

## Phase 10: Convergence

- [x] T038 Refrescar el estado del lote bajo bloqueo antes de confirmar o sustituir filas en backend/app/modules/importacion_estudiantes/service.py; probar dos sesiones con el lote previamente cargado y rechazo de edición tras confirmación externa en backend/tests/integration/test_roster_import_flow.py, conservando una sola alta y secretos emitidos una sola vez según FR-007, FR-010, FR-013 y plan: replay transaccional (partial, HIGH).
