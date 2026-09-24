# Plan: Flujo docente móvil de calificación

**Rama**: `codex/043-flujo-docente-movil` | **Fecha**: 2026-09-23 | **Spec**: [spec.md](./spec.md) | **Issue**: #131

## Resumen

Refinar el centro de calificaciones existente sin cambiar sus contratos ni reglas de negocio. La implementación reorganizará únicamente la presentación móvil: contexto compacto, búsqueda y filtros persistentes, pestañas fijas, agrupación de acciones secundarias y una barra inferior cuyo contenido deriva del estado y los permisos existentes.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6, React 18
**Dependencias**: React Router 7, TanStack Query 5, Tailwind CSS 3, componentes UI internos y Lucide
**Persistencia**: No aplica; se preservan parámetros de URL y estado local existentes
**Pruebas**: Vitest, Testing Library, typecheck, lint y validación Playwright CLI en navegador real
**Plataforma objetivo**: Navegadores móviles desde 360×800 y escritorio sin regresiones
**Rendimiento y escala**: Escritura inmediata; búsqueda diferida 300 ms; ninguna navegación móvil bloqueada por consultas; controles táctiles mínimos de 44 px

## Verificación de la constitución

- Separación de roles: cumple; la vista sigue protegida por rol y permisos existentes.
- Integridad y trazabilidad: cumple; no cambia cálculo, confirmación, publicación ni historial.
- Asincronía e idempotencia: cumple; mantiene consultas cancelables, estados de procesamiento y mutaciones vigentes.
- Datos y secretos: cumple; no agrega persistencia ni datos sensibles.
- Accesibilidad: cumple; incorpora áreas táctiles, etiquetas, foco visible y validación desde 360 px.
- Gobernanza y pruebas: cumple; issue #131, especificación aprobada, plan aprobado y pruebas focalizadas.

## Estructura del proyecto

```text
frontend/src/modules/calificaciones/
├── CalificacionesWorkspace.tsx
├── CalificacionesWorkspace.mobile.test.tsx
└── review-triage/

specs/043-flujo-docente-movil/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
├── quickstart.md
└── tasks.md
```

## Decisiones y complejidad

- Se conserva una sola ruta de calificación; no se crea una segunda pantalla móvil que pueda divergir.
- El estado de materia, evaluación, filtro, estudiante, pregunta y hoja continúa en la URL para permitir reanudación y enlaces profundos.
- Las acciones avanzadas no se eliminan: se agrupan en móvil y mantienen su distribución actual en escritorio.
- La barra inferior no replica lógica de negocio; invoca los mismos callbacks y permisos que los controles existentes.
- No se modifica el inicio docente ni la navegación de materias en esta entrega para mantener el cambio pequeño y verificable.
