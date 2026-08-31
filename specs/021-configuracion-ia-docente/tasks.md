# Tareas: Configuración de IA global y por docente

## Fase 1: Preparación

- [x] T001 Actualizar el índice responsable y el inventario de superficies en specs/README.md y specs/012-ia-jobs-produccion/spec.md
- [x] T002 [P] Crear pruebas de migración y compatibilidad de datos heredados en backend/tests/integration/test_ai_configuration_migration.py
- [x] T003 [P] Crear pruebas contractuales de catálogos, rutas y configuración docente en backend/tests/integration/test_ai_configuration_api.py
- [x] T004 [P] Crear pruebas del cliente frontend para modelos, rutas y credenciales personales en frontend/src/modules/admin/api.test.ts y frontend/src/modules/profesor_ai/api.test.ts

## Fase 2: Fundamentos

- [x] T005 Implementar la migración compatible de catálogo, rutas, políticas y configuración docente en backend/alembic/versions/202608250001_teacher_ai_configuration.py
- [x] T006 Definir contratos tipados de proveedor, modelo, ruta, credencial y configuración personal en backend/app/modules/admin_ai_config/schemas.py
- [x] T007 [P] Crear pruebas unitarias de precedencia, compatibilidad, versiones e instantáneas sanitizadas en backend/tests/unit/test_ai_configuration_resolver.py
- [x] T008 [P] Crear pruebas unitarias de cifrado, sustitución, borrado y ausencia de secretos en backend/tests/unit/test_teacher_ai_credentials.py
- [x] T009 Implementar repositorio de credenciales personales y resolución por propietario en backend/app/services/ai_credentials_service.py
- [x] T010 Implementar el resolvedor central y el catálogo de capacidades en backend/app/services/ai_configuration_resolver.py y backend/app/services/ai_config_service.py
- [x] T011 Capturar y preservar `_ai_config` sanitizado al crear/reintentar trabajos en backend/app/modules/jobs/service.py y backend/app/modules/jobs/schemas.py

## Fase 3: Historia 1 - Administración por capacidad (P1)

**Objetivo**: el administrador publica proveedor/modelo principal y fallback compatibles sin editar el servidor.
**Prueba independiente**: configurar texto y visión con modelos distintos, rechazar una incompatibilidad y comprobar hash consistente entre backend y worker.
- [x] T012 [P] [US1] Crear pruebas de publicación atómica, conflicto de versión, rollback y permisos admin en backend/tests/integration/test_admin_ai_routing.py
- [x] T013 [P] [US1] Crear pruebas de selectores de modelo compatibles y estados de guardado en frontend/src/modules/admin/AdminAIConfigPage.test.tsx
- [x] T014 [US1] Persistir y validar catálogo, capacidades, `primary_model`, `fallback_model` y rollout en backend/app/services/ai_config_service.py
- [x] T015 [US1] Endurecer endpoints globales tipados, prueba por modelo y restauración en backend/app/modules/admin_ai_config/router.py
- [x] T016 [US1] Ampliar contratos frontend para catálogo, versión y modelos por capacidad en frontend/src/modules/admin/api.ts
- [x] T017 [US1] Mejorar la interfaz global con proveedor/modelo principal, fallback filtrado y rollout en frontend/src/modules/admin/ai/sections/FeatureRoutingSection.tsx
- [x] T018 [US1] Mostrar compatibilidad, prueba, conflicto y reversión sin revelar secretos en frontend/src/modules/admin/AdminAIConfigPage.tsx

## Fase 4: Historia 2 - API propia por docente (P1)

**Objetivo**: cada docente conecta proveedores autorizados sin afectar a otros usuarios.
**Prueba independiente**: dos docentes ejecutan trabajos simultáneos con orígenes distintos y no pueden leer ni modificar la configuración ajena.
- [x] T019 [P] [US2] Crear pruebas de acceso docente/estudiante/admin, aislamiento y respuestas sanitizadas en backend/tests/integration/test_teacher_ai_configuration.py
- [x] T020 [P] [US2] Crear pruebas de configuración básica, credenciales enmascaradas y eliminación en frontend/src/modules/profesor_ai/TeacherAIConfigPage.test.tsx
- [x] T021 [US2] Implementar consulta, guardado atómico y auditoría de preferencias personales en backend/app/modules/admin_ai_config/router.py
- [x] T022 [US2] Implementar alta, prueba efímera, sustitución y eliminación de claves por proveedor en backend/app/modules/admin_ai_config/router.py
- [x] T023 [US2] Crear cliente tipado y claves de caché docentes en frontend/src/modules/profesor_ai/api.ts y frontend/src/config/queryKeys.ts
- [x] T024 [US2] Implementar la vista docente de modo institucional/propio y tarjetas de proveedores en frontend/src/modules/profesor_ai/TeacherAIConfigPage.tsx
- [x] T025 [US2] Añadir una única ruta y entrada de navegación docente protegida en frontend/src/router.tsx, frontend/src/config/routes.ts y frontend/src/config/nav.ts

