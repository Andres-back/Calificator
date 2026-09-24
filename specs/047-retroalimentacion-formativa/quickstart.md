# Validación local realizada

Validación del 2026-09-18 en worktree aislado, con datos sintéticos y clientes simulados. No se llamó a APIs externas ni se modificó producción.

Requisitos: entorno backend con requisitos de aplicación, pytest y Ruff; worktree de esta rama. Solo datos sintéticos y clientes simulados.

Desde `backend`:

```powershell
python -m pytest tests/unit/test_comparator_feedback.py tests/unit/test_vision_extractor.py -q
python -m pytest tests/integration/test_explainable_grading_pipeline.py -q
python -m ruff check --select F401,F821,F822,F823,F841 app/modules/calificaciones/agents.py tests/unit/test_comparator_feedback.py
```

Esperado: reglas compatibles en principal/respaldo, evidencia completa, salidas simuladas conservadas y escala 1–5 vigente. Pruebas de prompt no acreditan calidad semántica del LLM.

Resultado actualizado sobre `main` el 2026-09-23: 87 pruebas aprobadas, 1 omitida y avisos de deprecación de dependencias. La omitida requiere `SPEC031_TEST_DATABASE_URL` (PostgreSQL de pruebas aislado); no se considera ejecutada. Las 14 pruebas del archivo de feedback y las regresiones de visión, desglose, modalidades, persistencia y ajustes docentes pasan. Ruff para F401/F821/F822/F823/F841 y `git diff --check` pasan.

También se verificó que los metadatos internos de trazabilidad/publicación no se incluyan como preferencias y que el blueprint original no sea modificado. No se midió latencia real ni calidad pedagógica de nuevas salidas: no se promete un tiempo de respuesta ni obediencia semántica del modelo.

Revisar diff: solo constructor/prompt, pruebas y documentación; sin cambios de cálculo, modelos, timeouts, cola, esquema o UI. El issue #94 y las aprobaciones `spec-approved` y `plan-approved` están registrados; antes del merge siguen siendo obligatorios PR y CI verde.

## Validación posterior al primer piloto — 2026-09-24

El issue #137 evoluciona la misma especificación sin migraciones ni reprocesamiento histórico. Se validaron estos escenarios sintéticos:

- La extracción recibe el enunciado `270 x 67`, pero debe conservar operandos, productos parciales y resultado exactamente como aparecen en la evidencia.
- El verificador lee la imagen antes de considerar la propuesta principal y devuelve una transcripción literal por componente.
- Una diferencia entre evaluador y verificador por pregunta activa arbitraje dirigido.
- Una nota global distinta de la suma deja la nota calculada visible, pero mantiene la calificación en revisión y conserva el feedback original en trazabilidad.
- Una felicitación de «todas correctas» incompatible con un componente incorrecto se reemplaza por un resumen basado en el desglose.
- Una nota ya confirmada o ajustada por el docente conserva nota, estado y feedback sin cambios.

Comandos ejecutados:

```powershell
python -m pytest backend/tests/unit/test_answer_key_guard.py backend/tests/unit/test_breakdown_compatibility.py backend/tests/unit/test_breakdown_history.py backend/tests/unit/test_breakdown_authorization.py backend/tests/unit/test_breakdown_modalities.py backend/tests/unit/test_calificacion_breakdown.py backend/tests/unit/test_breakdown_visibility.py backend/tests/unit/test_breakdown_teacher_adjustment.py backend/tests/unit/test_breakdown_sanitizer.py backend/tests/unit/test_breakdown_persistence.py backend/tests/unit/test_grading_queue_service.py backend/tests/unit/test_grading_provider_policy.py backend/tests/unit/test_grading_component_consensus.py backend/tests/unit/test_online_grading_persistence.py backend/tests/unit/test_photo_grading_failures.py backend/tests/unit/test_photo_grading_persistence.py backend/tests/unit/test_real_photo_answer_regression.py backend/tests/unit/test_tasks_grading.py backend/tests/unit/test_vision_extractor.py backend/tests/unit/test_comparator_feedback.py -q
python -m pytest backend/tests/integration/test_explainable_grading_pipeline.py backend/tests/integration/test_explainable_grading_flow.py -q
python -m ruff check backend/app/services/vision_extractor.py backend/app/modules/calificaciones/agents.py backend/app/modules/calificaciones/orchestrator.py backend/app/modules/calificaciones/breakdown_policy.py backend/app/modules/calificaciones/breakdown_service.py backend/tests/unit/test_vision_extractor.py backend/tests/unit/test_comparator_feedback.py backend/tests/unit/test_breakdown_persistence.py
git diff --check
```

Resultado: `157 passed` en regresión unitaria focalizada; `27 passed, 1 skipped` en integración explicable. El caso omitido requiere PostgreSQL aislado y no se declara ejecutado. Ruff y `git diff --check` aprobaron. No se llamaron proveedores externos ni se modificaron datos de producción.
