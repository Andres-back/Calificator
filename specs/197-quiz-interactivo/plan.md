# Plan: Quiz rápido interactivo con clave de respuestas fiable

**Spec**: [spec.md](spec.md) | **Issue**: [#414](https://github.com/Andres-back/Calificator/issues/414)

## Decisión

Solo frontend. Depende de la Spec 193 (usa `optionText` de `resourceLabels.ts`).

- `resourceLabels.ts`: nueva `correctOptionIndex(opciones, clave)`. Primero busca una letra (sola, con puntuación, con «Opción», o seguida de texto) dentro del rango de opciones; si no, compara el texto normalizado. Devuelve -1 si no hay coincidencia.
- `ContenidoView.tsx`: `ExamenContent` usa `correctOptionIndex` para marcar la clave; `quiz_rapido` pasa a `QuizContent`.
- `QuizContent.tsx` (nuevo): estado local de respuestas, comprobación y resultado; botones con `role="radio"` dentro de un `radiogroup` por pregunta; `Confetti` al acertar todo. No llama al servidor.
- No se cambia `interactive` en `meta.ts`: así no se altera el flujo de las actividades calificables.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/herramientas/views/resourceLabels.ts` | `correctOptionIndex` |
| `frontend/src/modules/herramientas/views/QuizContent.tsx` | nuevo |
| `frontend/src/modules/herramientas/views/ContenidoView.tsx` | clave del examen y vista del quiz |
| `frontend/src/modules/herramientas/views/QuizContent.test.tsx` | pruebas (nuevo) |
