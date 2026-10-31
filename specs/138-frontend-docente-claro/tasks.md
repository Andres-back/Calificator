# Tareas: Frontend docente claro y contextual

## Fase 1: Preparación

- [x] T001 Registrar alcance aprobado e issue295; rama aislada y artefactos de diseño en specs/138-frontend-docente-claro/{spec,plan,research,data-model,contracts/frontend,quickstart}.md. FR-001–FR-012.
- [x] T002 Revisar checklists/ux.md por delegación explícita del usuario y ejecutar Analyze sobre specs/138-frontend-docente-claro/{spec,plan,tasks}.md; maqueta previa en frontend/output/spec138-design/propuesta.html y capturas384/1440. FR-010–FR-012.

## Fase 2: Fundamentos

- [x] T003 Añadir pruebas RED del contrato de ruta/contexto/permisos en frontend/src/modules/calificaciones/reviewRoutes.test.ts y de navegación docente en frontend/e2e/teacher-review-context.spec.ts. FR-005–FR-010; SC-003–SC-005.

## Fase 3: US1 Revisión sin ruido

- [x] T004 [P] [US1] Trasladar cobertura técnica de frontend/src/modules/calificaciones/components/GradeBreakdown.test.tsx a GradeAnalysisDetails.test.tsx antes de separar GradeAnalysisDetails.tsx y ReviewHelp.tsx; conservar aviso/colores/evidencia/estudiante y puntajes137. FR-001/FR-002/FR-009; SC-001/SC-003.
- [x] T005 [P] [US1] Unificar copy propio Retroalimentación y quitar CTA duplicado individual en frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx y tests relacionados; conservar barra compartir/imprimir, dirty/busy/permisos/recuperación. FR-003/FR-004/FR-009; SC-002/SC-003.
- [x] T006 [US1] Integrar ayuda/historial y Nota sugerida/Nota final en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx sin modificar su lógica académica ni duplicar estado. FR-001–FR-004/FR-009; SC-001–SC-003.

## Fase 4: US3 Celular y pendientes

- [x] T007 [P] [US3] Sustituir selector móvil por nav horizontal existente en frontend/src/modules/materias/MateriaDetailPage.tsx; actualizar sus pruebas y e2e/p2-responsive.spec.ts sin perder guards/foco. FR-008/FR-010; SC-004/SC-005.
- [x] T008 [US3] Adaptar frontend/src/modules/dashboard/TeacherInbox.tsx y acceso global de CalificacionesWorkspace.tsx/config/nav.ts a Pendientes/selectorcompatible, gated submissions.review, totales y muestra honestos con pruebas. FR-007/FR-009; SC-003/SC-005.

## Fase 5: US2 Contexto compartido

- [x] T009 [US2] Implementar reviewRoutes.ts, ReviewContextNavigation.tsx y ruta hermana en frontend/src/router.tsx; actualizar AppShell.tsx/Topbar.tsx/lib/analytics.ts con matchercompartido y permisos existentes. FR-005/FR-006/FR-009; SC-003/SC-005.
- [x] T010 [US2] Sincronizar path/query/changeContext/returnToReview, validar materia-evaluación y resolver una vuelta por nivel en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx; mantener bloqueos y retorno libro validado. FR-005/FR-006/FR-009; SC-003.
- [x] T011 [US2] Actualizar iniciadores frontend/src/modules/materias/{MateriaEvaluaciones,MateriaVistaGeneral,MateriaBoletin}.tsx, dashboard/TeacherInbox.tsx, calificaciones/{teacherReviewResume,GradingJobMonitor}.ts(x) y feedback_sharing/FeedbackToolsButton.tsx mediante constructorcompatible y pruebas de enlaces completos/roles. FR-005–FR-007/FR-009; SC-003/SC-005.

## Fase 6: US4 Proceso y cierre

- [x] T012 [US4] Añadir declaración agrega/reutiliza/retira y maqueta/capturas384px a las plantillas efectivas .specify/templates/overrides/{spec,plan,tasks}-template.md; actualizar contratos dueños specs/008-calificaciones y frontend, sin tocar constitución ni exigir modificar specs históricas. FR-011/FR-012.
- [x] T013 Ejecutar unidades/lint/tipos/build/auditorías y regresiones de enlaces/boletín/estudiante/puntajes137, matriz384/1440 dos temas, texto200% y scroll en frontend/e2e/teacher-review-context.spec.ts; registrar resultados reales en specs/138-frontend-docente-claro/quickstart.md. FR-001–FR-012; SC-001–SC-005.
- [x] T014 Regenerar specs/system-inventory/current.json, actualizar gobernanza de spec138 en tests/spec_governance/test_spec_baseline.py y ejecutar pruebas; Converge y preparación de PR en specs/138-frontend-docente-claro/tasks.md/quickstart.md, sin afirmar CI/despliegue pendientes. FR-012; SC-003–SC-005.

## Dependencias y estrategia

T001→T002→T003. T004/T005/T007 pueden desarrollarse en paralelo tras la revisión y las pruebas RED de su área, sin editar archivos compartidos. T006 requiere T004/T005; T008 reutiliza T009 cuando usa destinos contextuales. T009→T010→T011; T006/T007/T008/T010/T011 preceden T013. T012 independiente de código, T014 cierra todo. Los contratos/artefactos se revisan por el agente principal; la delegación no decide excepciones de gobernanza.

Incremento1 comprobable: T004–T007, limpieza sin cambiar rutas. Incremento2: T008–T011, contexto con mismo workspace. No declarar entrega completa con solo el primer incremento. Publicar PR/ejecutar CI sucede después del commit de tareas terminadas; fusionar requiere autorización y todos los controles verdes, no parte de una casilla que prometa éxito remoto previo.
