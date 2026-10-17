# Guía de validación

Estado: implementación local validada el 2026-10-17; CI remoto y fusión todavía pendientes. Se usaron exclusivamente datos sintéticos y este worktree, sin producción ni Spec 101.

## Comprobaciones focalizadas

1. Vitest de CameraCapture y MultiPageEvidencePicker: ninguna/una/tres cámaras, etiquetas vacías, preferencia al reabrir, cambio rápido, permiso tardío, cierre, contexto distinto, segundo plano, cámara ocupada/desconectada y foto en revisión. Comprobar parada de cada stream obsoleto, hojas conservadas y cero envíos automáticos.
2. Vitest de EducationalIcon y navegación: tres assets nuevos, fallback, cuatro entradas administrativas ilustradas y permisos conservados.
3. E2E de captura y administración en Chromium/WebKit con cámaras y cuentas sintéticas; 360/390/1440 px, teclado/foco, mensajes y desbordamiento. Conservar escenarios de captura/revisión/subida existentes.
4. Revisar visualmente iconos y cabeceras en claro/oscuro: significado correcto, bordes sin rectángulo blanco, texto legible; comprobar WebP de hasta 60 KB cada uno.
5. Lint, comprobación de tipos y build del frontend según scripts del repositorio; todos los controles CI requeridos antes de proponer fusión.

## Registro del resultado

Anotar comando, resultado y limitaciones; distinguir mocks/emulación de hardware físico. No marcar como probadas cámaras USB/iPhone/Android si solo se ejecutó emulación. No capturar identificadores de dispositivos ni datos de alumnos en informes.

## Seguridad de entrega

Sin migración, cambios de API, claves, modelos, notas o evidencias. Merge/despliegue de esta nueva rama requieren autorización propia; la aprobación anterior de PR #213 no se reutiliza. No hacer despliegues ni reinicios manuales como parte de esta validación.

## Evidencia local del 2026-10-17

- Revisión de requisitos: base 16/16, lista UX 6/6, evaluación delegada autorizada por el usuario. Analyze: nueve requisitos cubiertos por once tareas; sin conflictos críticos, tareas huérfanas ni cambios de alcance funcional del bot.
- `npm run typecheck`: correcto.
- `npm run lint:strict`: correcto, sin advertencias.
- `npm run build`: correcto; conserva aviso general de tamaño de chunks, sin ocultarlo ni elevar presupuestos.
- `npm run audit:actions`: correcto, 465 botones y 119 enlaces con propósito verificable.
- `npm run audit:build`: correcto, recursos/precargas dentro del presupuesto.
- `npx playwright test e2e/camera-capture.spec.ts e2e/admin-icons.spec.ts --workers=2`: **20 passed (1.0m)**, Chromium y WebKit. Tres dispositivos seleccionables; permisos denegados, confirmación y cero escrituras académicas. Administración con datos sintéticos, tres cabeceras, navegación desktop, ambos temas, 360/390/1440 px y cero errores de página.
- QA visual: cabecera de Usuarios móvil claro, Correo escritorio oscuro y captura móvil/escritorio revisadas. Una captura inicial de WebKit se tomó durante animación; se añadieron comprobaciones de opacidad completa antes de capturar, sin modificar estilos globales ni introducir esperas fijas. Repetición correcta.
- `npm exec vitest run src/components/evidence/CameraCapture.test.tsx src/components/evidence/MultiPageEvidencePicker.test.tsx src/components/ui/EducationalIcon.test.tsx src/config/nav.test.ts src/modules/admin/AdminUsersPage.test.tsx src/modules/admin/AdminMailPage.test.tsx`: **98 passed**, seis archivos. Incluye captura con cada una de las tres cámaras, propiedad/limpieza de streams, contexto/preferencia, assets/fallback, permisos del menú y regresiones de Usuarios/Correo.
- Assets: [procedencia, prompts, tamaños y hashes](./assets.md). Tres WebP 256 × 256 con transparencia real, 53 506 bytes total. Assets finales presentes en `frontend/public/branding/semantic-icons/` y en el build.

La primera ejecución E2E mostró todos los escenarios completados pero su proceso local quedó esperando el cierre del servidor de desarrollo; la repetición reutilizando ese servidor finalizó con código 0 y el resultado anterior. No se usó ese comportamiento local para eludir una prueba ni se alteró CI.

Límites: WebKit Windows simula vídeo porque no reproduce canvas MediaStream; Chromium usa stream de canvas, ambos sintéticos. No se probaron webcams USB físicas ni cámara/teclado físicos de Android/iPhone. No se accedió a producción, estudiantes reales, claves ni APIs institucionales. La propuesta de Xali #215 está documentada, no implementada.

Converge: nueve FR, cuatro SC, ocho principios constitucionales y siete decisiones del plan revisados; cero brechas accionables, sin fase vacía añadida. Implement cerró las once tareas tras registrar pruebas y revisión. No hay excepciones a la constitución ni autorización de fusión/despliegue inferida.
