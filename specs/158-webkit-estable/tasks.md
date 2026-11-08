# Tareas: Las pruebas de WebKit dejan de obligar a relanzar la CI

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-07 (`spec-approved`, `plan-approved` en #336).

## Pruebas primero (RED)

- [X] T001 Reproducir en local con WebKit la falla de `regrading-score-context.spec.ts:102`. RED: agota 30 s esperando que un control quede estable, igual que en la CI. (FR-003)
- [X] T002 Medir el tiempo por cuadro de la página y del diálogo, y aislar la causa ocultando o pausando capas. El fondo animado deja la página en ≈ 340-480 ms por cuadro. (FR-003, FR-004)
- [X] T003 Prueba de gobernanza `tests/spec_governance/test_webkit_retries_ci.py`: repetición solo en WebKit y solo en CI, paso de resumen con `if: always()` y lista de pruebas repetidas con su primer error. RED: la configuración no tenía la regla. (FR-001, FR-002, FR-006)

## Corrección (GREEN)

- [X] T004 Dejar quietos los círculos decorativos del fondo en `frontend/src/index.css`, con el mismo aspecto. (FR-004)
- [X] T005 `retries` de una vez para los proyectos WebKit solo en CI en `frontend/playwright.config.ts`; `retries: 0` global se mantiene. (FR-001)
- [X] T006 `frontend/scripts/report-flaky.mjs` y paso «List flaky end-to-end tests» en la CI con el reportero JSON. (FR-002)
- [X] T007 Sin subir tiempos límite ni quitar pruebas o comprobaciones: las cuatro pruebas no cambian. (FR-003, FR-005)

## Validación

- [X] T008 Repetir 20 veces en WebKit las cuatro pruebas de la tabla y su archivo, ejecutar gobernanza e inventario y registrar los resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)
