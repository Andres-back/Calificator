# Tareas: Tomar varias fotos seguidas no pierde la foto ni bloquea el envío

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #390. Aprobados por el usuario el 2026-11-13: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #390).

### Pruebas primero (RED)

- [X] T001 `MultiPageEvidencePicker.scan.test.tsx`: la cámara nativa abierta sobrevive a `scanEnabled` true → false → true y true → false; la foto se agrega. RED: el control se había quitado. (FR-001)
- [X] T002 `MultiPageEvidencePicker.scan.test.tsx`: una hoja cerrada sin preparar muestra «Prepara la hoja N o usa la original» y «Abrir hoja N» la abre. RED: no había aviso. (FR-004)
- [X] T003 `MultiPageEvidencePicker.scan.test.tsx`: Atrás cierra la preparación, en modo normal y estricto, sin cambiar la dirección; cerrar con sus botones devuelve el historial. RED: no había entrada en el historial. (FR-005)
- [X] T004 `MateriaCalificar.test.tsx`: `uploadEligibilityVerified` con consulta de fondo, primera consulta y fallo; la preparación sigue encendida si la verificación cae; una hoja pendiente de preparar no muestra «Comprobando la calidad». RED: la función no existía, la preparación se apagaba y el aviso salía. (FR-002, FR-003, FR-004)

### Implementación (GREEN)

- [X] T005 `uploadEligibilityVerified` y su uso en `CalificacionesWorkspace`. (FR-002)
- [X] T006 Capacidad de preparación estable por estudiante y `qualityPending` sin las hojas pendientes de preparar en `MateriaCalificar`. (FR-003, FR-004)
- [X] T007 `MultiPageEvidencePicker`: reinicio solo por estudiante o deshabilitado, época propia para el editor y aviso de hoja pendiente. (FR-001, FR-004, FR-006)
- [X] T008 `useCloseOnBack` para la cámara y la preparación. (FR-005)

### Validación

- [X] T009 Pruebas del selector, la carga, las calificaciones y las evaluaciones; tipos y lint; inventario y gobernanza; resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)

## Dependencias

T001 → T007. T002 → T007. T003 → T008. T004 → T005, T006. T009 al final.
