# Tareas: Modularización segura de evidencia de calificación

**Cobertura**: FR-001 a FR-010 y SC-001 a SC-005.

## Fase 1: Preparación

- [x] T001 Registrar `039-modularizar-evidencia` en `specs/README.md` y `tests/spec_governance/test_spec_baseline.py` conforme a FR-010.
- [x] T002 Registrar la línea base de funciones, tamaño del router y pruebas vigentes en `specs/039-modularizar-evidencia/research.md` conforme a SC-002 y SC-003.

## Fase 2: Fundamentos

- [x] T003 Crear pruebas de caracterización directas para URL segura, copia serializable, imagen, PDF, errores y caché en `backend/tests/unit/test_evidence_service.py` conforme a FR-001–FR-003 y SC-004.

## Fase 3: Historia 1 — Acceso seguro (P1)

**Objetivo**: conservar presentación y autorización observables con propiedad interna separada.

**Prueba independiente**: imagen, página PDF válida, página inválida y archivo dañado producen los resultados actuales.

- [x] T004 [US1] Extraer error, huella, renderizado de páginas, URL segura y copia serializable a `backend/app/modules/calificaciones/evidence_service.py` conforme a FR-002, FR-003 y FR-006.
- [x] T005 [US1] Integrar las capacidades extraídas mediante importaciones compatibles en `backend/app/modules/calificaciones/router.py` sin cambiar rutas ni permisos conforme a FR-001 y FR-007.
- [x] T006 [US1] Ejecutar `backend/tests/unit/test_evidence_service.py` y `backend/tests/unit/test_calificaciones_revision_workspace.py` para validar SC-001 y SC-004.

## Fase 4: Historia 2 — Preparación multihoja (P1)

**Objetivo**: conservar rotaciones, metadatos, modalidad mixta y reemplazo.

**Prueba independiente**: paquetes y reemplazos producen los mismos metadatos y referencias existentes.

- [x] T007 [US2] Extraer parseo de rotaciones, metadatos y limpieza tolerante a fallos a `backend/app/modules/calificaciones/evidence_service.py` conforme a FR-004, FR-005 y FR-006.
- [x] T008 [US2] Sustituir definiciones duplicadas por imports compatibles en `backend/app/modules/calificaciones/router.py` sin mover carga ni encolado conforme a FR-007–FR-009.
- [x] T009 [US2] Ejecutar pruebas de reemplazo, modalidad mixta, persistencia fotográfica y entrega en línea en `backend/tests/unit/` conforme a SC-001 y SC-005.

## Fase 5: Historia 3 — Mantenibilidad (P2)

**Objetivo**: demostrar propiedad única y reducción segura del router.

**Prueba independiente**: una búsqueda estructural encuentra una sola definición por responsabilidad y los imports anteriores siguen disponibles.

- [x] T010 [US3] Añadir aserciones de propiedad única y compatibilidad progresiva en `backend/tests/unit/test_evidence_service.py` conforme a FR-006, FR-007 y SC-003.
- [x] T011 [US3] Documentar el resultado del corte y mantener diferida la cola en `specs/039-modularizar-evidencia/research.md` conforme a FR-008.

## Fase final: Validación

- [x] T012 Actualizar y comprobar el inventario mediante `scripts/build_system_inventory.py --write` conforme a FR-010.
- [x] T013 Ejecutar Ruff, compilación, pruebas unitarias, integración, gobernanza y `git diff --check` conforme a SC-001–SC-005.
- [x] T014 Ejecutar `$speckit-converge` y completar cualquier brecha restante.
- [x] T015 Crear commit, publicar la rama, abrir PR enlazado al issue #80 y registrar el cierre en `specs/039-modularizar-evidencia/tasks.md` únicamente con CI verde.

## Dependencias

- T001–T003 preceden a la extracción.
- T004–T006 completan primero el acceso seguro.
- T007–T009 amplían el servicio a multihoja y reemplazo.
- T010–T011 demuestran el límite modular completo.
- T012–T015 requieren todas las historias completas.

## Estrategia incremental

La Historia 1 constituye el corte mínimo verificable. La Historia 2 completa la cohesión sin tocar la cola. La Historia 3 prueba mantenibilidad y deja explícito que el siguiente límite asíncrono tendrá su propia especificación.
