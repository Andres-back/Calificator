# Modelo de experiencia

No se crean tablas ni entidades académicas nuevas.

## FeedbackStory

- `evaluationId`, `gradeId`: referencias existentes, nunca texto visible en recursos.
- `mode`: `animated | static`.
- `scenes`: lista ordenada de 1 a 4 `FeedbackScene`.
- `currentIndex`: posición efímera de la interfaz.
- `playback`: `idle | playing | paused | completed | skipped`.

## FeedbackScene

- `kind`: `welcome | strength | improvement | next_step`.
- `componentId`: referencia opcional al componente del desglose.
- `title`, `message`: texto derivado del desglose ya publicado.
- `mascotState`: combinación aprobada de Xali.
- `detailLabel`: etiqueta para abrir el detalle original.

## XaliMascotState

- `expression`: catálogo cerrado de ocho expresiones.
- `gesture`: catálogo cerrado de cinco gestos.
- `accessory`: `none | book | lesson_card`.
- `tone`: `neutral | encouragement | success | attention`.
- `motion`: `none | idle | explain | celebrate`, anulado por reducción de movimiento.

Las combinaciones no son registros persistidos: un catálogo tipado define cuáles son válidas.

## LocalFeedbackPreference

- Clave por usuario/dispositivo sin datos académicos.
- `motion`: `system | reduced`.
- `seenGrades`: conjunto acotado de identificadores para no forzar repetición automática; no altera disponibilidad de “Repetir”.
- Fallo de almacenamiento: usar `system` y mantener controles.

## AnalyticsEvent existente

Nuevos `tipo` con referencias canónicas y metadatos escalares enumerados. El servidor deriva identidad/rol de la sesión. No se almacena mensaje, respuesta, evidencia, nota o estado emocional.

## Transiciones

`idle → playing → paused → playing → completed`; desde cualquier estado visible puede pasar a `skipped`; `replay` vuelve a `playing` en el índice 0. En modo estático, navegación cambia índice sin estado `playing`.
