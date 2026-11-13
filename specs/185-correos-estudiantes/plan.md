# Plan: Correos de estudiante fáciles: apellido + iniciales

**Spec**: [spec.md](spec.md) | **Issue**: [#388](https://github.com/Andres-back/Calificator/issues/388)

## Decisión

- `backend/app/modules/importacion_estudiantes/student_email.py`, funciones puras:
  - `propose(nombre)` → parte local, orden supuesto y si es dudoso.
  - `first_free(local, ocupados)` → el primer correo libre.
  - Las partículas se unen a la palabra siguiente. El orden se decide comparando cuántos nombres de pila conocidos hay al inicio y al final; en empate, apellidos primero y dudoso.
- `importacion_estudiantes/service.unique_internal_email`:
  - Toma un bloqueo consultivo por base (`pg_advisory_xact_lock`) y lee los correos `base\d*@xcalificator.com`.
  - Elige el primero libre. Es la única vía de alta de cuentas internas (importación por foto o manual).
- `scripts/migrate_student_emails.py`, canalizado al contenedor:
  - Simulación de solo lectura: CSV más huella sha256 del mapa id→anterior→nuevo.
  - `--apply --expected-sha256`: bloquea las cuentas y recalcula; si la huella no coincide, no aplica nada. Si coincide, guarda el respaldo en `.private/student-email-migration/` y cambia en dos pasos (correo temporal y luego el definitivo) para no chocar con la restricción única.
  - `--override ID=parte_local` aplica las correcciones de la revisión. `--revert` restaura desde el respaldo.
- No cambia el inicio de sesión: sigue siendo correo + contraseña, y las sesiones no dependen del correo.

Descartado:

- **Una migración de Alembic**: aplicaría sin revisión humana del orden de los nombres.
- **Separar nombres y apellidos en la base**: cambio mayor; el campo único se conserva.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/importacion_estudiantes/student_email.py` | nuevo |
| `backend/app/modules/importacion_estudiantes/service.py` | generador nuevo con bloqueo |
| `scripts/migrate_student_emails.py` | nuevo |
| `backend/tests/unit/test_student_email.py`, `test_migrate_student_emails.py` | nuevos |
| `backend/tests/integration/test_roster_import_flow.py`, `frontend/e2e/roster-import.spec.ts` | formato nuevo |

## Riesgos

- El correo anterior deja de servir para entrar. Los profesores entregan los nuevos accesos desde «Entregar accesos», y el navegador puede sugerir el correo anterior.
- Un orden mal supuesto da un correo extraño; por eso la tabla se revisa antes.
