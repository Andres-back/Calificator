# Validación: Spec 153

Entorno: Windows 11 y Python 3.13. Pruebas unitarias con dobles en memoria y datos sintéticos, sin API ni datos reales. Las pruebas de integración con PostgreSQL las ejecuta el CI.

## Pruebas primero: RED

| Prueba (en `backend/`) | Resultado antes de la corrección (`main` @ `0430885`) |
| --- | --- |
| `pytest tests/unit/test_score_revision_without_material.py` | ❌ 3 de 9 fallan: 409 "Revisa el material y las respuestas correctas", 422 "Indica el contenido visual" y 422 "Cada pregunta necesita su identificador". Las otras 6 protegen rechazos que deben seguir vigentes |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| `pytest tests/unit/test_score_revision_without_material.py` | ✅ 9 |
| `pytest` de las pruebas unitarias que usan `visual_service`, `prepare_content_edit`, `save_content_revision` o `publish_evaluation` | ✅ 105, 1 omitida |
| `ruff check --select F401,F821,F822,F823,F841` en `app/modules/evaluaciones` y la prueba nueva | ✅ |
| `python scripts/build_system_inventory.py --write` y `pytest tests/spec_governance` | ✅ inventario vigente y 61 pruebas |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (publicar sin material) | `test_score_plan_version_without_material_can_be_published` |
| FR-002 (rechazos vigentes) | `test_publication_still_requires_reviewed_material_and_keys` |
| FR-003 (editar con versión) | `test_versioned_evaluation_without_material_can_start_a_text_edit` y `test_text_edit_saves_a_new_version_with_the_key_and_complete_coverage` |
| FR-004 (cobertura completa) | `test_text_edit_saves_a_new_version_with_the_key_and_complete_coverage` |
| FR-005 (primera versión) | `test_unversioned_evaluation_still_needs_content_to_start_an_edit` y `test_first_version_still_needs_material_or_document` |
| FR-006 (regresión) | la tabla RED |

## Observaciones

- ⚠️ No hay prueba de la secuencia completa contra PostgreSQL ni contra la API. Las etapas se prueban por separado.
- La corrección no cambia filas de producción. Las respuestas esperadas siguen siendo responsabilidad del docente.
