# Modelo de datos: documentos de evaluaciones

## Entidades reutilizadas

`Evaluacion`: id, nombre, descripcion, profesor_id, materia_id, estado, modalidad,
preguntas, respuestas_esperadas, nota_maxima, material_origen_id y created_at.
`Material`: tipo, titulo, contenido_json y propietario cuando es origen asignado.
Se leen sus registros; no se cambia esquema ni estado.

## Representación temporal

Documento imprimible normalizado: título, instrucciones, preguntas numeradas,
opciones, puntajes, contexto necesario y respuestas solo cuando se autoriza
`soluciones=true`. No se guarda una entidad ni se llama a generación.

Respuesta de exportación: bytes PDF o DOCX, nombre sanitizado, MIME específico,
disposición inline/attachment y caché privada no-store. Se genera por petición.

## Estados UI

Cerrado → cargando documento → documento listo o error recuperable.
Cambiar versión vuelve a cargando y reemplaza el archivo; cerrar libera URLs.
Descarga tiene progreso/error independiente y no modifica la evaluación.
No hay transiciones del estado educativo ni del estado de calificaciones.
