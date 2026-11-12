# Validación: Spec 171

Entorno: Windows 11 y Python 3.13. Pruebas unitarias con dobles en memoria y una comprobación contra la API y PostgreSQL locales con datos sintéticos. Las pruebas de integración con PostgreSQL las ejecuta el CI.

## Pruebas primero: RED

| Prueba (en `backend/`) | Resultado antes de la corrección (`main` @ `3ddc2d3`) |
| --- | --- |
| `pytest tests/unit/test_batch_confirm_published.py` | ❌ 2 de 2: la publicada queda `confirmada`, y una cifra distinta se acepta |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| `pytest tests/unit/test_batch_confirm_published.py tests/unit/test_tie_decision_paths.py` | ✅ 13 |
| `pytest tests/unit -k "batch or lote or confirm or calificacion or grade or tie or publish"` | ✅ 317 |
| `ruff check --select F401,F821,F822,F823,F841` de los dos archivos | ✅ |
| `python scripts/build_system_inventory.py --check` y `pytest tests/spec_governance` (en la raíz) | ✅ |

## Comprobación contra la API y PostgreSQL locales

`POST /api/calificaciones/lote/confirmar` con una calificación publicada sintética y su misma nota:

| | Antes (`4c83bb6`) | Después |
| --- | --- | --- |
| Respuesta | 200, `success: true` | 200, `success: true` |
| Estado de la calificación | pasa de `publicada` a `confirmada` | sigue `publicada` |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (publicada intacta) | `test_published_grade_stays_published_when_confirmed_in_batch`: estado, nota, historial y enlaces |
| FR-002 (cuenta como exitosa) | la misma prueba y la tabla contra la API |
| FR-003 (cifra distinta falla) | `test_batch_confirm_does_not_change_the_score_of_a_published_grade` |
| FR-004 (el resto del lote) | la primera prueba y `test_lote_confirmar_solo_falla_el_item_en_empate` |
| FR-005 (regresión) | la tabla RED |

## Observaciones

- No se comprobó en pantalla. La lista de «Ver notas» no cambia: sigue permitiendo marcar notas publicadas y el resumen del lote las cuenta como confirmadas.
- El caso de la cifra distinta no se repitió contra la API local; lo cubre la prueba unitaria.
- Las notas que este fallo ya despublicó en producción no se restauran con este cambio. No se midió cuántas hay, porque la auditoría no tuvo lectura de producción.
