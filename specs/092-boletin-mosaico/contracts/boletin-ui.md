# Contrato de interfaz: mosaico y boletín

## Ámbito y permisos

Ruta vigente `routes.materiaBoletin(materia.id)`. `canManageMateria` selecciona vista docente; `grading.read` autoriza notas/previsualización/exportación. Backend mantiene permiso y propiedad. Sin rutas, endpoints o permisos nuevos; estudiante intacto.

## Consultas

- `listEvaluaciones(materiaId)` existente.
- `listCalificaciones(evaluationId, { readOnly: true })`: GET con `solo_lectura=true`, respuesta `Calificacion[]` vigente, sin reconciliar vencimientos.
- Clave por evaluación/modo/materia/usuario con prefijo `calificaciones`; no consultas por ficha ni escrituras por abrir/cerrar/reintentar.
- Mosaico usa evaluaciones del filtro; diálogo usa todas las no borrador. Errores/carga adicional no desmontan el grupo ni se presentan como ausencia real.

## Mosaico

«Boletines», búsqueda por nombre/correo, filtro por evaluación y exportación existentes. Rejilla de fichas con botón «Ver boletín de [nombre]», iniciales, nombre completo, identificador para homónimos y resumen breve. Sin resultados extensos abiertos por defecto. Sin notas autorizadas/cargadas no inventar estados.

## Previsualización

`Modal` compartido, título «Boletín de [nombre]» y materia. Todas las evaluaciones no borrador con nota/escala/estado. Sugerencias identificadas, pendientes sin cero y error distinto de ausencia. Sin pérdida decimal.

«Ver explicación» solo para calificación existente y lectura permitida; usa `gradingHref` vigente con alumno/evaluación/calificación correctos y retorno con filtros. No confirma, publica, recalifica ni imprime.

Cerrar por botón/Escape; conservar filtros/scroll y devolver foco. Cambio de usuario, materia, permiso o matrícula descarta selección antes de mostrar datos anteriores. Sin alumnos o evaluaciones: estados vacíos claros; sin coincidencias: limpieza de filtros. Sin respuestas completas: carga/error y reintento, no boletín supuestamente completo.

La exportación 090 conserva formato y permisos. La vista estudiante 091 y todos los registros académicos permanecen compatibles.
