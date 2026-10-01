# Tareas: Flujo docente contextual y resultados ordenados

Alcance y plan ampliados aprobados mediante «SIGUE» el 2026-09-30; revisión de calidad autorizada. La lista cubre las cinco historias, con datos sintéticos y sin cambios de backend ni notas persistidas.

## Fase 1: Preparación

- [x] T001 Registrar aprobación ampliada en specs/078-asistencia-libro-notas/spec.md y plan.md; issue #163. Fusión/despliegue separados.
- [x] T002 Revisar specs/078-asistencia-libro-notas/checklists/ux.md y analizar cobertura completa de spec.md, plan.md y tasks.md antes de código.

## Fase 2: Fundamentos

- [x] T003 Comprobar ignorados, permisos y fixtures sintéticos existentes en .gitignore, frontend/eslint.config.js y frontend/e2e/mock; sin dependencias nuevas. FR-010/FR-011.

## Fase 3: Historia 1 — Búsqueda de asistencia

**Prueba independiente**: buscar, marcar, limpiar y guardar grupo completo sin perder observaciones; pendientes ocultos impiden guardar.

- [x] T004 [US1] Ampliar frontend/src/modules/materias/attendanceModel.test.ts con coincidencias, posición original, 100 alumnos, borrador y payload íntegros. FR-001/FR-002/FR-003/FR-011.
- [x] T005 [US1] Añadir helper puro de búsqueda en frontend/src/modules/materias/attendanceModel.ts, sin cambiar funciones de guardado. FR-001/FR-002.
- [x] T006 [US1] Integrar búsqueda, cantidad, limpiar, vacío y texto global en frontend/src/modules/materias/MateriaAsistencia.tsx. FR-001/FR-002/FR-003/FR-010.

## Fase 4: Historia 2 — Notas de toda una evaluación

**Prueba independiente**: dos evaluaciones, 30 alumnos, una selección, lista completa y compacta; filtrar no escribe y «Todas» restaura seguimiento.

- [x] T007 [US2] Ampliar frontend/src/modules/materias/gradebookModel.test.ts y crear frontend/src/modules/materias/MateriaBoletin.test.tsx para selección, estados, lista íntegra, fallback y consultas correctas. FR-004/FR-005/FR-006/FR-007/FR-011/FR-012.
- [x] T008 [US2] Integrar selección y consultas por evaluación en frontend/src/modules/materias/MateriaBoletin.tsx, conservando asociación por ID, carga/error y refresco. FR-004/FR-005/FR-006/FR-007/FR-011.
- [x] T009 [US2] Presentar lista compacta con nombre, nota/estado y detalle contextual; plegar indicadores y textos ampliados en frontend/src/modules/materias/MateriaBoletin.tsx. FR-005/FR-010/FR-012.
- [x] T010 [US2] Mantener «Todas», filtros combinados, recuperación y presentación estudiantil intactos en frontend/src/modules/materias/MateriaBoletin.tsx. FR-006/FR-007/FR-009/FR-011.

## Fase 5: Historia 3 — Navegación contextual

**Prueba independiente**: sin enlace redundante del docente, con botones/rutas anteriores y fallback del rol personalizado; menús estudiante/admin intactos.

- [x] T011 [US3] Ampliar frontend/src/config/studentNavigation.test.ts con ruta contextual, fallback y no ampliación de permisos. FR-008/FR-009/FR-011.
- [x] T012 [US3] Centralizar regla de navegación en frontend/src/config/nav.ts y reutilizarla en frontend/src/components/layout/Sidebar.tsx. FR-008/FR-009.

## Fase 6: Historia 4 — Resultado ordenado

**Prueba independiente**: abrir nota desde evaluación; cuatro secciones, respaldo real, enlaces profundos, guardas y retorno con filtros.

- [x] T013 [US4] Extender frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx y frontend/src/modules/materias/MateriaEvaluaciones.test.tsx con orden, apertura y enlace contextual. FR-013/FR-014/FR-015/FR-016; SC-008/SC-009.
- [x] T014 [US4] Actualizar «Notas y entregas» en frontend/src/modules/materias/MateriaEvaluaciones.tsx y contexto/retorno en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx sin nuevas rutas. FR-013/FR-009.
- [x] T015 [US4] Reorganizar PanelDetalle en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx en cuatro secciones con evidencia/comparación plegadas en todos los tamaños y alertas visibles. FR-010/FR-014/FR-016.
- [x] T016 [US4] Mostrar explicación registrada y comparación compacta en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y frontend/src/modules/calificaciones/components/GradeBreakdown.tsx preservando ajuste global y ausencia histórica. FR-015/FR-014.
- [x] T017 [US4] Mantener deep links, cambios sin guardar, edición/publicación/evidencia/PQRS/historial con regresión de frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx y frontend/e2e/mock/grading-review.mock.spec.ts. FR-011/FR-013/FR-016; SC-009.

