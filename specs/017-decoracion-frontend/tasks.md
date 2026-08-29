# Tareas: Decoración visual transversal

## Fase 1: Preparación

- [X] T001 Inventariar activos, capas y componentes visuales existentes en frontend/public/branding y frontend/src/components (FR-002, FR-007)
- [X] T002 Generar e inspeccionar la ilustración ambiental sin texto en frontend/public/branding/learning-atmosphere-v2.webp (FR-002, FR-007, SC-006)

## Fase 2: Fundamentos

- [X] T003 Definir el contrato de ambientación y fallback en specs/017-decoracion-frontend/contracts/visual-contract.md (FR-003, FR-008)
- [X] T004 Añadir cobertura estructural de capas no interactivas en frontend/src/components/layout/AppShell.test.tsx (FR-001, FR-003)

## Fase 3: Historia 1 - Orientación visual consistente

- [X] T005 [US1] Integrar la capa ambiental compartida sin alterar Outlet ni monitores en frontend/src/components/layout/AppShell.tsx (FR-001–FR-004, FR-008)
- [X] T006 [US1] Reforzar jerarquía decorativa de cabeceras sin modificar acciones en frontend/src/components/layout/PageHeader.tsx (FR-001, FR-002, FR-005)
- [X] T007 [US1] Afinar superficies compartidas de tarjetas y estados vacíos en frontend/src/index.css y frontend/src/components/ui/EmptyState.tsx (FR-002, FR-005, FR-010)

## Fase 4: Historia 2 - Experiencia inclusiva en cualquier pantalla

- [X] T008 [US2] Implementar temas, breakpoints, fallback y movimiento reducido en frontend/src/index.css (FR-003–FR-009)
- [X] T009 [P] [US2] Ampliar verificaciones responsive y de desbordamiento en frontend/e2e/p2-responsive.spec.ts (FR-004–FR-006, FR-010, SC-002–SC-004)
- [X] T010 [P] [US2] Añadir verificaciones de accesibilidad visual en frontend/e2e/accessibility/example.a11y.spec.ts (FR-003, FR-005, FR-006, FR-009, FR-010, SC-003–SC-005)

## Fase 5: Historia 3 - Identidad visual propia y ligera

- [X] T011 [US3] Aplicar la ilustración a los inicios de profesor y estudiante en frontend/src/modules/dashboard/DashboardPage.tsx y frontend/src/modules/dashboard/DashboardEstudiante.tsx (FR-002, FR-004, FR-007)
- [X] T012 [US3] Verificar que el recurso no contiene texto, marcas externas ni controles aparentes y registrar su origen en specs/017-decoracion-frontend/quickstart.md (FR-007, SC-006)

## Fase final: Validación

- [X] T013 Ejecutar lint, tipos, pruebas unitarias y build desde frontend/package.json (FR-001, SC-005)
- [X] T014 Ejecutar recorridos visuales representativos y documentar evidencia en specs/017-decoracion-frontend/quickstart.md (FR-001, FR-004–FR-010, SC-001–SC-004)
- [X] T016 Crear auditoría estática de controles accionables en frontend/scripts/audit-actions.mjs y frontend/package.json (FR-011, SC-007)
- [X] T017 Añadir apertura automática por primera visita en frontend/src/components/ui/useFirstVisitTour.ts y sus pruebas (FR-013, FR-014, SC-008)
- [X] T018 Integrar el tour de primera visita en frontend/src/modules/calificaciones/CalificacionesPage.tsx, CalificarFotoPage.tsx, SalonPage.tsx y BoletinPage.tsx (FR-012–FR-014, SC-008)
- [X] T019 Ejecutar la auditoría de botones, corregir controles sin función y documentar resultados en specs/017-decoracion-frontend/quickstart.md (FR-011, FR-012, SC-007)
- [X] T020 Regenerar el inventario técnico determinista para registrar la nueva cobertura de rutas y componentes (FR-010, SC-001)
- [X] T021 Evitar que la ambientación cree un contexto de apilamiento que deje modales bajo la navegación y verificar los cuatro flujos del asistente IA (FR-001, FR-003, SC-001)
- [X] T015 Ejecutar convergencia, completar specs/017-decoracion-frontend/tasks.md y preparar el PR enlazado al issue #22 (FR-001–FR-014, SC-001–SC-008)

## Evolución visual de cuento y presentaciones — 2026-08-29

- [X] T022 [US1] Separar portada, personajes, narración, moraleja y preguntas del cuento en frontend/src/modules/herramientas/views/StoryContent.tsx y frontend/src/modules/herramientas/views/ContenidoView.tsx (FR-015, SC-009)
- [X] T023 [US2] Reforzar escenario, posición, controles y miniaturas en frontend/src/modules/presentaciones/PresentationPreviewModal.tsx (FR-016, SC-010)
- [X] T024 Añadir regresión focalizada y ejecutar pruebas y build del frontend en frontend/src/modules/herramientas/views/StoryContent.test.tsx y frontend/package.json (FR-001, FR-005, FR-015, FR-016)

## Evolución de iconografía personalizada — Issue #43

- [X] T025 [US3] Generar e inspeccionar cuatro iconos transparentes originales en frontend/public/branding/icons (FR-002, FR-007, FR-017, SC-006, SC-011)
- [X] T026 [US3] Integrar la iconografía mediante un componente con fallback sin reemplazar controles pequeños (FR-001, FR-008, FR-018, FR-019, SC-011)
- [X] T027 Añadir pruebas focalizadas, validar build e inventario técnico y documentar los recursos generados (FR-001, FR-005, FR-017–FR-019, SC-005, SC-011)

## Dependencias

- T001 precede a T002 y define qué activos se conservan.
## Evolución de iconografía semántica — Issue #45

- [X] T028 [US3] Inventariar navegación docente, formatos canónicos y equivalencias históricas (FR-020, FR-021, FR-022, FR-023, SC-012)
- [X] T029 [US3] Crear la familia semántica vectorial y su tablero de referencia visual (FR-020, FR-021, FR-022, SC-012)
- [X] T030 [US3] Integrar la correspondencia única en navegación, selector, listados, materia y vistas por rol (FR-020, FR-021, FR-022, FR-023, SC-012, SC-013)
- [X] T031 Retirar los activos generales reemplazados, ejecutar regresión focalizada, responsive, build e inventario técnico (FR-023, SC-012–SC-013)
- [X] T032 Corregir el contraste percibido con insignias duotono y prueba de regresión de las siete entradas docentes (FR-024)
- [X] T033 Extraer e integrar los 18 WebP de la lámina aprobada, conservar fallback SVG y validar las superficies consumidoras (FR-024, FR-025, SC-014)

- T002 y T003 preceden a la integración visual.
- T004 precede a T005 para proteger la estructura funcional.
- T005–T007 completan la historia 1 y habilitan el refinamiento transversal de T008.
- T009 y T010 pueden ejecutarse en paralelo después de T008.
- T011 depende de T002 y puede validarse independientemente del detalle de tarjetas.
- T013 y T014 requieren todas las tareas de implementación; T015 requiere validación verde.

## Estrategia incremental

El incremento mínimo es T001–T007: ambientación compartida con estructura funcional protegida. Las historias 2 y 3 añaden adaptación, verificación y expresión de marca sin introducir dependencias de negocio.

- [X] T034 Generar, limpiar e integrar 18 iconos contextuales para evaluación, revisión, materias y reportes, con fallback y validación responsive (FR-026, FR-027, FR-028, FR-029, FR-030, SC-015, SC-016, SC-017)
