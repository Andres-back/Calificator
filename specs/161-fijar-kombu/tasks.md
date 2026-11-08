# Tareas: Workers en producción con kombu fijado

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-08 (`spec-approved`, `plan-approved` en #342).

- [X] T001 Prueba de compatibilidad del transporte de Redis. RED con kombu 5.7.0 y GREEN con kombu 5.4.2, en un entorno local con `celery==5.4.0` y `redis==5.2.1`. (FR-002)
- [X] T002 Fijar `kombu==5.4.2` en `backend/requirements.txt`. (FR-001)
- [X] T003 Prueba de gobernanza que exige las tres versiones fijadas. (FR-001)
- [X] T004 Ejecutar inventario y gobernanza, y registrar los resultados en `quickstart.md`. (FR-001, FR-002)
