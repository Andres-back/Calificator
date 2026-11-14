# Validación: Tras cambiar la evidencia o recalificar, las respuestas son de la hoja nueva

## Pruebas

```
python -m pytest tests/unit/test_breakdown_persistence.py   (backend)
  11 pruebas: pasan (2 nuevas; la de reemplazo fallaba antes)

Pruebas que usan create_automatic_breakdown, breakdown_service, reprocess_grade o revision_service
  180 pasan
```

## Después de desplegar

Cambiar la evidencia de una calificación con un ajuste docente: al terminar la calificación, las respuestas mostradas deben venir de la hoja nueva y el ajuste anterior debe aparecer en el historial.
