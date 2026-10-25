# Contrato de interfaz127

## Entrada del usuario

- `Tomar foto` / `Tomar otra foto`: nativa por preferencia móvil; integrada en PC. Requiere componente habilitado, sin PDF y por debajo del límite vigente.
- `Repetir foto` / `Reemplazar foto`: misma elección de modo, ligada a una hoja identificada. Cancelación conserva el archivo anterior.
- `Subir fotos o PDF`: selector de archivos independiente, con `multiple` y tipos definidos por consumidor; nunca solicita stream por sí mismo.
- `Ampliar hoja N`: muestra el contenido completo para revisar antes del envío; conserva herramientas existentes de orden, rotación y quitar.

La solicitud nativa pide imagen con preferencia trasera y formatos admitidos en el mismo gesto, sin esperar consultas, efectos o temporizadores. El navegador determina el UI final. No solicitar micrófono.

## Retorno y errores

1. Resultado sin archivo/cancel: limpiar cuando el navegador lo notifique y conservar las hojas; no inventar permiso denegado, no enviar ni reabrir automáticamente.
2. Archivo válido + intento/época/contexto vigentes: aceptar una vez y pasar al pipeline de preparación actual.
3. Archivo no admitido, demasiado grande o mezcla/cantidad prohibida: informar según validaciones actuales y conservar hojas previas.
4. Intento invalidado, componente deshabilitado, destino quitado o usuario/contexto cambiado: descartar y limpiar sin reemplazar otra hoja.
5. `hidden → visible → change` con el mismo intento vigente: se admite; la página se ocultó para usar la cámara. `focus` no confirma ni cancela.

No existe un nuevo endpoint. Se mantienen los payloads y permisos de carga/calificación, reemplazo, digitalización y entrega de estudiante. Las pruebas deben interceptar y confirmar ausencia de POST de envío por captura/cancelación/revisión.

## Computador y accesibilidad

Mantener selección de cámaras102/103, `getUserMedia` sin audio y stop de tracks al cerrar, cambiar dispositivo/contexto u ocultarse. Las acciones son alcanzables con teclado; capturar no elimina la subida alternativa. Una ventana de PC estrecha conserva webcam, no cambia por su tamaño.

## Límite de validación

Automatización de `filechooser`/archivos sintéticos prueba el enlace entre botón y retorno, no la interfaz del SO. Las actas manuales deben distinguir Safari/Chrome, dispositivo/OS, acceso normal/inicio y resultados de captura, repetición, cancelación y orden. No exponer datos académicos reales en capturas.
