# Tareas: Aislar y organizar el flujo del estudiante

**Input**: Documentos de diseño en `specs/074-aislar-flujo-estudiante/`

**Tests**: Obligatorios por FR-009 y por tratarse de un hotfix de separación de roles.

## Fase 1: Preparación

- [x] T001 Registrar la especificación responsable en `specs/README.md` y enlazar el issue #153

## Fase 2: Fundamentos

- [x] T002 [P] Crear regresiones de clasificación para estudiante estándar, profesor, administrador y rol personalizado en `frontend/src/lib/authorization.test.ts`
- [x] T003 [P] Crear regresiones del guard de superficies docentes y preservación de contexto en `frontend/src/components/auth/RouteGuards.test.tsx`
- [x] T004 Implementar la clasificación pura de perfil efectivo en `frontend/src/lib/authorization.ts`
- [x] T005 Implementar el guard reutilizable de perfil elevado/personalizado en `frontend/src/components/auth/RequireStaffSurface.tsx`

## Fase 3: Historia 1 - Materia sin controles docentes (P1)

- [x] T006 [US1] Ampliar la regresión con permisos reales del estudiante en `frontend/src/modules/materias/MateriaDetailPage.test.tsx`
- [x] T007 [US1] Filtrar pestañas docentes mediante el perfil efectivo y conservar pestañas compartidas en `frontend/src/modules/materias/MateriaDetailPage.tsx`
- [x] T008 [US1] Proteger rutas internas de calificación, asistencia y criterios con perfil y permiso en `frontend/src/router.tsx`
- [x] T009 [US1] Añadir regresiones de acciones estudiantiles y ausencia de Calificar y revisar en `frontend/src/modules/materias/MateriaEvaluaciones.test.tsx`
- [x] T010 [US1] Derivar las acciones de evaluación desde la variante estudiantil del contexto y los permisos efectivos en `frontend/src/modules/materias/MateriaEvaluaciones.tsx`

## Fase 4: Historia 2 - Contenido compartido con lenguaje estudiantil (P2)

- [x] T011 [US2] Proteger la biblioteca editorial de recursos y los espacios de calificación para estudiantes estándar en `frontend/src/router.tsx`
- [x] T012 [US2] Añadir regresiones de textos, vacío y acciones de Presentaciones para estudiante y docente en `frontend/src/modules/presentaciones/PresentacionesPage.test.tsx`
- [x] T013 [US2] Implementar la variante estudiantil de Presentaciones sin controles editoriales en `frontend/src/modules/presentaciones/PresentacionesPage.tsx`

## Fase 5: Historia 3 - Roles personalizados conservados (P3)

- [x] T014 [US3] Permitir perfiles personalizados con permisos efectivos en rutas elevadas y en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`
- [x] T015 [US3] Cubrir con regresiones un perfil base estudiante con rol personalizado permitido y otro denegado en `frontend/src/components/auth/RouteGuards.test.tsx`

## Fase final: Validación

- [x] T016 Ejecutar Vitest focalizado para autorización, rutas, materias, evaluaciones y presentaciones desde `frontend/`
- [x] T017 Ejecutar `npm run typecheck`, `npm run lint:strict` y `npm run build` desde `frontend/`
- [x] T018 Validar a 360×800 y 390×844 los recorridos descritos en `specs/074-aislar-flujo-estudiante/quickstart.md`
- [x] T019 Ejecutar convergencia contra `specs/074-aislar-flujo-estudiante/spec.md`, `plan.md` y `tasks.md`

## Dependencias

- T002 y T003 pueden prepararse en paralelo; T004 y T005 satisfacen sus regresiones.
- T006–T010 dependen de T004–T005 y forman el MVP del hotfix.
- T011–T013 dependen del guard de T005.
- T014–T015 dependen de T004–T005 y validan que el hotfix no rompa roles personalizados.
- T016–T019 dependen de todas las historias implementadas.

## Estrategia de implementación

1. Fijar primero las regresiones con el conjunto real de permisos del estudiante.
2. Introducir una única clasificación reusable y evitar condiciones de rol dispersas.
3. Corregir materia y evaluaciones antes de las bibliotecas globales.
4. Validar perfiles personalizados y responsividad antes de abrir el PR.
