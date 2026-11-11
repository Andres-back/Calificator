# Validación: Spec 172

Entorno: Windows 11 y Python 3.13 para las pruebas de gobernanza. El corte real solo se puede comprobar en GitHub Actions.

## Pruebas primero: RED

| Prueba (en la raíz) | Resultado antes del cambio (`main` @ `4aaf7bd`) |
| --- | --- |
| `pytest tests/spec_governance/test_ci_first_failure.py` | ❌ 12 de 14 fallan: ningún conjunto corta en el primer fallo y ningún trabajo cancela la ejecución. Las otras dos protegen `fail-fast: false` y los permisos de solo lectura |

## Después del cambio: GREEN

| Comando | Resultado |
| --- | --- |
| `pytest tests/spec_governance/test_ci_first_failure.py` | ✅ 14 |
| `pytest tests/spec_governance` | ✅ 86 |
| Lectura de `ci.yml` con `yaml.safe_load` | ✅ los cuatro trabajos de pruebas terminan en «Stop the run at the first failure» y declaran sus permisos; los otros tres no cambian |
| `python scripts/build_system_inventory.py --check` | ✅ |

## Comprobación en GitHub Actions

En el PR #365 se subió una prueba de Vitest rota a propósito (`frontend/src/zzCorteCi.test.ts`, commit `6b8715d`) y se retiró en el commit siguiente. Ejecución 43053160753:

| Qué se miró | Resultado |
| --- | --- |
| Duración de la ejecución | 3 min 25 s (15:55:27 a 15:58:52 UTC). Las ejecuciones completas de ese día pasaron de 20 minutos |
| Trabajo «Frontend quality and build» | paso «Run unit tests» en `failure`; el trabajo termina como `cancelled` |
| Backend y contenedores | `cancelled` a los 3 minutos, sin terminar |
| Fragmentos E2E y regresiones contextuales | `cancelled` sin arrancar |
| Compuertas «Frontend E2E» y «Frontend quality, build and E2E» | `failure`: el PR no queda en verde |
| Lectura del fallo | `gh run view <ejecución> --job <trabajo> --log` muestra la prueba rota y su aserción. `gh run view --log-failed` no devuelve nada, porque el trabajo figura como cancelado |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (backend) | `test_each_backend_suite_stops_at_its_first_failure` |
| FR-002 (Vitest) | `test_frontend_unit_tests_stop_at_their_first_failure` |
| FR-003 (E2E) | `test_each_e2e_suite_stops_at_its_first_failure` |
| FR-004 (cancelar al final) | `test_a_failed_test_job_cancels_the_rest_of_the_run` y `test_quality_jobs_cancel_on_any_failed_check` |
| FR-005 (infraestructura) | `test_a_browser_install_timeout_does_not_cancel_the_run` y `test_one_slow_shard_install_does_not_cancel_the_other_shards` |
| FR-006 (permisos) | `test_a_failed_test_job_cancels_the_rest_of_the_run` y `test_other_jobs_keep_read_only_permissions` |
| FR-007 (compuerta) | `test_visual_ci_gates.py`, sin cambios en sus casos de trabajos cancelados u omitidos |

## Observaciones

- Una ejecución muestra ahora solo el primer fallo de cada conjunto.
- El trabajo que falla aparece como «cancelado», no como «fallido»: para encontrar el motivo hay que abrir ese trabajo y buscar el paso marcado en rojo.
- En la comprobación, Vitest informó «1 failed | 1534 passed»: la prueba rota estaba en el último archivo, así que `--bail=1` no llegó a ahorrar pruebas. El ahorro vino de cancelar los demás trabajos.
- Los cortes de `pytest -x` y de Playwright no se probaron en GitHub Actions; son opciones estándar y las cubre la prueba de gobernanza. Tampoco se provocó una instalación lenta de navegadores para ver que no cancela.
