# Tareas: Foto o archivo también en criterios de aprendizaje e instrucciones

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #425. Aprobados por el usuario el 2026-11-17: pidió facilitar foto, archivo o texto pegado en todos los campos y buscar mejoras de ese tipo (`spec-approved` y `plan-approved` en #425).

### Pruebas

- [X] T001 Variante compacta: dos botones y sin nota de formatos. (FR-003)
- [X] T002 Instrucciones de recursos: botones, texto añadido debajo y tope de 6.000 caracteres. (FR-003, FR-004)

### Implementación

- [X] T003 Subida de criterios con `capture_text` y mensajes. (FR-001, FR-002)
- [X] T004 Variante compacta e instrucciones de recursos y presentaciones. (FR-003, FR-004)
- [X] T005 Formatos y textos en la pantalla de criterios. (FR-001, FR-005)

### Validación

- [X] T006 Pruebas de captura, recursos, presentaciones y materias; tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Dependencias

Spec 201 → todo. T001 y T002 → T004. T006 al final.
