# Validación rápida: respuesta estructurada y rutas rápidas

## 1. Validación automatizada

```powershell
python -m pytest backend/tests/unit/test_comparator_feedback.py backend/tests/unit/test_opencode_model_gateway.py backend/tests/unit/test_llm_router_output_budget.py backend/tests/unit/test_photo_grading_failures.py backend/tests/unit/test_evaluation_digitalization.py backend/tests/unit/test_ai_usage_pipeline.py -q
python -m ruff check backend/app/core/config.py backend/app/modules/calificaciones/agents.py backend/app/services/llm_router.py backend/tests/unit/test_comparator_feedback.py backend/tests/unit/test_opencode_model_gateway.py backend/tests/unit/test_llm_router_output_budget.py backend/tests/unit/test_photo_grading_failures.py
python scripts/spec_governance.py --base-ref origin/main --head-ref HEAD
```

Resultados esperados:

- DeepSeek V4 Flash Vision Exp recibe su control compatible; GLM 5.3 Flash omite el campo `thinking` no admitido y recibe un prompt compacto.
- Una respuesta terminada por límite se identifica como truncada.
- Un verificador sin nota no ejecuta arbitraje adicional y deja revisión docente.
- El arbitraje continúa disponible cuando existen dos notas discrepantes.

## 2. Digitalización real controlada

1. Iniciar sesión como Profesor Demo en producción.
2. Abrir Mate-avanzada > Evaluaciones > Digitalizar de foto/PDF.
3. Subir `output/playwright/evaluacion-real.jpg` con nombre técnico identificable.
4. Esperar el trabajo en segundo plano sin bloquear la navegación.
5. Confirmar cuatro preguntas y cuatro respuestas en borrador.
6. Verificar telemetría: sin 404/401, modelo de estructura configurado y total menor de 20 s.

## 3. Calificación real controlada

1. Abrir `Matematicas-Avanzada1` y seleccionar Estudiante Demo.
2. Añadir la misma imagen y confirmar una hoja.
3. Esperar sin confirmar ni publicar la nota.
4. Confirmar DeepSeek como extracción/valoración y GLM como verificador.
5. Confirmar cuatro componentes, suma coherente y observaciones visibles sobre claves dudosas.
6. Verificar duración total menor de 20 s y ausencia de arbitraje cuando el verificador no produce nota.

## 4. Seguridad del ensayo

- No publicar la nota.
- No reemplazar automáticamente respuestas de referencia.
- Mantener el resultado en revisión docente.
- Eliminar únicamente artefactos temporales locales al terminar; no borrar datos productivos sin autorización explícita.
