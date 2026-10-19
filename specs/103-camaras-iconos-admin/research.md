# Investigación: cámaras e identidad administrativa

## Cámaras

La implementación de Spec 102 ya captura, permite revisar/repetir y limpia streams al cerrar o pasar a segundo plano. Falta enumeración y selección. Se ampliará, no se sustituirá, su ciclo de vida y la protección del contexto de entrega.

`enumerateDevices()` requiere contexto seguro y documento activo/visible; los dispositivos/etiquetas disponibles dependen de permisos. Por ello se enumera tras obtener permiso y se muestran nombres alternativos si faltan etiquetas. Fuente primaria: [MDN, enumerateDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices).

`devicechange` no está disponible uniformemente. Se usará cuando exista y se conservará siempre actualización manual. Fuente primaria: [MDN, devicechange](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/devicechange_event). Referencia normativa: [W3C, Media Capture and Streams](https://www.w3.org/TR/2025/CRD-mediacapture-streams-20251009/).

Decisión: preferencia controlada por el picker montado; solicitudes identificadas, parada antes de cambio y limpieza del stream propio si la respuesta queda obsoleta. Una desconexión informa y permite recuperación explícita sin descartar archivos. No se solicitan audio ni nuevos permisos administrativos.

Alternativas descartadas: persistir identificadores de hardware; abrir streams simultáneos para previsualizar todas las cámaras; cambiar automáticamente durante revisión de una foto; suponer que todos los navegadores enumeran todo el hardware.

## Administración

Inventario: adminNav tiene ilustración para IA, Presentaciones, Reportes y Asistente, pero no para Inicio, Usuarios, Roles y Correo. Sidebar ya admite EducationalIcon. Topbar necesita contexto administrativo. Usuarios, Roles y Correo tienen encabezados propios que pueden incorporar identidad compacta sin cambiar el componente general de cabeceras.

Inicio puede reutilizar dashboard.webp. Los assets student-roster (alumnos), ai-institutional (IA institucional) y student-claim (reclamo) no representan adecuadamente cuentas generales, permisos y correo. Se crearán tres ilustraciones raster específicas, transparentes, con la paleta y acabado del sistema actual; optimización WebP, fallback y rótulos existentes.

No se reemplazarán editar/eliminar/buscar ni indicadores de estado por ilustraciones. No hay nuevas dependencias, endpoints ni migraciones.

## Verificación y límites

Vitest cubre propiedad de streams, resultados tardíos, selección/recuperación y assets. Playwright usa cuentas/dispositivos sintéticos en Chromium/WebKit y comprueba 360/390/1440 px. Las pruebas existentes usan simulaciones; no demuestran funcionamiento físico en teléfonos o webcams. Los resultados de hardware real, si se realizan, deben distinguirse explícitamente.
