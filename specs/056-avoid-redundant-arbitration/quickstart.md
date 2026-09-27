# Validación: arbitraje no redundante

```powershell
python -m pytest backend/tests/unit/test_comparator_feedback.py backend/tests/unit/test_photo_grading_failures.py -q
python -m ruff check backend/app/modules/calificaciones/orchestrator.py backend/app/modules/calificaciones/agents.py backend/tests/unit/test_comparator_feedback.py backend/tests/unit/test_photo_grading_failures.py
python scripts/build_system_inventory.py --check
python -m pytest tests/spec_governance -q
```

En producción, con autorización del docente: enviar la imagen matemática real a Estudiante Demo en `Matematicas-Avanzada1`; medir trabajo y etapas; comprobar `arbiter_invoked=false` con dos notas cercanas y confianza suficiente, revisión pendiente, alertas y cuatro componentes. No confirmar ni publicar la nota. La diferencia real o baja confianza se valida por regresión sin generar nuevas notas productivas.
