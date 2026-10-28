# Plan: cámara nativa en celular

**Rama**: `codex/127-camara-nativa-movil` | **Fecha**: 2026-10-25 | **Spec**: [spec.md](./spec.md) | **Issue**: [#268](https://github.com/Andres-back/Calificator/issues/268)

**Estado**: aprobado por el usuario el 2026-10-25 («aprove»), incluida la revisión de requisitos y continuación. La aprobación no autoriza fusión o despliegue.

## Resumen

Priorizar captura nativa en iPhone/Android/iPad desde el mismo gesto de «Tomar foto», evitando montar primero `CameraCapture`. Conservar la webcam integrada y su selector en computador. Reutilizar la preparación y envío actuales, reforzando la identidad del intento de selección para descartar resultados tardíos sin confundir el ocultamiento normal de la cámara nativa con abandono de la entrega.

## Contexto técnico

**Lenguajes/versiones**: TypeScript/React18, Vite y navegadores actuales del proyecto.
**Dependencias**: controles de archivo/captura del navegador y componentes existentes; sin nuevas librerías o servicios de IA.
**Persistencia**: únicamente estado local del intento y archivos en memoria. Sin almacenamiento local persistente, migración o modificación de endpoints.
**Pruebas**: Vitest/Testing Library, Playwright Chromium/WebKit, fixtures sintéticas de cámara/selector y regresiones de los cuatro consumidores. Comprobación física manual separada.
**Plataforma objetivo**: iPhone Safari, Android Chrome, iPad Safari con presentación de escritorio y navegador/acceso de inicio; PC con webcam y varias cámaras. La interfaz de la cámara externa sigue siendo del SO/navegador.
**Rendimiento y escala**: una solicitud local de selección activa, hasta diez fotos conforme al consumidor; sin inferencias, llamadas de subida o reducción adicional de resolución por abrir la cámara. Liberar listeners, inputs temporales y referencias al finalizar/invalidar.

## Verificación de la constitución

- Separación de roles (I): se conservan permisos y handlers de cada consumidor. Elegir modo de cámara es una preferencia de presentación, nunca autorización. Sin nuevas rutas backend.
- Integridad y trazabilidad (II): captura provisional no confirma ni envía. Añadir/reemplazar conserva orden y exige contexto/intent válidos; resultados tardíos no migran entre estudiantes, tampoco en A→B→A.
- Asincronía e idempotencia (III): un intento por acción, sin apertura automática al volver de segundo plano. Cancelación sin resultado no bloquea; aceptar solo una vez. Análisis de calidad conserva la época de contexto tras aceptar.
- Evolución segura (IV): no cambia esquema, datos ni payloads; no se relajan tipos/tamaños. No se convierte HEIC silenciosamente ni se renombra como JPEG.
- Datos y secretos (VI): sin cámara al montar, audio, credenciales, contenido sensible en logs o llamadas a proveedores. Estado del intento solo en memoria.
- Accesibilidad (V): botones semánticos, foco recuperable, mensajes claros y objetivos44px. Revisar ampliación de la hoja en360/390/768/1440 y orientación horizontal; no prometer estilizar la UI del SO.
- Gobernanza y pruebas (VII/VIII): issue #268, aprobación humana del 2026-10-25, calidad documental 16/16 y revisión autorizada 8/8. Checklist/Tasks/Analyze preceden a implementación, regresiones, inventario y CI. Sin push directo a main ni despliegue manual.

Revisión posterior al diseño: no hay excepción constitucional ni incógnita bloqueante. Aprobación humana registrada; continuar con revisión de requisitos, tareas, análisis e implementación.

## Estructura del proyecto

- `frontend/src/components/evidence/MultiPageEvidencePicker.tsx`: enrutar las acciones de captura según política, coordinar intento nativo/subida, invalidar por época de contexto y conservar validaciones/posición/quality.
- Helper pequeño en `frontend/src/components/evidence/` para política móvil/tableta y ciclo de selección nativa, con pruebas unitarias propias. No acoplarlo a una página o a datos académicos.
- `CameraCapture.tsx` y sus pruebas: preservar webcam, selector, apagado y alternativa nativa explícita; no montarlo por defecto en perfiles móviles. No rediseñar el visor de documentos.
- `MateriaCalificar.tsx`, `GradeReprocessing.tsx`, `DigitalizarEvaluacionModal.tsx` y `ResolverEvaluacionPage.tsx`: inspeccionar y probar consumidores existentes, evitando cambios innecesarios de contratos/límites.
- `frontend/e2e/camera-capture.spec.ts` y, si conviene, archivo de casos127: separar perfil móvil de ancho de pantalla. Mantener la regresión desktop102/103 y añadir pruebas de elección/retorno de archivos, cancelación y contexto. Registrar127 en WebKit sin perder casos anteriores.
- Tras aprobación: referencias de extensión en Specs102/103/113 y dominios005/008, inventario generado, validación y registro Spec127 conforme a las comprobaciones vigentes. No modificar workflows para eludir fallos.

## Decisiones y complejidad

1. **Nativa como preferencia móvil**: política pura con señales de teléfono/tableta y la heurística iPad con UA Mac+touch, ya presente en el proyecto. No usar solo ancho o `capture in input` como detector, pues no garantiza captura en escritorio. Política solo de UX, con alternativa de archivos; no afirmar detección infalible.
2. **Mismo gesto del usuario**: abrir el control de archivo con `capture=environment` y tipos admitidos dentro de la acción del botón, no desde un efecto, timeout, consulta o retorno de visibilidad. Solicitar JPEG/PNG/WebP, validar lo recibido y no garantizar transcodificación del SO.
3. **Identidad inmutable del intento**: ID, época de contexto, tipo de selector y destino de reemplazo. El evento debe quedar unido a esa apertura, no leer únicamente el último `contextKey`. Usar un control/handler por intento y limpieza propia para impedir que un evento de una apertura vieja se presente como nuevo. Las implementaciones no deben depender de actualizar estado React y luego hacer click desde un efecto.
4. **Cancelación nativa distinta de stream**: procesar `cancel` si llega; si no llega, no bloquear ni diagnosticar permiso denegado sin evidencia. Ocultar/volver a mostrar o recibir foco no cancela ni confirma una captura nativa; cambio de contexto, desmontaje o deshabilitación sí. La cámara integrada conserva su apagado por ocultamiento.
5. **Integridad del archivo**: conservar el `File` admitido y el pipeline de orientación existente; no reducir resolución como en captura de canvas ni añadir generación. Mantener deduplicación, con regresiones para nombres repetidos y mensajes claros de formato/tamaño. Sin librería HEIC nueva.
6. **Pruebas honestas**: el file chooser automatizado demuestra la petición y el regreso a la aplicación, no la UI ni el hardware del SO. Registrar aparte dispositivo/OS/navegador, captura/repetición/cancelación y retorno desde inicio antes de afirmar validación física.

Se rechaza ampliar solamente el modal móvil: puede seguir limitado por viewport/Safari y no satisface el uso normal de la cámara solicitado. También se rechaza enviar inmediatamente tras capturar, decidir solo por pantalla, borrar hojas al cancelar o cancelar indiscriminadamente con `visibilitychange`.

Diseño detallado en [research.md](./research.md), [data-model.md](./data-model.md), [contrato de interfaz](./contracts/captura.md) y [guía de validación](./quickstart.md).

## Coordinación 131: evidencia docente revisable

Conserva captura nativa en teléfono y webcam/selector en PC. El editor revisable se abre después de recibir la foto; no reintroduce una cámara móvil en un recuadro pequeño. La prueba física sigue siendo un gate independiente. Contratos y validación se registran en [Spec131](../131-escaneo-evidencias/spec.md), [plan](../131-escaneo-evidencias/plan.md) y [tareas](../131-escaneo-evidencias/tasks.md), issue #276. Esta coordinación no certifica cierre, CI, teléfonos físicos ni activación productiva.