## Fase 5: Historia 3 - Configuración sencilla y avanzada (P2)

**Objetivo**: un docente no técnico configura el modo recomendado rápidamente y puede ampliar solo cuando lo necesita.
**Prueba independiente**: completar modo automático a 360 px y personalizar una capacidad desde el panel avanzado sin perder las demás selecciones.
- [x] T026 [P] [US3] Crear pruebas responsive, teclado, claro/oscuro y mensajes educativos en frontend/e2e/teacher-ai-configuration.spec.ts y frontend/e2e/accessibility/teacher-ai-configuration.a11y.spec.ts
- [x] T027 [US3] Implementar selección automática de modelos recomendados compatibles en backend/app/services/ai_configuration_resolver.py
- [x] T028 [US3] Implementar panel avanzado plegable, filtros por capacidad y consentimiento explícito en frontend/src/modules/profesor_ai/TeacherAIConfigPage.tsx
- [x] T029 [US3] Incorporar ayuda sobre OpenAI API, Qwen/OpenCode y conectividad de Ollama en frontend/src/modules/profesor_ai/TeacherAIConfigPage.tsx

## Fase 6: Historia 4 - Trazabilidad, fallback y continuidad (P2)

**Objetivo**: cada trabajo conserva su ruta, respeta consentimiento y puede recuperarse sin alterar notas.
**Prueba independiente**: encolar, cambiar configuraciones y confirmar selección inmutable; simular fallo personal con y sin fallback institucional.
- [x] T030 [P] [US4] Crear regresiones de snapshot, fallback, revocación y calificación institucional existente en backend/tests/integration/test_ai_job_configuration_snapshot.py y backend/tests/unit/test_photo_grading_failures.py
- [x] T031 [P] [US4] Crear prueba concurrente de tres docentes sin cruce de claves o modelos en backend/tests/integration/test_ai_configuration_concurrency.py
- [x] T032 [P] [US4] Crear escaneo de secretos sintéticos en jobs, respuestas, auditoría y logs de prueba en backend/tests/integration/test_ai_configuration_secret_safety.py
- [x] T033 [US4] Integrar la selección capturada en LLMRouter sin cambiar firmas públicas en backend/app/services/llm_router.py
- [x] T034 [US4] Integrar la selección capturada en visión y digitalización preservando DeepSeek y fallbacks actuales en backend/app/services/vision_extractor.py y backend/app/modules/evaluaciones/digitalize_service.py
- [x] T035 [US4] Integrar selección efectiva en imágenes y embeddings en backend/app/services/image_router.py y backend/app/services/embedding_service.py
- [x] T036 [US4] Conectar creación de trabajos de evaluaciones, calificaciones, recursos, presentaciones y Xali al resolvedor en backend/app/modules/evaluaciones/router.py, backend/app/modules/calificaciones/router.py, backend/app/modules/herramientas/router.py, backend/app/modules/presentaciones/service.py y backend/app/modules/xali/router.py
- [x] T037 [US4] Registrar origen, versión, fallback y error sanitizados en backend/app/modules/analytics/usage_logger.py y backend/app/services/ai_config_service.py
- [x] T038 [US4] Mantener adaptadores heredados y retiro trazable de columnas sin consumidores en backend/app/modules/admin_ai_config/router.py y backend/alembic/versions/202608250001_teacher_ai_configuration.py

## Fase final: Validación

