# Especificación: Entregas y experiencia estudiante

**Rama**: codex/007-entregas-estudiante | **Creada**: 2026-08-14 | **Estado**: Aprobada | **Issue**: #8

## Escenarios de usuario y pruebas

### Historia 1 - Flujo principal (Prioridad: P1)
Como estudiante, necesito resolver en línea o entregar fotos y PDF multihoja con confirmación para obtener un resultado claro, seguro y trazable.

**Prueba independiente**: El recorrido termina en estado visible, conserva datos esperados y no concede permisos ajenos.

**Aceptación**:
1. **Dado** un actor autorizado, **cuando** completa el flujo, **entonces** recibe el resultado esperado.
2. **Dado** un actor no autorizado, **cuando** intenta acceder, **entonces** se rechaza sin revelar datos.

### Historia 2 - Estados y recuperación (Prioridad: P2)
Como mantenedor, necesito permisos, estados, errores y recuperación documentados para verificar el dominio.

### Historia 3 - Especificación viva (Prioridad: P3)
Como equipo, necesito actualizar estos artefactos cuando cambie el comportamiento para evitar contradicciones.

### Casos límite
- Hasta 10 fotos ordenadas o un PDF de 20 páginas, nunca mezclados
- Una dependencia lenta deja estado recuperable y no duplica operaciones.
- Sesión vencida o rol incorrecto se rechazan consistentemente.

## Requisitos

### Requisitos funcionales
- **FR-001**: El flujo principal DEBE estar disponible solo para actores autorizados.
- **FR-002**: La autorización DEBE aplicarse en servidor e interfaz.
- **FR-003**: Se DEBEN conservar estas entidades: Entrega, EntregaTipo, EntregaEstado, Evidencia, EvidenciaPagina.
- **FR-004**: Carga, vacío, éxito, error y reintento DEBEN ser visibles.
- **FR-005**: Operaciones repetidas DEBEN respetar idempotencia y unicidad.
- **FR-006**: Errores NO DEBEN exponer secretos ni datos ajenos.
- **FR-007**: Contratos DEBEN estar trazados en contracts/interfaces.md.
- **FR-008**: Todo cambio futuro DEBE actualizar especificación, plan, tareas y pruebas.

### Entidades clave
- **Entrega**: identidad, estado y relaciones definidos por el dominio.
- **EntregaTipo**: identidad, estado y relaciones definidos por el dominio.
- **EntregaEstado**: identidad, estado y relaciones definidos por el dominio.
- **Evidencia**: identidad, estado y relaciones definidos por el dominio.
- **EvidenciaPagina**: identidad, estado y relaciones definidos por el dominio.

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