## Fase 7: Historia 5 — Creación contextual

**Prueba independiente**: A→B→A y formato anterior; contexto fijo, opciones con resumen y revisión intacta.

- [x] T018 [US5] Ampliar frontend/src/modules/evaluaciones/components/generationWizardModel.test.ts para aislamiento y compatibilidad del borrador. FR-019; SC-010.
- [x] T019 [US5] Aislar borradores por materia en frontend/src/modules/evaluaciones/components/generationWizardModel.ts sin eliminar trabajo ajeno. FR-019.
- [x] T020 [US5] Ampliar frontend/src/modules/evaluaciones/components/GenerationWizard.test.tsx con contexto, opciones/errores progresivos, escala/rúbrica y edición intactas. FR-017/FR-018/FR-019; SC-010.
- [x] T021 [US5] Simplificar contexto y opciones complementarias de frontend/src/modules/evaluaciones/components/GenerationWizard.tsx conservando revisión y payload. FR-010/FR-017/FR-018/FR-019.
- [x] T022 [US5] Verificar frontend/src/modules/evaluaciones/EvaluacionesPage.tsx y frontend/src/modules/evaluaciones/components/DigitalizarEvaluacionModal.tsx: entrada general/contextual autorizada y edición sin cambiar datos. FR-017/FR-011.

## Fase final: Validación

- [x] T023 Añadir escenarios UI sintéticos en frontend/e2e/mock para asistencia, dos evaluaciones/30 alumnos, cuatro secciones, creador contextual y seis combinaciones tamaño/tema; demostrar SC-001–010 y FR-001–019.
- [x] T024 Ejecutar tipos, lint, pruebas frontend, build y UI; registrar resultados en specs/078-asistencia-libro-notas/quickstart.md sin afirmaciones productivas no comprobadas. FR-010/FR-011.
- [x] T025 Registrar evolución en specs/README.md, tests/spec_governance/test_spec_baseline.py y regenerar specs/system-inventory según scripts/build_system_inventory.py; ejecutar gobernanza.
- [x] T026 Ejecutar convergencia y cerrar tasks.md solo con evidencia; preparar PR enlazado a #163 y CI obligatorio. Sin fusión/despliegue sin autorización.
- [x] T027 Actualizar frontend/e2e/explainable-grading.spec.ts y frontend/e2e/p2-responsive.spec.ts al recorrido progresivo aprobado; conservar regresión de ajustes, historial, ausencia de datos, procesamiento, scroll y permisos; ejecutar los 73 escenarios E2E existentes sin omitirlos. FR-009/FR-010/FR-014/FR-015/FR-016.

## Dependencias y estrategia

T001–003 antes de código. En cada historia: pruebas antes de implementación, después regresión focal. US1, US2, US4 y US5 son independientes; US3 conserva el recorrido contextual de US4. Priorizar US4/US5 (P1) antes de ejecutar US3 (P2), conservando los IDs originales T011/012. T023–026 requieren las cinco historias. MVP: asistencia; entrega completa incluye lista compacta, resultado ordenado, creador contextual y menú. 26 tareas: preparación 3, US1 3, US2 4, US3 2, US4 5, US5 5, final 4.

Trabajo paralelo posible sin agentes: lectura de fixtures y pruebas de modelos en archivos distintos. No se propone delegación ni ejecución simultánea sobre archivos compartidos.

## Seguimiento de CI y autorización de fusión

El CI remoto del PR #164 detectó 17 regresiones de selectores/estado inicial del flujo anterior (56 escenarios aprobados). T027 corrige las pruebas existentes, no cambia el alcance funcional ni elimina aserciones de integridad. El usuario autoriza fusión y producción mediante «fusion y produccion deja el codigo limpio y sostenible encargate de buena pacticas»; continúan siendo obligatorios CI verde y verificación posterior de solo lectura.
