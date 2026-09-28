# Implementation Plan: Aislar y organizar el flujo del estudiante

**Branch**: `codex/074-aislar-flujo-estudiante` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md) | **Issue**: #153

## Summary

Corregir la interpretación de permisos compartidos en el frontend sin cambiar permisos ni contratos del backend. Se añadirá una clasificación reutilizable entre estudiante estándar y perfil elevado/personalizado; las rutas de autoría se protegerán con esa clasificación además de sus permisos; las pestañas y tarjetas de materia usarán el contexto real de gestión; y Presentaciones ofrecerá textos y estados estudiantiles cuando muestre contenido publicado a un estudiante estándar.

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3

**Primary Dependencies**: React Router 7, Zustand 5, TanStack Query 5, Tailwind CSS 3.4, Framer Motion 11

**Storage**: N/A; no cambia persistencia ni permisos guardados

**Testing**: Vitest 4, Testing Library, TypeScript, ESLint y Playwright para validación móvil y de rutas

**Target Platform**: Aplicación web responsiva en navegador, desde 360 px hasta escritorio

**Project Type**: Frontend de aplicación web existente con API FastAPI sin cambios contractuales

**Performance Goals**: La clasificación de perfil y el filtrado de navegación deben ser sincrónicos y no añadir solicitudes de red

**Constraints**: Conservar permisos de lectura estudiantiles, roles personalizados y rutas públicas existentes; no alterar notas, matrículas ni contenido almacenado

**Scale/Scope**: Guardas de rutas, navegación contextual de materias, tarjetas de evaluaciones y presentación estudiantil de contenido publicado

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Separación estricta de roles**: PASS. El hotfix elimina capacidades visuales docentes del estudiante estándar y conserva la autoridad del backend.
- **II. Integridad de calificaciones**: PASS. No cambia cálculos, estados ni escrituras de calificación.
- **III. Procesamiento asíncrono**: PASS. No cambia trabajos ni colas.
- **IV. Evolución segura de datos**: PASS. No hay migración ni eliminación de datos.
- **V. Accesibilidad**: PASS. Se validan navegación táctil y ancho de 360 px.
- **VI. IA intercambiable y secretos**: PASS. No cambia proveedores ni credenciales.
- **VII. Especificación y pruebas**: PASS. Issue #153, spec aprobada como hotfix, tareas trazables y regresiones obligatorias.
- **VIII. Main protegida**: PASS. Rama y PR; no habrá push directo a `main`.

## Project Structure

### Documentation (this feature)

```text
specs/074-aislar-flujo-estudiante/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-access.md
├── checklists/
│   ├── requirements.md
│   └── ux.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/src/
├── components/auth/
│   ├── RequireStaffSurface.tsx
│   └── RouteGuards.test.tsx
├── lib/
│   ├── authorization.ts
│   └── authorization.test.ts
├── modules/materias/
│   ├── MateriaDetailPage.tsx
│   ├── MateriaDetailPage.test.tsx
│   ├── MateriaEvaluaciones.tsx
│   └── MateriaEvaluaciones.test.tsx
├── modules/presentaciones/
│   ├── PresentacionesPage.tsx
│   └── PresentacionesPage.test.tsx
└── router.tsx
```

**Structure Decision**: El cambio se limita al frontend existente. Una utilidad pura define el tipo de perfil; un guard reutilizable protege superficies de trabajo; los componentes mantienen los permisos efectivos como segunda condición. No se crea una navegación paralela ni se duplican endpoints.

## Phase 0 Research Decisions

Las decisiones completas están en [research.md](./research.md).

1. Los permisos de lectura compartidos siguen siendo válidos para lecturas propias o publicadas y no se retiran del estudiante.
2. Una superficie docente requiere perfil elevado o personalizado y permiso efectivo.
3. Presentaciones conserva lectura estudiantil publicada, pero cambia encabezados, vacío y acciones para no simular autoría.
4. Las decisiones de tarjetas dentro de materias usan el perfil efectivo expuesto por el contexto de materia y el permiso específico; un permiso de lectura compartido no basta para el estudiante estándar.

## Phase 1 Design

- Definir `isStandardStudentProfile` y `canUseStaffSurfaces` como funciones puras sobre el usuario autenticado.
- Añadir `RequireStaffSurface`, preservando el contexto de `Outlet`, antes de los permisos en rutas docentes.
- Marcar pestañas internas como compartidas o docentes y filtrarlas por perfil elevado/personalizado más permiso efectivo.
- Hacer que `MateriaEvaluaciones` derive la variante estudiantil desde el contexto efectivo de materia, sin confundir permisos de lectura con autoría.
- Presentar `/app/presentaciones` como biblioteca asignada para un estudiante estándar y como biblioteca editorial para perfiles elevados.
- Mantener `/app/recursos/:id` y los recursos de materia como rutas legítimas del estudiante; bloquear `/app/herramientas` para estudiante estándar.

## Post-Design Constitution Check

No hay excepciones constitucionales. La doble condición perfil + permiso reduce la exposición visual sin reemplazar controles del servidor. Los roles personalizados continúan usando permisos efectivos. La solución no introduce migraciones, secretos, rutas nuevas ni cambios contractuales.

## Complexity Tracking

No se requieren excepciones ni complejidad adicional fuera de un helper y un guard reutilizables.
