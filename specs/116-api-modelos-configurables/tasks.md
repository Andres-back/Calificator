# Tareas: APIs y modelos administrables

Estado: implementación y pruebas locales; CI, fusión y activación se registran por separado en el PR. Spec 117 / PR #245 ya integrado en el punto de partida. Ninguna tarea marcada significa por sí sola una publicación en producción.

## Fase 1 — Contratos y fundamentos

- [x] T001 Añadir pruebas de formatos y normalización en `backend/tests/unit/test_ai_api_transport.py`: texto/imagen, Responses/Chat/Messages, rechazo/vacío/truncamiento y preservación del legado (FR-002, FR-004, FR-005, SC-004).
- [x] T002 Añadir pruebas de URL segura, catálogo completo, credenciales privadas y preflight no falsificable en `backend/tests/unit/test_ai_api_connections.py` (FR-001, FR-003, FR-006, FR-007).
- [x] T003 Crear migración aditiva en `backend/alembic/versions/` para perfiles y revisiones privadas de credencial, con downgrade que se niegue a borrar datos utilizados; ampliar `backend/app/services/ai_credentials_service.py` con resolución cifrada/versionada y revocación sin filtrar secretos (FR-001, FR-006, FR-010).
- [x] T004 Implementar constructor/normalizador compartido en `backend/app/services/ai_api_transport.py` sin ciclos de importación ni un SDK adicional (FR-002, FR-004, FR-005).

## Fase 2 — US1: administrar conexión y modelos

- [x] T005 [US1] Ampliar contratos en `backend/app/modules/admin_ai_config/schemas.py` y persistencia/lectura/historial en `backend/app/services/ai_config_service.py` conservando formatos anteriores (FR-001, FR-002, FR-006).
- [x] T006 [US1] Completar catálogo en `backend/app/services/ai_model_discovery.py`: paginación acotada, rechazo de truncamiento, conservación ante fallo y perfiles manuales, sin inventar capacidad desconocida (FR-003, SC-001).
- [x] T007 [US1] Implementar conexión compatible, rotación y prueba sintética autenticada en `backend/app/modules/admin_ai_config/router.py` y `backend/app/services/ai_api_connections.py`, con destino seguro, una llamada y comprobante ligado a la revisión (FR-001, FR-002, FR-006, FR-007).
- [x] T008 [US1] Validar publicación en `backend/app/modules/admin_ai_config/control_center_service.py` usando credenciales reales del servidor y dependencias modificadas; mantener conflictos de versión y recuperación (FR-005, FR-006).
- [x] T009 [US1] Añadir contratos y controles de conexión/perfil/prueba en `frontend/src/modules/admin/api.ts`, `AdminAIConfigPage.tsx` y `ai/sections/ProvidersSection.tsx`; conservar borrador y selección ante fallos (FR-001, FR-002, FR-003, FR-009, SC-001).

## Fase 3 — US2: ejecutar lo publicado

- [x] T010 [US2] Capturar conexión, perfil, capacidades y referencia privada de credencial en `backend/app/services/ai_configuration_resolver.py`; probar snapshots heredados/inmutables y rotación sin cruce de destinos (FR-004, FR-006, FR-010, SC-002).
- [x] T011 [US2] Adaptar `backend/app/modules/calificaciones/agents.py` y `orchestrator.py` al transporte publicado con telemetría real, principal/respaldo independientes e imágenes conservadas; mantener salidas inconsistentes en revisión (FR-004, FR-005, FR-010).
- [x] T012 [US2] Integrar el mismo contrato en `backend/app/services/vision_extractor.py` y `llm_router.py`, manteniendo adaptadores de imágenes/embeddings/Ollama y sin modificar rutas actuales (FR-004, FR-005, FR-008).
- [x] T013 [US2] Mostrar evaluador principal y guardado/efectivo/observado correctos en `frontend/src/modules/admin/ai/sections/FunctionsSection.tsx`; permitir proveedores compatibles según capacidad/protocolo en lugar de una lista cerrada de IDs, con errores por función sin mensajes técnicos innecesarios (FR-004, FR-008, FR-009, SC-003).

## Fase 4 — Verificación y preparación de entrega

