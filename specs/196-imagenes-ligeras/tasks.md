# Tareas: Recursos con imagen que abren rápido

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #412. Aprobados por el usuario el 2026-11-16: pidió seguir con esta mejora (`spec-approved` y `plan-approved` en #412).

### Pruebas

- [X] T001 La respuesta no trae la imagen incrustada y sí su enlace; sin imagen real no cambia. (FR-001)
- [X] T002 La imagen sale en WebP y más liviana; nunca más pesada que la original; transparencia y tope de tamaño. (FR-002, FR-005)
- [X] T003 El punto de acceso responde 200 con caché, 304 con la huella y 404 sin recurso o sin imagen. (FR-002, FR-003, FR-006)
- [X] T004 Al editar se conserva la imagen guardada. (FR-004)

### Implementación

- [X] T005 Módulo `image_delivery.py`. (FR-001, FR-002, FR-004, FR-006)
- [X] T006 Respuestas livianas en el router y punto de acceso de imagen. (FR-001, FR-002, FR-003, FR-006)
- [X] T007 `update_material` conserva la imagen. (FR-004, FR-005)

### Validación

- [X] T008 Comprobación real en local con imágenes de producción (solo lectura): tamaños, caché, estudiante, edición y sin sesión; capturas en 390 px. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)
- [X] T009 Pruebas, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)

## Dependencias

T001–T004 → T005–T007. T008 y T009 al final.
