# Validación: respuestas dibujadas

```powershell
python -m pytest backend/tests/unit/test_vision_extractor.py backend/tests/unit/test_photo_grading_failures.py backend/tests/unit/test_grading_component_consensus.py -q
python -m ruff check backend/app/services/vision_extractor.py backend/app/modules/calificaciones/orchestrator.py backend/app/modules/calificaciones/agents.py backend/app/modules/calificaciones/breakdown_policy.py backend/app/modules/calificaciones/breakdown_service.py backend/tests/unit/test_vision_extractor.py backend/tests/unit/test_photo_grading_failures.py backend/tests/unit/test_grading_component_consensus.py
python scripts/build_system_inventory.py --check
python -m pytest tests/spec_governance -q
```

Con autorización del docente, volver a procesar la fotografía matemática de referencia. Comprobar que la cuarta respuesta conserva una descripción de sus trazos o una alerta honesta de incertidumbre, que sigue pendiente de revisión docente y que ninguna nota se confirma ni publica. Medir por separado extracción, valoración y tiempo total. No copiar imagen ni datos personales a Git.
