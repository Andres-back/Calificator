# Tareas: «Confirmar todos» no despublica las notas publicadas

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #361. El usuario ordenó reparar los hallazgos de la auditoría el 2026-11-11; las etiquetas `spec-approved` y `plan-approved` las registra él.

## Fase 1: Pruebas primero (RED)

- [X] T001 Pruebas de regresión en `backend/tests/unit/test_batch_confirm_published.py`: una nota publicada no cambia al confirmarla en lote y la otra del lote sí se confirma; una cifra distinta sobre una publicada falla sin cambiarla. RED: 2 de 2 fallan. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Fase 2: Corrección (GREEN)

- [X] T002 `confirmar_nota_batch` deja intacta una calificación publicada con la misma cifra y la cuenta como exitosa. (FR-001, FR-002, FR-004)
- [X] T003 `confirmar_nota_batch` rechaza el ítem si la cifra difiere de la publicada. (FR-003)

## Fase final: Validación

- [X] T004 Ejecutar las pruebas unitarias relacionadas, ruff, el inventario y la gobernanza, repetir el lote contra la API local y registrar resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Dependencias

T001 → T002 y T003 → T004. Sin IA ni datos reales en las pruebas.