- [x] T014 Añadir integración PostgreSQL aislada en `backend/tests/integration/test_ai_api_configuration.py`: permisos, publicaciones simultáneas, revisiones, secretos, fallo parcial y conservación de notas/evidencias (FR-001, FR-006, FR-010, SC-002).
- [x] T015 Añadir Vitest/E2E en `frontend/src/modules/admin/` y `frontend/e2e/` para conexión → catálogo → prueba → publicación/reapertura a 360/1366 px, acceso denegado y recuperación (FR-009, SC-003, SC-005).
- [x] T016 Ejecutar regresiones de gateway, calificación, digitalización, migración, frontend y contenedores; actualizar `specs/system-inventory/`, índice y baseline de gobernanza solo con los archivos de esta entrega (FR-004, FR-011, SC-004, SC-005).
- [x] T017 Registrar evidencias, convergencia y procedimiento de entrega/rollback en `specs/116-api-modelos-configurables/quickstart.md`; preparar PR que cierre #243 con CI obligatorio (FR-011).
- [x] T018 Preparar en `specs/116-api-modelos-configurables/quickstart.md` y verificar la prueba sintética y publicación versionada de las cinco rutas de FR-008 (digitalización Luna/respaldo GLM, valoración Luna, verificación GLM, revisión adicional Luna), con comprobación de admin/worker y comparación de otras rutas intactas. Probar conservación de imágenes, numeración con huecos, clave de opción existente y respuesta abierta sin letra inventada. CI/fusión/despliegue y activación reales deben confirmarse después en el PR, no presumirse por esta preparación (FR-008, FR-011, SC-003).

## Dependencias y estrategia

T001/T002 preceden a sus implementaciones. T003/T004 bloquean US1. T005–T008 preceden a T009; T010–T012 preceden a T013. T014/T015 verifican ambas historias y bloquean T016–T018. No ejecutar inferencias con alumnos ni cambiar producción para resolver pruebas.

MVP seguro: conexión/perfil probados y consumidos por un trabajo sintético antes de publicar Luna. Imágenes, embeddings y otras funciones permanecen independientes. Las pruebas T001 y T002 pueden prepararse en archivos distintos; no se delega código ni se modifican archivos compartidos simultáneamente.

## Phase 5: Convergence

- [x] T019 Incluir el identificador de función granular en la proyección de último uso de `backend/app/modules/admin_ai_config/control_center_service.py` y probar `digitalizacion.estructura` para no ocultar su proveedor real en el panel, conforme a FR-009 y SC-003 (partial).

## Phase 6: Convergence

- [x] T020 Corregir la brecha de autoservicio al cambiar un modelo en `FunctionsSection.tsx`, `CompatibleAPISection.tsx` y `AdminAIConfigPage.tsx`: mostrar principal/respaldo pendientes antes de guardar, preparar el modelo seleccionado desde su función sin perder el borrador, ofrecer respaldos comprobados o quitarlo solo por decisión explícita y conservar errores accionables; añadir regresión del caso Luna con respaldo heredado y pruebas móvil/escritorio, sin relajar comprobantes del servidor ni cambiar rutas publicadas automáticamente, conforme a FR-005, FR-009, SC-001 y SC-005 (partial).

## Phase 7: Convergence

- [x] T021 Conectar la tarea de generación `evaluacion_generar_dba_rag` a la ruta administrativa de generación de preguntas en `ai_config_service.py`, `llm_router.py` y `control_center_service.py`, capturando su selección y observando el uso real sin cascadas a proveedores ajenos ni plantillas; probar ruta, respaldo explícito, fallo recuperable y modelos arbitrarios, sin publicar configuraciones nuevas, conforme a FR-004, FR-005, FR-009 y FR-010 (partial).
- [x] T022 Validar el contrato completo del borrador en `generation_service.py`, explicitar las metas no vacías y limitar a una corrección de salida incompleta usando la misma configuración; conservar alineación, permisos, preguntas y notas existentes, no guardar salidas inválidas ni registrar su contenido. Añadir regresión del fallo `metas_aprendizaje=[]`, pruebas focalizadas y comprobación sintética separada de calificación antes de informar funcionamiento, conforme a FR-005, FR-010, FR-011 y Constitución VI (partial).
