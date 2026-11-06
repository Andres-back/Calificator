# Validación: Spec 148

Entorno: Windows 11 y Python 3.11. Pruebas unitarias con dobles en memoria y datos sintéticos; sin base de datos real.

## Pruebas primero: RED

| Prueba (en `backend/`) | Resultado antes de la corrección (rama de la Spec 147 @ `ff21e75`) |
| --- | --- |
| `pytest tests/unit/test_tie_decision_reads.py` | ❌ no existían `approval_rate` ni `boletin_grade_text`, ni la decisión en `BoletinItem`, `EvaluacionRead.mi_redondeo_empate`, Xali o las devoluciones |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| `pytest tests/unit/test_tie_decision_reads.py tests/unit/test_xali_delivered_max_grade.py tests/unit/test_grade_rounding.py` | ✅ |
| `pytest tests/unit` | ✅ 2009 pruebas. ⚠️ Las mismas 13 fallas locales de Windows que en `main` (procesamiento de imagen, enlaces simbólicos y versión de `fpdf`); el CI de Linux las pasa. |
| `ruff check --select F401,F821,F822,F823,F841 app tests` (regla del CI) | ✅ |
| `python scripts/build_system_inventory.py --write` y `pytest tests/spec_governance` | ✅ |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (decisión en las lecturas) | `test_lecturas_del_estudiante_incluyen_la_decision`, `test_devolucion_resumen_incluye_la_decision_solo_si_existe` y la prueba ampliada de Xali |
| FR-002 (huellas estables) | `test_huella_de_devolucion_no_cambia_sin_decision` |
| FR-003 (tasa con nota presentada) | `test_tasa_de_aprobacion_usa_la_nota_presentada_y_excluye_empates_sin_decidir` |
| FR-004 (PDF) | `test_pdf_muestra_la_nota_presentada` |

## Observaciones

- `generate_boletin_pdf` hoy solo se usa en pruebas y en las muestras de `fpdf`. La regla queda aplicada para cuando se conecte, y las filas sin `nota_maxima` (como las de esas muestras) conservan su texto exacto.
- La tasa de aprobación sigue considerando la sugerencia de la IA cuando no hay nota confirmada, como antes. Ahora le aplica la misma regla, sin decisión.
