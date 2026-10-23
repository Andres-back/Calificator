# Investigación

- Decisión: perfil explícito y tres protocolos. OpenCode documenta Luna en Responses, Qwen en Messages y GLM en Chat; no basta un prefijo. Fuentes 22-10-2026: https://opencode.ai/v2/docs/console/go/ y https://developers.openai.com/api/docs/models/gpt-6-luna.
- Compartir transporte normalizado y conservar fachada de agentes; descartar cliente paralelo solo de benchmark.
- Snapshots contienen conexión/perfil no secretos y clave resuelta al ejecutar. Hoy agentes/extracción pueden usar URL de entorno aunque el panel guarde otra.
- No declarar visión por ausencia de metadatos. Hoy el normalizador no reconoce Luna; respetar metadatos y prueba sintética.
- Conexiones adicionales cifradas sin sustituir almacenamiento heredado; imágenes/embeddings fuera de gateway textual.
- La decisión inicial limitaba la publicación a `calificacion.valoracion`. Tras las pruebas locales, el usuario aprobó cinco rutas explícitas: extracción/estructura de digitalización con Luna y respaldo GLM, valoración Luna, verificación GLM y revisión adicional Luna. No cambiar los alias generales `calificacion_texto`, `calificacion_foto` o `generacion_preguntas`: alteran consumidores ajenos. Añadir evaluador principal al resumen.

- La comparación de nueve llamadas confirma que Luna necesita Responses. Con el perfil probado, DeepSeek agotó 16.000 tokens de razonamiento sin respuesta final en el documento de dos páginas. Un HTTP 200 o una selección de catálogo no demuestran un resultado válido. Luna/GLM conservaron el contenido de Marcela pero renumeraron 17–20 como 15–18; conservar números impresos y regiones completas requiere comprobaciones propias, no solo cambiar el modelo. Las respuestas de alumnos no se convierten en clave oficial.
- Investigación read-only delegada por Plan confirmó IDs cerrados, validación global, protocolo por prefijo y URL ignorada. No quedan preguntas bloqueantes de diseño.
- Auditoría: servicios saludables, main `8959108`, rutas v12 y 32 jobs exitosos. Sin contenido estudiantil. Falta smoke para validar funcionamiento actual; no alterar notas para diagnosticar.
- Incidente confirmado después de la captura del usuario: el POST de evidencia nueva falla antes de la IA por autoflush de una entrega sin `tipo`. Reparación independiente y prioritaria en Spec 117 / issue #244 / PR #245. No atribuir ese 500 al catálogo, a DeepSeek ni a la resolución de la foto. La modernización de APIs de esta especificación sigue siendo una entrega separada.
