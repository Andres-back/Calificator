# Investigación: Higiene incremental del backend

## Decisión 1: Línea base medible y limitada

**Decisión**: usar exclusivamente los 22 hallazgos F401/F841 actuales como alcance.

**Justificación**: son residuos demostrables y generalmente eliminables sin alterar comportamiento. Permiten una mejora verificable y pequeña.

**Alternativas consideradas**: activar todas las reglas Ruff fue descartado por mezclar estilo y modernización; analizar código muerto por heurísticas de llamadas fue pospuesto porque puede producir falsos positivos en rutas y registros dinámicos.

### Línea base reproducida

El comando `py -m ruff check --select F401,F841 backend/app backend/tests` detectó 22 hallazgos:

- 1 import en `admin_mail/router.py`.
- 1 import en `analytics/event_policy.py`.
- 4 imports y 1 variable en `analytics/service.py`.
- 1 import en `authorization/models.py`.
- 1 import en `calificaciones/breakdown_service.py`.
- 3 imports en `evaluaciones/models.py` y 1 alias de excepción en `evaluaciones/router.py`.
- 1 import en `impacto_tesis/models.py`, 1 en `pdf_service.py` y 2 en `vision_service.py`.
- 2 imports en `test_explainable_grading_pipeline.py`, 1 en `test_calificaciones_resumen_academico.py` y 2 variables en `test_puzzle_builder.py`.

La revisión manual confirmó que ninguno de estos nombres era un import de registro o inicialización. Tras retirarlos, el mismo comando terminó con cero hallazgos.

## Decisión 2: Revisión de efectos de importación

**Decisión**: comprobar manualmente cada import antes de retirarlo y conservar cualquier import que registre modelos, rutas o plugins.

**Justificación**: Python puede ejecutar comportamiento al importar módulos, por lo que un símbolo no referenciado sintácticamente no siempre es prescindible.

**Alternativas consideradas**: ejecutar corrección automática sin revisión fue descartado por riesgo de romper registros dinámicos.

## Decisión 3: Prevención en el mismo control incremental

**Decisión**: ampliar el paso Ruff existente con F401 y F841.

**Justificación**: evita duplicar instalaciones o pasos y mantiene una política explícita de errores funcionales y residuos básicos.

**Alternativas consideradas**: un workflow separado fue descartado por añadir latencia y mantenimiento sin aportar aislamiento útil.

## Deuda posterior medida

Los mayores módulos actuales son presentaciones/service (2142 líneas), analytics/service (2069), calificaciones/router (1960), calificaciones/service (1678), herramientas/service (1486), calificaciones/agents (1425), admin_ai_config/router (1412) y calificaciones/orchestrator (1201). Su división se realizará por límites funcionales en especificaciones posteriores.

La división modular permanece explícitamente diferida: esta fase no cambia límites funcionales ni redistribuye lógica del flujo de calificación.
