# Validación: cámara y evaluación completa

Estado: validación local ejecutada el 2026-10-17. CI remoto pendiente. Sin captura física ni despliegue nuevo en producción acreditados.

## Preparación

Rama `codex/102-camara-visor-completo`, lockfile vigente y fixtures sintéticos. Registrar aprobación de spec/plan y revisión de [ux.md](checklists/ux.md) antes de Implement. Consultar [contratos](contracts/interfaces.md) y [modelo local](data-model.md).

## Comandos desde frontend

```powershell
npm ci
npm run test:run -- src/components/evidence/CameraCapture.test.tsx src/components/evidence/MultiPageEvidencePicker.test.tsx src/modules/evaluaciones/components/EvaluationPdfViewer.test.tsx src/modules/evaluaciones/components/EvaluationPreviewModal.test.tsx
npm run typecheck
npm run lint:strict
npm run build
npm run audit:actions
npm run audit:build
npx playwright test e2e/camera-capture.spec.ts e2e/evaluation-preview.spec.ts
```

Ampliar configuración E2E para ejecutar ambos archivos en Chromium/WebKit: actualmente el visor no está incluido en WebKit. No saltar controles ni ampliar timeouts para esconder fallos.

## Escenarios

- Cámara concedida, denegada, inexistente/ocupada; previsualizar/repetir/aceptar/cancelar; no enviar automáticamente.
- Permiso tardío, cambio de estudiante/evaluación, segundo plano, deshabilitado/envío: tracks detenidos, ninguna hoja en otro contexto.
- Reemplazo cancelado conserva original; aceptación sustituye solo destino; calidad/orden/límites intactos.
- PDF sintético de veinte páginas: primera/última/regreso, zoom/resize, error/reintento, texto y píxeles reales; ≤3 canvases, ≤4 Mpx cada uno, dibujo serial.
- Un scroll, sin overflow de pantalla a 360/390/1440; lectura ≥60 % de alto a 390 × 844, opciones cerradas; táctiles/foco/cierre, claro/oscuro.
- Solucionario permitido/denegado, descarga de versión correcta y cambio de evaluación. Error Word no oculta PDF.
- Auditar Nginx utilizado y headers HTML/SPA: cámara propia, micrófono/geolocalización denegados, CSP no ampliada innecesariamente.

## Cierre

Registrar resultados/capturas sintéticas/limitaciones aquí tras ejecutarlos. Actualizar propietarios/inventario si corresponde, Converge y PR enlazado a #212. Squash merge solo HEAD revisado y CI verde. Sin despliegue manual del VPS.

## Resultados locales

- Plan aprobado y revisión UX autorizada por respuesta humana del 2026-10-17; Specify 16/16, UX 8/8.
- Vitest focalizado: 60/60 en ocho archivos, incluyendo selector, cámara, viewer, permisos de descarga, cola de render, política Nginx y consumidores docente/estudiante. Tras corregir página visible se añadieron/regresaron nueve pruebas de viewer/cola, 9/9.
- Matriz amplia inicial: 20/22 E2E; dos esperas de estabilidad de clics en WebKit Windows escritorio. Se conservó clic en móviles y Chromium y se añadió activación por teclado en escritorio WebKit, con visibilidad/habilitación comprobadas, sin `force`, skip ni aumentar timeouts. Cámara WebKit 1440 pasó (7,3 s) y PDF WebKit 1920 pasó (17 s) después de ese ajuste de prueba.
- El nuevo caso de zoom detectó una franja de la hoja previa que alteraba el indicador. Se corrigió la detección por área visible y añadió regresión unitaria. Suite final de lector en 390/1440 y veinte páginas: 6/6 entre Chromium y WebKit, incluido zoom, descargas y permisos. Cámara móvil en 360/390, escritorio 1440, denegación y no envío automático tienen cobertura sintética.
- TypeScript, lint estricto, build y auditorías de acciones/build se ejecutan según los comandos anteriores; resultados finales registrados en el PR.
- Inventario regenerado: 573 superficies, sin nuevas rutas ni tablas. Se registró Spec 102 en la línea base de gobernanza, manteniendo las comprobaciones existentes.
- HEAD productivo no modificado durante estas pruebas. Comprobación pública previa: HTTP 200 y `Permissions-Policy: camera=(self), microphone=(), geolocation=()`; demuestra política existente, no cámara integrada desplegada.

## Limitaciones explícitas

Analyze final: 11 FR y 4 SC trazados a 14 tareas, cobertura 100 %, sin ambigüedades/duplicidades ni conflicto constitucional. Converge sobre código/contratos: 11 FR, 4 SC, ocho escenarios de aceptación, decisiones de cámara/render/permisos y ocho principios revisados; cero hallazgos funcionales pendientes. No añadió tareas ni modificó su lista durante Converge. CI y fusión siguen siendo gates externos pendientes.

La cámara de Chromium usa un MediaStream de canvas sintético. WebKit Windows no reproduce ese origen de vídeo: se simulan fuente, reproducción y frame para comprobar captura/UI, cancelación y ausencia de envíos. No equivale a permiso/cámara física iPhone/Android; probarlos en el piloto tras despliegue. No se accedió a fotos de alumnos, claves o APIs de IA.

Capturas y trazas sintéticas quedan en `frontend/test-results/` y logs locales en `frontend/output/playwright/`, ambos ignorados por Git. Los fallos iniciales se conservan en el historial de validación, no se ocultan como una ejecución íntegra de 22/22.
