# Validación: La revisión adicional de calificación no agota su límite de salida

## Pruebas

```
python -m pytest tests/unit/test_comparator_feedback.py tests/unit/test_grading_output_budget.py tests/unit/test_document_grading_context.py     37 pasan (1 nueva)
ruff de lo tocado                                                                                                                        sin errores
```

## Evidencia de producción antes del cambio (solo lectura)

| Modelo | Resultado | Veces | Tokens de salida |
| --- | --- | --- | --- |
| claude-haiku-5-5 | `output_budget_exhausted` | 60 | 1.024 en todas |
| claude-haiku-5-5 | correcto | 10 | 778 a 1.010 |

## Comprobación tras el despliegue

Consultar los registros de uso de la etapa `targeted_recheck` después de algunas calificaciones con discrepancia. No se probó contra el modelo real en esta entrega.
