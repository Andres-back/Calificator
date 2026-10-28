# Tareas: lectura y recalificación administradas

## Fase 1: Preparación

- [X] T001 Registrar diagnóstico minimizado, alcance autorizado, contrato y plan en `specs/133-lectura-recalificacion-configurable/`; revisar16 criterios de calidad documental y trazabilidad. (FR-001–010)

## Fase 2: Fundamentos

- [X] T002 Escribir primero regresiones de límites y ruta sin modelos ocultos en `backend/tests/unit/test_vision_route_policy.py` y `test_vision_extractor.py`; registrar RED de deadline, intentos compartidos, respaldo, credenciales y salida cortada. (FR-001, FR-002, FR-004, FR-005)
- [X] T003 Crear contrato tipado `backend/app/services/vision_route_policy.py` y migración nullable `backend/alembic/versions/202610280001_vision_runtime_limits.py`; pruebas de upgrade/downgrade sin pérdida en `backend/tests/integration/test_vision_runtime_limits.py`. (FR-003, FR-004, FR-008)

## Fase 3: US1 — Administración

- [X] T004 [US1] Capturar/persistir/versionar controles y conexión en `backend/app/services/{ai_config_service,ai_configuration_resolver,ai_api_connections}.py` y `backend/app/modules/admin_ai_config/{schemas,router}.py`, preservando campos omitidos y rechazando otras etapas. (FR-001, FR-002, FR-003, FR-008)
- [X] T005 [US1] Añadir controles de lectura y dirty/publicación/reapertura en `frontend/src/modules/admin/{api.ts,ai/utils/snapshots.ts,ai/sections/FunctionsSection.tsx}` con pruebas unitarias/API. (FR-003, FR-004)

## Fase 4: US2 — Ejecución fiable

- [X] T006 [US2] Ejecutar ruta administrada en `backend/app/services/vision_extractor.py` con presupuestos compartidos, perfiles/credenciales independientes y salida completa; conservar consumidores legacy fuera del alcance. (FR-001, FR-002, FR-004, FR-005)
- [X] T007 [US2] Impedir cascadas externas/configuración silenciosa en `backend/app/modules/calificaciones/orchestrator.py` para trabajos admitidos; probar configuración ausente, principal/respaldo fallidos y multipágina. (FR-001, FR-002, FR-005, FR-008)
- [X] T008 [US2] Registrar códigos visuales finitos y uso disponible en `backend/app/modules/analytics/usage_logger.py` con regresiones, sin contenido sensible ni nuevas llamadas reales. (FR-005)

## Fase 5: US3 — Referencia anterior

- [X] T009 [US3] Escribir primero pruebas de historial con cero, snapshots recientes vacíos, error, ausencia y roles en `frontend/src/modules/calificaciones/components/PreviousGradeReference.test.tsx`. (FR-006, FR-007)
- [X] T010 [US3] Integrar `PreviousGradeReference.tsx` en `CalificacionesWorkspace.tsx` usando API114 privada existente, sin asignar el valor a nota vigente/confirmación/publicación/exportación. (FR-006, FR-007)

## Fase final: Validación

- [X] T011 Ejecutar PostgreSQL aislado: compatibilidad/permiso/publicación/rollback/conservación en `backend/tests/integration/test_vision_runtime_limits.py`; verificar contratos académicos y sin reintento real. (FR-003, FR-007, FR-008)
- [X] T012 Añadir E2E admin/docente/estudiante360/1440 en `frontend/e2e/reading-controls.spec.ts` y recorridos existentes, sin aflojar controles ni contadores de casos. (FR-003, FR-006, FR-007)
- [X] T013 Ejecutar regresiones completas/aplicables, tipos/lint/build; actualizar propietarios008/012/116, índice, baseline e inventario y registrar resultados en `specs/133-lectura-recalificacion-configurable/quickstart.md`. (FR-001–008, FR-010)
- [X] T014 Ejecutar Converge y preparar PR a279 con evidencia y CI; documentar publicación posterior Luna/GLM solo para lectura, sin fusión ni modificación de notas o trabajos reales. (FR-009, FR-010)

## Dependencias y estrategia

T001→T002→T003→T004→T005. T006 sigueT003/T004 y precedeT007/T008. T009→T010 es independiente de transporte, pero se ejecuta secuencial para limitar cambios simultáneos. T011 sigueT004/T007; T012 sigueT005/T010. T013 yT014 cierran todo. MVP restaura gobernabilidad de lectura; referencia histórica no altera la validez de ninguna nota. No se requiere delegación ni llamadas a IA de producción para desarrollar/probar.

Preparación de entrega completada con `pr-description.md` y revisión Converge. Los checks remotos se ejecutan al abrir el PR: marcar tareas de implementación no acredita CI verde ni autoriza fusión/despliegue.
