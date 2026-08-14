# Especificación: Arquitectura, roles y seguridad

**Rama**: codex/002-arquitectura-roles-seguridad | **Creada**: 2026-08-14 | **Estado**: Aprobada | **Issue**: #3

## Escenarios de usuario y pruebas

### Historia 1 - Flujo principal (Prioridad: P1)
Como usuario autenticado, necesito navegar solo por funciones autorizadas para su rol para obtener un resultado claro, seguro y trazable.

**Prueba independiente**: El recorrido termina en un estado visible, conserva los datos esperados y no concede permisos de otro rol.

**Aceptación**:
1. **Dado** un actor autorizado, **cuando** completa el flujo, **entonces** recibe el resultado esperado.
2. **Dado** un actor sin permiso, **cuando** intenta acceder, **entonces** se rechaza sin revelar datos.

### Historia 2 - Estados y recuperación (Prioridad: P2)
Como mantenedor, necesito permisos, estados, errores y recuperación documentados para verificar el dominio sin interpretar código aislado.

### Historia 3 - Especificación viva (Prioridad: P3)
Como equipo, necesito actualizar estos artefactos cuando cambie el comportamiento para evitar contratos contradictorios.

### Casos límite
- Una URL de otro rol responde 403 o redirige sin filtrar contenido
- Una dependencia lenta deja un estado recuperable y no duplica operaciones.
- Una sesión vencida o rol incorrecto se rechaza consistentemente.

## Requisitos

### Requisitos funcionales
- **FR-001**: El flujo principal DEBE estar disponible únicamente para actores autorizados.
- **FR-002**: La autorización DEBE aplicarse en servidor e interfaz.
- **FR-003**: El sistema DEBE conservar las entidades del dominio: UserRole, UserEstado, Sesión, Ruta protegida, Permiso.
- **FR-004**: Carga, vacío, éxito, error y reintento DEBEN ser visibles.
- **FR-005**: Las operaciones repetidas DEBEN respetar idempotencia y unicidad.
- **FR-006**: Los errores NO DEBEN exponer secretos ni datos ajenos.
- **FR-007**: Contratos y rutas DEBEN estar trazados en contracts/interfaces.md.
- **FR-008**: Todo cambio futuro DEBE actualizar especificación, plan, tareas y pruebas.

### Entidades clave
- **UserRole**: identidad, estado y relaciones definidos por el dominio.
- **UserEstado**: identidad, estado y relaciones definidos por el dominio.
- **Sesión**: identidad, estado y relaciones definidos por el dominio.
- **Ruta protegida**: identidad, estado y relaciones definidos por el dominio.
- **Permiso**: identidad, estado y relaciones definidos por el dominio.

## Criterios de éxito
- **SC-001**: El 100 % de módulos, rutas y tablas declarados aparece en el índice general.
- **SC-002**: Los recorridos P1 se verifican sin acceso cruzado de roles.
- **SC-003**: Todos los requisitos tienen tarea o evidencia trazable.
- **SC-004**: No quedan marcadores pendientes, contradicciones críticas ni secretos.

## Supuestos
- Registra comportamiento vigente y no introduce cambios funcionales.
- Las inconsistencias se convierten en issues separados.
- Se conservan arquitectura y contratos públicos durante la línea base.
