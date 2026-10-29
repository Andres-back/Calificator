# Contrato de interacción 129

Diseño frontend aprobado el 2026-10-26. No introduce interfaces públicas o cambios de esquema.

## Marco y selección

Entradas de grupo e individual siguen FeedbackToolsButton/FeedbackWorkspace y el mismo controlador. Un solo marco con header, contenido y footer; grupo usa lista/detalle y modo integrado evita una segunda barra global. Estudiante/terceros sin permiso no obtienen gestión docente.

El conjunto se identifica por calificacion_id. Búsqueda/filtro no lo altera; seleccionar listos afecta solo visibles y lo anuncia. Una preparación fija destinatarios y opciones; no se reemplaza por el nuevo filtro. Cambiar cuenta/contexto/permiso descarta respuestas tardías y contenido privado.

## Compartir y copiar

1. Abrir panel: lectura de preview y accesos seleccionados, sin emisión o publicación. Clasificar por estado y validar resultados actuales.
2. Activo recuperable: POST de copia con IDs existentes. No emitir ni cambiar vigencia/evidencia por las opciones destinadas a faltantes.
3. Faltante elegible: confirmación explícita con request_id y selecciones/fingerprint; máximo 100 por partición. Cerrados/antiguos no recuperables se conducen a opciones, no se sustituyen con emisión.
4. Resultado: contrastar IDs/cantidad, mostrar N de M y cada error. Un resultado ausente/duplicado/ajeno no es éxito. Tras reintento exacto sin URL, copiar por los IDs confirmados.
5. Copiar: gesto explícito desde URLs preparadas; éxito solo después de resolver el portapapeles. Alternativa manual con el mismo conjunto. Lista privada nombre + URL por alumno, entregada individualmente, nunca enlace común de grupo.

El resultado se muestra en el mismo panel con pie Copiar N enlaces; no genera secciones grupales separadas para nuevos/guardados/controlados al final del recorrido.

Hotfix #283: si el preview vigente incluye revision_docente y falta preparar la devolución, «Revisar y compartir» abre el formulario existente dentro de ese mismo panel. Aprobar usa POST /evaluaciones/{id}/devoluciones/revisar con source_fingerprint, scope, feedback_text y request_id actuales. Si el detalle no está disponible, solo puede aprobarse el resumen; no se inventan puntajes. La respuesta del servidor, no un cambio local forzado, habilita preparar el enlace. Guardar el mensaje sin aprobar no lo habilita. Se preservan las opciones/URLs en memoria y se mantiene inmutable cualquier manifiesto incierto.

## Rutas existentes reutilizadas

- Preview: POST /evaluaciones/{id}/devoluciones/previsualizar, grading.read, IDs de calificación.
- Listado: GET /evaluaciones/{id}/devoluciones/accesos, paginación completa y filtro individual disponible.
- Emisión: POST /evaluaciones/{id}/devoluciones/accesos, grading.publish, UUID, selecciones y opciones; idempotente solo para la misma identidad de solicitud.
- Copia: POST /evaluaciones/{id}/devoluciones/accesos/copiar, grading.publish, IDs de acceso, resultado por ID sin cambiar cuota/vigencia.
- Ciclo: POST /devoluciones/accesos/{id}/{desactivar|reactivar|renovar}, versión esperada, request_id y confirmaciones actuales.
- Fichas: POST /evaluaciones/{id}/devoluciones/fichas, selecciones/fingerprint, misma impresión privada.
- Edición/revisión y aceptar-publicar: contratos actuales separados. /lotes/{request_id} solo recupera publicación académica y no se usará como consulta de emisión de enlaces.

Rutas contrastadas con api.ts y router.py durante el diseño. Reutilizar sus payloads al generar tareas; no duplicar adaptadores ni cambiar backend para maquillar un estado UI.

## Recuperación y privacidad

Solicitud incierta: conservar y reintentar exactamente el manifiesto actual; no cambiar UUID/opciones ni usar una ausencia temporal como permiso para crear de nuevo. Reapertura consulta estado actual antes de ofrecer escritura. No almacenar credenciales en sessionStorage/localStorage/URL/logs/capturas; el manifiesto mínimo no contiene datos académicos.

Fuente cambiada, acceso antiguo/corrupto o permiso perdido: mostrar mensaje claro, actualizar y conservar lo que aún pueda recuperarse bajo autorización; nunca un fallback que copie lo obsoleto o reactive accesos.

## Accesibilidad y teclado

360/390/768/1440, ambos temas, 44 px, foco visible y retorno al iniciador. Un único scroll principal en móvil y pie sin tapar la última fila; teclado/viewport y safe areas medidos, sin robar foco al abrir. Desktop puede usar dos regiones adyacentes, no scrolls anidados que escondan los controles. Sin animación nueva obligatoria ni recursos pagados.
