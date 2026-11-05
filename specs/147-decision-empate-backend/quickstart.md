# Validación: Spec 147

Entorno: Windows 11 con Python 3.11 y las dependencias de `backend/requirements*.txt`. Las pruebas unitarias usan dobles en memoria; no hay base de datos real ni datos personales. Las pruebas de integración con PostgreSQL corren en el CI.

## Pruebas primero: RED

| Prueba (en `backend/`) | Resultado con `main` @ `1b82884` |
| --- | --- |
| `pytest tests/unit/test_grade_rounding.py` | ❌ el módulo `grade_rounding` no existía |
| `pytest tests/unit/test_tie_decision_paths.py` | ❌ 10 fallos: confirmar, ajustar y "Establecer nota" guardaban 2.95 sin decisión; la decisión no existía en los esquemas; publicar no bloqueaba el empate |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| Pruebas nuevas y las existentes de ajuste directo y nota manual | ✅ 52 pruebas |
| `pytest tests/unit` | ✅ 2002 pruebas. ⚠️ 13 fallan **también en `main`** en este Windows: procesamiento de imagen, enlaces simbólicos, procesos aislados y la versión de `fpdf`. Son preexistentes y locales; el CI de Linux las pasa. |
| `ruff check --select F401,F821,F822,F823,F841 app tests` (regla del CI) | ✅ |
| Cabezas de Alembic | ✅ una sola: `202611040001` |
| `python scripts/build_system_inventory.py --write` y `pytest tests/spec_governance` | ✅ |

## Ajuste tras el primer CI

`tests/integration/test_feedback_sharing_migration.py::test_upgrade_preserves_whole_existing_grade` falló en el CI con `UndefinedColumnError: redondeo_empate`.

- **Causa:** la prueba migra una base temporal a `202610150001` y crea la fila sintética con el ORM actual, que escribe todas las columnas mapeadas.
- **Corrección:** antes de crear la fila, la prueba añade como opcionales las columnas de revisiones posteriores, mediante `_add_later_nullable_columns`, que exige que sean nullable. La comprobación sobre `202610200001` (la fila no cambia) se mantiene igual, y el arreglo también sirve para futuras columnas.

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (regla única) | `test_detecta_solo_el_empate_del_umbral` y `test_nota_presentada`, con la misma tabla que la Spec 145 |
| FR-002 (exigir decisión) | confirmar, ajustar, "Establecer nota" y lote de confirmar; el lote de ajustar usa el mismo `apply_final_grade` |
| FR-003 (decisión aparte, con historial) | `test_confirmar_empate_con_decision_la_guarda_y_la_registra`; `nota_confirmada` conserva 2.95 |
| FR-004 (no publicar sin decisión) | `test_publicar_bloquea_empate_sin_decision` y `test_calculo_que_deja_publicada_una_nota_en_empate_la_despublica`. Aceptar-publicar hereda la guarda de confirmar y publicar. |
| FR-005 (descartar al cambiar la cifra) | `test_cambio_calculado_de_la_nota_descarta_la_decision_previa` y los reinicios a NULL |
| FR-006 (lectura) | `CalificacionRead.redondeo_empate` |
| FR-007 (compatibilidad) | `test_endpoint_confirmar_acepta_la_decision_opcional`; las pruebas previas de ajuste y nota manual siguen pasando sin el campo |

## Fuera de alcance

- PR 2b: tasa de aprobación en analítica y PDF calculados con la nota presentada.
- PR 3 (frontend): pregunta al docente y presentación de 2.9 o 3.0 con la decisión.
- Las notas existentes en empate quedan sin decisión, como dice la spec; no se hizo backfill.
