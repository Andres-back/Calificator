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

Pendiente de registrar: se hace en el PR con una prueba de Vitest rota a propósito y se retira después. Ver la sección «Corte comprobado» más abajo cuando esté.

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
- Los cortes de Playwright no se probaron en GitHub Actions; la opción `--max-failures=1` es estándar y la cubre la prueba de gobernanza.
