# Plan: escritura docente móvil despejada

**Rama**: `codex/097-escritura-docente-movil` | **Fecha**: 2026-10-13 | **Spec**: [spec.md](./spec.md) | **Issue**: [#204](https://github.com/Andres-back/Calificator/issues/204)

**Estado**: Alcance/plan aprobados por «perfecto adelante» el 2026-10-13, después de explicar el ajuste y solicitar autorización de revisión/continuidad. Implementación autorizada; sin fusión ni despliegue. Base main `0619678d1c06ed97566e9eda9e8d2218db5a59ca` (PR #203).

## Resumen

Despejar preparar/revisar evaluaciones y su formulario manual al escribir en un teléfono. Evitar teclado automático; adaptar el contenedor al viewport visible mediante comportamiento opt-in; cabecera breve, foco estable y acción Listo sin submit. Plegar ayudas/opciones secundarias manteniendo valores y errores localizables. No rediseñar procesos ni todo el sistema.

## Contexto técnico

**Lenguajes/versiones**: React/TypeScript y Tailwind según lockfile vigente, sin actualizaciones.
**Dependencias**: Modal, bloqueo de scroll, GenerationWizard/Preparation, editores de preguntas/rúbrica y formulario manual/DynamicTextList actuales; API nativa VisualViewport cuando exista. Sin librerías nuevas.
**Persistencia**: tablas/API intactas; estado académico y borradores v7 conservados. El modo de escritura no persiste ni crea evaluaciones.
**Pruebas**: Vitest/Testing Library para foco, viewport/fallback, conservación y Listo sin submit. E2E focalizados Chromium/WebKit para espacios normales/reducidos, claro/oscuro y documentos/permisos pertinentes; CI completo obligatorio antes de merge.
**Plataforma objetivo**: Safari/PWA iPhone y Chrome/PWA Android; 360/390, apaisado, altura visual 300–450 y tamaños normales. Escritorio 768/1280/1440 sin cambios involuntarios. La emulación no acredita un teclado físico.
**Rendimiento y escala**: sin peticiones IA por enfocar/plegar, ni reflow/actualización de viewport por cada tecla. Mantener límites actuales de 3–30 preguntas y un scroll principal del editor.

## Verificación de la constitución

- Separación de roles: conservar guardas de acceso y mutaciones; el modo móvil no concede permisos. Pruebas de estudiante y docente sin permiso.
- Integridad y trazabilidad: conservar preguntas/claves, origen/confianza, pesos/criterios, versión y advertencias. Listo/enfoque/pliegues no invocan guardar, publicar ni recalificar.
- Asincronía e idempotencia: mantienen locks y estados actuales; no disparar solicitudes al cambiar viewport y conservar trabajo ante fallo.
- Datos y secretos: sin migraciones, credenciales ni capturas de alumnos. Estado visual transitorio, sin cambios a borradores guardados por estas acciones.
- Accesibilidad: controles de 44×44, fuentes de campos textuales de al menos 16 px en teléfono, zoom permitido, foco/trampa/retorno conservados y errores alcanzables.
- Proveedores intercambiables: no cambiar proveedores, modelos, prompts ni tiempos de calificación.
- Gobernanza y pruebas: aprobar este plan antes de Checklist/Tasks/Analyze e implementación. Converge y CI antes de pedir fusión; autorización independiente de despliegue.
- Main/demo: rama propia; ninguna modificación a producción, notas, evidencias o servicios reales.

Reevaluación del diseño: sin excepciones constitucionales, nuevas tecnologías ni incógnitas de integración que requieran agentes. La captura de iPhone solicitada puede precisar los detalles visuales; no se fabrica evidencia de dispositivo físico.

## Estructura del proyecto

- `frontend/src/hooks/useMobileFormViewport.ts` y pruebas: helper/hook cohesionado, opt-in, tamaño/offset visible y foco editable; listeners solo al abrir, limpiados al cerrar. No duplica valores del formulario.
- `frontend/src/components/ui/Modal.tsx` y pruebas: soporte opt-in del espacio visible únicamente para los dos formularios de evaluación. Default sin cambios para visor/evidencia/administración; mantener scroll-lock y foco existentes.
- `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx`, `EvaluationPreparation.tsx` y pruebas: apertura sin teclado automático en celular, cabecera/modo escritura compactos, Listo y restauración; conservar pantallas/handlers/validaciones 096.
- `frontend/src/modules/evaluaciones/EvaluacionesPage.tsx` y pruebas del formulario compartido: contexto breve, secundarios plegados, campos legibles y DynamicTextList con botones sin encoger/dividir palabras. No duplicar formularios de materia/general.
- Extender casos afectados de `frontend/e2e/evaluation-ai-wizard.spec.ts` y `frontend/e2e/mock/grading-review.mock.spec.ts`; no duplicar toda la matriz 096 innecesariamente. Regresiones desktop/Modal/documentos pertinentes.
- Propietario 005, índice/baseline/inventario y artefactos 097 al entregar. Backend/modelo académico sin cambios.

## Decisiones y complejidad

1. Compactación por foco editable en teléfono; no afirmar que existe un detector universal del teclado. VisualViewport ajusta geometría cuando está disponible; fallback mantiene scroll normal. Zoom y teclado externo no cambian datos ni navegación.
2. Evitar autoFocus textual móvil; conservar foco inicial accesible y uso de escritorio. Cambios de viewport no deben reejecutar autofocus ni reemplazar el campo.
3. Cabecera compacta con etapa/título breve; ayudas/contexto repetidos se reducen durante escritura. Mantener cerrar y una acción Listo accesibles. Listo solo termina edición/blur; generación/guardado vuelve a su acción normal independiente.
4. Mantener montado el control activo, su key, cursor/selección y el estado padre único. Plegar no reinicia pendientes de listas ni desmarca criterios. Sin reparentar el textarea por cada tecla.
5. Medir alto/offset visibles con listeners acotados a resize/scroll/foco y actualizaciones agrupadas, no por pulsación. Aplicación opt-in: no alterar globalmente todos los modales durante demo.
6. Manual conserva su validación/serialización; secundarios bajo Personalizar y resumen. Campos textuales legibles y Agregar con ancho estable/contexto accesible; no rehacer sus preguntas/claves ni exigir nuevos datos.
7. Bloqueos/advertencias académicas no desaparecen por compactación. Errores llevan al campo/sección; contenido editable conserva recuperación, guardado diferencial y expected_updated_at.
8. Pruebas sintéticas primero, sin LLM real. Simular viewport reducido y eventos/foco; registrar límites. Probar después la captura/dispositivo del docente sin prometer que un emulador abra el teclado de iOS.

Diseño y validación: [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui.md](./contracts/ui.md) y [quickstart.md](./quickstart.md). Las tareas se generan después de la aprobación y revisión de requisitos.
