# Tareas: Higiene incremental del backend

**Cobertura**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007 y FR-008.

## Fase 1: Preparación

- [x] T001 Confirmar y registrar los 22 hallazgos F401/F841 iniciales en `specs/038-backend-hygiene/research.md`.
- [x] T002 Registrar `038-backend-hygiene` en `specs/README.md` y `tests/spec_governance/test_spec_baseline.py` conforme a FR-007.

## Fase 2: Historia 1 — Preservación funcional (P1)

**Objetivo**: demostrar que la limpieza no cambia contratos ni flujos.

**Prueba independiente**: compilación, inventario y suites backend producen los mismos resultados funcionales.

- [x] T003 [US1] Revisar el diff para excluir rutas, esquemas, permisos, migraciones y lógica de calificación en cumplimiento de FR-001, FR-002 y FR-006.
- [x] T004 [US1] Ejecutar compilación y pruebas backend relacionadas después de cada grupo de limpieza en `backend/app` y `backend/tests`.

## Fase 3: Historia 2 — Eliminar residuos comprobables (P1)

**Objetivo**: resolver los hallazgos medidos sin eliminar registros dinámicos.

**Prueba independiente**: Ruff F401/F841 termina con cero hallazgos sobre aplicación y pruebas.

- [x] T005 [US2] Revisar y retirar imports/variables sin uso en `backend/app/modules/admin_mail/router.py`, `backend/app/modules/analytics/event_policy.py` y `backend/app/modules/analytics/service.py` conforme a FR-003.
- [x] T006 [US2] Revisar y retirar imports/variables sin uso en `backend/app/modules/authorization/models.py`, `backend/app/modules/calificaciones/breakdown_service.py`, `backend/app/modules/evaluaciones/models.py` y `backend/app/modules/evaluaciones/router.py` conforme a FR-003.
- [x] T007 [US2] Revisar y retirar imports sin uso en `backend/app/modules/impacto_tesis/models.py`, `backend/app/services/pdf_service.py` y `backend/app/services/vision_service.py` conforme a FR-003.
- [x] T008 [US2] Retirar residuos en `backend/tests/integration/test_explainable_grading_pipeline.py`, `backend/tests/unit/test_calificaciones_resumen_academico.py` y `backend/tests/unit/test_puzzle_builder.py` conforme a FR-004.
- [x] T009 [US2] Ejecutar `ruff check --select F401,F841 app tests` y justificar cualquier excepción de importación dinámica conforme a FR-003 y FR-004.

## Fase 4: Historia 3 — Prevenir regresiones (P2)

**Objetivo**: mantener la línea base limpia en cambios futuros.

**Prueba independiente**: el comando del CI acepta el repositorio y rechaza muestras aisladas F401 y F841.

- [x] T010 [US3] Ampliar el paso Ruff de `.github/workflows/ci.yml` con F401 y F841 sin retirar F821/F822/F823 conforme a FR-005.
- [x] T011 [US3] Ejecutar controles negativos por entrada estándar para F401 y F841 y el control positivo completo documentado en `specs/038-backend-hygiene/quickstart.md`.

## Fase 5: Validación y documentación

- [x] T012 Actualizar el inventario generado mediante `scripts/build_system_inventory.py --write` y comprobar ausencia de deriva conforme a FR-007.
- [x] T013 Ejecutar pruebas unitarias, integración, gobernanza, compilación y `git diff --check` conforme a SC-002 y SC-004.
- [x] T014 Confirmar en `specs/038-backend-hygiene/research.md` que la división de módulos grandes sigue diferida conforme a FR-008.
- [x] T015 Ejecutar `$speckit-converge` y completar cualquier brecha restante.
- [x] T016 Crear commit, publicar la rama, abrir PR enlazado al issue #78 y fusionar únicamente con CI verde.

## Dependencias

- T001 y T002 preceden a las historias.
- T003 protege T005–T008; T009 depende de todas las eliminaciones.
- T010 precede a T011.
- T012–T016 requieren T004, T009 y T011 completas.

## Estrategia incremental

La historia 1 fija los invariantes; la historia 2 elimina residuos en grupos pequeños; la historia 3 vuelve permanente la política. La división modular se inicia únicamente en una especificación posterior.
