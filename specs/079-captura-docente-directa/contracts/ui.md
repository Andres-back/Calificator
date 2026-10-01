# Contrato de interfaz docente

## Asistencia

- Se conserva la ruta de asistencia por materia y su contrato de consulta/guardado.
- Fecha hoy por defecto, búsqueda y estados directamente accesibles. La ayuda explicativa y el desglose completo están plegados por defecto y se abren con teclado o puntero.
- «Resumen y guardado de asistencia» mantiene un nombre accesible y siempre participa en el flujo normal del documento; no es sticky/fixed en ninguna anchura.
- Resumen inicial: cantidad marcada, pendientes y estado/botón de guardado. El botón no guarda con pendientes y sigue anunciando guardado/error.
- Expandir, buscar o marcar no guarda automáticamente; el payload incluye todo el grupo.

## Tarjeta de evaluación

- «Calificar por foto»: evaluación no borrador en `fisica`/`mixta`, con permisos actuales de captura; dirige a `/app/calificaciones` con `materia`, `evaluacion` y `modo=carga`.
- «Notas y entregas»: conserva la consulta de la evaluación con sus filtros, detalle y acciones autorizadas.
- No se añaden rutas ni permisos, y las evaluaciones online o perfiles de consulta no adquieren captura mediante el nuevo acceso.

## Captura

- Estudiante se elige explícitamente; las opciones disponibles se muestran en flujo normal al entrar sin selección, con búsqueda y sin un clic adicional de apertura. No se autoselecciona al primer alumno ni se superpone el roster a la evidencia.
- Si el alumno viene identificado en un enlace, se conserva solo si es candidato autorizado; de lo contrario se explica y no se reasigna su paquete.
- Junto a «Enviar a calificar» aparecen evaluación, alumno, fotos ordenadas o identificación del PDF. El envío válido necesita una sola activación; no aparece «Confirmar y enviar» para repetirlo.
- Se muestran razones de bloqueo: contexto/candidatos cargando o fallidos, alumno ausente/no elegible, paquete vacío, análisis de calidad pendiente, foto inutilizable o envío en curso.
- Preparación multihoja, rotaciones, reemplazo de foto, vista previa y límites conservan sus controles.
- Error conserva paquete y destinatario. Aceptación muestra evidencia guardada y trabajo en segundo plano, sin confirmación/publicación de nota.
- Refrescar candidatos no desmonta la captura con hojas; cambiar de contexto o salir mantiene aviso de descarte. Aceptación no abre un falso aviso de descarte por la selección que se limpia.

## Servidor sin cambios

`POST /api/calificaciones/foto`: campos existentes `evaluacion_id`, `estudiante_id`, múltiples `foto` y `rotaciones` serializadas. `calificarFoto` conserva su contrato y el monitor conserva `job_id`.

No se invocan confirmar, ajustar o publicar por navegar o enviar evidencia. El resultado mantiene las cuatro secciones de 078 y todos los bloqueos/alertas existentes.