- [x] T039 Ejecutar upgrade, downgrade y upgrade de Alembic contra datos heredados y documentar resultado en specs/021-configuracion-ia-docente/quickstart.md
- [x] T040 Ejecutar pruebas backend completas, compilación Python y escaneo de secretos sobre backend/app y backend/tests
- [x] T041 Ejecutar TypeScript, lint estricto, Vitest y build de producción sobre frontend/src y frontend/package.json
- [x] T042 Ejecutar E2E mock, accesibilidad y viewport 360×800 sobre frontend/e2e
- [x] T043 Regenerar inventario técnico y verificar que ninguna ruta/tabla nueva quede sin propietario en specs/system-inventory/current.json
- [x] T044 Ejecutar `$speckit-converge` y reflejar cualquier tarea restante en specs/021-configuracion-ia-docente/tasks.md antes del PR

## Dependencias

- Fase 1 no depende de implementación y establece pruebas/propiedad.
- Fase 2 bloquea todas las historias: migración, contratos, cifrado, resolvedor y snapshot.
- Historias 1 y 2 pueden avanzar en paralelo después de Fase 2 porque separan panel global y personal.
- Historia 3 depende de Historia 2.
- Historia 4 depende de Historias 1 y 2 y se integra por capacidad en orden: contenido/presentaciones → visión/digitalización → calificación/verificación.
- La fase final requiere todas las historias completas.

## Estrategia incremental

1. Mantener `rollout_enabled=false` durante migración y paneles.
2. Activar generación de contenido y presentaciones y validar telemetría.
3. Activar digitalización y visión conservando DeepSeek como valor sembrado.
4. Activar evaluación/verificación solo después de sus regresiones completas.
5. Ante cualquier anomalía, desactivar rollout para trabajos nuevos; los trabajos iniciados conservan su snapshot.

## Fase 7: Convergencia

- [x] T045 Capturar `_ai_config` al crear jobs de digitalización y calificación, mapear su capacidad y añadir regresiones de inmutabilidad per FR-012, FR-013 y plan: instantánea al encolar (partial)
- [x] T046 Permitir al administrador activar o desactivar modelos del catálogo con validación, auditoría, interfaz y pruebas per FR-006 (partial)
- [x] T047 Versionar publicaciones globales y restaurar atómicamente la última configuración publicada válida sin alterar jobs existentes per FR-018 (partial)
## Cobertura de requisitos

- **FR-001, FR-002, FR-003, FR-004, FR-005, FR-006**: T012–T018 y T046 validan catálogo, capacidades, pruebas, activación y publicación global.
- **FR-007, FR-008, FR-009, FR-010, FR-011**: T019–T029 cubren credenciales propias, modo automático/avanzado, precedencia y consentimiento de fallback.
- **FR-012, FR-013**: T011, T030, T033–T037 y T045 preservan y auditan la instantánea inmutable de cada trabajo.
- **FR-014, FR-015**: T008, T009, T019, T022 y T032 cubren cifrado, sanitización, propiedad y separación de roles.
- **FR-016, FR-021**: T020, T024, T026, T028 y T029 cubren estados comprensibles, móvil y orientación sobre proveedores externos/locales.
- **FR-017**: T027, T030, T033–T038 garantizan que el modo institucional existente continúa como comportamiento predeterminado.
- **FR-018, FR-019, FR-020**: T012, T014, T015, T037 y T047 cubren restauración, publicación atómica y auditoría sin secretos.
- **FR-033, FR-034**: T051, T059, T064–T066 limitan Ollama local a Presentaciones, bloquean evidencia estudiantil y separan builds de desarrollo de artefactos firmados.

## Fase 8: Ampliación Ollama Cloud y conector local Windows

**Objetivo**: permitir Ollama Cloud institucional o personal y Ollama local del docente sin exponer el puerto local ni bloquear la cola principal.
**Prueba independiente**: seleccionar un modelo Cloud descubierto, emparejar un conector Windows, ejecutar un trabajo local persistente y recuperar el resultado una sola vez tras una desconexión.

