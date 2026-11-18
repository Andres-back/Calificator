# Tareas: Ilustraciones para la portada, el inicio del docente y Crear material

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #415. Aprobados por el usuario el 2026-11-16: pidió generar con GPT recursos para mejorar la interfaz (`spec-approved` y `plan-approved` en #415).

### Pruebas

- [X] T001 `LandingPage.test.tsx`: ilustraciones decorativas en beneficios e invitación. (FR-001, FR-005)
- [X] T002 `DashboardPage.test.tsx`: ilustración del saludo oculta en celular. (FR-004, FR-005)
- [X] T003 `brandingAssets198.test.ts`: toda imagen usada existe y pesa menos de 90 KB. (FR-002, FR-003, FR-005)

### Implementación

- [X] T004 Generar, identificar por contenido, corregir transparencia y exportar a WebP las once imágenes. (FR-005)
- [X] T005 Portada con ilustraciones. (FR-001)
- [X] T006 Intenciones ilustradas y compactas en celular; Xali en la espera. (FR-002, FR-003)
- [X] T007 Ilustración junto al saludo del docente. (FR-004)

### Validación

- [X] T008 Hoja de contacto en claro y oscuro; capturas en 390 px y 1440 px; pruebas, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Dependencias

T004 → T005–T007. T001–T003 → T005–T007. T008 al final.
