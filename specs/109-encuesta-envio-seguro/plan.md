# Implementation Plan: Encuesta fiable y versionada

**Branch**: `codex/109-encuesta-envio-seguro` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

## Summary

Importar solo encuesta-docente del commit desplegado 5d05751 sobre main, sin fusionar cambios académicos ajenos. Corregir firma y confirmación, reintento en memoria y diagnóstico LR-CR-01 5.0. Alcance y producción autorizados por el usuario, con ampliación metodológica del 2026-10-20, issue #226.

## Technical Context

Python 3.11 estándar, WSGI/Gunicorn, SQLite y JavaScript sin nuevas dependencias. Dos bases existentes y volumen conservado, sin migración ni cambios de claves. unittest, Node test runner, Playwright CLI WebKit/Chromium y build Docker. Peticiones acotadas a 20 segundos; sin APIs de IA.

## Constitution Check

CSRF, permisos, firma obligatoria, idempotencia y constancias intactos. Borradores solo en memoria. Consentimiento 5.0 informa duración del formulario. Issue, spec, plan y aprobación humana registrados; PR y CI antes de main/producción. Solo reiniciar encuesta-docente, no el sistema académico.

## Project Structure

- app.py: límites compartidos, contexto archivado 4.0, resumen privado y métricas opcionales.
- public/submission.js y app.js: validación, confirmación vinculada al paquete, reintento y estados.
- public/schema.json, settings.json: 24 preguntas de 5.0 (se sustituye rango por minutos y se añaden cinco ítems).
- public/admin.js y admin.html: recuentos por versión, CSV agregado y métricas no causales.
- versions/4.0-web-breve/: esquema, ajustes y consentimiento inmutables.
- tests/: regresión y persistencia sintéticas, nunca sobre la muestra real.

## Release and rollback

Ampliación autorizada en chat el 2026-10-20: Pillow 12.3.0 → 13.0.0 para desbloquear la auditoría de seguridad. Python de producción/CI es 3.11, compatible con 13.0.0. Revisar usos de APIs retiradas y ejecutar regresiones de preparación de fotos, evidencia, extracción y recursos visuales/exportaciones con imágenes sintéticas. No actualizar otras dependencias ni modificar el flujo de calificación. El CRUD sigue separado y pendiente; primero cerrar este hotfix con CI completo.

Tras CI/merge, snapshot privado y huellas antes de reconstruir únicamente encuesta-docente desde main. Conservar .env/volumen y etiqueta de imagen anterior. Comprobar publicación, recepción con base temporal de la misma imagen, resumen real de solo lectura y huellas. Si falla salud, recuperar imagen previa sin borrar datos. No declarar preprueba humana realizada.

## Hotfix de ventanas autorizado tras el fallo de CI

FR-016: crear primero una regresión unitaria que detenga requestAnimationFrame y cierre Modal con movimiento normal/reducido; comprobar DOM retirado, scroll/foco restaurados y Escape dirigido al diálogo subyacente. Retirar únicamente la dependencia de la animación de salida para desmontar la ventana; conservar la entrada animada y el respeto a movimiento reducido, sin temporizadores ni detección especial de Safari. Ejecutar los casos WebKit fallidos de tablas manual/IA y la suite contextual existente, además de typecheck/lint/build/unitarias y gobernanza. No modificar mocks, expectativas, retries ni timeouts para ocultar el fallo. El usuario autorizó investigar/corregir mediante «adelante» después del diagnóstico concreto.

## Navegación de la prueba de creación

El fallo general restante de f6ec74a ocurre al ejecutar el segundo page.goto con DashboardPage todavía cargando: la traza muestra fallo de importación inmediatamente después de goto y caída del proceso de red de WebKit. Añadir regresión con entrega retardada de ese módulo y registro sintético en pagehide que compruebe contenido inicial montado antes de salir. Primero demostrar fallo con el helper anterior; después esperar el encabezado real dentro de main antes de navegar, conservando cabecera/camino/autenticación y todas las aserciones del creador. No cambiar código productivo por este fallo del arnés. Ejecutar matriz móvil y caso retrasado, gobernanza/inventario y CI completo; comprobar HEAD y verde exactos antes de squash sin --admin. Autorización explícita: «CORRIGE Y FUSIONA».

## Visibilidad en la regresión de cámara

El CI de 7374630 detectó una aserción síncrona prematura: findByRole devuelve la foto al estar en DOM, mientras la entrada de Modal aún puede tener opacidad cero. Usar waitFor con la misma aserción toBeVisible y sus límites predeterminados en los tres casos de primera captura. No sustituir visibilidad por mera presencia ni cambiar la cámara, animaciones, permisos, timeouts o retries. Ejecutar las 15 pruebas de cámara y mantener obligatorio el CI completo (FR-018).

## Prioridad adicional: nombre único

Release 5.0.1, instrumento 5.0 sin cambiar preguntas/consentimiento. Suprimir signature-name del DOM, derivar signature.name de identity.name con un helper puro, mostrar nombre escapado y ofrecer Corregir mi nombre al paso de identidad. Al cambiarlo después de firmar, borrar dibujo y autorización en memoria para volver a firmar; nunca modificar constancias guardadas. Bloquear el botón mientras un envío es incierto para respetar el paquete idempotente. El backend conserva el contrato y rechaza nombres distintos enviados por clientes no válidos. Pruebas Node de helper/ausencia del segundo campo y navegador real: completar, corregir nombre, volver a firmar, enviar y comprobar constancia. CRUD continúa pendiente en admin-crud-draft.md; no hay migración en esta entrega.
