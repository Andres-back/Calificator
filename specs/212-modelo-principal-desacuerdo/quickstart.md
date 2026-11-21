# Validación: En un desacuerdo entre modelos vale el modelo principal

## Pruebas

```
pytest tests/unit/test_modelo_principal_desacuerdo.py tests/unit/test_grading_component_consensus.py tests/unit/test_breakdown_persistence.py
npx vitest run src/modules/calificaciones
tsc --noEmit y eslint de lo tocado
```

## Medición en producción (solo lectura, últimos 30 días)

| Medida | Antes | Con la regla |
| --- | --- | --- |
| Preguntas pendientes con valoración válida de A | 92 sin puntaje | 92 con el puntaje de A |
| Notas del verificador que nombran una pregunta y quedan como objeción | 54 de 373 | 105 de 373 |
| Calificaciones sin «requiere revisión» | 2 de 178 | cerca de 19 de 178 |

La mayoría sigue en revisión porque el propio modelo principal la pidió (172 de 222 calificaciones del mes), casi siempre con alertas suyas.

## Qué revisar a mano tras desplegar

1. Calificar una entrega nueva en la que A y B discrepen: la pregunta muestra el puntaje de A y el aviso «El verificador propuso…».
2. Confirmar que la nota sigue sin publicarse hasta que el docente la confirma.
3. Confirmar que las calificaciones existentes no cambiaron.
