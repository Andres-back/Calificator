# Especificación: Xali, RAG y refuerzos

**Rama**: codex/009-xali-rag-refuerzos | **Creada**: 2026-08-14 | **Estado**: Aprobada | **Issue**: #10

## Escenarios de usuario y pruebas

### Historia 1 - Flujo principal (Prioridad: P1)
Como estudiante, necesito recibir ayuda contextual basada en entrega, respuestas y retroalimentación para obtener un resultado claro, seguro y trazable.

**Prueba independiente**: El recorrido termina en estado visible, conserva datos esperados y no concede permisos ajenos.

**Aceptación**:
1. **Dado** un actor autorizado, **cuando** completa el flujo, **entonces** recibe el resultado esperado.
2. **Dado** un actor no autorizado, **cuando** intenta acceder, **entonces** se rechaza sin revelar datos.

### Historia 2 - Estados y recuperación (Prioridad: P2)
Como mantenedor, necesito permisos, estados, errores y recuperación documentados para verificar el dominio.

### Historia 3 - Especificación viva (Prioridad: P3)
Como equipo, necesito actualizar estos artefactos cuando cambie el comportamiento para evitar contradicciones.

### Casos límite
- Sin evidencia suficiente el tutor declara límites y no inventa errores
- Una dependencia lenta deja estado recuperable y no duplica operaciones.
- Sesión vencida o rol incorrecto se rechazan consistentemente.

## Requisitos

### Requisitos funcionales
- **FR-001**: El flujo principal DEBE estar disponible solo para actores autorizados.
- **FR-002**: La autorización DEBE aplicarse en servidor e interfaz.
- **FR-003**: Se DEBEN conservar estas entidades: RagSource, RagChunk, XaliRefuerzo, XaliStudentResource, HistorialChat.
- **FR-004**: Carga, vacío, éxito, error y reintento DEBEN ser visibles.
- **FR-005**: Operaciones repetidas DEBEN respetar idempotencia y unicidad.
- **FR-006**: Errores NO DEBEN exponer secretos ni datos ajenos.
- **FR-007**: Contratos DEBEN estar trazados en contracts/interfaces.md.
- **FR-008**: Todo cambio futuro DEBE actualizar especificación, plan, tareas y pruebas.

### Entidades clave
- **RagSource**: identidad, estado y relaciones definidos por el dominio.
- **RagChunk**: identidad, estado y relaciones definidos por el dominio.
- **XaliRefuerzo**: identidad, estado y relaciones definidos por el dominio.
- **XaliStudentResource**: identidad, estado y relaciones definidos por el dominio.
- **HistorialChat**: identidad, estado y relaciones definidos por el dominio.

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
