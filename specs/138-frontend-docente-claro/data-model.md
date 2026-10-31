# Modelo de presentación

No se añaden tablas, campos académicos, migraciones ni contratos de datos públicos.

## ReviewContext

- materiaId/evaluationId: segmentos contextuales o query heredada. La ruta tiene prioridad; relación comprobada contra getEvaluacion antes de acciones.
- gradeId/studentId/questionId/page/filter/mode: selección reconocida ya existente; mantener identidad estable y validaciones actuales.
- returnToBook: solo URL interna del boletín de la misma materia; no datos de identidad en almacenamiento nuevo.
- canOpenSubject: derivado de permisos efectivos, no del nombre del rol.

Transiciones: lista→estudiante→pregunta/hoja; estudiante→lista conserva evaluación/filtro; lista→evaluaciones vuelve un nivel. Cambiar materia/evaluación invalida selección como hoy, previa resolución de borrador. Una modificación de query no modifica registros académicos.

## AnalysisPresentation

Datos de componentes de GradeBreakdownData: id/clave/numero/orden/titulo/fuentes/valoraciones/origen. Componente puro dentro del Historial docente; estudiante/publicación siguen usando su DTO filtrado sin fuentes privadas. No convertir ausencia de fuentes en error ni inventar nuevas valoraciones.

## PendingSample

Reutiliza BandejaDocenteRead. Totales globales separados de listaslimitadas6. El agrupamiento usa evaluación/materia de cada caso, sin inferir más casos ni llamar a N evaluaciones. Si no submissions.review, no se consume el endpoint.

## Help y tabs

Ayuda cerrada por defecto, no tiene persistencia. Pestaña activa derivada de ruta; foco y revelado horizontal no cambian la sección sin acción del usuario.
