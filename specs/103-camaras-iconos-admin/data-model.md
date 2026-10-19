# Modelo de estado frontend

No se modifica la base de datos ni se crean entidades de servidor.

## Cámara disponible

- `deviceId`: identificador efímero recibido del navegador; solo en memoria.
- `label`: etiqueta autorizada o «Cámara N»; solo presentación.
- Se filtran dispositivos `videoinput`; no se solicita ni lista audio para el selector.

## Preferencia de captura

- Cámara elegida en la instancia montada de MultiPageEvidencePicker.
- Se conserva entre aperturas de cámara mientras viva esa instancia; se elimina al abandonarla.
- No se almacena en cuenta, estudiante, localStorage, telemetría, archivos o servidor.
- Si ya no está disponible, se muestra recuperación explícita; no se borra ninguna hoja preparada.

## Sesión de cámara

Estados: preparando → vídeo listo → codificando → foto en revisión → aceptar/cerrar o repetir. Error permite reintentar, actualizar/elegir dispositivo o subir archivo. Cambio de cámara desde vídeo listo vuelve a preparando después de detener el stream anterior.

Cada solicitud posee una generación y su stream devuelto. Cierre, contexto distinto, desmontaje o segundo plano invalidan solicitudes; un resultado tardío detiene solo su propio stream. Durante codificación/revisión no se admite cambio de cámara. Aceptar una foto no envía una entrega ni califica.

## Identidad administrativa

Tres nombres nuevos propuestos: `admin-users`, `admin-roles`, `admin-mail`, cada uno con WebP transparente local y fallback. Inicio reutiliza `dashboard`. Navegación/cabecera comparten nombre semántico, manteniendo etiquetas, rutas y permisos existentes.
