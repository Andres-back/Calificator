# Tareas: Un mirror lento de Ubuntu no agota la CI de frontend

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md).

## Fase 1: Pruebas primero (RED)

- [X] T001 Prueba de regresión en `tests/spec_governance/test_playwright_install_ci.py`: caché antes de instalar, límite propio dentro del presupuesto del trabajo y sin `continue-on-error`. RED: 4 de 6 fallan con el flujo anterior. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Fase 2: Corrección (GREEN)

- [X] T002 Restaurar los paquetes `.deb` y limitar la instalación en `frontend-e2e-general` y `frontend-e2e-contextual`. (FR-001, FR-002, FR-003, FR-004)

## Fase final: Validación

- [X] T003 Ejecutar la gobernanza y el inventario, y registrar en `quickstart.md` qué debe comprobarse en GitHub Actions. (FR-005)

## Dependencias

T001 → T002 → T003.
