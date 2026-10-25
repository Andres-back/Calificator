# Estado local de captura127

Sin tablas, migración, almacenamiento persistente nuevo o cambios de API.

## Intento de selección

- ID inmutable por apertura, contexto/época de entrega, tipo cámara nativa/subida y destino de reemplazo opcional.
- Control/handler y cleanup pertenecen a esa apertura; un evento viejo no adopta el ID del intento actual.
- Inicio solo por botón. Una apertura nueva invalida la anterior; contexto, desmontaje o deshabilitación también invalidan, incluso en A→B→A.
- Estados: pendiente → aceptado, cancelado o invalidado. Cada intento admite como máximo una aceptación.
- Ocultamiento/foco no representan cambio de contexto y no finalizan por sí mismos una captura nativa.
- Cancelación silenciosa no bloquea el UI; el control anterior se limpia al repetir, cambiar contexto o cerrar. Mantener como máximo un intento/control activo.

## Hoja aceptada

Se reutiliza `EvidencePage`: ID local, File, rotación y calidad. Una aceptación válida añade al final o sustituye solo el ID/posición solicitado. Si ese destino ya no existe, no se añade en otra posición silenciosamente. Calidad asíncrona verifica época/contexto antes de actualizar.

Reglas de tamaño, tipo, PDF, cantidad y duplicados existentes siguen siendo autoridad. No hay envío hasta la acción autorizada del consumidor.

## Cámara integrada

Conserva dispositivos, stream, selección de cámara, revisión y apagado de102/103; la preferencia del dispositivo se mantiene solo dentro de la preparación actual. Una preferencia móvil no es un permiso ni identifica al usuario.

## Datos excluidos

No persistir IDs de hardware, fotos, nombres de estudiantes o intentos en localStorage/analítica/logs. No mezclar estado entre componentes/usuarios ni modificar datos académicos por seleccionar o cancelar.
