# Plan: evidencia multimodal para calificacion

## Causa raiz

El orquestador conserva `physical_answers`, pero crea `ctx_grading` con `image_bytes=None`. La imagen tampoco llega al verificador y las preguntas abiertas no tienen una validacion objetiva que compense esa perdida.

## Implementacion

1. Formatear las respuestas visuales como evidencia textual canonica.
2. Adjuntarlas al contexto en todas las rutas.
3. Conservar imagen y MIME en el contexto del evaluador y verificador.
4. Usar llamadas multimodales cuando exista imagen y el modelo admita vision.
5. Convertir la contradiccion entre respuestas legibles y ausencia total en revision obligatoria.
6. Cubrir la regresion sin llamadas reales a proveedores.

## Compatibilidad y seguridad

- No cambian endpoints, tablas ni payloads publicos.
- El flujo textual no cambia.
- La imagen permanece en memoria y no se registra.
- Los modelos sin vision conservan la ruta textual.

