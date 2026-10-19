# Tareas: recursos docentes claros

## Fase 1: Preparación

- [x] T001 Registrar aprobación y checklist revisada en specs/106-recursos-vista-clara/ e issue #220; verificar ignore, rama y conservación de cambios ajenos.

## Fase 2: Fundamentos

- [x] T002 Crear pruebas y modelo puro en frontend/src/modules/herramientas/resourcePresentationModel.test.ts y resourcePresentationModel.ts para estados, filtros, contexto de cuenta/origen y acciones por permiso/autoría (FR-002, FR-006, FR-009, FR-011).

## Fase 3: US1 — encontrar y abrir

Prueba independiente: primera tarjeta visible, filtros combinados, carga incremental y regreso al origen sin mutaciones.

- [x] T003 [US1] Extender frontend/src/modules/herramientas/ListPage.test.tsx y api.test.ts para búsqueda, filtros, páginas y lectura explícita (FR-001, FR-002, FR-003, FR-011).
- [x] T004 [US1] Reorganizar frontend/src/modules/herramientas/ListPage.tsx con toolbar local, Ver recurso, resumen plegado y paginación existente en api.ts (FR-001, FR-002, FR-003, FR-011).

## Fase 4: US2 — leer y actuar

Prueba independiente: detalle legible, PDF inequívoco, acciones autorizadas y alertas conservadas sin modificar contenido.

- [x] T005 [US2] Añadir frontend/src/modules/herramientas/DetailPage.test.tsx para lectura, errores, autoría y acciones/documentos sin llamadas al abrir menús (FR-004, FR-005, FR-009, FR-012).
- [x] T006 [US2] Extraer frontend/src/modules/herramientas/components/ResourceActions.tsx y compactar DetailPage.tsx: estado, lectura, opciones, descarga/impresión segura y compartir canónico (FR-004, FR-005, FR-006, FR-009).

## Fase 5: US3 — editar sin pérdidas

Prueba independiente: editar abre sección visible, teclado no tapa campos, fallo conserva valores y salida dirty exige confirmación.

- [x] T007 [US3] Añadir pruebas de editor, descarte, respuesta tardía y error/doble toque en frontend/src/modules/herramientas/DetailPage.test.tsx y components/ResourceEditorPanel.test.tsx (FR-007, FR-008).
- [x] T008 [US3] Implementar frontend/src/modules/herramientas/components/ResourceEditorPanel.tsx y adaptar coordinación en DetailPage.tsx y entradas de MaterialContentEditor.tsx sin cambiar esquema (FR-007, FR-008, FR-010).

## Fase 6: US4 — coherencia y responsive

Prueba independiente: materia/biblioteca coherentes, lector sin acciones indebidas, mismos contenidos en 360/390/1440 y ambos temas.

- [x] T009 [US4] Alinear frontend/src/modules/materias/MateriaRecursos.tsx y su test con Ver recurso, contexto/estado y permisos; preservar StudentResourcePage y juegos (FR-003, FR-006, FR-009, FR-011, FR-012).
- [x] T010 [US4] Añadir frontend/e2e/resources-responsive.spec.ts con matriz Chromium/WebKit, ambos temas, foco, teclados/altura, menús/edición, registros intactos y medidas antes/después (FR-010, SC-001, SC-002, SC-003, SC-004, SC-005, SC-006).

## Fase final: Validación

- [x] T011 Ejecutar unitarias, tipos/lint/build/auditorías frontend y E2E de creación/estudiante; pruebas backend existentes pertinentes en entorno aislado y registrar resultados/limitaciones en specs/106-recursos-vista-clara/quickstart.md (FR-012).
- [x] T012 Actualizar propietarios specs/006-recursos-actividades/spec.md y specs/003-usuarios-materias-matriculas/spec.md, specs/README.md, tests/spec_governance/test_spec_baseline.py e inventario; ejecutar Converge y gobernanza antes de PR/CI.

## Dependencias y estrategia

T001→T002; T003 antes de T004; T005 antes de T006; T007 antes de T008. T009 reutiliza fundamentos y presentación. T010 requiere las historias, T011→T012 cierran entrega. MVP: biblioteca US1, después detalle US2, editor US3 y coherencia US4. Pruebas independientes de biblioteca/modelo podrían correr en paralelo; se implementa secuencialmente sin delegación. Las tareas que comparten DetailPage se ejecutan en orden. No fusionar ni desplegar por esta aprobación.

## Phase 8: Convergence

- [x] T013 Limitar el desplazamiento de Editar criterios al área interna de ResourceEditorPanel.tsx, sin desplazar la cabecera/pie del diálogo; añadir prueba unitaria y comprobación Chromium/WebKit de foco y visibilidad de Guardar/Cancelar según FR-007/FR-010 y plan decisión 5 (partial, F1 HIGH).

## Phase 9: Convergence

- [x] T014 Distinguir la superficie estudiantil de la ausencia de permisos de escritura en MateriaRecursos.tsx; conservar lectura docente y origen para profesor de solo lectura, sin conceder acciones, y mantener rutas del estudiante. Añadir prueba de ambos perfiles según FR-006/FR-009/FR-011 y US4/AC1 (partial, F2 HIGH).
