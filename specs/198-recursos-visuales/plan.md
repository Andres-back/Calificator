# Plan: Ilustraciones para la portada, el inicio del docente y Crear material

**Spec**: [spec.md](spec.md) | **Issue**: [#415](https://github.com/Andres-back/Calificator/issues/415)

## Decisión

- **Generación**: `codex exec -m gpt-5.6-luna` con las ilustraciones de Xali existentes como referencia y fondo transparente.
- **Posproceso**:
  - Volver opacas las zonas interiores semitransparentes (la pantalla de Xali y algunos contornos).
  - Recortar el margen, centrar y exportar a WebP: 448–512 px las ilustraciones, 320 px la del saludo y 256 px los iconos.
- **Uso** (solo frontend, sin cambios de flujo):
  - `LandingPage.tsx`: imagen por beneficio y en la invitación a docentes.
  - `DashboardPage.tsx`: imagen junto al saludo, `hidden sm:block`.
  - `GeneratePage.tsx`: `GOAL_IMAGES` reemplaza los iconos de línea; tarjetas `flex` en celular y `sm:block` desde tableta; Xali en la pantalla de espera.

## Lección de la generación

Dos tandas de `codex` en paralelo comparten caché y cruzan los archivos. Se generó la última tanda sola, pidiendo las imágenes una por una, y se verificó el contenido de cada archivo.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/public/branding/feature-evidence.webp`, `feature-teacher-decides.webp`, `feature-learning.webp`, `community-teachers.webp`, `teacher-hero.webp`, `xali-working.webp` | ilustraciones nuevas |
| `frontend/public/branding/semantic-icons/intent-all.webp`, `intent-evaluate.webp`, `intent-practice.webp`, `intent-play.webp`, `intent-explain.webp` | iconos nuevos |
| `frontend/src/modules/auth/LandingPage.tsx` | portada |
| `frontend/src/modules/dashboard/DashboardPage.tsx` | saludo del docente |
| `frontend/src/modules/herramientas/GeneratePage.tsx` | intenciones y espera |
| `frontend/src/modules/auth/LandingPage.test.tsx`, `brandingAssets198.test.ts`, `frontend/src/modules/dashboard/DashboardPage.test.tsx` | pruebas |
