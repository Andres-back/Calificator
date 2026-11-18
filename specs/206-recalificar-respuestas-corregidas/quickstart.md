# Validación: Recalificar con las respuestas esperadas corregidas

## Pruebas

```
python -m pytest tests/unit/test_reprocessing_context.py tests/unit/test_batch_regrade.py     48 pasan
python -m pytest tests/integration/test_regrading_score_context.py            30 pasan (2 nuevas), con base PostgreSQL aislada
npx vitest run src/modules/calificaciones                                     387 pasan (3 nuevas)
tsc --noEmit, eslint y ruff de lo tocado                                      sin errores
```

## Ensayo local de punta a punta

1. Edición real de una respuesta esperada con `update_evaluation` (la vía de la pantalla del docente): se creó una versión nueva.
2. Comparación de las dos versiones sin la clave de respuestas: ninguna diferencia.
3. Consulta de la entrega: `respuestas_actualizadas`, pregunta 1.
4. Recalificación con la elección: entrega asociada a la versión nueva, nota anterior archivada en el historial con el motivo y la pregunta afectada, trabajo de calificación encolado.

Una entrega recibida antes de un cambio de enunciado siguió dando `contenido_modificado`, como debe.

## Caso real que motivó el lote

En producción, tras corregir las respuestas esperadas, cinco entregas recalificadas en lote y tres una por una siguieron calificándose con la clave anterior. Por eso la casilla viene marcada y el lote adopta la clave corregida.

## No se probó

El resultado de la calificación con IA tras adoptar la clave (el trabajador local corre una versión anterior del código).
