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

## Evolución 018: revisión fluida y tiempos observables

- La revisión docente muestra cada respuesta, referencia, explicación verificable, puntaje obtenido/máximo y fórmula final dentro de un único desglose versionado.
- El ajuste se realiza dentro de la tarjeta activa, previsualiza la nueva nota y exige motivo interno y explicación pedagógica antes de guardar.
- Cambiar de respuesta o abandonar el detalle con datos sin guardar exige confirmación; un conflicto de versión no sobrescribe cambios de otra sesión.
- En móvil existe un único propietario de desplazamiento, altura dinámica, áreas seguras y objetivos táctiles de al menos 44 px para volver, cerrar y crear incidencias.
- La extracción visual se ejecuta una vez con `qwen3.7-plus` como principal configurable. Un evaluador Flash genera el desglose y un verificador Flash compacto valida puntajes y fórmula; el modelo Pro solo arbitra discrepancia, confianza baja, ambigüedad o fallo. Una demora mantiene el job activo; solo un fallo real de transporte o respuesta inválida termina en revisión docente y nunca en publicación automática.
- Los tiempos técnicos son diagnósticos aditivos y no alteran la fórmula, la autoridad docente ni la única calificación vigente.
- La regresión de veinte componentes, Chromium, WebKit, accesibilidad y modo claro/oscuro se conserva en la especificación 018.

## Evolución 032: recuperación y autoridad docente implementadas bajo banderas

[032 Calificación e impacto docente](../032-calificacion-impacto-docente/spec.md) añade checkpoints compatibles, escritor vigente por lease, protección frente a resultados tardíos y estados grupales sin cambiar la única nota oficial. Los desgloses y tiempos de estudio son aditivos: nunca publican ni sustituyen una decisión docente. La activación gradual permanece apagada por defecto.

## Evolución 033: centro unificado

[033 Centro de calificación](../033-centro-calificacion/spec.md) reúne carga, revisión y publicación en `/app/calificaciones`. La proyección docente `GET /evaluaciones/{id}/revision` incluye toda la matrícula, nota nullable, versión/cobertura y contadores exhaustivos. Realiza seis consultas agrupadas (cinco sin permiso de PQRS), sin archivos, respuestas ni inferencias al consultar. La política de intento vigente se conserva.

La lista distingue cero real, sin entrega, procesamiento, error y nota publicada. Los filtros son independientes de la paginación; la búsqueda limita filas, no cambia los contadores del examen. Un cursor que deja de pertenecer al filtro responde 409 para reiniciar la lista explícitamente.

Carga, nota manual, reemplazo, ajuste, confirmación y publicación conservan sus endpoints y permisos. Los resultados grupales mantienen seleccionados solo los fallos. Se retiran tres páginas React sin consumidores, no sus APIs de salón/boletín. No se modifica fórmula, configuración de IA ni base de datos.
