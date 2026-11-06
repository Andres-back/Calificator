# Validación: Spec 151

Entorno: Windows 11 y Python 3.11. Pruebas unitarias con dobles en memoria y datos sintéticos, sin API ni datos reales.

## Pruebas primero: RED

| Prueba (en `backend/`) | Resultado antes de la corrección (`main` @ `6a0ac07`) |
| --- | --- |
| `pytest tests/unit/test_grader_missing_score.py` | ❌ error de colección: no existía `grader_output_shape` |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| `pytest tests/unit/test_grader_missing_score.py tests/unit/test_grading_recovery.py tests/unit/test_photo_grading_failures.py` | ✅ 92 |
| `pytest tests/unit` | 2010 pasan. ⚠️ 13 fallan en local: pruebas de procesamiento de imagen, enlaces simbólicos y versión de `fpdf`, las mismas áreas de las fallas de Windows ya conocidas en `main`; el CI de Linux decide. |
| `ruff check --select F401,F821,F822,F823,F841 app tests` (regla del CI) | ✅ |
| `python scripts/build_system_inventory.py --write` y `pytest tests/spec_governance` | ✅ |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (un reintento) | `test_etapa_reintenta_una_vez_si_falta_la_nota`, `test_etapa_no_supera_dos_intentos_y_conserva_motivo_y_forma` |
| FR-002 (motivo real) | esas pruebas y `test_both_failed_graders_return_no_score[grader_missing_score...]` |
| FR-003 (forma sin texto) | `test_forma_de_la_salida_no_incluye_texto_del_estudiante`, `test_calificador_sin_nota_devuelve_motivo_y_forma` |
| FR-004 (sin nota inventada) | `test_etapa_no_supera_dos_intentos_y_conserva_motivo_y_forma` |
| FR-005 (regresión) | la tabla RED |

## Observaciones

- Esta validación no prueba el arreglo contra el modelo real. Cuando esté desplegado, un fallo de este tipo mostrará en `grader_a_output_shape` qué devolvió el modelo.
- `output_shape` no se conserva cuando la evaluación se divide en partes (`merge_partition_results`); el motivo se resume igual que antes en ese caso.
