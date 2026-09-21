# Tareas: respuesta estructurada y rutas rápidas

**Entrada**: documentos de diseño en `specs/055-fast-json-routing/`.

**Pruebas**: obligatorias por tratarse de un hotfix productivo.

## Fase 1: Preparación

- [x] T001 Registrar evidencia reproducible del incidente y criterios de seguridad para FR-001–FR-008 en `specs/055-fast-json-routing/research.md` y `specs/055-fast-json-routing/quickstart.md`.

## Fase 2: Fundamentos

- [x] T002 [P] Añadir regresiones de FR-001, FR-002, FR-003, FR-004 y FR-006 para control compatible, truncado y salida parcial segura en `backend/tests/unit/test_comparator_feedback.py`, `backend/tests/unit/test_opencode_model_gateway.py` y `backend/tests/unit/test_photo_grading_failures.py`.
- [x] T003 [P] Añadir regresión de FR-002 y FR-005 para el cuerpo OpenCode en `backend/tests/unit/test_llm_router_output_budget.py`.

## Fase 3: Historia 1 - Verificación independiente completa

**Objetivo**: completar o degradar honestamente la verificación sin una tercera inferencia innecesaria.

**Prueba independiente**: simular respuesta GLM completa, truncada y sin nota; comprobar resultado válido o revisión docente inmediata.

- [x] T004 [US1] Centralizar y aplicar la política de controles compatibles por modelo para FR-001 y FR-007 en `backend/app/services/llm_router.py` y `backend/app/modules/calificaciones/agents.py`.
- [x] T005 [US1] Detectar `length`/`max_tokens` antes de parsear la respuesta para FR-002 en `backend/app/modules/calificaciones/agents.py`.
- [x] T006 [US1] Evitar arbitraje adicional cuando uno de los evaluadores no produce nota y conservar desglose/alerta/revisión para FR-003, FR-004 y FR-007 en `backend/app/modules/calificaciones/agents.py`.

## Fase 4: Historia 2 - Digitalización sin rutas muertas

**Objetivo**: estructurar el borrador con una ruta disponible y sin razonamiento innecesario.

**Prueba independiente**: enviar la imagen real, obtener cuatro preguntas/respuestas y comprobar ausencia de 404/401.

- [x] T007 [US2] Aplicar controles compatibles y telemetría para FR-005, FR-006 y FR-008 al cliente OpenCode del router en `backend/app/services/llm_router.py` y configurar `digitalizacion.estructura` mediante el control institucional existente.

## Fase final: Validación y gobernanza

- [x] T008 Ejecutar pytest y Ruff focalizados para FR-001–FR-008 según `specs/055-fast-json-routing/quickstart.md`.
- [x] T009 Actualizar trazabilidad en `specs/README.md`, `specs/system-inventory/current.json` y la línea base de especificaciones.
- [x] T010 Preparar el recorrido gobernado de CI, despliegue y las dos pruebas reales de producción para SC-001–SC-005, sin confirmar ni publicar notas.

## Dependencias

- T001 no tiene dependencias.
- T002 y T003 dependen de T001 y pueden ejecutarse en paralelo.
- T004, T005 y T006 dependen de T002.
- T007 depende de T003 y puede avanzar después de la política común de T004.
- T008 depende de T004-T007.
- T009 depende de T008.
- T010 depende de T008-T009 y de CI verde.

## Oportunidades de paralelismo

- Las pruebas de agentes y router afectan archivos diferentes.
- La documentación de trazabilidad puede actualizarse después de estabilizar código y pruebas.

## Estrategia de implementación

1. Capturar la regresión antes del cambio.
2. Implementar controles compatibles y contexto compacto.
3. Degradar sin tercera llamada cuando falte una nota.
4. Validar localmente.
5. Actualizar la configuración productiva con el panel/servicio existente.
6. Fusionar solo con CI verde y repetir los dos recorridos reales.
