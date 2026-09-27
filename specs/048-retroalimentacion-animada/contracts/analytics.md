# Contrato analítico mínimo

Todos los eventos reutilizan `POST /analytics/evento`, requieren sesión estudiantil válida, `evaluacion_id` y `calificacion_id` autorizados.

| Tipo | Metadatos admitidos |
|---|---|
| `feedback_story_started` | `mode` |
| `feedback_story_controlled` | `mode`, `action`, `step` |
| `feedback_story_detail_opened` | `mode`, `step` |
| `feedback_story_completed` | `mode` |

Catálogos: `mode=animated|static`; `action=pause|resume|skip|replay|next|previous`; `step` entero 1–4. Ningún otro metadato se admite. La autorización por objeto debe comprobar que la calificación corresponde al estudiante de la sesión.

El cliente ignora fallos analíticos. El servidor rechaza referencias ausentes/ajenas, roles no permitidos, valores fuera de catálogo y claves sensibles.
