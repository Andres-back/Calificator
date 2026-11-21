# Tareas: Correr la suite de accesibilidad en cada PR

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #441. Aprobados por el usuario el 2026-11-20: ante la recomendación «correr la suite de accesibilidad en cada PR» respondió «adelante» (`spec-approved` y `plan-approved` en #441).

### Pruebas

- [X] T001 Gobernanza: paso de accesibilidad con `id: a11y`, corte en el primer fallo, antes de los diagnósticos y suite no vacía. (FR-001, FR-003)
- [X] T002 Gobernanza: la condición de corte incluye el paso de accesibilidad. (FR-002, FR-003)

### Implementación

- [X] T003 Paso «Run accessibility checks» en el trabajo de regresiones contextuales. (FR-001)
- [X] T004 Condición de corte ampliada y ajuste de la prueba de Spec 172. (FR-002)

### Validación

- [X] T005 Suite de accesibilidad en local (16 pasan), gobernanza de CI, inventario y gobernanza de specs. (FR-001, FR-002, FR-003)

## Dependencias

T001 y T002 → T003 y T004. T005 al final.
