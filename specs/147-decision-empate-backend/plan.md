# Plan: Decisión del docente en el empate del umbral (backend)

**Rama**: `codex/147-decision-empate-backend` | **Fecha**: 2026-11-04 | **Spec**: [spec.md](./spec.md) | **Issue**: [#312](https://github.com/Andres-back/Calificator/issues/312)

## Resumen

Se crea un módulo `grade_rounding.py` con la regla del empate, idéntica a la del frontend de la Spec 145. Se añade la columna `calificaciones.redondeo_empate` (`'abajo' | 'arriba' | NULL`) y un único punto de escritura, `apply_final_grade(cal, evaluacion, score, decision, *, require_decision)`, que todos los caminos que fijan la nota final usan. La publicación se bloquea si hay empate sin decisión.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11, FastAPI, SQLAlchemy 2 (async), Pydantic 2 y Alembic.
**Persistencia**: una columna nueva, nullable y con `CHECK`. La migración es aditiva y reversible, sin backfill: las notas antiguas quedan sin decisión (supuesto de la spec).
**Pruebas**: pytest, con unitarias de la regla y de cada camino usando dobles, y la prueba de la migración si el repositorio la tiene.
**Plataforma objetivo**: API backend.
**Rendimiento y escala**: aritmética O(1) por nota, sin consultas adicionales, porque `evaluacion` ya está cargada en cada camino.

## Regla (`backend/app/modules/calificaciones/grade_rounding.py`)

```text
cents    = quantize(nota, 0.01, HALF_UP)
umbral10 = quantize(nota_maxima × 0.6, 0.1, HALF_UP)
empate   ⇔ cents == umbral10 − 0.05
presentada(nota, máx, decisión) = umbral10 − 0.1 si decisión == "abajo";
                                  umbral10 si decisión == "arriba";
                                  quantize(nota, 0.1, HALF_UP) si no hay empate;
                                  None si hay empate sin decisión
```

Se comprueba con la misma tabla de casos que `gradePresentation.test.ts` (Spec 145).

## Verificación de la constitución

- **Separación de roles:** cumple. Solo quien ya podía confirmar, ajustar o publicar puede decidir; no hay permisos nuevos.
- **Integridad y trazabilidad:** cumple. La nota exacta y el desglose no se tocan, y la decisión se registra en el historial (`_timeline`) con quién la tomó y cuándo.
- **Asincronía e idempotencia:** cumple. Las guardas actuales se conservan (`operacion_id`, `version_desglose_esperada`, versión del desglose). La decisión forma parte de la intención de `ajustar`, es decir, de su `fingerprint`.
- **Datos y secretos:** no aplica.
- **Accesibilidad:** no aplica (solo backend).
- **Gobernanza y pruebas:** cumple. Pruebas en RED primero, `tasks.md` e inventario.

## Caminos y cambios

| Camino (archivo) | Cambio |
| --- | --- |
| `confirm_grade_decision`, `service.py:196`, usado por confirmar y por aceptar-publicar | Recibe `decision`. Usa `apply_final_grade(..., require_decision=True)`. |
| `ajustar_nota`, `service.py:222` | `AjustarNota.redondeo_empate`; se valida antes de `prepare_final_grade_adjustment`; la decisión entra en el `fingerprint`. |
| `set_manual_grade`, "Establecer nota", `service.py:344` | `CalificacionManualCreate.redondeo_empate`; exige la decisión porque publica directamente. |
| `confirmar_nota_batch` / `ajustar_nota_batch`, `service.py:1162` y `:1230` | Campo opcional por ítem; el empate sin decisión da un error solo en ese ítem. |
| `update_breakdown`, `breakdown_service.py:353`, y `_apply_one`, `evaluaciones/score_notes.py:156` | Nota calculada: `apply_final_grade(..., require_decision=False)`. Si el valor cambia, la decisión se descarta. No se bloquea aquí. |
| `publish_grade_decision` / `publicar_nota_batch`, `service.py:1376` y `:1399` | `ensure_tie_decided(cal, evaluacion)`: 409 o error por ítem si hay empate sin decisión. |
| `feedback_sharing/batch_service.py:80` (aceptar-publicar) | Por la guarda de `confirm_grade_decision`, un empate de la sugerencia de IA queda pendiente con un código por ítem, sin abortar el lote. |
| Reinicios a NULL: `service.py:311`, `photo_service.py:86,133`, `router.py:434` y `jobs/router.py:319` (SQL) | También ponen `redondeo_empate = NULL`. |
| `ConfirmarNota`, `BatchConfirmItem`, `BatchAdjustItem` (`schemas.py`) y `CalificacionRead` | Campo opcional `redondeo_empate: Literal["abajo", "arriba"] \| None`; la lectura lo expone. |
| `models.py:123` y migración `202611040001_redondeo_empate.py` | Columna `String(6)` nullable con `CHECK (redondeo_empate IN ('abajo','arriba'))`. |

**Mensaje de rechazo** (422, texto plano, para que el `toApiError` actual del frontend lo muestre): "La nota 2.95 está justo en el empate del umbral de aprobación (3.0). Indica si queda en 2.9 o en 3.0." Los números se calculan con la regla.

## Decisiones y complejidad

- **Un único punto de escritura (`apply_final_grade`)** en vez de repetir la regla en cada camino. Los lotes hoy duplican la lógica de confirmar; esta spec no los refactoriza, solo les hace llamar al punto común para la nota.
- **No reescribir `nota_confirmada`**, decisión del usuario: la validación de publicación con desglose (`nota_confirmada == desglose.nota_final`, `service.py:1324` y `:1383`) sigue funcionando sin cambios.
- **Mensaje en texto plano en lugar de un código estructurado:** `toApiError` descarta los `detail` no textuales. El PR 3 del frontend detecta el empate antes de enviar (la misma regla de la Spec 145) y manda la decisión, así que el rechazo es solo una red de seguridad.
- **Sin backfill:** decidir por el docente las notas antiguas iría contra la regla.

## Pruebas planificadas

1. `test_grade_rounding.py`: tabla de la regla (escalas 5, 10, 100 y 4.5) y `presentada`.
2. Confirmar, ajustar y "Establecer nota": rechazo sin decisión, aceptación con decisión, registro en el historial y decisión ignorada cuando no hay empate.
3. Lotes de confirmar, ajustar y publicar: error solo en el ítem en empate.
4. Publicar: 409 sin decisión.
5. Desglose y reparto: la decisión se descarta cuando cambia el valor.
6. Aceptar-publicar: la sugerencia en empate queda pendiente con código.
7. Migración: `upgrade` y `downgrade`, si existe el patrón de prueba de migraciones.

## Reducción y validación visual

No aplica: no hay interfaz. No se retira ningún control. La presentación y la pregunta llegan en el PR 3.
