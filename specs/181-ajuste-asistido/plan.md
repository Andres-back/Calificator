# Plan: Ajustar una pregunta sin escribir el motivo y con la explicación redactada por la IA

**Spec**: [spec.md](spec.md) | **Issue**: [#382](https://github.com/Andres-back/Calificator/issues/382)

## Decisión

- **Frontend** (`GradeComponentEditor`): el motivo se propone según el estado; si queda vacío se envía el del estado. El contrato de guardado no cambia: el backend sigue exigiendo motivo y lo recibe siempre.
- **Backend**: `explanation_draft_service.draft_explanation` lee la pregunta del desglose activo, arma el prompt con las reglas de retroalimentación formativa del calificador (acierto observado, qué revisar, acción breve con papel y lápiz, sin cifras de nota, sin inventar) y llama a la ruta de IA de `calificacion.verificacion` con enrutamiento explícito, un intento y 512 tokens de salida. Suelta la transacción antes de llamar al modelo. Valida el borrador (12–600 caracteres, sin cifras de nota, no genérico).
- **Ruta**: `POST /calificaciones/{id}/redactar-explicacion`, con el mismo permiso que las demás acciones docentes de revisión.

Descartado:

- **Quitar la obligatoriedad del motivo en el backend**: el historial pierde el porqué; el frontend siempre envía uno.
- **Generar la explicación al guardar**: el docente debe ver y aprobar el texto antes.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/explanation_draft_service.py` | nuevo |
| `backend/app/modules/calificaciones/revision_router.py` | ruta |
| `backend/app/modules/calificaciones/schemas.py` | `ExplanationDraftRequest`, `ExplanationDraft` |
| `frontend/src/modules/calificaciones/api.ts` | `redactarExplicacion` |
| `frontend/src/modules/calificaciones/components/GradeComponentEditor.tsx` | motivo propuesto, borrador de IA, «Cancelar» sin cortes |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` | conecta el borrador |

## Riesgos

- Costo: una llamada corta por cambio de estado, con el modelo de verificación configurado.
- Si la ruta de verificación no está configurada, el borrador responde 503 y el docente escribe la explicación como antes.
