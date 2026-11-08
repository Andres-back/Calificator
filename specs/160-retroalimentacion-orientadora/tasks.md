# Tareas: Retroalimentación orientada al siguiente paso y foto siempre adjunta

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-08 (`spec-approved`, `plan-approved` en #340).

## PR 1: Historia 1, la foto siempre adjunta

### Pruebas primero (RED)

- [X] T001 Pruebas de backend en `backend/tests/unit/test_feedback_photo_always.py` y `test_feedback_link_guards.py`: publicación nueva con foto, reutilización sin 409, reemplazo, copia con y sin gesto, enlace cerrado sin cambios y `evidencia_disponible` solo con archivo. RED: 9 fallas. (FR-001, FR-003, FR-010, FR-011)

### Corrección (GREEN)

- [X] T002 `new_publication` siempre con foto y `attach_evidence` con auditoría; reutilizar y reemplazar la activan; el campo `evidencia` se acepta y se ignora, y sigue en el recibo de cada solicitud para que un reintento no falle. (FR-001, FR-003)
- [X] T003 `adjuntar_evidencia` en la copia, enviado solo desde un gesto del docente: copiar, WhatsApp y Compartir. (FR-001, FR-011)
- [X] T004 `evidencia_disponible` exige archivo; un 404 de la foto vuelve a consultar el enlace en vez de cerrar la página. (FR-010)
- [X] T005 Quitar la casilla e indicar la foto en la creación, la confirmación, la reactivación, el reemplazo y la copia. (FR-002)
- [X] T006 Actualizar las pruebas de Vitest y E2E que esperaban la casilla o `evidencia: false`, y añadir las de foto sin casilla, gesto y foto que falla. Se escribieron junto con el cambio de frontend, sin una corrida RED aparte. (FR-001, FR-002, FR-010, FR-011)

### Validación

- [X] T007 Ejecutar pruebas, inventario y gobernanza, y registrar los resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-009, FR-010, FR-011)

## PR 2: Historias 2 y 3, el mensaje orienta primero

Sus tareas se añaden en ese PR: la acción primero, reglas de redacción, sin frase de reparto al estudiante, aviso interno fuera de enlaces nuevos y validación con una muestra anónima. (FR-004, FR-005, FR-006, FR-007, FR-008, FR-009)

## Dependencias

T001 → T002 → T003 y T004 → T005 → T006 → T007.
