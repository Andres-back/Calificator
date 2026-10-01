# Modelo de estado: filtros de consulta docente

## Búsqueda de asistencia

- `search: string`: estado local; vacío o solo espacios significa mostrar todos.
- Registros: colección existente con `estudiante_id`, nombre, correo, estado y observación.
- Proyección visible: registros coincidentes y posición original; claves siempre por `estudiante_id`.
- Borrador y baseline: mantienen a todos los alumnos. No dependen del texto de búsqueda.
- Transiciones: escribir/limpiar cambia visibilidad; marcar/observar modifica el borrador por ID; guardar usa el payload completo existente y exige cero pendientes globales.
- Normalización: quitar diferencias de mayúsculas y tildes para comparar, sin modificar el nombre/correo original.

## Selección del libro de notas

- `selectedEvaluationId: string`: vacío significa todas; un ID válido debe pertenecer a las evaluaciones no borrador de la materia.
- `visibleEvaluations`: todas las no borrador o únicamente la selección válida.
- `gradesByEvaluation`: mapa por ID con resultados de las consultas visibles; no asociar por índices de una lista diferente.
- Filas/summary: proyección existente de estudiantes, evaluaciones visibles y sus notas. La fuente persistida y el cálculo oficial no cambian.
- Búsqueda y filtro de seguimiento: estados actuales combinados con las filas de la selección.
- Transiciones: seleccionar cambia proyección y contexto de consulta; volver a todas restaura seguimiento global. Una selección desaparecida se restablece con aviso tras una actualización resuelta del listado.
- Las notas reales en cero, sugeridas, confirmadas y en procesamiento conservan su presentación y reglas actuales.

## Acceso lateral

- Entrada: perfil actual, rol personalizado y conjunto de permisos efectivos.
- Regla: con acceso a materias y evaluaciones, la entrada redundante de calificaciones no se muestra; sin ese recorrido, `grading.read` permite el fallback existente.
- No cambia autorización del servidor ni registro de rutas. Las secciones estudiante/admin permanecen igual.

## Estado de presentación del resultado

- Sección inicial: nota/explicación. Las otras tres secciones están cerradas en apertura normal.
- Expansión de evidencia, respuestas y retroalimentación: estado de presentación independiente de datos persistidos y permisos.
- `pregunta`/`hoja` en la URL: seleccionan componente/página existentes y abren la sección adecuada; no crean una nueva calificación.
- Fuente de explicación: fórmula/desglose y criterios/motivos registrados. Ausencia de respaldo genera un mensaje, no un texto inventado. Decisión global y suma de componentes son datos diferentes.
- Cambios sin guardar: mantienen los borradores y guardas existentes al navegar o plegar contenido. Historial, PQRS y acciones conservan su estado actual.
- Volver: mantiene parámetros existentes de materia, evaluación, búsqueda y filtro; no mezcla otro estudiante.

## Contexto del borrador de creación

- Materia de origen: `initialMateriaId` al entrar desde una materia, o selección autorizada en la entrada general. Grado/área se toman del contexto disponible, no del alumno ni de un borrador ajeno.
- Borrador compatible: solo se ofrece para recuperar si su materia coincide con el contexto actual. Editar una evaluación no carga borradores de creación.
- Aislamiento local: identificar borradores por usuario/materia mediante las funciones existentes, con recuperación conservadora del formato anterior. Abrir o guardar en B no sobrescribe ni elimina el borrador de A.
- Cambiar sección/plegar opciones: no cambia los valores. La configuración complementaria y sus validaciones se resumen de manera visible.

Ninguna tabla nueva, migración, dato estudiantil adicional o secreto. Ampliación de estado UI/borrador local aprobada el 2026-09-30.
