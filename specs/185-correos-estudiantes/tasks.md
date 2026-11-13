# Tareas: Correos de estudiante fáciles: apellido + iniciales

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #388. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #388). Alcance, revisión previa y momento del cambio, decididos por el usuario el 2026-11-13.

### Pruebas primero (RED)

- [X] T001 `test_student_email.py`: ejemplo del usuario, listas oficiales, un solo nombre, partículas, tildes y ñ, dudoso, números por repetición y límite de longitud. RED: el módulo no existía. (FR-001, FR-002, FR-003)
- [X] T002 `test_migrate_student_emails.py`: tabla determinista, números frente a correos de otras cuentas, corrección revisada, segunda aplicación sin cambios y huella. RED: el script no existía. (FR-002, FR-004, FR-005)
- [X] T003 `test_roster_import_flow.py`: las cuentas nuevas reciben `ruizana@` y `pazluis@`. (FR-001)

### Implementación (GREEN)

- [X] T004 Generador y alta de cuentas con bloqueo por base. (FR-001, FR-002, FR-003)
- [X] T005 Script de migración con simulación, huella, respaldo y reversión. (FR-004, FR-005)

### Validación

- [X] T006 Pruebas, lint, inventario y gobernanza; resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Dependencias

T001 → T004. T002 → T005. T003 → T004. T006 al final.
