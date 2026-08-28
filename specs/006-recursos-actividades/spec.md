# Especificación: Recursos y actividades

**Rama**: codex/006-recursos-actividades | **Creada**: 2026-08-14 | **Estado**: Aprobada | **Issue**: #7

## Escenarios de usuario y pruebas

### Historia 1 - Flujo principal (Prioridad: P1)
Como profesor o estudiante, necesito generar, editar, asignar, visualizar y resolver recursos para obtener un resultado claro, seguro y trazable.

**Prueba independiente**: El recorrido termina en estado visible, conserva datos esperados y no concede permisos ajenos.

**Aceptación**:
1. **Dado** un actor autorizado, **cuando** completa el flujo, **entonces** recibe el resultado esperado.
2. **Dado** un actor no autorizado, **cuando** intenta acceder, **entonces** se rechaza sin revelar datos.

### Historia 2 - Estados y recuperación (Prioridad: P2)
Como mantenedor, necesito permisos, estados, errores y recuperación documentados para verificar el dominio.

### Historia 3 - Especificación viva (Prioridad: P3)
Como equipo, necesito actualizar estos artefactos cuando cambie el comportamiento para evitar contradicciones.

### Casos límite
- Emparejar y unir columnas comparten intención y deben evitar duplicidad conceptual
- Una dependencia lenta deja estado recuperable y no duplica operaciones.
- Sesión vencida o rol incorrecto se rechazan consistentemente.

## Requisitos

### Requisitos funcionales
- **FR-001**: El flujo principal DEBE estar disponible solo para actores autorizados.
- **FR-002**: La autorización DEBE aplicarse en servidor e interfaz.
- **FR-003**: Se DEBEN conservar estas entidades: Material, MaterialTipo, Actividad, Asignación.
- **FR-004**: Carga, vacío, éxito, error y reintento DEBEN ser visibles.
- **FR-005**: Operaciones repetidas DEBEN respetar idempotencia y unicidad.
- **FR-006**: Errores NO DEBEN exponer secretos ni datos ajenos.
- **FR-007**: Contratos DEBEN estar trazados en contracts/interfaces.md.
- **FR-008**: Todo cambio futuro DEBE actualizar especificación, plan, tareas y pruebas.

### Entidades clave
- **Material**: identidad, estado y relaciones definidos por el dominio.
- **MaterialTipo**: identidad, estado y relaciones definidos por el dominio.
- **Actividad**: identidad, estado y relaciones definidos por el dominio.
- **Asignación**: identidad, estado y relaciones definidos por el dominio.

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


## Evolución 018: ciclo de vida asociado a materia

- Un recurso generado con materia_id conserva esa relación desde su creación y aparece con el mismo identificador tanto en la biblioteca docente como en la pestaña Recursos de la materia.
- La relación con la materia no publica el recurso automáticamente: el estado inicial es borrador y el profesor decide entre material de apoyo o actividad evaluativa.
- Los estados canónicos son borrador, apoyo visible/oculto y actividad visible/oculta; una actividad mantiene separada la visibilidad de su recepción de entregas.
- Convertir un material en actividad crea como máximo una evaluación vinculada y las operaciones repetidas recuperan el vínculo existente.
- PATCH /herramientas/{material_id}/visibilidad administra publicación u ocultamiento de forma idempotente y sincroniza la evaluación vinculada sin borrar notas, entregas ni contenido.
- El profesor ve borradores y estados administrativos; el estudiante solo recibe recursos autorizados, publicados y pertenecientes a una matrícula activa.
- La evolución se verifica en las pruebas de ciclo de vida, autorización, biblioteca y pestaña de materia de la especificación 018.

## Evolución 026: calidad pedagógica y catálogo canónico

- La especificación [026-perfeccionar-recursos](../026-perfeccionar-recursos/spec.md) diferencia guía, lectura comprensiva, taller y plan de refuerzo mediante secciones obligatorias y verificables.
- `Relacionar pares` es la opción canónica para nuevas creaciones; `unir_columnas` se conserva como alias histórico.
- La ficha didáctica deja de ofrecerse para nuevas creaciones y conserva compatibilidad completa para materiales existentes.
- Vista previa, editor y exportaciones deben mantener paridad de contenido y ocultar soluciones en la versión estudiantil.
- Una respuesta incompleta del generador no puede persistirse como material terminado.
