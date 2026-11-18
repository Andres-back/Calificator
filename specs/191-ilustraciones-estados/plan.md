# Plan: Ilustraciones para pantallas vacías y de error

**Spec**: [spec.md](spec.md) | **Issue**: [#404](https://github.com/Andres-back/Calificator/issues/404)

## Decisión

- Generar cinco ilustraciones con `codex exec -m gpt-5.6-luna`, con las de Xali existentes como referencia de estilo y fondo transparente.
- Posproceso: volver opacas las zonas cerradas semitransparentes (la pantalla de Xali) y pasar a WebP de 512 px en `frontend/public/branding/`.
- Usar la propiedad `image` de `EmptyState` en cada estado vacío, y una `img` decorativa en `QueryError`.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/public/branding/empty-presentations.webp`, `empty-resources.webp`, `empty-criteria.webp`, `empty-attendance.webp`, `state-error.webp` | ilustraciones nuevas |
| `frontend/src/modules/presentaciones/PresentacionesPage.tsx` | estado vacío |
| `frontend/src/modules/materias/MateriaRecursos.tsx` | estado vacío |
| `frontend/src/modules/materias/MateriaDbaPage.tsx` | dos estados vacíos |
| `frontend/src/modules/materias/MateriaAsistenciaReporte.tsx` | estado vacío |
| `frontend/src/components/ui/QueryState.tsx` | error con ilustración |
| `frontend/src/components/ui/P2Accessibility.test.tsx`, `frontend/src/modules/presentaciones/PresentacionesPage.test.tsx` | pruebas |
