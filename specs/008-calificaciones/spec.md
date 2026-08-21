# Especificación: Calificaciones, visión, PQRS y boletín

**Rama**: codex/008-calificaciones | **Creada**: 2026-08-14 | **Estado**: Aprobada | **Issue**: #9

## Escenarios de usuario y pruebas

### Historia 1 - Flujo principal (Prioridad: P1)
Como profesor o estudiante, necesito calificar, revisar, publicar, consultar y reclamar notas trazables para obtener un resultado claro, seguro y trazable.

**Prueba independiente**: El recorrido termina en estado visible, conserva datos esperados y no concede permisos ajenos.

**Aceptación**:
1. **Dado** un actor autorizado, **cuando** completa el flujo, **entonces** recibe el resultado esperado.
2. **Dado** un actor no autorizado, **cuando** intenta acceder, **entonces** se rechaza sin revelar datos.

### Historia 2 - Estados y recuperación (Prioridad: P2)
Como mantenedor, necesito permisos, estados, errores y recuperación documentados para verificar el dominio.

### Historia 3 - Especificación viva (Prioridad: P3)
Como equipo, necesito actualizar estos artefactos cuando cambie el comportamiento para evitar contradicciones.

### Casos límite
- Una entrega faltante admite nota cero manual sin evidencia y una apelación no altera nota por sí sola
- Una dependencia lenta deja estado recuperable y no duplica operaciones.
- Sesión vencida o rol incorrecto se rechazan consistentemente.

## Requisitos

### Requisitos funcionales
- **FR-001**: El flujo principal DEBE estar disponible solo para actores autorizados.
- **FR-002**: La autorización DEBE aplicarse en servidor e interfaz.
- **FR-003**: Se DEBEN conservar estas entidades: Calificacion, CalificacionEstado, CalificacionIncidencia, SalonSesion, Historial.
- **FR-004**: Carga, vacío, éxito, error y reintento DEBEN ser visibles.
- **FR-005**: Operaciones repetidas DEBEN respetar idempotencia y unicidad.
- **FR-006**: Errores NO DEBEN exponer secretos ni datos ajenos.
- **FR-007**: Contratos DEBEN estar trazados en contracts/interfaces.md.
- **FR-008**: Todo cambio futuro DEBE actualizar especificación, plan, tareas y pruebas.

### Entidades clave
- **Calificacion**: identidad, estado y relaciones definidos por el dominio.
- **CalificacionEstado**: identidad, estado y relaciones definidos por el dominio.
- **CalificacionIncidencia**: identidad, estado y relaciones definidos por el dominio.
- **SalonSesion**: identidad, estado y relaciones definidos por el dominio.
- **Historial**: identidad, estado y relaciones definidos por el dominio.

## Criterios de éxito
- **SC-001**: El 100 % de módulos, rutas y tablas declarados aparece en el índice.
- **SC-002**: Recorridos P1 se verifican sin acceso cruzado.
- **SC-003**: Cada requisito tiene tarea o evidencia.
- **SC-004**: No quedan marcadores pendientes, contradicciones críticas ni secretos.

## Supuestos
- Registra comportamiento vigente; no introduce cambios funcionales.
- Inconsistencias se convierten en issues separados.
- Se conservan arquitectura y contratos públicos.
## Inventario técnico

- [Ver superficies, permisos y cobertura de este dominio](./inventory.md).

## Extensión vigente: calificación explicable

La especificación [016-calificacion-explicable](../016-calificacion-explicable/spec.md) amplía este dominio con componentes versionados por pregunta o rúbrica, fórmula reproducible, ajustes docentes auditables, redacción de claves por rol y PQRS vinculadas a una versión. La adopción inicial es controlada y no sustituye silenciosamente la nota del flujo histórico.