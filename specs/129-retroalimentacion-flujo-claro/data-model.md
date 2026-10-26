# Modelo de presentación 129

Diseño aprobado el 2026-10-26; no cambia tablas ni estados backend.

## Contexto autorizado

Actor estable, evaluación y, en modo individual, calificación. Incluye permisos actuales y revisión de carga; resultados tardíos se validan contra ese contexto antes de aplicarse. Logout/cambio de actor/evaluación o retirada de permiso limpia datos privados; renovar el mismo actor no destruye selección.

## Fila de devolución

estudiante_id, calificacion_id cuando existe, nombre, nota/máximo, preview/fingerprint y capacidad de lectura/edición/entrega. Accesos asociados por calificacion_id, nunca por nombre. Estado de nota/devolución y estado de enlace permanecen distintos: activo no implica que una nueva versión sea entregable; manda el guard del servidor.

## Selección y navegación

Conjunto de calificacion_id, filtro/búsqueda, identidad de detalle abierto, vista y punto de retorno/foco. Selección masiva aplica al filtro visible según etiqueta; el total incluye seleccionados ocultos y lo informa. Abrir detalle no selecciona ni borra alumnos. Una preparación captura su conjunto y no cambia por una búsqueda posterior.

## Preparación de enlaces

Destino capturado, opciones solo para faltantes nuevos (duracion_dias inicial 3; evidencia false), estado y resultado por alumno. Clasificación: activo por recuperar; faltante elegible sin enviar; pendiente académico; acceso cerrado/no recuperable; confirmado; error conocido; incierto. Varios accesos previos se conservan y muestran para elegir, sin sustituirlos silenciosamente.

Estados de vista: selección → preparación por lectura → confirmación de faltantes → envío → resultado completo/parcial/incierto. Reintento usa el mismo manifiesto; copiar solo trabaja sobre resultados confirmados y muestra el subconjunto exacto. Enlaces URL/token se conservan únicamente en memoria del contexto y se descartan al salir o invalidarlo.

## Manifiesto mínimo de operación

Versión del formato local, actor/evaluación, fecha de creación/caducidad (una hora), request_id, calificacion_id/fingerprint de faltantes, opciones y particiones de hasta 100. Sin nombre, nota, mensaje, respuesta, evidencia, URL ni token. sessionStorage por actor/evaluación para recuperar recargas; no concede permisos y no se ejecuta automáticamente por cargarlo. Validar estructura y contexto antes de ofrecer reintentar; caducidad invalida escritura y conduce a consulta/decisión actual.

No confundirlo con el manifiesto/recibo de aceptar-publicar académico (máximo 25), que permanece bajo su componente y contrato actuales.

## Control de acceso e impresión

Reutiliza id/version/estado/expires_at/copy_available/fingerprint recibidos. Renovar, reactivar y desactivar mantienen confirmaciones actuales. Copia no muta acceso/cuota; auditoría del acceso autorizado sigue el servidor existente. Impresión recibe las selecciones/fingerprints vigentes y devuelve fichas; volver restaura la vista sin convertirla en una entrega nueva.
