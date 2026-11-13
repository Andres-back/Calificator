# Validación: Una hoja sin respuestas no impide calificar las demás

## Pruebas

```
python -m pytest tests/unit/test_vision_route_policy.py tests/unit/test_vision_extractor.py \
  tests/unit/test_photo_grading_failures.py tests/unit/test_reading_completeness.py \
  tests/unit/test_canonical_evidence_consumers.py
  151 pruebas: pasan
```

Antes de la corrección, tres de las cuatro pruebas nuevas fallaban con `vision_incomplete_pages`.

## Lo que no se comprobó

- La recalificación real en producción: se hace después de desplegar, solo con la calificación revisada y con autorización del usuario.

## Después de desplegar

Recalificar la entrega de 2 hojas revisada (con `scripts/recover_multipage_grading.py`: simulación y después `--execute` con su ID). Debe quedar «requiere revisión» con las preguntas 11–20 leídas y el aviso de que falta un bloque de preguntas.
