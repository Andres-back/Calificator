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
