# Plan: selección de cámaras e iconos administrativos

**Rama**: `codex/103-camaras-iconos-admin` | **Fecha**: 2026-10-17 | **Spec**: [spec.md](./spec.md) | **Issue**: [#214](https://github.com/Andres-back/Calificator/issues/214)

## Resumen

Ampliar la captura integrada con selección y actualización de cámaras autorizadas, sin alterar la preparación ni el envío explícito de entregas. Completar la identidad ilustrada de administración: reutilizar Inicio y crear tres assets transparentes para Usuarios, Roles y Correo. Alcance exclusivamente frontend; spec, plan y revisión de requisitos autorizados por el usuario el 2026-10-17. La solicitud adicional de Xali se documenta como propuesta separada del issue #215; no se implementa el bot en este cambio.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6 y React 18, sobre el frontend existente.
**Dependencias**: MediaDevices del navegador, componentes actuales, Vitest y Playwright; sin dependencia nueva de ejecución.
**Persistencia**: ninguna nueva; preferencia de cámara solamente en memoria del selector de evidencias montado.
**Pruebas**: unitarias de ciclo de vida/cámaras y assets; E2E con dispositivos y cuentas sintéticos en Chromium/WebKit, tamaños 360/390/1440 px y temas claro/oscuro.
**Plataforma objetivo**: navegador HTTPS en escritorio, Android e iPhone, sujeto a permisos y capacidades disponibles.
**Rendimiento y escala**: una cámara vigente como máximo; cero streams obsoletos después de cierre/cancelación; tres WebP optimizados de hasta 60 KB cada uno (180 KB total), sin llamadas IA en tiempo de uso.

## Verificación de la constitución

- Separación de roles: no cambian rutas, permisos ni filtrado del menú; se verifican administrador y roles restringidos. Captura compartida conserva sus consumidores y controles actuales.
- Integridad y trazabilidad: no se modifica backend, evaluaciones, notas, evidencias guardadas ni Spec 101; artefactos de trabajo aislados en esta rama e issue.
- Asincronía e idempotencia: solicitudes de cámara identificadas por generación; respuesta obsoleta cierra su propio stream. Se bloquea captura durante cambios y se conserva aceptación única de foto y envío explícito.
- Datos y secretos: vídeo sin audio, sin persistir/enviar nombres o identificadores de hardware. Pruebas sintéticas y generación de iconos sin producción, alumnos ni claves de API.
- Accesibilidad: etiquetas visibles, teclado y foco, área táctil mínima 44 px, textos sencillos y controles sin desbordamiento desde 360 px. Iconos decorativos con rótulos conservados y fallback.
- Gobernanza y pruebas: Specify y Plan aprobados el 2026-10-17; revisión delegada de requisitos autorizada. Lista específica, Tasks, Analyze, Implement y Converge; pruebas y CI obligatorios antes de proponer fusión. Ninguna autorización previa de PR #213 se extiende a este cambio.

## Estructura del proyecto

- `frontend/src/components/evidence/CameraCapture.tsx`: selección, actualización, recuperación y ciclo de vida de dispositivos.
- `frontend/src/components/evidence/MultiPageEvidencePicker.tsx`: preferencia efímera entre aperturas y conservación de contexto.
- Pruebas unitarias correspondientes y `frontend/e2e/camera-capture.spec.ts`: múltiples cámaras, cambios rápidos, errores y responsive.
- `frontend/src/components/ui/EducationalIcon.tsx` y su prueba: nombres semánticos, assets y fallback.
- `frontend/public/branding/semantic-icons/`: tres nuevos WebP transparentes, sin reemplazar archivos existentes.
- `frontend/src/config/nav.ts`, Sidebar/Topbar y pantallas administrativas de Usuarios, Roles y Correo: identidad coherente, sin alterar permisos ni controles funcionales.
- `specs/103-camaras-iconos-admin/`: especificación, decisiones, contrato de comportamiento y verificaciones.

## Decisiones y complejidad

1. Enumerar después del permiso inicial; conservar la selección real devuelta por el stream y usar `deviceId` exacto solamente al elegir un dispositivo explícito. No combinarlo con una orientación obligatoria.
2. Detener antes de cambiar; invalidar resultados anteriores con un identificador de solicitud y limpiar cada stream que llegue tarde. Eventos de conexión/desconexión complementan «Actualizar cámaras», no lo sustituyen.
3. Congelar el selector durante codificación o revisión de foto. Mantener las hojas preparadas ante errores; reintentar, elegir otra cámara o subir archivo son recuperaciones explícitas.
4. Guardar preferencia únicamente mientras vive MultiPageEvidencePicker; no usar localStorage, backend ni estado del alumno. No agregar un gestor global de hardware.
5. Usar generación de imágenes para tres ilustraciones raster coherentes con las existentes, un resultado por función y con transparencia; conservar referencias/procedencia en la verificación. Optimizar a WebP y comprobar visualmente bordes sobre ambos temas. No convertir este cambio en una reescritura de la iconografía funcional.
6. Reutilizar componentes y añadir cabeceras compactas; no rediseñar toda la administración ni introducir dependencias de UI. Cambios visuales no crean permisos.
7. Las simulaciones verifican lógica y distribución; una prueba física de webcams/iPhone/Android se registra por separado y nunca se presume a partir de emulación.

No hay excepciones a la constitución. Documentos de apoyo: [investigación](./research.md), [estado](./data-model.md), [contrato](./contracts/frontend.md), [validación](./quickstart.md).
