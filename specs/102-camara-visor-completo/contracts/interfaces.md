# Contratos de interfaz

## US1: captura preparada, no envío

1. Conservar `pages/onChange/disabled/onError` del picker; añadir identidad opaca del contexto desde sus consumidores.
2. Captura confirmada produce `File` JPEG y destino opcional de reemplazo; pasa por `addFiles`, sin endpoints nuevos ni llamadas de calificación.
3. Repetir/cerrar/error/cambio de contexto no cambia hojas; detener tracks también ante permiso tardío. Sin audio ni geolocalización.
4. Subir archivos conserva tipos/límites. Selector nativo opcional identificado como alternativa del dispositivo, no cámara integrada garantizada.
5. Solo «Enviar a calificar» existente envía el paquete, con sus permisos/contratos anteriores.

## US2: lectura y documentos autorizados

1. Conservar `getEvaluationDocument(id, 'pdf'|'docx', soluciones, signal)` y autorización servidor.
2. Blob ya autorizado, sin `fetch(blob:)`, iframe remoto ni URLs públicas de evidencias. Todas las páginas navegables; dibujo acotado.
3. Opciones ofrece PDF/Word y «Ver evaluación completa», otra pestaña con `noopener noreferrer`. La versión seleccionada se conserva; Word advierte edición no sincronizada.
4. Inicialmente sin respuestas; solucionario solo docente autorizado. Cambio de permiso/evaluación invalida documentos anteriores.
5. Fallo de Word no oculta PDF; errores humanos, sin secretos; cierre/cambio cancela operaciones y libera recursos.

## Accesibilidad

Un scroll vertical; zoom normal sin overflow de pantalla, zoom intencional solo dentro del lector. Controles 44 px, foco/restauración/cierre. Chromium/WebKit emulados en 360/390/1440, claro/oscuro; no afirmar dispositivos físicos sin probarlos.
