# Tasks: Optimizar fluidez y organización del frontend

**Input**: Documentos de diseño en `specs/074-optimizar-frontend/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-behavior.md

## Phase 1: Setup y línea base

**Purpose**: Capturar el comportamiento vigente y preparar validaciones reproducibles.

- [x] T001 Registrar tamaños base y precargas actuales en `specs/074-optimizar-frontend/quickstart.md` (SC-003, SC-004)
- [x] T002 [P] Añadir auditoría de artefactos públicos compilados en `frontend/scripts/audit-build.mjs` y conectarla en `frontend/package.json` (FR-004, FR-005, FR-006)
- [x] T003 [P] Añadir regresión de búsqueda por ráfaga y estabilidad visual en `frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx` (US1, FR-001, FR-002, SC-001)

---

## Phase 2: User Story 1 - Buscar calificaciones sin bloqueos (Priority: P1) 🎯 MVP

**Goal**: Proteger el buscador fluido ya existente y evitar que una regresión vuelva a consultar por cada tecla.

**Independent Test**: Escribir varias letras antes de 300 ms produce una sola consulta con el valor final y mantiene la lista anterior durante la transición.

- [x] T004 [US1] Ajustar el buscador únicamente si la regresión detecta una brecha en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` (FR-001, FR-002)
- [x] T005 [US1] Ejecutar la regresión móvil de calificaciones y documentar el resultado en `specs/074-optimizar-frontend/quickstart.md` (SC-001)

---

## Phase 3: User Story 2 - Navegar con menos esperas y consumo (Priority: P1)

**Goal**: Eliminar tráfico periódico estable y reducir la transferencia inicial sin ocultar procesos activos.

**Independent Test**: Las vistas estables permanecen treinta segundos sin nuevas solicitudes; una entrega en proceso sigue actualizando; el build público no precarga chunks internos y usa WebP.

- [x] T006 [P] [US2] Añadir pruebas de política de actualización estable/transitoria en `frontend/src/modules/evaluaciones/ResolverEvaluacionPage.test.tsx`, `frontend/src/modules/materias/MateriaEvaluaciones.test.tsx` y pruebas nuevas equivalentes de boletín/Xali (FR-003, FR-011, SC-002)
- [x] T007 [P] [US2] Generar variantes WebP dimensionadas en `frontend/public/branding/` conservando los PNG fuente (FR-004, FR-006, SC-004)
- [x] T008 [US2] Retirar intervalos incondicionales y conservar seguimiento transitorio en `frontend/src/modules/evaluaciones/EvaluacionesPage.tsx`, `frontend/src/modules/evaluaciones/ResolverEvaluacionPage.tsx`, `frontend/src/modules/materias/MateriaEvaluaciones.tsx`, `frontend/src/modules/materias/MateriaBoletin.tsx`, `frontend/src/modules/calificaciones/BoletinPage.tsx` y `frontend/src/modules/xali/XaliPage.tsx` (FR-003, FR-011)
- [x] T009 [P] [US2] Sustituir consumidores por WebP y carga apropiada en `frontend/src/modules/auth/`, `frontend/src/components/layout/`, `frontend/src/modules/dashboard/`, `frontend/src/modules/evaluaciones/`, `frontend/src/modules/materias/` y `frontend/src/modules/xali/` (FR-004, FR-006)
- [x] T010 [US2] Filtrar precargas de entrada HTML en `frontend/vite.config.ts` sin alterar precargas de importaciones dinámicas (FR-005)
- [x] T011 [US2] Validar build, tamaño, recursos y procesos activos con `frontend/scripts/audit-build.mjs` y `specs/074-optimizar-frontend/quickstart.md` (SC-002, SC-003, SC-004)

---

## Phase 4: User Story 3 - Encontrar acciones sin redundancia en móvil (Priority: P2)

**Goal**: Acortar tableros y hacer descubrible la navegación interna sin retirar destinos ni permisos.

**Independent Test**: A 360 px se puede ingresar, recuperar acceso una sola vez, cambiar de sección de materia y alcanzar todas las acciones autorizadas; la bandeja vacía ocupa un bloque.

- [x] T012 [P] [US3] Ampliar pruebas públicas para acciones móviles y recuperación única en `frontend/src/modules/auth/LandingPage.test.tsx` y una prueba de `frontend/src/modules/auth/LoginPage.tsx` (FR-007, FR-008)
- [x] T013 [P] [US3] Ampliar pruebas de sección móvil y permisos en `frontend/src/modules/materias/MateriaDetailPage.test.tsx` (FR-009, FR-012)
- [x] T014 [P] [US3] Ampliar pruebas de bandeja compacta y acciones únicas en `frontend/src/modules/dashboard/DashboardPage.test.tsx` y `frontend/src/modules/dashboard/DashboardEstudiante.test.tsx` (FR-010)
- [x] T015 [US3] Mostrar ingreso móvil y una recuperación única en `frontend/src/modules/auth/LandingPage.tsx` y `frontend/src/modules/auth/LoginPage.tsx` (FR-007, FR-008)
- [x] T016 [US3] Implementar selector de sección móvil basado en permisos y ruta en `frontend/src/modules/materias/MateriaDetailPage.tsx` (FR-009, FR-012, FR-013)
- [x] T017 [US3] Compactar estado vacío y conservar listas con casos en `frontend/src/modules/dashboard/TeacherInbox.tsx` (FR-010)
- [x] T018 [US3] Eliminar duplicados de igual jerarquía conservando destinos en `frontend/src/modules/dashboard/DashboardPage.tsx` y `frontend/src/modules/dashboard/DashboardEstudiante.tsx` (FR-010)
- [x] T019 [US3] Compactar métricas administrativas en móvil sin cambiar consultas en `frontend/src/modules/dashboard/DashboardAdmin.tsx` (FR-010, FR-013)

---

## Phase 5: Polish y verificación transversal

- [x] T020 Ejecutar `npm run audit:actions`, lint, TypeScript, unitarias, build y auditoría de build desde `frontend/package.json` (SC-006, SC-007)
- [x] T021 Ejecutar Playwright mock, accesibilidad y visual en los tamaños de `specs/074-optimizar-frontend/quickstart.md` (FR-013, SC-005)
- [x] T022 Revisar CSP sin ampliar orígenes y documentar ruido externo en `specs/074-optimizar-frontend/quickstart.md` (FR-014)
- [x] T023 Ejecutar Converge contra `specs/074-optimizar-frontend/spec.md`, `plan.md` y `tasks.md`; completar cualquier tarea añadida (FR-001–FR-014)
- [ ] T024 Abrir PR enlazado a issue #155 y exigir gobernanza/CI verde antes de fusionar (SC-007, Constitución VII–VIII)

---

## Dependencies & Execution Order

- Phase 1 establece las regresiones y mediciones.
- US1 puede cerrarse de inmediato si la regresión confirma el debounce existente.
- US2 depende de T002 para auditar el build y de T006 antes de retirar intervalos.
- US3 es independiente de US2 salvo por los recursos WebP compartidos.
- Phase 5 depende de las historias seleccionadas completas.

## Parallel Opportunities

- T002 y T003 pueden ejecutarse en paralelo.
- T006 y T007 pueden ejecutarse en paralelo.
- T009 puede avanzar por módulos después de T007 mientras T008 cubre consultas.
- T012, T013 y T014 son pruebas en archivos separados.

## Implementation Strategy

1. Proteger el buscador existente como MVP.
2. Reducir tráfico y peso sin cambiar comportamiento funcional.
3. Reorganizar móvil preservando destinos.
4. Ejecutar toda la matriz proporcional al riesgo y converger antes del PR.
