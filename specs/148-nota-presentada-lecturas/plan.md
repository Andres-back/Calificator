# Plan: La decisión del empate llega a todas las lecturas, la analítica y el PDF (backend)

**Rama**: `codex/148-nota-presentada-lecturas` | **Fecha**: 2026-11-04 | **Spec**: [spec.md](./spec.md) | **Issue**: [#314](https://github.com/Andres-back/Calificator/issues/314)

## Resumen

Se reutiliza `grade_rounding` (Spec 147) sin cambiar la regla:

- se añade `redondeo_empate` en las respuestas de lectura que muestran una nota;
- la tasa de aprobación y el PDF usan `presented_grade`.

La rama parte de la Spec 147, que añade la columna. Se actualizará contra `main` cuando se fusione el #313.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11, FastAPI, Pydantic 2 y SQLAlchemy 2.
**Persistencia**: sin cambios ni migraciones.
**Pruebas**: pytest unitario con dobles; las pruebas de devolución existentes comprueban que las huellas no cambian.

## Cambios

| Lectura o cálculo | Archivo | Cambio |
| --- | --- | --- |
| Boletín del estudiante | `calificaciones/schemas.py:266` (`BoletinItem`) y su construcción en `service.py` (boletín, ~881-1026) | `redondeo_empate: TieDecision \| None = None` |
| Evaluaciones del estudiante | `evaluaciones/schemas.py:131` y `evaluaciones/service.py:323` | `mi_redondeo_empate` |
| Xali | `xali/schemas.py` y `xali/service.py` | `redondeo_empate` junto a `nota_maxima` |
| Devolución compartida | `feedback_sharing/projection.py`: carga útil `summary` (:89) y `detail` (`build_projection`), y la huella de origen (:38-41) | `redondeo_empate` **solo si existe**, en la carga útil y en la huella, para que la huella de las notas sin decisión no cambie (FR-002) |
| Tasa de aprobación | `analytics/service.py:976-992` | `presented_grade(nota, máx, decisión)`. Se excluye si es `None`; aprueba si la nota presentada es mayor o igual que `pass_threshold(máx)`. |
| PDF | `services/pdf_service.py:65` y el origen de sus filas | La nota presentada con un decimal, o "2.95 (por decidir)". Las filas incluyen `nota_maxima` y `redondeo_empate`. |

## Verificación de la constitución

- **Separación de roles:** cumple. Cada lectura expone la decisión solo de las notas que ya expone.
- **Integridad y trazabilidad:** cumple. No se reescribe ninguna nota y las huellas previas no cambian.
- **Datos y secretos:** no aplica.
- **Gobernanza y pruebas:** cumple. Pruebas en RED primero, `tasks.md` e inventario.

## Decisiones

- **Exponer la decisión, no una "nota presentada" calculada** en cada respuesta: el frontend ya tiene la regla (Spec 145) y solo le falta el dato. Así se evita duplicar formatos de texto en el backend.
- **El empate sin decidir queda fuera de la tasa**, en lugar de contarlo como reprobado: no prejuzga la decisión del docente.
- **Los promedios siguen con las notas exactas**, porque son otra decisión pedagógica.

## Pruebas planificadas

1. Tasa de aprobación con 2.94, 2.96, 2.95 decidida "arriba" y 2.95 sin decidir: 2 de 3.
2. Huella de la devolución idéntica para una nota sin decisión; con decisión, la carga útil la incluye.
3. Boletín, `mi_redondeo_empate` y Xali incluyen la decisión.
4. Texto del PDF para una nota normal, una decidida y una sin decidir.
