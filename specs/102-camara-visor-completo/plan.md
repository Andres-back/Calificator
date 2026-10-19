# Plan: cámara real y evaluación completa

**Rama**: `codex/102-camara-visor-completo` | **Fecha**: 2026-10-17 | **Spec**: [spec.md](./spec.md) | **Issue**: [#212](https://github.com/Andres-back/Calificator/issues/212)

**Estado**: aprobado por respuesta humana el 2026-10-17; implementación y validación local completas, CI remoto pendiente.

## Resumen

Dos incrementos independientes: captura integrada dentro del selector de evidencias y lector amplio del PDF final con desplazamiento continuo. Reutilizar calidad de fotos, API documental, PDF.js, permisos y controles accesibles actuales. Sin modificar el backend de calificación ni la digitalización visual en curso (Spec 101).

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6, React 18, Vite 8; lockfile actual.
**Dependencias**: cámara/canvas del navegador, PDF.js 6.4.299, Modal y Button; ninguna nueva dependencia de producción.
**Persistencia**: ninguna nueva; captura y documento locales hasta las acciones existentes de envío/descarga.
**Pruebas**: Vitest/Testing Library; Playwright Chromium y WebKit, API simulada y fixtures sintéticos; CI vigente.
**Plataforma objetivo**: Android/iOS y escritorio, navegador seguro, 360/390/1440 px, claro/oscuro.
**Rendimiento y escala**: veinte páginas, dibujo serial, máximo tres canvases residentes de hasta 4 millones de píxeles; Blob completo como antes. Lectura ≥60 % del alto a 390 × 844, opciones cerradas. Captura JPEG acotada y análisis existente.

## Verificación de la constitución

- Separación de roles: conservar `showSolutions = solutions && canViewSolutions`, autorización backend y correspondencia evaluación/versión/Blob; pruebas permitido/denegado.
- Integridad y trazabilidad: `addFiles` sigue siendo el ingreso de fotos preparadas; capturar/aceptar no llama a calificar. Sin cambios a notas/evidencias guardadas.
- Asincronía e idempotencia: sesión invalida capturas/promesas tardías; una aceptación por foto; cancelación y limpieza de PDF.js.
- Datos y secretos: fixtures sintéticos; sin credenciales, evidencias reales, IA externa o migraciones.
- Accesibilidad: foco restaurado, Escape/cierre, táctiles de 44 px, viewport dinámico, áreas seguras, un scroll y texto por página.
- Gobernanza y pruebas: usuario aprobó spec/plan y autorizó revisión de checklist el 2026-10-17; Specify 16/16 y UX 8/8 revisados. PR/CI verde, sin bypass ni push a main.
- Revisión posterior al diseño: sin excepciones ni incertidumbres técnicas abiertas; gate humano cerrado antes de implementar.

## Estructura del proyecto

```text
frontend/src/components/evidence/
  CameraCapture.tsx y CameraCapture.test.tsx (nuevos)
  MultiPageEvidencePicker.tsx y MultiPageEvidencePicker.test.tsx
frontend/src/modules/materias/MateriaCalificar.tsx
frontend/src/modules/evaluaciones/
  ResolverEvaluacionPage.tsx
  components/EvaluationPreviewModal.tsx y EvaluationPreviewModal.test.tsx
  components/EvaluationPdfViewer.tsx y EvaluationPdfViewer.test.tsx
  components/EvaluationPdfPage.tsx (nuevo)
  components/pdfRenderQueue.ts y pdfRenderQueue.test.ts (nuevos)
frontend/e2e/camera-capture.spec.ts (nuevo)
frontend/e2e/evaluation-preview.spec.ts
frontend/playwright.config.ts
frontend/src/test/nginxPolicy.test.ts
frontend/nginx.conf
nginx/templates/default.conf.template (auditar; conservar si ya correcta)
specs/102-camara-visor-completo/
specs/README.md
specs/005-evaluaciones/ y specs/008-calificaciones/ (propietarios)
```

## Decisiones y complejidad

### Cámara

- «Tomar foto» abre `CameraCapture` tras clic. `getUserMedia` pide `audio:false` y cámara trasera preferente, no obligatoria; vídeo `autoPlay muted playsInline`. Esperar dimensiones y manejar reproducción fallida.
- Revisar/repetir antes de aceptar. Aceptar crea JPEG como `File` y lo entrega a `addFiles` con destino de reemplazo; no quitar original antes de aceptar.
- El picker recibe identidad opaca de contexto, sin datos personales, desde consumidores docente/estudiante. Cambio de identidad, `disabled`, desmontaje, cancelación y segundo plano invalidan sesión y detienen tracks, incluso si permiso llega tarde.
- Mensajes simples para permiso, ausencia, cámara ocupada y navegador/contexto incompatible. «Subir fotos o PDF» siempre tiene alternativa. El selector nativo opcional no se presenta como cámara garantizada.
- La plantilla Docker realmente usada ya declara `camera=(self), microphone=()`. No confundirla con `frontend/nginx.conf` alternativo, que prohíbe cámara; alinear únicamente cámara propia allí y comprobar headers efectivos, sin ampliar micrófono/geolocalización/CSP.

### Visor

- Viewport disponible con estilos/variante opt-in; no alterar comportamiento predeterminado de otros modales ni exigir fullscreen nativo en iPhone.
- Cabecera corta, cerrar y «Opciones» accesibles. Wrapper `overflow-hidden`; un único scroll documental interior; sin pie permanente de descargas.
- Todas las páginas tienen contenedores numerados con proporción reservada. `IntersectionObserver` sobre el scroll identifica página/ventana; fallback por medición y scroll si falta.
- Máximo tres canvases activos y un dibujo simultáneo; liberar páginas lejanas manteniendo posición. Zoom deliberado desplaza solo el lector, no toda la pantalla.
- Cancelar render, esperar su resolución/rechazo y luego limpiar página; destruir documento al cerrar/cambiar versión. No recargar bytes por página.
- Conservar texto bajo demanda, reintento y descargas aunque falle una capa visual o Word. «Opciones» usa un control expandible accesible, sin foco en controles ocultos.
- PDF, Word y «Ver evaluación completa (otra pestaña)» respetan Blob/versión autorizados; Word advierte edición no sincronizada.

### Entrega y límites

Pruebas focalizadas primero, después typecheck/lint/build/auditorías/E2E aplicables y CI. Actualizar propietarios e inventario si corresponde; Converge antes del PR. Fusionar por squash solo HEAD revisado y CI verde, registrando aprobaciones reales. Sin despliegue manual del VPS; la fusión puede activar el despliegue automático ya existente. Ver [research.md](research.md), [contratos](contracts/interfaces.md) y [quickstart.md](quickstart.md).
