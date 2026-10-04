# Contratos conservados

`GET /api/materias/{id}/dba`: criterios oficiales/personalizados de esa materia.
`POST /api/evaluaciones/generar-borrador`: selección explícita de IDs, instrucciones,
material y rúbrica opcionales. Respuesta habitual de evaluación; advertencia opcional
en `blueprint.reglas_feedback.trazabilidad`. No alterar permisos ni formato de puntajes.
`PATCH /api/evaluaciones/{id}` sigue confirmando el borrador después de revisión docente.
