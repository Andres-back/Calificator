# Validación: Spec 154

Entorno local: Windows 11 y Python 3.13. La prueba local comprueba la forma del flujo de CI. Que la caché funcione solo se puede comprobar en GitHub Actions.

## Pruebas primero: RED

| Prueba | Resultado con el flujo anterior (`main` @ `0430885`) |
| --- | --- |
| `pytest tests/spec_governance/test_playwright_install_ci.py` | ❌ 4 de 6 fallan: sin límite propio y sin caché. Las otras 2 comprueban que no haya `continue-on-error` |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| `pytest tests/spec_governance/test_playwright_install_ci.py` | ✅ 6 |
| `python scripts/build_system_inventory.py --write` y `pytest tests/spec_governance` | ✅ inventario vigente y 67 pruebas |

## Comprobación en GitHub Actions

1. **Primera ejecución**: los trabajos no encuentran caché, instalan como antes y al menos uno la guarda (`Cache saved`).
2. **Segunda ejecución**: `Cache restored` antes de instalar, y `Need to get` muy por debajo de 89.5 MB en el registro de `apt`.

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (caché antes de instalar) | `test_ubuntu_packages_are_restored_from_cache_before_installing` y la comprobación en GitHub Actions |
| FR-002 y FR-003 (límites) | `test_install_step_fails_fast_within_the_job_budget` |
| FR-004 (sin ocultar fallos) | `test_slow_install_is_not_hidden` |
| FR-005 (regresión) | la tabla RED |
