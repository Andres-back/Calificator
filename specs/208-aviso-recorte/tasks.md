# Tareas: Avisar cuando el recorte de la hoja deja fuera parte de la foto

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #437. Aprobados por el usuario el 2026-11-20: ante la propuesta «advertir al recortar a mano cuando el recorte deja fuera buena parte de la foto» respondió «así es» (`spec-approved` y `plan-approved` en #437).

### Pruebas

- [X] T001 Detección con recortes reales de producción (franjas, mitad hasta el borde, columna) y casos sin aviso (foto completa, hoja dentro, un solo lado, vértice en esquina). (FR-001, FR-003)
- [X] T002 Editor: aviso al reabrir un recorte guardado y aceptación sin cambios. (FR-002, FR-004)
- [X] T003 Editor: sin aviso con una hoja detectada dentro de la foto. (FR-003)
- [X] T004 Editor: aviso al arrastrar las esquinas hacia adentro desde la foto completa. (FR-001)

### Implementación

- [X] T005 `sidesOnPhotoFrame` y `cropCutsAcrossPhoto`. (FR-001, FR-003)
- [X] T006 Aviso en `EvidenceScanEditor`. (FR-001, FR-002, FR-004)

### Validación

- [X] T007 Recorrido en el navegador con el editor real en 390 px y 1280 px. (FR-001, FR-002, FR-004)
- [X] T008 Pruebas de evidencia, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004)

## Dependencias

T001 → T005. T002 a T004 → T006. T007 y T008 al final.
