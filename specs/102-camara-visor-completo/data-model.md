# Modelo de estado local

Sin tablas, migraciones ni nuevas rutas.

## Sesión de cámara (US1)

- Identidad opaca de contexto de entrega, identificador de sesión, stream/vídeo, foto provisional y destino opcional de reemplazo.
- Estados: solicitando → lista → capturada → aceptada; alternativas error/cancelada.
- Solo aceptar invoca `addFiles` una vez. Cancelar/cambiar contexto/salir/ocultar/deshabilitar invalida sesión, apaga tracks y descarta resultados tardíos.
- Límites, duplicados, calidad y orden existentes; cancelar reemplazo conserva original.

## Sesión de lectura (US2)

- Clave evaluación/permiso/versión/Blob, documento, total de páginas, página visible, zoom y dimensiones reservadas.
- Ventana máxima de tres canvases; una tarea de render; texto y errores por página.
- Cerrar/cambiar versión aborta carga, cancela renders y libera recursos. Una URL anterior no se presenta bajo otra evaluación/versión.
- Soluciones efectivas = elección y permiso vigente; por defecto sin respuestas.
