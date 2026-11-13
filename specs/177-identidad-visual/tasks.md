# Tareas: Identidad visual — isotipo legible, iconos ilustrados en la revisión y páginas de error

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #374. Aprobados por el usuario el 2026-11-12: dio permiso abierto para mejorar la imagen visual y aprobó por adelantado las specs de estas mejoras (`spec-approved` y `plan-approved` en #374).

### Pruebas primero (RED)

- [X] T001 `EducationalIcon.test.tsx`: 51 ilustraciones publicadas, con los tres nombres nuevos. RED: faltaban los tres archivos. (FR-002, FR-004)
- [X] T002 `ReviewNavigation.test.tsx`: cada opción de la revisión muestra su icono ilustrado. (FR-002)
- [X] T003 `brandAssets.test.ts`: existen el isotipo y las dos ilustraciones de error, pesan menos de 60 KB y las cuatro pantallas con marca usan el isotipo; las páginas de error conservan mensaje y acciones. (FR-001, FR-003, FR-004)

### Implementación (GREEN)

- [X] T004 Generar las cinco imágenes con la CLI de Codex, posprocesarlas y revisarlas sobre claro y oscuro. (FR-004)
- [X] T005 `logo-mark.webp` y su uso en menú, portada, inicio de sesión y registro. (FR-001)
- [X] T006 Tres nombres nuevos en `EducationalIcon` y su uso en `ReviewNavigation`. (FR-002)
- [X] T007 Ilustración en `NotFoundPage` y `ForbiddenPage`. (FR-003)

### Validación

- [X] T008 Suite del frontend, tipos y lint; capturas locales antes y después a 1440 y 390 px, en claro y oscuro; inventario y gobernanza; resultados en `quickstart.md`. (FR-001 a FR-004)

## Dependencias

T004 → T006, T007. T001 a T003 acompañan a T005 a T007. T008 al final.