- [x] T048 [P] [US5] Crear pruebas de autenticación Bearer, descubrimiento tags y capacidades show de Ollama Cloud en backend/tests/unit/test_ollama_cloud_provider.py
- [x] T049 [P] [US5] Crear pruebas de cifrado, aislamiento docente y ausencia de secretos de Ollama Cloud, consolidadas en backend/tests/unit/test_teacher_ai_credentials.py
- [x] T050 [P] [US5] Crear pruebas de emparejamiento, revocación, lease, heartbeat e idempotencia del conector, consolidadas en backend/tests/unit/test_ollama_cloud_provider.py
- [x] T051 [P] [US5] Crear pruebas de selección Cloud o local y estados del conector en frontend/src/modules/profesor_ai/TeacherAIConfigPage.test.tsx y frontend/src/modules/admin/AdminAIConfigPage.test.tsx (la selección local queda limitada y probada únicamente para Presentaciones)
- [x] T052 [US5] Crear migración de conectores, códigos de emparejamiento y trabajos locales persistentes en backend/alembic/versions/202608300002_ollama_connectors.py
- [x] T053 [US5] Implementar cliente Ollama Cloud compatible con chat, tags y show en backend/app/services/ollama_provider.py
- [x] T054 [US5] Permitir credenciales Ollama Cloud cifradas globales y por docente en backend/app/services/ai_credentials_service.py y backend/app/modules/admin_ai_config/router.py
- [x] T055 [US5] Integrar modelos Ollama descubiertos y capacidades reales al resolvedor en backend/app/services/ai_configuration_resolver.py y backend/app/services/ai_config_service.py
- [x] T056 [US5] Implementar modelos, esquemas y servicio de emparejamiento y dispositivos en backend/app/modules/ollama_connector/models.py, schemas.py y service.py
- [x] T057 [US5] Implementar endpoints autenticados de profesor y conector en backend/app/modules/ollama_connector/router.py y backend/app/api.py
- [x] T058 [US5] Implementar trabajos locales persistentes con lease renovable, finalización idempotente, expiración recuperable y reanudación del job original en backend/app/modules/ollama_connector/service.py y backend/app/modules/jobs/service.py
- [x] T059 [US5] Integrar Ollama Cloud por capacidad y Ollama local únicamente para Presentaciones, sin cambiar contratos de negocio ni enviar evidencias estudiantiles al conector, en backend/app/services/llm_router.py, backend/app/services/vision_extractor.py y backend/app/modules/presentaciones/service.py, según FR-033
- [x] T060 [US5] Ampliar panel global y docente con credencial enmascarada, modelos Cloud y emparejamiento local seguro en frontend/src/modules/admin/AdminAIConfigPage.tsx y frontend/src/modules/profesor_ai/TeacherAIConfigPage.tsx
- [x] T061 [US5] Crear conector Windows saliente, almacenamiento seguro y cliente local 127.0.0.1 en connector/windows/xcalificator_ollama_connector
- [x] T062 [US5] Documentar instalación, revocación, recuperación y prohibición de exponer el puerto local de Ollama en connector/windows/README.md
- [x] T063 [US5] Reanudar de forma idempotente el trabajo original tras callback, fallo o expiración local, consolidado sin archivo nuevo en backend/app/modules/ollama_connector/service.py, backend/app/modules/jobs/service.py, backend/app/workers/tasks_ai_config.py y backend/app/workers/tasks_presentations.py
- [x] T064 [US5] Empaquetar ejecutable para Windows 10 22H2 y Windows 11 23H2 o posteriores, separando desarrollo sin firma de distribución con Authenticode y SHA-256 en connector/windows/installer
- [x] T065 Ejecutar pruebas específicas Ollama, desconexión y concurrencia sin usar credenciales reales en backend/tests y connector/windows
- [x] T066 Ejecutar TypeScript, lint, Vitest y build para las superficies Ollama en frontend
- [x] T067 Actualizar inventario técnico y ejecutar convergencia en specs/021-configuracion-ia-docente/tasks.md y specs/system-inventory/current.json

## Dependencias de la ampliación Ollama

- T048 a T051 definen contratos antes de implementación.
- T052 bloquea persistencia del conector; T053 y T054 bloquean el flujo Cloud.
- T055 depende de T053 y T054; T056 a T058 dependen de T052.
- T059 depende de T055 y T058; T060 puede avanzar después de contratos API estables.
- T061 consume T057 y T058 y nunca abre un puerto entrante en el equipo docente.
- T063 reanuda el trabajo original y T064 produce el instalador; T065 a T067 se ejecutan únicamente cuando el usuario autoriza pruebas y publicación.

## Fase 9: Convergencia

- [ ] T068 Ejecutar aceptación cronometrada de emparejamiento, detección de Ollama y finalización de una Presentación sin datos estudiantiles en Windows 10 22H2 y Windows 11 23H2 o posteriores per SC-011 y SC-014 (partial: E2E Windows 11 completado en 29,43 s con dos modelos; falta repetir la matriz en Windows 10)
