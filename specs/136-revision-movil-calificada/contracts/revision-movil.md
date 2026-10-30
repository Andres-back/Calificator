# Contrato de presentación y navegación

## Preguntas

- Entrada:desglose autorizado, selección, callback de selección y guardas existentes. No cambia ningún DTO.
- Acceso compacto: número o identificador distinguible, icono/prioridad y selección; nombre accesible conserva el significado completo. Respuesta, estado académico, puntaje y evidencia se muestran en la tarjeta vigente.
- Anterior/siguiente: derivados del índice de la identidad seleccionada; deshabilitados en extremos. No saltar a otro estudiante ni interpretar números repetidos como la misma pregunta.
- Edición pendiente: respetar los mecanismos actuales de guardar/descartar; no limpiar borradores silenciosamente al paginar, cambiar pestaña o ampliar evidencia.

## Lectura integrada y ventana

- Integrada: `grade-review-scroll` es el dueño del recorrido de calificación. Los descendientes del mensaje crecen sin capturar gestos inútilmente; teclado y foco se desplazan respecto a ese dueño real.
- Modal de grupo: contenedor acotado y scroll propio. Su lista y panel mantienen retorno, selección, bloqueo del fondo y acciones accesibles.
- Compartir, revisar/editar y previsualizar impresión heredan el mismo modo; no dejar una subvista con el comportamiento anterior.
- Evidencia ampliable mantiene su política específica de gestos; la corrección del texto no modifica los píxeles, regiones o controles de zoom.

## Peticiones y permisos

No se añaden rutas ni payloads. Abrir la lectura puede conservar las consultas vigentes, incluido el POST de previsualización que no escribe notas. La navegación/scroll no puede invocar aprobación, publicación, actualización de mensaje, emisión/renovación de accesos, recalificación, cambio de evidencia ni IA. Roles y privacidad actuales se conservan.
