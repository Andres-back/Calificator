# Especificación: Selección “Todos” al matricular estudiantes

**Rama**: `codex/064-matricular-todos` | **Creada**: 2026-09-23 | **Estado**: Aprobada | **Issue**: #133

## Escenarios de usuario y pruebas

### Historia 1 - Seleccionar en bloque estudiantes visibles (Prioridad: P1)

Como docente, necesito seleccionar todos los estudiantes mostrados en el diálogo de estudiantes existentes para matricular un grupo sin marcar cada cuenta individualmente.

**Razón de prioridad**: Reduce una tarea repetitiva y evita errores al reutilizar cuentas ya creadas en otras materias.

**Prueba independiente**: Con varias cuentas visibles, pulsar “Todos” las selecciona y el botón de matrícula refleja la cantidad seleccionada.

**Aceptación**:

1. **Dado** un listado con estudiantes disponibles, **cuando** el docente pulsa “Todos”, **entonces** quedan seleccionados todos los estudiantes visibles.
2. **Dado** que todos los estudiantes visibles están seleccionados, **cuando** pulsa nuevamente “Todos”, **entonces** se desmarcan los estudiantes visibles.
3. **Dada** una búsqueda activa, **cuando** pulsa “Todos”, **entonces** solo cambia la selección de los resultados visibles y conserva la selección previa de cuentas ocultas por el filtro.

### Casos límite

- Si no hay estudiantes visibles, el control “Todos” permanece deshabilitado.
- Si una parte de los resultados ya está seleccionada, “Todos” completa la selección visible.
- El cierre del diálogo conserva el comportamiento actual y no matricula sin confirmación.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE mostrar un control táctil visible llamado “Todos” junto al listado de estudiantes existentes.
- **FR-002**: El control DEBE seleccionar todos los estudiantes que coincidan con el filtro visible.
- **FR-003**: Si todos los estudiantes visibles ya están seleccionados, el mismo control DEBE desmarcarlos.
- **FR-004**: El sistema DEBE conservar selecciones que no estén visibles por una búsqueda activa.
- **FR-005**: La cantidad del botón “Matricular” DEBE reflejar el total real seleccionado.
- **FR-006**: El cambio NO DEBE modificar contratos del backend ni crear matrículas hasta que el docente confirme.
- **FR-007**: El control DEBE ser accesible mediante teclado y tener un objetivo táctil mínimo de 44 píxeles.

## Criterios de éxito

- **SC-001**: Un docente puede seleccionar un grupo visible completo con una sola acción.
- **SC-002**: Seleccionar o desmarcar todos responde inmediatamente y sin alterar estudiantes ocultos por el filtro.
- **SC-003**: La matrícula individual y el envío actual continúan funcionando sin regresiones.
- **SC-004**: El flujo es utilizable desde 360 píxeles de ancho sin desbordamiento horizontal.

## Supuestos

- “Todos” se refiere a todos los resultados actualmente visibles, no a cuentas ocultas por una búsqueda.
- El backend actual acepta el conjunto seleccionado y no requiere cambios.
- La solicitud del usuario constituye aprobación del comportamiento descrito para este cambio acotado.
