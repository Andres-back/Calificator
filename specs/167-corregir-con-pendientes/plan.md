# Plan: Corregir una pregunta aunque otras sigan pendientes

**Spec**: [spec.md](spec.md) | **Issue**: [#351](https://github.com/Andres-back/Calificator/issues/351)

## Diagnóstico

Reproducido en local sobre `4c83bb6` el 2026-11-10, en el navegador y con una prueba unitaria:

- `breakdown_policy` deja una pregunta sin valoración verificable con `puntos_obtenidos = None` y estado `revision_pendiente`.
- `breakdown_service.update_breakdown` recorre todos los componentes. Para los que no cambian toma el puntaje anterior, y rechaza con 409 «Puntaje inválido» si es `None`.
- La pantalla envía un solo cambio por guardado (`CalificacionesWorkspace.breakdownMutation`) y traduce cualquier 409 como «La calificación cambió en otra revisión».
- Después de guardar, `update_breakdown` marca la calificación como `ajustada` y fija `nota_confirmada` con la nota del desglose. `calculate_formula` suma las preguntas sin puntaje como cero.
- La comprobación que impide publicar con preguntas pendientes solo corre con `EXPLAINABLE_GRADING_AUTHORITY_ENABLED`, apagado por defecto. Por eso no basta con quitar el rechazo: la nota quedaría confirmada con preguntas sin puntaje.

## Decisión

Backend, en `update_breakdown`:

- El rango de puntos se valida solo en los componentes con cambio, y un valor fuera de rango responde 422.
- Un componente sin cambio conserva `puntos_obtenidos`, estado y `requiere_revision`.
- Si la versión nueva conserva alguna pregunta sin puntaje y la calificación no está publicada: estado `requiere_revision`, sin llamar a `apply_computed_final_grade`. `nota_confirmada` y `redondeo_empate` no cambian.
- Sin preguntas sin puntaje, el flujo actual no cambia. Una pregunta con puntaje marcada para revisión tampoco lo cambia: ese caso ya se guardaba.
- `revisado_por_docente` se sigue marcando en ambos casos, para que un trabajo tardío no pise la corrección del docente.

Frontend, en `CalificacionesWorkspace` (`GradeComponentEditor` ya muestra la recarga solo si recibe `onReload`):

- El aviso de conflicto y «Recargar versión vigente» se muestran solo con 409. Los demás rechazos muestran el mensaje del backend.
- Tras guardar con preguntas aún pendientes, el aviso de éxito dice cuántas faltan en vez de «nota recalculada».

Descartado:

- **Enviar todas las preguntas pendientes en un solo guardado**: obliga al docente a resolverlas todas antes de guardar la primera.
- **Poner cero a las preguntas pendientes al guardar otra**: convierte en nota una pregunta que nadie revisó.
- **Activar `EXPLAINABLE_GRADING_AUTHORITY_ENABLED`**: es una decisión de activación aparte.
- **Corregir aquí el recálculo tras «Recalificar» o el estado de «Confirmar todos»**: son hallazgos distintos de la auditoría, cada uno con su spec.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/breakdown_service.py` | validación por cambio y estado con pendientes |
| `backend/tests/unit/test_breakdown_teacher_adjustment.py` | pruebas de regresión |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` | «Recargar versión vigente» solo con 409; mensaje de éxito con pendientes |
| `frontend/e2e/explainable-grading.spec.ts` | regresión del aviso y del mensaje |

Sin migraciones, sin rutas nuevas y sin cambios de datos.

## Riesgos

- Una calificación con correcciones parciales queda con `revisado_por_docente` y estado `requiere_revision`. La lista «Por revisar» filtra por estado, así que debe seguir apareciendo; no se comprobó en pantalla (ver `quickstart.md`).
- Si una calificación ya publicada tuviera preguntas pendientes, conserva el estado publicado y la nota recalculada, como hoy. No se conoce un camino que produzca ese estado.
- El texto de ayuda del editor dice que guardar «no confirma ni publica la nota», pero resolver la última pregunta sí la deja `ajustada`. Ese desajuste ya existe y queda fuera de este cambio.
