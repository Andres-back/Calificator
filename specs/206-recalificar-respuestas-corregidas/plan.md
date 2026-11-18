# Plan: Recalificar con las respuestas esperadas corregidas

**Spec**: [spec.md](spec.md) | **Issue**: [#430](https://github.com/Andres-back/Calificator/issues/430)

## Decisión

Se amplía el mecanismo que ya permite adoptar el reparto de puntos al recalificar (misma consulta, mismo comprobante, mismo registro en el historial).

- **Backend** `calificaciones/reprocessing_context.py`:
  - `_without_answer_key`: copia de la versión sin `respuestas_esperadas`, `claves_pendientes_revision`, la copia de respuestas del plano de calificación ni las reglas `lectura`, `claves_pendientes`, `clave_completa` y `requiere_validacion_docente`.
  - `_comparison`: si la huella académica difiere pero la huella sin clave coincide, el estado es `respuestas_actualizadas` (con los cambios de puntos, si los hay); en otro caso sigue siendo `contenido_modificado`.
  - `validate_reprocessing_target`: en ese estado, sin elección devuelve el contexto original; con elección exige versión objetivo y comprobante vigentes.
- **Backend** `calificaciones/schemas.py`: estado nuevo y campos `respuestas_cambiadas` y `lectura_cambiada`.
- **Frontend** `GradeReprocessing.tsx` y `api.ts`: aviso, lista de preguntas y casilla opcional; envía la misma terna que la adopción de puntos.

No hay migración: la versión que conserva cada entrega y el historial ya existen.

## Qué no se hace

- La recalificación en lote no adopta respuestas: sigue siendo una decisión por entrega.
- No se reescribe ninguna versión guardada.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/reprocessing_context.py` | estado, comparación y validación |
| `backend/app/modules/calificaciones/schemas.py` | contrato de la consulta |
| `frontend/src/modules/calificaciones/components/GradeReprocessing.tsx`, `frontend/src/modules/calificaciones/api.ts` | diálogo y tipo |
| `backend/tests/unit/test_reprocessing_context.py`, `backend/tests/integration/test_regrading_score_context.py`, `frontend/src/modules/calificaciones/components/GradeReprocessing.answers.test.tsx` | pruebas |

## Riesgo

Medio-bajo. Cambia una protección deliberada, pero solo para claves y lectura, con elección explícita por entrega y registro en el historial. Sin elección, el comportamiento es el anterior.
