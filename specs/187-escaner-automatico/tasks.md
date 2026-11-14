# Tareas: La hoja se endereza y gira sola al tomar la foto

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #394. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #394).

### Pruebas primero (RED)

- [X] T001 `test_evidence_scan_suggestion.py`: contrato de orientación, rechazo de respuestas no confiables, cuatro vistas giradas en sentido horario, una consulta con cuatro imágenes y caché propia, abstención, ruta privada que niega antes de leer. RED: no existían. (FR-001, FR-002)
- [X] T002 `cornerAssistance.test.ts`: ruta propia y solo 0/90/180/270. `EvidenceScanEditor.test.tsx`: abre en la preparada y gira, el giro manual gana, sin sugerencia si ya venía girada, sin bordes abre en esquinas, fallo sin cambios. RED: no existían. (FR-003, FR-004, FR-005)

### Implementación (GREEN)

- [X] T003 Orientación y flujo común en el backend, y rutas. (FR-001, FR-002)
- [X] T004 Cliente, capacidad, selector y editor. (FR-003, FR-004, FR-005)

### Validación

- [X] T005 Pruebas del escáner (backend y frontend), tipos, lint, E2E del escáner, captura, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Dependencias

T001 → T003. T002 → T004. T005 al final.
